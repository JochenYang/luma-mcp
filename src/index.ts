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
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import {
  loadConfig,
  getProviderApiKeyEnvName,
  type LumaConfig,
} from "./config.js";
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
  formatResultWithMeta,
  sanitizeErrorMessage,
  type CallMeta,
} from "./utils/helpers.js";
import {
  DEFAULT_BASE_VISION_PROMPT,
  PACKAGE_VERSION,
} from "./constants.js";
import {
  TASK_TYPES,
  resolveTaskType,
  shouldPreferTextForTask,
  shouldDisableMultiCropForTask,
  buildTaskPromptAddon,
  type TaskType,
} from "./task-types.js";

function readPackageVersion(): string {
  try {
    const pkgPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "package.json"
    );
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
    return pkg.version || PACKAGE_VERSION;
  } catch {
    return PACKAGE_VERSION;
  }
}

/**
 * Build full prompt by combining base vision prompt, user prompt, and optional task addon.
 */
function buildFullPrompt(
  userPrompt: string,
  basePrompt?: string,
  taskAddon?: string
): string {
  const parts: string[] = [];
  const trimmedBase = basePrompt?.trim();
  const trimmedUser = userPrompt.trim();
  const trimmedAddon = taskAddon?.trim();

  if (trimmedBase) {
    parts.push(trimmedBase);
  }
  if (trimmedUser) {
    parts.push(`用户任务描述：\n${trimmedUser}`);
  }
  if (trimmedAddon) {
    parts.push(trimmedAddon);
  }

  if (parts.length === 0) {
    return trimmedUser;
  }
  if (parts.length === 1 && !trimmedBase) {
    return trimmedUser;
  }
  return parts.join("\n\n");
}

/**
 * 根据配置与 task 决定输出单图还是多裁剪结果
 */
async function prepareImageInput(
  imageSource: string,
  preferText: boolean | undefined,
  config: LumaConfig,
  forceSingleImage: boolean
): Promise<{ imageData: string | string[]; imageHint?: string }> {
  const multiCrop = config.multiCrop && !forceSingleImage;

  if (multiCrop) {
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
  const version = readPackageVersion();
  logger.info("Initializing Luma MCP Server", { version });

  const config = loadConfig();
  const baseVisionPrompt =
    config.baseVisionPrompt ?? DEFAULT_BASE_VISION_PROMPT;

  if (!config.apiKey && config.provider !== "custom") {
    logger.warn(
      `API key not set for provider "${config.provider}". Set ${getProviderApiKeyEnvName(
        config.provider
      )}. Server will start, but image_understand will fail until the key is provided.`
    );
  }

  const CLIENT_REGISTRY: Record<
    string,
    (config: LumaConfig) => VisionClient
  > = {
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
  const visionClient = factory(config);

  logger.info("Vision client initialized", {
    provider: config.provider,
    model: visionClient.getModelName(),
    multiCrop: config.multiCrop,
    multiCropMaxTiles: config.multiCropMaxTiles,
    includeMeta: config.includeMeta,
  });

  const server = new McpServer(
    {
      name: "luma-mcp",
      version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const analyzeWithRetry = withRetry(
    async (preparedImageInput: string | string[], fullPrompt: string) => {
      return visionClient.analyzeImage(
        preparedImageInput,
        fullPrompt,
        config.enableThinking
      );
    },
    2,
    1000
  );

  server.tool(
    "image_understand",
    `图像理解工具（单一入口）：
- 何时调用：用户提到看图/截图/界面/报错/OCR/布局，或对话中出现图片附件并询问图片相关问题时，优先调用本工具。
- 图片来源：粘贴图路径、本地路径、HTTP(S) URL、Data URI。
- prompt：直接传入用户原始问题即可；服务端会拼接基础视觉协议与可选 task 指引。
- task_type（可选）：auto|general|ocr|ui|debug|describe。省略或 auto 时与旧版行为兼容（按 prompt 启发式）。`,
    {
      image_source: z
        .string()
        .describe(
          "要分析的图片来源：1) 客户端提供的粘贴路径 2) 本地文件路径 3) HTTP(S) URL 4) data:image/...;base64,...（PNG/JPG/WebP/GIF，最大约 10MB）"
        ),
      prompt: z
        .string()
        .min(1, "Prompt cannot be empty")
        .describe(
          "用户关于图片的原始问题或简短指令。服务器会补充系统级视觉提示词；无需手写长分析模板。"
        ),
      task_type: z
        .enum(TASK_TYPES)
        .optional()
        .describe(
          "可选任务类型。省略或 auto：兼容旧行为。ocr=文字提取；ui=界面结构；debug=报错/日志截图；describe=简短描述；general=通用分析。"
        ),
    },
    async (params) => {
      const started = Date.now();
      try {
        const prompt = params.prompt;
        const taskType = (params.task_type as TaskType | undefined) ?? "auto";
        const effectiveTask = resolveTaskType(taskType, prompt);
        const preferText = shouldPreferTextForTask(effectiveTask, prompt);
        const forceSingle = shouldDisableMultiCropForTask(effectiveTask);

        logger.info("Analyzing image", {
          source:
            params.image_source.length > 120
              ? `${params.image_source.slice(0, 40)}…(${params.image_source.length} chars)`
              : params.image_source,
          prompt,
          taskType: effectiveTask,
          preferText,
          forceSingle,
        });

        await validateImageSource(params.image_source);

        const preprocessStarted = Date.now();
        const preparedImageInput = await prepareImageInput(
          params.image_source,
          preferText ? true : undefined,
          config,
          forceSingle
        );
        const preprocessMs = Date.now() - preprocessStarted;

        const promptWithImageHint = preparedImageInput.imageHint
          ? `${prompt}\n\n补充说明：${preparedImageInput.imageHint}`
          : prompt;
        const fullPrompt = buildFullPrompt(
          promptWithImageHint,
          baseVisionPrompt,
          buildTaskPromptAddon(effectiveTask)
        );

        const apiStarted = Date.now();
        const result = await analyzeWithRetry(
          preparedImageInput.imageData,
          fullPrompt
        );
        const apiMs = Date.now() - apiStarted;

        const tileCount = Array.isArray(preparedImageInput.imageData)
          ? preparedImageInput.imageData.length
          : 1;

        const meta: CallMeta = {
          provider: config.provider,
          model: visionClient.getModelName(),
          taskType: effectiveTask,
          tileCount,
          multiCrop: config.multiCrop && !forceSingle && tileCount > 1,
          preferText,
          preprocessMs,
          apiMs,
          totalMs: Date.now() - started,
        };

        logger.info("Image analysis completed successfully", meta);

        const text = formatResultWithMeta(result, meta, config.includeMeta);
        return createSuccessResponse(text);
      } catch (error) {
        const raw =
          error instanceof Error ? error.message : "Unknown error";
        const message = sanitizeErrorMessage(raw);
        logger.error("Image analysis failed", { error: message });
        return createErrorResponse(message);
      }
    }
  );

  return server;
}

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
