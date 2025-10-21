#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const pipeline_1 = require("./pipeline");
function loadEnvironment() {
    const rootEnvPath = path.resolve(__dirname, '../../../../.env');
    const backendEnvPath = path.resolve(__dirname, '../../../.env');
    console.log(`🔍 Looking for environment files...`);
    console.log(`   Root .env: ${rootEnvPath}`);
    console.log(`   Backend .env: ${backendEnvPath}`);
    const envPaths = [rootEnvPath, backendEnvPath];
    let envLoaded = false;
    for (const envPath of envPaths) {
        try {
            const fs = require('fs');
            if (fs.existsSync(envPath)) {
                dotenv.config({ path: envPath });
                console.log(`✅ Loaded environment from: ${envPath}`);
                envLoaded = true;
                break;
            }
        }
        catch (error) {
            console.log(`❌ Could not load ${envPath}:`, error.message);
        }
    }
    if (!envLoaded) {
        console.log(`⚠️  No .env file found. Checking environment variables...`);
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
        console.log(`✅ OPENAI_API_KEY found (${apiKey.slice(0, 8)}...)`);
    }
    else {
        console.error('❌ OPENAI_API_KEY not found in environment');
    }
}
async function main() {
    loadEnvironment();
    const imagePath = process.argv[2];
    if (!imagePath) {
        console.error('Usage: node dist/index.js <absolute_image_path>');
        process.exit(2);
    }
    const backendRoot = process.cwd();
    const pipeline = new pipeline_1.DescribeImagePipeline(backendRoot);
    await pipeline.processImage(imagePath);
}
if (require.main === module) {
    main().catch((error) => {
        console.error('Fatal error:', error?.message || error);
        process.exit(1);
    });
}
