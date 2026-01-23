#!/usr/bin/env node

/**
 * Luma MCP 服务器
 * 支持多提供商的通用视觉理解 MCP 服务器
 */

// 将 console 输出重定向到 stderr，避免污染 MCP stdout
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
import { HunyuanClient } from "./hunyuan-client.js";
import {
	imageToBase64Variants,
	validateImageSource,
} from "./image-processor.js";
import {
	withRetry,
	createSuccessResponse,
	createErrorResponse,
} from "./utils/helpers.js";

/**
 * 当未设置 BASE_VISION_PROMPT 时使用的默认视觉提示词
 * 作为轻量级系统提示词引导图像理解
 *
 * 设计目标：
 * - 基于截图可见事实优先输出结构/布局
 * - 避免猜测不可见细节（实现、性能等）
 */
const DEFAULT_BASE_VISION_PROMPT = [
	"你是一个专门帮助开发者理解截图内容的视觉理解助手。",
	"目标：基于截图中可见信息进行高保真理解与回答。",
	"当用户明确要求诊断、排错或推断时，可以基于可见证据做推断，并清晰标注不确定性与依据。",
	"优先顺序：事实描述 → 文字/代码/数据提取 → 结构/布局 → 回答用户问题。",
	"当用户描述过于简短时，自动执行全面提取并结构化输出。",
].join("\n");

