/**
 * Qwen 客户端测试
 * 测试阿里云通义千问VL视觉理解
 */

import { loadConfig } from "../src/config.js";
import {
  imageToBase64Variants,
  imageToBase64WithOptions,
} from "../src/image-processor.js";
import { QwenClient } from "../src/qwen-client.js";
import { TEXT_HEAVY_PROMPT_PATTERN } from "../src/constants.js";

// 根据 prompt 选择单图或多裁剪输入
async function prepareImageInput(imagePath: string, prompt: string) {
  const config = loadConfig();
  const preferText = TEXT_HEAVY_PROMPT_PATTERN.test(prompt);

  if (config.multiCrop) {
    const variants = await imageToBase64Variants(imagePath, {
      preferText,
      maxTiles: config.multiCropMaxTiles,
    });
    return variants.length === 1 ? variants[0] : variants;
  }

  return imageToBase64WithOptions(imagePath, { preferText });
}

async function testQwen() {
  // 获取图片路径
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error("Error: please provide an image path");
    console.log("Usage: tsx test/test-qwen.ts <image-path>");
    process.exit(1);
  }

  const config = loadConfig();
  config.provider = "qwen";
  if (!config.apiKey) {
    config.apiKey = process.env.DASHSCOPE_API_KEY || "";
  }
  if (!config.model) {
    config.model = "qwen3-vl-flash";
  }

  if (!config.apiKey) {
    console.error("Error: DASHSCOPE_API_KEY is required");
    process.exit(1);
  }

  const client = new QwenClient(config);
  console.log(`Testing ${client.getModelName()}\n`);

  const prompts = [
    "请详细分析这张图片的内容",
    "请详细分析这张图片的内容，包括所有细节",
    "识别图片中的所有文字",
  ];

  for (const prompt of prompts) {
    console.log(`Prompt: ${prompt}`);
    const imageInput = await prepareImageInput(imagePath, prompt);
    const result = await client.analyzeImage(
      imageInput,
      prompt,
      config.enableThinking
    );
    console.log(result);
    console.log("\n----------------------------------------\n");
  }
}

void testQwen().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
