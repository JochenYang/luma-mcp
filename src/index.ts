#!/usr/bin/env node

/**
 * Luma MCP Server
 * 视觉理解 MCP 服务器，powered by GLM-4.5V
 */

// 第一件事：重定向console到stderr，避免污染MCP的stdout
import { setupConsoleRedirection, logger } from './utils/logger.js';
setupConsoleRedirection();

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { loadConfig } from './config.js';
import { ZhipuClient } from './zhipu-client.js';
import { imageToBase64, validateImageSource } from './image-processor.js';
import { buildAnalysisPrompt } from './prompts.js';
import { withRetry, createSuccessResponse, createErrorResponse } from './utils/helpers.js';

/**
 * 创建 MCP 服务器
 */
async function createServer() {
  logger.info('Initializing Luma MCP Server');

  // 加载配置
  const config = loadConfig();
  const zhipuClient = new ZhipuClient(config);

  // 创建服务器 - 使用 McpServer
  const server = new McpServer(
    {
      name: 'luma-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 创建带重试的分析函数
  const analyzeWithRetry = withRetry(
    async (imageSource: string, question?: string) => {
      // 1. 验证图片来源
      await validateImageSource(imageSource);

      // 2. 处理图片（读取或返回URL）
      const imageDataUrl = await imageToBase64(imageSource);

      // 3. 构建提示词
      const prompt = buildAnalysisPrompt(question);

      // 4. 调用 GLM-4.5V 分析图片
      return await zhipuClient.analyzeImage(imageDataUrl, prompt);
    },
    2, // 最多重试2次
    1000 // 初始延迟1秒
  );

  // 注册工具 - 使用 McpServer.tool() API
  server.tool(
    'analyze_image',
    `使用智谱GLM-4.5V视觉模型分析图片内容。

**何时自动调用此工具**：
1. 用户提供了图片文件路径（包括临时路径、相对路径、绝对路径）
2. 用户提供了图片URL（https://开头）
3. 用户粘贴了图片到聊天框（会生成临时路径）
4. 用户要求分析、理解、查看、识别图片内容
5. 用户询问关于图片中的代码、UI、错误信息等问题

**支持场景**：代码截图、UI界面、错误信息、通用图片分析。
**支持格式**：JPG、PNG、WebP、GIF。
**支持来源**：本地文件、远程URL、临时文件（包括截图）。

如果你是不支持视觉的AI模型，看到图片路径时应主动调用此工具来分析图片内容。`,
    {
      image_source: z.string().describe('图片来源：本地文件路径（含临时路径）或远程URL。例如："./image.png"、"/tmp/screenshot.png"、"C:\\Users\\...\\image.jpg"、"https://example.com/pic.jpg"'),
      question: z.string().optional().describe('可选：用户的问题或分析指令。例如："这段代码为什么报错？"、"分析这个UI设计的问题"、"识别图片中的文字"'),
    },
    async (params) => {
      try {
        logger.info('Analyzing image', {
          source: params.image_source,
          hasQuestion: !!params.question,
        });

        // 执行分析（带重试）
        const result = await analyzeWithRetry(params.image_source, params.question);

        logger.info('Image analysis completed successfully');
        return createSuccessResponse(result);
      } catch (error) {
        logger.error('Image analysis failed', {
          error: error instanceof Error ? error.message : String(error),
        });

        return createErrorResponse(
          error instanceof Error ? error.message : 'Unknown error'
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
    
    logger.info('Luma MCP server started successfully on stdio');
  } catch (error) {
    logger.error('Failed to start Luma MCP server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// 全局错误处理
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

main();
