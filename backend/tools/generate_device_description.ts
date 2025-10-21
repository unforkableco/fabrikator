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

const modelName = process.env.OPENAI_MODEL || "gpt-5";

// Minimal File polyfill for Node when missing (no top-level await)
if (!(globalThis as any).File) {
  try {
    const NodeBlob: any = (globalThis as any).Blob || (require("buffer").Blob);
    class NodeFile extends NodeBlob { name: string; lastModified: number; constructor(bits: any[], name: string, options: any = {}) { super(bits, options); this.name = name; this.lastModified = options.lastModified ?? Date.now(); } }
    (globalThis as any).File = NodeFile as any;
  } catch {}
}

async function main() {
  const outPath = path.resolve(repoRoot, "backend/tools/analysis_latest.txt");
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "Usage: ts-node tools/generate_device_description.ts \"<device summary>\"\nExample: ts-node tools/generate_device_description.ts \"desktop coffee cup warmer with ON LED, on/off button, USB-C power\""
    );
    process.exit(2);
  }
  const summary = args.join(" ").trim();
  const prompt = `Create a description of: ${summary}. It's important that your 
  concept takes into account 3D printability. You will describe the design (global shapes, 
  colors, materials), hardware components required and provide a detailed list of the 
  printable parts with a detailed description of their geometry. Start by describing the base and lid
  of the device as it's the starting point for the rest of the parts.`;

  const client = new OpenAI({ apiKey });
  const resp = await client.responses.create({
    model: modelName,
    input: [{ role: "user", content: prompt }],
  } as any);
  const text = (resp as any).output_text || "";
  if (!text) {
    console.error("No output from model");
    process.exit(1);
  }
  fs.writeFileSync(outPath, text, "utf-8");
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err?.response?.data || err);
  process.exit(1);
});


