import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import dotenv from "dotenv";
import OpenAI from "openai";
import { fetch as undiciFetch, FormData as UndiciFormData, Headers as UndiciHeaders, Request as UndiciRequest, Response as UndiciResponse } from "undici";
import { Blob as NodeBlob } from "buffer";

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

const vsId = process.env.CADLIB_VECTOR_STORE_ID || "";
if (!vsId) {
  console.error("CADLIB_VECTOR_STORE_ID not set (check backend/.env)");
  process.exit(2);
}

const modelName = process.env.OPENAI_MODEL || "gpt-4o";

// Read spec from argv[2] or stdin
async function readSpec(): Promise<string> {
  const argPath = process.argv[2];
  if (argPath && fs.existsSync(argPath)) {
    return fs.readFileSync(argPath, "utf-8");
  }
  return await new Promise<string>((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

async function main() {
  const spec = (await readSpec()).trim();
  if (!spec) {
    console.error("Empty spec provided");
    process.exit(2);
  }

  // Polyfill web APIs required by the OpenAI JS SDK under Node
  (globalThis as any).fetch = (globalThis as any).fetch || (undiciFetch as any);
  // Minimal File polyfill if missing
  if (!(globalThis as any).File) {
    const BaseBlob: any = (globalThis as any).Blob || NodeBlob;
    class NodeFile extends BaseBlob {
      name: string;
      lastModified: number;
      constructor(bits: any[], name: string, options: any = {}) {
        super(bits, options);
        this.name = name;
        this.lastModified = options.lastModified ?? Date.now();
      }
    }
    (globalThis as any).File = NodeFile as any;
  }
  (globalThis as any).FormData = (globalThis as any).FormData || (UndiciFormData as any);
  (globalThis as any).Headers = (globalThis as any).Headers || (UndiciHeaders as any);
  (globalThis as any).Request = (globalThis as any).Request || (UndiciRequest as any);
  (globalThis as any).Response = (globalThis as any).Response || (UndiciResponse as any);

  const client = new OpenAI({ apiKey, fetch: undiciFetch as any });

  // Responses API with file_search tool + vector store attachment
  const baseInstructions =
    "Generate Python that ONLY uses the `cadlib` API as documented. " +
    "Do not import CadQuery or any geometry libraries directly. " +
    "Use millimeters. Return a single complete Python script. " +
    "Do NOT export or write files; do NOT call cadquery.exporters.export. " +
    "Provide geometry by defining build() that returns a dictionary of name->solid. " +
    "No prints/logging; no prose—code only. Do not call cadquery directly, only use cadlib.";

  async function callOnce(extraDevHint?: string): Promise<string> {
    const dev = baseInstructions + (extraDevHint ? (" " + extraDevHint) : "");
    const resp = await client.responses.create({
      model: modelName,
      input: [
        { role: "developer", content: dev },
        { role: "user", content: spec },
      ],
      tools: [
        {
          type: "file_search",
          vector_store_ids: [vsId],
        } as any,
      ],
    } as any);
    return (resp as any).output_text || "";
  }

  let raw: string = await callOnce(
    "Return ONLY code with no prose. Wrap output in ```python fenced block. Start with: from cadlib import *."
  );
  // Extract Python code from possible fenced blocks; prefer blocks containing cadlib usage
  function extractCode(text: string): string {
    const fenceRe = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
    let best = "";
    let m: RegExpExecArray | null;
    while ((m = fenceRe.exec(text))) {
      const lang = (m[1] || "").toLowerCase();
      const body = m[2];
      if (!best) best = body;
      if (lang === "python") {
        if (/from\s+cadlib|import\s+cadlib/.test(body)) return body;
        best = body; // prefer python even without cadlib
      }
    }
    if (best) return best;
    // No fences; attempt to slice from first cadlib import
    const idx = text.search(/from\s+cadlib|import\s+cadlib|import\s+cadquery\s+as\s+cq/);
    if (idx >= 0) return text.slice(idx);
    return text.trim();
  }

  let code: string = extractCode(raw);
  if (!/(from\s+cadlib|import\s+cadlib)/.test(code)) {
    raw = await callOnce(
      "Your previous output contained explanation. Now respond with ONLY a Python code block fenced as ```python ...```. Do not add any commentary. Start with: from cadlib import *."
    );
    code = extractCode(raw);
  }

  if (!code) {
    console.error("No code returned by model");
    process.exit(1);
  }

  const outPy = path.resolve(repoRoot, "generated.py");
  fs.writeFileSync(outPy, code, "utf-8");
  console.log(`Wrote ${outPy}`);

  // Execute via guarded Python runner
  const runner = path.resolve(repoRoot, "backend/tools/run_generated_guarded.py");
  // Prefer repo venv Python if present
  const venvPy = path.resolve(repoRoot, ".venv/bin/python");
  const py = process.env.PYTHON || (fs.existsSync(venvPy) ? venvPy : "python");
  const run = spawnSync(py, [runner, outPy], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
  process.exit(run.status === null ? 1 : run.status);
}

main().catch((err) => {
  console.error(err?.response?.data || err);
  process.exit(1);
});


