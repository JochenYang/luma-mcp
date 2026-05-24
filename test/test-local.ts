/**
 * Luma MCP 本地测试脚本
 * 直接测试图片分析功能，不需要MCP客户端
 */

import { loadConfig, type LumaConfig } from "../src/config.js";
import { HunyuanClient } from "../src/hunyuan-client.js";
import {
  imageToBase64WithOptions,
  prepareVisionImageInput,
  validateImageSource,
} from "../src/image-processor.js";
import { QwenClient } from "../src/qwen-client.js";
import { SiliconFlowClient } from "../src/siliconflow-client.js";
import type { VisionClient } from "../src/vision-client.js";
import { VolcengineClient } from "../src/volcengine-client.js";
import { ZhipuClient } from "../src/zhipu-client.js";
import { TEXT_HEAVY_PROMPT_PATTERN } from "../src/constants.js";

// 根据 provider 创建客户端
function createClient(config: LumaConfig): VisionClient {
  switch (config.provider) {
    case "siliconflow":
      return new SiliconFlowClient(config);
    case "qwen":
      return new QwenClient(config);
    case "volcengine":
      return new VolcengineClient(config);
    case "hunyuan":
      return new HunyuanClient(config);
    default:
      return new ZhipuClient(config);
  }
}

// 根据配置准备单图或多裁剪图片输入
async function prepareImageInput(
  imagePath: string,
  question: string,
  config: LumaConfig
) : Promise<{ imageData: string | string[]; imageHint?: string }> {
  const preferText = TEXT_HEAVY_PROMPT_PATTERN.test(question);

  if (config.multiCrop) {
    return prepareVisionImageInput(imagePath, {
      preferText,
      maxTiles: config.multiCropMaxTiles,
    });
  }

  return {
    imageData: await imageToBase64WithOptions(imagePath, { preferText }),
  };
}

async function testImageAnalysis(imagePath: string, question?: string) {
  console.log("\n==========================================");
  console.log("Testing Luma MCP image analysis");
  console.log("==========================================\n");

  try {
    // 1. 加载配置
    console.log("Loading config...");
    const config = loadConfig();
    console.log(
      `Config loaded: provider=${config.provider}, model=${config.model}, multiCrop=${config.multiCrop}`
    );

    // 2. 验证图片
    console.log("Validating image source...");
    await validateImageSource(imagePath);
    console.log(`Image validation passed: ${imagePath}`);

    // 3. 构建提示词
    const prompt = question || "请详细分析这张图片的内容";
    console.log(`Prompt: ${prompt}`);

    // 4. 处理图片
    console.log("Preparing image input...");
    const imageInput = await prepareImageInput(imagePath, prompt, config);
    console.log(
      `Image prepared: ${
        Array.isArray(imageInput.imageData)
          ? `${imageInput.imageData.length} variants`
          : "single image"
      }`
    );
    if (imageInput.imageHint) {
      console.log(`Image hint: ${imageInput.imageHint}`);
    }

    // 5. 创建客户端并调用 API
    const client = createClient(config);
    console.log(`Calling ${client.getModelName()}...`);
    const result = await client.analyzeImage(
      imageInput.imageData,
      imageInput.imageHint ? `${prompt}\n\n补充说明：${imageInput.imageHint}` : prompt,
      config.enableThinking
    );

    // 6. 显示结果
    console.log("\n==========================================");
    console.log("Analysis Result");
    console.log("==========================================\n");
    console.log(result);
    console.log("\n==========================================");
    console.log("Local test completed");
    console.log("==========================================\n");
  } catch (error) {
    console.error("\nLocal test failed:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// 解析命令行参数
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Usage:
  npm run test:local <image-path-or-url> [question]

Examples:
  npm run test:local ./test.png
  npm run test:local ./code-error.png "这段代码为什么报错？"
  npm run test:local https://example.com/image.jpg
`);
  process.exit(1);
}

const imagePath = args[0];
const question = args.slice(1).join(" ") || undefined;

void testImageAnalysis(imagePath, question);
