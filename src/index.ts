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
import { VolcengineClient } from "./volcengine-client.js";
import { imageToBase64, validateImageSource } from "./image-processor.js";
import {
	withRetry,
	createSuccessResponse,
	createErrorResponse,
} from "./utils/helpers.js";

/**
 * Default base vision prompt used when BASE_VISION_PROMPT is not set.
 * This acts like a lightweight system prompt for image understanding.
 *
 * 设计目标：
 * - 优先输出基于截图“可见事实”的结构/布局信息
 * - 尽量减少凭经验猜测实现方式、性能、无障碍等不可见细节
 */
const DEFAULT_BASE_VISION_PROMPT = [
	"你是一个专门帮助开发者理解截图内容的视觉结构分析助手。",
	"你的首要目标是：基于截图中可见的信息，准确还原页面/界面的结构、布局和主要元素，而不是主观做视觉审美评价或猜测底层实现。",
	"当用户提到“页面结构”、“页面架构”、“布局”、“组件树”、“还原界面”、“前端/客户端界面”等需求时，请遵循以下原则：",
	"1. 先进行【事实描述】，只陈述从截图中可以直接观察到的内容（区域划分、布局方式、组件/控件、大致层级关系等）；不要推测不可见的信息，例如具体实现技术（JS/CSS/Canvas）、运行性能、无障碍属性（aria-*）、隐藏的交互状态（hover/focus/点击后的效果等）。",
	"2. 描述布局时，尽量用有助于还原实现的方式组织信息，例如：顶部导航栏 / 左侧侧边栏 / 主内容区 / 底部栏、单栏/双栏/多栏、是否有固定头部等。",
	"3. 如用户没有明确要求“设计点评/优化建议”，可以完全不写或只给最多 1～2 条简短、标明为“通用建议”的内容，且要明确说明这些建议无法仅凭截图确认当前是否已经做到。",
	"4. 只在确实需要推测时才说明\"无法从截图确认\";对于可以直接观察到的内容,直接描述即可,无需添加任何免责声明。",
].join("\n");

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

  if (config.provider === "siliconflow") {
    visionClient = new SiliconFlowClient(config);
  } else if (config.provider === "qwen") {
    visionClient = new QwenClient(config);
  } else if (config.provider === "volcengine") {
    visionClient = new VolcengineClient(config);
  } else {
    visionClient = new ZhipuClient(config);
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
	
	      // 3. Build full prompt from base vision prompt and user prompt
	      const fullPrompt = buildFullPrompt(prompt, baseVisionPrompt);

      // 4. 调用视觉模型分析图片
      return await visionClient.analyzeImage(
        imageDataUrl,
        fullPrompt,
        config.enableThinking
      );
    },
    2, // 最多重试2次
    1000 // 初始延补1秒
  );

	  // 注册工具 - 使用 McpServer.tool() API
	  server.tool(
	    "analyze_image",
	    `图像分析工具：
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
