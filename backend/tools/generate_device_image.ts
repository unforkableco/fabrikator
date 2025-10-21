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

const modelName = process.env.OPENAI_IMAGE_MODEL || "dall-e-3";

// Minimal File polyfill for Node when missing
if (!(globalThis as any).File) {
  try {
    const NodeBlob: any = (globalThis as any).Blob || (require("buffer").Blob);
    class NodeFile extends NodeBlob { name: string; lastModified: number; constructor(bits: any[], name: string, options: any = {}) { super(bits, options); this.name = name; this.lastModified = options.lastModified ?? Date.now(); } }
    (globalThis as any).File = NodeFile as any;
  } catch {}
}

async function main() {
  const specPath = process.argv[2];
  if (!specPath || !fs.existsSync(specPath)) {
    console.error("Usage: ts-node tools/generate_device_image.ts <analysis_file>");
    process.exit(2);
  }
  const prompt = "Create a 3‑panel image, vertically split into equal thirds:" +
  "1) Isometric (30°/30°)" +
  "2) Left side orthographic" +
  "3) Top orthographic" +
  "Render the device in the spec fully assembled per the spec. Include all parts (no exploded view, nothing hidden). White background, neutral material, no text/logos/UI." + 
  "Center each panel; equal margins; consistent scale across panels; no cropping. Clean CAD style: crisp edges, thin black outlines, minimal ambient occlusion, no heavy shadows." + 
  "Ensure small features (ports, buttons, holes) are clearly visible. Spec:";
  const spec = fs.readFileSync(specPath, "utf-8");

  const client = new OpenAI({ apiKey });
  const resp = await client.images.generate({
    model: modelName as any,
    prompt: `${prompt}\n\n${spec}`,
    size: "1024x1024",
  } as any);
  const b64 = (resp as any).data?.[0]?.b64_json;
  if (!b64) {
    console.error("No image returned by model");
    process.exit(1);
  }
  const outPng = path.resolve(repoRoot, "backend/tools/image.png");
  fs.writeFileSync(outPng, Buffer.from(b64, "base64"));
  console.log(`Wrote ${outPng}`);
}

main().catch((err) => {
  console.error(err?.response?.data || err);
  process.exit(1);
});


