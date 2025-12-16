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
import type { VisionClient } from "./vision-client.js";
import { ZhipuClient } from "./zhipu-client.js";
import { SiliconFlowClient } from "./siliconflow-client.js";
import { QwenClient } from "./qwen-client.js";
import { imageToBase64, validateImageSource } from "./image-processor.js";
import {
  withRetry,
  createSuccessResponse,
  createErrorResponse,
} from "./utils/helpers.js";

/**
 * 创建 MCP 服务器
 */
async function createServer() {
  logger.info("Initializing Luma MCP Server");

  // 加载配置
  const config = loadConfig();

  // 根据配置选择模型客户端
  let visionClient: VisionClient;

  if (config.provider === "siliconflow") {
    visionClient = new SiliconFlowClient(
      config.apiKey,
      config.model,
      config.maxTokens,
      config.temperature
    );
  } else if (config.provider === "qwen") {
    visionClient = new QwenClient(
      config.apiKey,
      config.model,
      config.maxTokens,
      config.temperature
    );
  } else {
    visionClient = new ZhipuClient(
      config.apiKey,
      config.model,
      config.maxTokens,
      config.temperature,
      config.topP
    );
  }

  logger.info("Vision client initialized", {
    provider: config.provider,
    model: visionClient.getModelName(),
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

  // 创建带重试的分析函数
  const analyzeWithRetry = withRetry(
    async (imageSource: string, prompt: string) => {
      // 1. 验证图片来源
      await validateImageSource(imageSource);

      // 2. 处理图片（读取或返回URL）
      const imageDataUrl = await imageToBase64(imageSource);

      // 3. 直接使用原始提示词（不进行包装或增强）
      const fullPrompt = prompt;

      // 4. 调用视觉模型分析图片
      return await visionClient.analyzeImage(imageDataUrl, fullPrompt);
    },
    2, // 最多重试2次
    1000 // 初始延补1秒
  );

  // 注册工具 - 使用 McpServer.tool() API
  server.tool(
    "analyze_image",
    "图像分析工具：支持三种使用方式：1) 用户粘贴图片时直接调用，无需手动指定路径 2) 指定本地图片路径，如./screenshot.png 3) 指定图片URL，如https://example.com/image.png。AI应根据用户问题生成专业的分析提示词（如用户问'网站布局有什么问题'，应生成'请详细分析这个网站界面的布局问题，包括视觉层次、对齐方式、间距、响应式设计等方面的问题'），然后传递提示词和图片进行调用。",
    {
      image_source: z
        .string()
        .describe(
          "要分析的图片来源：支持三种方式 1) 用户粘贴图片时由Claude Desktop自动提供路径 2) 本地文件路径，如./screenshot.png 3) HTTP(S)图片URL，如https://example.com/image.png（支持 PNG、JPG、JPEG、WebP、GIF，最大 10MB）"
        ),
      prompt: z
        .string()
        .describe(
          '分析提示词：AI根据用户问题生成的专业分析提示词。应该包含具体的分析要求和期望的输出格式。'
        ),
    },
    async (params) => {
      try {
        // AI应该已经根据用户问题生成了合适的prompt
        const prompt = params.prompt;

        logger.info("Analyzing image", {
          source: params.image_source,
          prompt,
        });

        // 执行分析（带重试）
        const result = await analyzeWithRetry(params.image_source, prompt);

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
