import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";
import fetch from "node-fetch";

// Load backend/.env
const repoRoot = path.resolve(__dirname, "../../");
const backendEnv = path.resolve(repoRoot, "backend/.env");
if (fs.existsSync(backendEnv)) {
  dotenv.config({ path: backendEnv });
}

const apiKey = process.env.OPENAI_API_KEY || "";
if (!apiKey) {
  console.error("OPENAI_API_KEY not set (check backend/.env)");
  process.exit(2);
}

// No manual fetch polyfills here; let OpenAI SDK handle Node runtime

const DOC = path.resolve(repoRoot, "cadlib/docs/API_REFERENCE.md");
const CATALOG = path.resolve(repoRoot, "cadlib/docs/cadlib-catalog.md");
const EX_DIR = path.resolve(repoRoot, "cadlib/docs/examples");
const CADLIB_DIR = path.resolve(repoRoot, "cadlib");

async function main() {
  const client = new OpenAI({ apiKey });
  const anthropicKey = process.env.ANTHROPIC_API_KEY || "";

  // Use existing vector store if provided, else create a new one
  const existing = process.env.CADLIB_VECTOR_STORE_ID;
  let vsId: string;
  if (existing) {
    vsId = existing;
    console.log(`Using existing vector store: ${vsId}`);
  } else {
    const beta: any = (client as any).beta;
    const vs = await beta.vectorStores.create({ name: "cadlib-docs" });
    vsId = vs.id;
    console.log(vsId);
  }

  const paths: string[] = [];
  if (fs.existsSync(DOC)) paths.push(DOC);
  if (fs.existsSync(CATALOG)) paths.push(CATALOG);
  if (fs.existsSync(EX_DIR) && fs.statSync(EX_DIR).isDirectory()) {
    for (const fn of fs.readdirSync(EX_DIR)) {
      if (fn.endsWith(".py")) paths.push(path.join(EX_DIR, fn));
    }
  }
  // Include all cadlib .py sources to improve API grounding
  if (fs.existsSync(CADLIB_DIR) && fs.statSync(CADLIB_DIR).isDirectory()) {
    const stack = [CADLIB_DIR];
    while (stack.length) {
      const dir = stack.pop() as string;
      for (const fn of fs.readdirSync(dir)) {
        const p = path.join(dir, fn);
        const st = fs.statSync(p);
        if (st.isDirectory()) {
          if (fn === "__pycache__") continue;
          stack.push(p);
        } else if (st.isFile() && fn.endsWith(".py")) {
          paths.push(p);
        }
      }
    }
  }
  if (paths.length === 0) {
    console.error("No files found to upload.");
    process.exit(1);
  }

  // Upload and poll
  // JS SDK may not expose fileBatches helper; upload files and attach one by one
  // Build current attachment map filename -> fileIds
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  } as Record<string, string>;
  const existingByName: Record<string, string[]> = {};
  let cursor: string | undefined = undefined;
  while (true) {
    const url = new URL(`https://api.openai.com/v1/vector_stores/${vsId}/files`);
    if (cursor) url.searchParams.set("after", cursor);
    url.searchParams.set("limit", "100");
    const listRes = await fetch(url.toString(), { headers });
    if (!listRes.ok) break;
    const data: any = await listRes.json();
    for (const ent of (data.data || [])) {
      const fRes = await fetch(`https://api.openai.com/v1/files/${ent.id}`, { headers });
      if (!fRes.ok) continue;
      const fJson: any = await fRes.json();
      const name: string = fJson.filename || fJson.name || ent.id;
      (existingByName[name] ||= []).push(ent.id);
    }
    if (data.has_more && data.last_id) cursor = data.last_id; else break;
  }

  let refreshed = 0;
  for (const p of paths) {
    const filename = path.basename(p);
    const prev = existingByName[filename] || [];
    for (const fileId of prev) {
      await fetch(`https://api.openai.com/v1/vector_stores/${vsId}/files/${fileId}`, { method: "DELETE", headers });
      await fetch(`https://api.openai.com/v1/files/${fileId}`, { method: "DELETE", headers });
    }
    const stream = fs.createReadStream(p);
    const created: any = await (client as any).files.create({ file: stream, purpose: "assistants" });
    const res = await fetch(`https://api.openai.com/v1/vector_stores/${vsId}/files`, { method: "POST", headers, body: JSON.stringify({ file_id: created.id }) });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to attach file ${filename}: ${res.status} ${txt}`);
    }
    refreshed += 1;
  }
  console.log(`Refreshed ${refreshed} files on ${vsId}.`);

  // Also upload to Anthropic Files API if key present
  if (anthropicKey) {
    console.log("Uploading to Anthropic Files API (beta)...");
    let anthCount = 0;
    const anthIndexPath = path.resolve(repoRoot, "backend/tools/anthropic_files.json");
    const anthFiles: Array<{ filename: string; id: string }> = [];
    for (const p of paths) {
      // Upload original
      {
        const stream = fs.createReadStream(p);
        const form = new (require("form-data"))();
        form.append("file", stream, { filename: path.basename(p) });
        const res = await (fetch as any)("https://api.anthropic.com/v1/files", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "files-api-2025-04-14",
          } as any,
          body: form as any,
        });
        if (!res.ok) {
          const txt = await res.text();
          console.warn(`Anthropic upload failed for ${p}: ${res.status} ${txt}`);
        } else {
          const json: any = await res.json();
          console.log(`Anthropic file: ${path.basename(p)} -> ${json.id}`);
          anthFiles.push({ filename: path.basename(p), id: String(json.id) });
          anthCount++;
        }
      }
      // For unsupported document types (.md, .py), also upload a plaintext alias (.txt)
      const ext = path.extname(p).toLowerCase();
      if (ext === ".md" || ext === ".py") {
        try {
          const content = fs.readFileSync(p);
          const aliasName = path.basename(p).replace(/\.(md|py)$/i, ".$1.txt").replace(/\.md\.txt$/i, ".txt").replace(/\.py\.txt$/i, ".txt");
          const form2 = new (require("form-data"))();
          form2.append("file", content, { filename: aliasName, contentType: "text/plain" });
          const res2 = await (fetch as any)("https://api.anthropic.com/v1/files", {
            method: "POST",
            headers: {
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
              "anthropic-beta": "files-api-2025-04-14",
            } as any,
            body: form2 as any,
          });
          if (res2.ok) {
            const j2: any = await res2.json();
            console.log(`Anthropic file (txt alias): ${aliasName} -> ${j2.id}`);
            anthFiles.push({ filename: aliasName, id: String(j2.id) });
            anthCount++;
          } else {
            const txt = await res2.text();
            console.warn(`Anthropic alias upload failed for ${p}: ${res2.status} ${txt}`);
          }
        } catch (e) {
          console.warn(`Failed to upload plaintext alias for ${p}: ${e}`);
        }
      }
    }
    try {
      fs.writeFileSync(anthIndexPath, JSON.stringify({ updatedAt: new Date().toISOString(), files: anthFiles }, null, 2), "utf-8");
      console.log(`Wrote Anthropic file index: ${anthIndexPath}`);
    } catch (e) {
      console.warn(`Failed to write Anthropic index: ${e}`);
    }
    console.log(`Uploaded ${anthCount} files to Anthropic Files API.`);
  } else {
    console.warn("ANTHROPIC_API_KEY not set; skipping Anthropic upload.");
  }
}

main().catch((err) => {
  console.error(err?.response?.data || err);
  process.exit(1);
});