/**
 * 拼接基础提示词与用户提示词
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

type PromptProfile = {
	isGenericShort: boolean;
	wantsText: boolean;
	wantsLayout: boolean;
	wantsDiagnosis: boolean;
	preferText: boolean;
	needsTwoPass: boolean;
	extractionOnly: boolean;
};

function getPromptProfile(userPrompt: string): PromptProfile {
	const normalized = userPrompt.trim();
	const isGenericShort =
		/^(分析|查看|识别|描述|理解|看一下|看看|分析一下|请分析|analyze|describe|view|check)/i.test(
			normalized
		) && normalized.length < 30;
	const wantsText = /(ocr|文字|文本|代码|日志|报错|堆栈|stack|trace|error|exception|表格|文档|识别)/i.test(
		normalized
	);
	const wantsLayout = /(布局|结构|组件|页面|界面|架构|ui|layout|component|wireframe)/i.test(
		normalized
	);
	const wantsDiagnosis = /(报错|错误|异常|崩溃|失败|error|exception|crash)/i.test(
		normalized
	);
	const extractionOnly = /(只|仅).*(文字|文本|ocr|识别)/i.test(normalized) &&
		!wantsLayout;
	const preferText = wantsText || wantsDiagnosis || isGenericShort;
	const needsTwoPass = isGenericShort || wantsDiagnosis || (wantsText && wantsLayout);

	return {
		isGenericShort,
		wantsText,
		wantsLayout,
		wantsDiagnosis,
		preferText,
		needsTwoPass,
		extractionOnly,
	};
}

function buildStagePrompt(
	stage: "extract" | "answer" | "single",
	userPrompt: string,
	basePrompt?: string,
	extracted?: string
): string {
	const parts: string[] = [];
	const trimmedBase = basePrompt?.trim();
	if (trimmedBase) {
		parts.push(trimmedBase);
	}

	if (stage === "extract") {
		parts.push(
			[
				"请进行高密度可见信息提取：",
				"1) 逐行完整提取所有可见文字、代码、日志、表格内容，保持原始顺序；",
				"2) 描述主要区域与布局层次（上/下/左/右/主次区域）；",
				"3) 列出关键UI元素/图表/按钮/状态标识；",
				"只基于可见内容，不做无依据推测。",
				"输出要求：使用清晰标题和列表，便于后续复用。",
			].join("\n")
		);
	}

	if (stage === "answer") {
		parts.push(
			[
				"请基于可见信息与已提取信息回答用户问题。",
				"如果需要推断，请明确标注推断并给出依据。",
				"输出结构：先简要结论，再给要点。",
			].join("\n")
		);
	}

	if (stage === "single") {
		parts.push(
			[
				"请基于可见信息回答用户问题。",
				"若用户描述模糊，先进行完整提取再回答。",
				"输出结构化。",
			].join("\n")
		);
	}

	if (extracted?.trim()) {
		parts.push(`已提取信息：\n${extracted.trim()}`);
	}

	if (userPrompt.trim()) {
		parts.push(`用户任务描述：\n${userPrompt.trim()}`);
	}

	return parts.join("\n\n");
}

async function extractWithVariants(
	variants: string[],
	prompt: string,
	visionClient: VisionClient,
	enableThinking: boolean
): Promise<string> {
	const results = await Promise.all(
		variants.map((variant) =>
			visionClient.analyzeImage(variant, prompt, enableThinking)
		)
	);

	return results
		.map((result, index) => `区域 ${index + 1}：\n${result}`)
		.join("\n\n");
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

  // 按配置选择模型客户端
  let visionClient: VisionClient;

  if (config.provider === "siliconflow") {
    visionClient = new SiliconFlowClient(config);
  } else if (config.provider === "qwen") {
    visionClient = new QwenClient(config);
  } else if (config.provider === "volcengine") {
    visionClient = new VolcengineClient(config);
  } else if (config.provider === "hunyuan") {
    visionClient = new HunyuanClient(config);
  } else {
    visionClient = new ZhipuClient(config);
  }

  logger.info("Vision client initialized", {
    provider: config.provider,
    model: visionClient.getModelName(),
  });

  // 使用 McpServer 创建服务器
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
      // 1. 校验图片来源
      await validateImageSource(imageSource);

      const profile = getPromptProfile(prompt);

	      const variants = await imageToBase64Variants(imageSource, {
	      	preferText: profile.preferText,
	      	maxTiles: config.multiCropMaxTiles,
	      });
	      const imageDataUrl = variants[0];
	      const useVariants =
	      	variants.length > 1 && profile.preferText && config.multiCropEnabled;

	      if (profile.needsTwoPass) {
	      	const extractPrompt = buildStagePrompt(
	      		"extract",
	      		profile.extractionOnly ? prompt : "",
	      		baseVisionPrompt
	      	);
	      	const extracted = useVariants
	      		? await extractWithVariants(
	      			variants,
	      			extractPrompt,
	      			visionClient,
	      			config.enableThinking
	      		)
	      		: await visionClient.analyzeImage(
	      			imageDataUrl,
	      			extractPrompt,
	      			config.enableThinking
	      		);

	      	if (profile.extractionOnly) {
	      		return extracted;
	      	}

	      	const answerPrompt = buildStagePrompt(
	      		"answer",
	      		prompt,
	      		baseVisionPrompt,
	      		extracted
	      	);

	      	return await visionClient.analyzeImage(
	      		imageDataUrl,
	      		answerPrompt,
	      		config.enableThinking
	      	);
	      }

	      if (useVariants) {
	      	const extractPrompt = buildStagePrompt(
	      		"extract",
	      		"",
	      		baseVisionPrompt
	      	);
	      	const extracted = await extractWithVariants(
	      		variants,
	      		extractPrompt,
	      		visionClient,
	      		config.enableThinking
	      	);
	      	const singlePrompt = buildStagePrompt(
	      		"single",
	      		prompt,
	      		baseVisionPrompt,
	      		extracted
	      	);

	      	return await visionClient.analyzeImage(
	      		imageDataUrl,
	      		singlePrompt,
	      		config.enableThinking
	      	);
	      }

	      const singlePrompt = buildStagePrompt(
	      	"single",
	      	prompt,
	      	baseVisionPrompt
	      );

      return await visionClient.analyzeImage(
        imageDataUrl,
        singlePrompt,
        config.enableThinking
      );
    },
    2, // 最大重试次数: 2
    1000 // 初始退避: 1s
  );

	  // 使用 McpServer.tool() 注册工具
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
        // Prompt 已根据用户请求准备
        const prompt = params.prompt;

        logger.info("Analyzing image", {
          source: params.image_source,
          prompt,
        });

        // 使用重试执行分析
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
 * 主入口
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
