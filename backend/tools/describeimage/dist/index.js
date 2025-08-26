#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pipeline_1 = require("./pipeline");
async function main() {
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
