import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";

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
const CATALOG = path.resolve(repoRoot, "cadlib/docs/cadquery-catalog.md");
const EX_DIR = path.resolve(repoRoot, "cadlib/docs/examples");

async function main() {
  const client = new OpenAI({ apiKey });

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
}

main().catch((err) => {
  console.error(err?.response?.data || err);
  process.exit(1);
});


