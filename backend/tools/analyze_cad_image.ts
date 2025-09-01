import fs from "fs";
import path from "path";
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

// Prefer a dedicated model for image analysis; falls back to OPENAI_MODEL if set
const modelName = process.env.OPENAI_ANALYZER_MODEL || process.env.OPENAI_MODEL || "gpt-5";

// Polyfill web APIs required by the OpenAI JS SDK under Node
(globalThis as any).fetch = (globalThis as any).fetch || (undiciFetch as any);
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

function fileToDataUri(p: string): string {
  const abs = path.resolve(p);
  const data = fs.readFileSync(abs);
  const b64 = data.toString("base64");
  const ext = path.extname(abs).toLowerCase().replace(".", "");
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : "application/octet-stream";
  return `data:${mime};base64,${b64}`;
}

function extractJson(text: string): any {
  // Try direct parse
  try { return JSON.parse(text); } catch {}
  const fence = /```json\n([\s\S]*?)```/i.exec(text);
  if (fence) {
    try { return JSON.parse(fence[1]); } catch {}
  }
  const brace = /\{[\s\S]*\}/.exec(text);
  if (brace) {
    try { return JSON.parse(brace[0]); } catch {}
  }
  throw new Error("Failed to parse JSON from model output");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: ts-node tools/analyze_cad_image.ts <image_montage> [--notes optional_text]");
    process.exit(2);
  }
  const noteIdx = args.indexOf("--notes");
  const note = noteIdx >= 0 ? args.slice(noteIdx + 1).join(" ") : "";
  const imgArgs = noteIdx >= 0 ? args.slice(0, noteIdx) : args;
  if (imgArgs.length !== 1) {
    console.error("Please provide exactly one image that contains all views (isometric/top/side) in a single montage.");
    process.exit(2);
  }
  const images = [{ type: "input_image", image_url: fileToDataUri(imgArgs[0]) }];

  const client = new OpenAI({ apiKey, fetch: undiciFetch as any });

  const developer = [
    "You are a CAD part decomposition assistant.",
    "Given a single montage image of a device (showing isometric/top/side views), produce a precise description of 3d printable parts required for its fabrication and assembly that you extrapolate from the image.",
    "Use ONLY shapes/operations available in our cadlib library",
    "Name only those functions and parameters that exist in cadlib; avoid freeform geometry or other libraries.",
    "All units millimeters.",
  ].join("\n");

  const userText = [
    "Analyze the device images and output the description of the parts and assembly. Be extremely detailed, someone using CAD software will be using your description to build the parts.",
    note ? `Notes: ${note}` : "",
  ].join("\n").trim();

  const input = [
    { role: "developer", content: developer },
    { role: "user", content: [ { type: "input_text", text: userText }, ...images ] as any },
  ];

  const resp = await client.responses.create({
    model: modelName,
    input,
    tools: [ { type: "file_search", vector_store_ids: [vsId] } as any ],
  } as any);

  const text: string = (resp as any).output_text || "";

  const outPath = path.resolve(repoRoot, "backend/tools/analysis_latest.txt");
  fs.writeFileSync(outPath, text, "utf-8");
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err?.response?.data || err);
  process.exit(1);
});


