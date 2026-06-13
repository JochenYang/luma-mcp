#!/usr/bin/env node

/**
 * Luma MCP Server
 * 通用图像理解 MCP 服务器，支持多家视觉模型提供商
 */

// 第一件事：重定向console到stderr，避免污染MCP的stdout
import { setupConsoleRedirection, logger } from "./utils/logger.js";
setupConsoleRedirection();

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { loadConfig } from "./config.js";
import type { LumaConfig } from "./config.js";
import type { VisionClient } from "./vision-client.js";
import { ZhipuClient } from "./zhipu-client.js";
import { SiliconFlowClient } from "./siliconflow-client.js";
import { QwenClient } from "./qwen-client.js";
import { VolcengineClient } from "./volcengine-client.js";
import { HunyuanClient } from "./hunyuan-client.js";
import { CustomClient } from "./custom-client.js";
import {
  imageToBase64WithOptions,
  prepareVisionImageInput,
  validateImageSource,
} from "./image-processor.js";
import {
  withRetry,
  createSuccessResponse,
  createErrorResponse,
} from "./utils/helpers.js";
import {
  DEFAULT_BASE_VISION_PROMPT,
  TEXT_HEAVY_PROMPT_PATTERN,
} from "./constants.js";

/**
 * Build full prompt by combining base vision prompt and user prompt.
 */
function buildFullPrompt(userPrompt: string, basePrompt?: string): string {
  if (!basePrompt) {
    return userPrompt;
  }

  const trimmedBase = basePrompt.trim();
  const trimmedUser = userPrompt.trim();

  if (!trimmedBase) {
    return trimmedUser;
  }

  return `${trimmedBase}\n\n用户任务描述：\n${trimmedUser}`;
}

/**
 * 根据 prompt 判断是否属于文本密集场景
 * 用于代码截图、OCR、UI 长图等场景的保真处理
 */
function shouldPreferTextProcessing(prompt: string): boolean {
  return TEXT_HEAVY_PROMPT_PATTERN.test(prompt);
}

/**
 * 根据配置决定输出单图还是多裁剪结果
 */
async function prepareImageInput(
  imageSource: string,
  prompt: string,
  config: ReturnType<typeof loadConfig>
) : Promise<{ imageData: string | string[]; imageHint?: string }> {
  const preferText = shouldPreferTextProcessing(prompt) ? true : undefined;

  if (config.multiCrop) {
    return prepareVisionImageInput(imageSource, {
      preferText,
      maxTiles: config.multiCropMaxTiles,
    });
  }

  return {
    imageData: await imageToBase64WithOptions(imageSource, { preferText }),
  };
}

/**
 * 创建 MCP 服务器
 */
async function createServer() {
  logger.info("Initializing Luma MCP Server");

  // 加载配置
  const config = loadConfig();
  const baseVisionPrompt =
    config.baseVisionPrompt ?? DEFAULT_BASE_VISION_PROMPT;

  // 根据配置选择模型客户端
  let visionClient: VisionClient;

  // Provider registry 模式：新增 provider 只需往 Map 加一行
  const CLIENT_REGISTRY: Record<string, (config: LumaConfig) => VisionClient> = {
    zhipu: (c) => new ZhipuClient(c),
    siliconflow: (c) => new SiliconFlowClient(c),
    qwen: (c) => new QwenClient(c),
    volcengine: (c) => new VolcengineClient(c),
    hunyuan: (c) => new HunyuanClient(c),
    custom: (c) => new CustomClient(c),
  };

  const factory = CLIENT_REGISTRY[config.provider];
  if (!factory) {
    throw new Error(
      `Unsupported MODEL_PROVIDER: ${config.provider}. Supported: ${Object.keys(CLIENT_REGISTRY).join(", ")}`
    );
  }
  visionClient = factory(config);

  logger.info("Vision client initialized", {
    provider: config.provider,
    model: visionClient.getModelName(),
    multiCrop: config.multiCrop,
    multiCropMaxTiles: config.multiCropMaxTiles,
  });

  // 创建服务器 - 使用 McpServer
  const server = new McpServer(
    {
      name: "luma-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 只对模型调用做重试，避免远程下载和图片裁剪被重复执行
  const analyzeWithRetry = withRetry(
    async (preparedImageInput: string | string[], fullPrompt: string) => {
      return visionClient.analyzeImage(
        preparedImageInput,
        fullPrompt,
        config.enableThinking
      );
    },
    2, // 最多重试2次
    1000 // 初始延补1秒
  );

  // 注册工具 - 使用 McpServer.tool() API
  server.tool(
    "image_understand",
    `图像理解工具：
- 何时调用：当用户提到“看图、看截图、看看这张图片/界面/页面/报错/架构/布局/组件结构/页面结构”等需求，或者在对话中出现图片附件并询问与图片内容相关的问题（包括 UI/前端界面结构、代码截图、日志/报错截图、文档截图、表单、表格等），都应优先调用本工具，而不是只用文本推理。
- 图片来源：1) 用户粘贴图片时直接调用，无需手动指定路径 2) 指定本地图片路径，如 ./screenshot.png 3) 指定图片 URL，如 https://example.com/image.png。
- 提示词（prompt）约定：
  - **不要**在调用本工具前自己构造一大段复杂分析提示词；
  - 直接把“用户关于图片的原始问题/指令”作为 prompt 传入即可，例如：
    - “这张图是什么界面？整体结构是什么样的？”
    - “帮我从前端实现角度拆解这个页面的布局和组件结构”；
  - Luma 会在服务器内部自动拼接系统级视觉说明和分析模板，调用底层视觉模型完成完整理解；
  - 你只需要确保 prompt 准确表达用户对这张图想了解的内容，无需重复描述图片细节或编写长篇提示词。`,
    {
      image_source: z
        .string()
        .describe(
          "要分析的图片来源：支持三种方式 1) 用户粘贴图片时由Claude Desktop自动提供路径 2) 本地文件路径，如./screenshot.png 3) HTTP(S)图片URL，如https://example.com/image.png（支持 PNG、JPG、JPEG、WebP、GIF，最大 10MB）"
        ),
      prompt: z
        .string()
        .min(1, "Prompt cannot be empty")
        .describe(
          "用户关于图片的原始问题或简短指令，例如“这张图是什么界面？”、“帮我分析这个页面的结构和布局”。服务器会在内部补充系统级视觉提示词并构造完整分析指令。"
        ),
    },
    async (params) => {
      try {
        // AI应该已经根据用户问题生成了合适的prompt
        const prompt = params.prompt;

        logger.info("Analyzing image", {
          source: params.image_source,
          prompt,
          preferText: shouldPreferTextProcessing(prompt),
        });

        // 1. 验证图片来源
        await validateImageSource(params.image_source);

        // 2. 处理图片（单图或多裁剪）
        const preparedImageInput = await prepareImageInput(
          params.image_source,
          prompt,
          config
        );

        // 3. Build full prompt from base vision prompt and user prompt
        const promptWithImageHint = preparedImageInput.imageHint
          ? `${prompt}\n\n补充说明：${preparedImageInput.imageHint}`
          : prompt;
        const fullPrompt = buildFullPrompt(
          promptWithImageHint,
          baseVisionPrompt
        );

        // 4. 只重试模型调用，避免重复处理大图
        const result = await analyzeWithRetry(
          preparedImageInput.imageData,
          fullPrompt
        );

        logger.info("Image analysis completed successfully");
        return createSuccessResponse(result);
      } catch (error) {
        logger.error("Image analysis failed", {
          error: error instanceof Error ? error.message : String(error),
        });

        return createErrorResponse(
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }
  );

  return server;
}

/**
 * 主函数
 */
async function main() {
  try {
    const server = await createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info("Luma MCP server started successfully on stdio");
  } catch (error) {
    logger.error("Failed to start Luma MCP server", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// 全局错误处理
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
  process.exit(1);
});

process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down gracefully");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

main();
