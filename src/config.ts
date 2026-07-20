/**
 * 配置模块
 * 从环境变量加载配置
 */

export type ModelProvider =
  | "zhipu"
  | "siliconflow"
  | "qwen"
  | "volcengine"
  | "hunyuan"
  | "custom";

export const SUPPORTED_PROVIDERS: ModelProvider[] = [
  "zhipu",
  "siliconflow",
  "qwen",
  "volcengine",
  "hunyuan",
  "custom",
];

export interface CustomProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  authHeader: "bearer" | "x-api-key" | "custom";
  authHeaderValue?: string;
  path: string;
  timeoutMs: number;
  thinkingMode: "disabled" | "openai" | "qwen_extra_body";
}

export interface LumaConfig {
  provider: ModelProvider;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  enableThinking: boolean;
  multiCrop: boolean;
  multiCropMaxTiles: number;
  baseVisionPrompt?: string;
  /** Append preprocess/API timing metadata to tool results */
  includeMeta: boolean;
  customProvider?: CustomProviderConfig;
}

function clampNumber(
  value: number,
  min: number,
  max: number,
  fallback: number
): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * 从环境变量加载配置（保持既有 env 名兼容）
 */
export function loadConfig(): LumaConfig {
  const rawProvider = (
    process.env.MODEL_PROVIDER?.toLowerCase() || "zhipu"
  ).trim();

  if (
    rawProvider &&
    !SUPPORTED_PROVIDERS.includes(rawProvider as ModelProvider)
  ) {
    throw new Error(
      `Unsupported MODEL_PROVIDER: ${rawProvider}. Supported: ${SUPPORTED_PROVIDERS.join(", ")}`
    );
  }

  const provider = rawProvider as ModelProvider;

  let apiKey: string | undefined;
  let defaultModel: string;

  if (provider === "siliconflow") {
    apiKey = process.env.SILICONFLOW_API_KEY;
    defaultModel = "deepseek-ai/DeepSeek-OCR";
  } else if (provider === "qwen") {
    apiKey = process.env.DASHSCOPE_API_KEY;
    defaultModel = "qwen3-vl-flash";
  } else if (provider === "volcengine") {
    apiKey = process.env.VOLCENGINE_API_KEY;
    defaultModel = "doubao-seed-1-6-flash-250828";
  } else if (provider === "hunyuan") {
    apiKey = process.env.HUNYUAN_API_KEY;
    defaultModel = "hunyuan-t1-vision-20250916";
  } else if (provider === "custom") {
    apiKey = process.env.CUSTOM_API_KEY;
    defaultModel = process.env.CUSTOM_MODEL_NAME || "custom-model";
  } else {
    apiKey = process.env.ZHIPU_API_KEY;
    defaultModel = "glm-4.6v";
  }

  // Allow server start without key; first vision call will fail clearly
  if (!apiKey) {
    apiKey = "";
  }

  let customProvider: CustomProviderConfig | undefined;
  if (provider === "custom") {
    const customApiKey = process.env.CUSTOM_API_KEY;
    const baseUrl = process.env.CUSTOM_BASE_URL;
    const model = process.env.CUSTOM_MODEL_NAME;

    if (!customApiKey) {
      throw new Error("CUSTOM_API_KEY is required when MODEL_PROVIDER=custom");
    }
    if (!baseUrl) {
      throw new Error("CUSTOM_BASE_URL is required when MODEL_PROVIDER=custom");
    }
    if (!model) {
      throw new Error("CUSTOM_MODEL_NAME is required when MODEL_PROVIDER=custom");
    }

    const authHeaderRaw = (
      process.env.CUSTOM_AUTH_HEADER || "bearer"
    ).toLowerCase();
    if (!["bearer", "x-api-key", "custom"].includes(authHeaderRaw)) {
      throw new Error(
        `Invalid CUSTOM_AUTH_HEADER: ${authHeaderRaw}. Supported: bearer, x-api-key, custom`
      );
    }

    const thinkingRaw = (
      process.env.CUSTOM_THINKING_MODE || "disabled"
    ).toLowerCase();
    if (!["disabled", "openai", "qwen_extra_body"].includes(thinkingRaw)) {
      throw new Error(
        `Invalid CUSTOM_THINKING_MODE: ${thinkingRaw}. Supported: disabled, openai, qwen_extra_body`
      );
    }

    customProvider = {
      apiKey: customApiKey,
      baseUrl,
      model,
      authHeader: authHeaderRaw as "bearer" | "x-api-key" | "custom",
      authHeaderValue: process.env.CUSTOM_AUTH_HEADER_VALUE,
      path: process.env.CUSTOM_PATH || "/chat/completions",
      timeoutMs: clampNumber(
        parseInt(process.env.CUSTOM_TIMEOUT_MS || "60000", 10),
        1000,
        600000,
        60000
      ),
      thinkingMode: thinkingRaw as "disabled" | "openai" | "qwen_extra_body",
    };
  }

  const maxTokens = clampNumber(
    parseInt(process.env.MAX_TOKENS || "8192", 10),
    1,
    200000,
    8192
  );
  const temperature = clampNumber(
    parseFloat(process.env.TEMPERATURE || "0.7"),
    0,
    2,
    0.7
  );
  const topP = clampNumber(parseFloat(process.env.TOP_P || "0.95"), 0, 1, 0.95);
  const multiCropMaxTiles = clampNumber(
    parseInt(process.env.MULTI_CROP_MAX_TILES || "5", 10),
    1,
    16,
    5
  );

  // INCLUDE_META / LUMA_DEBUG both enable response metadata (new, optional)
  const includeMeta =
    process.env.INCLUDE_META === "true" ||
    process.env.LUMA_DEBUG === "1" ||
    process.env.LUMA_DEBUG === "true";

  return {
    provider,
    apiKey,
    model: process.env.MODEL_NAME || defaultModel,
    maxTokens,
    temperature,
    topP,
    enableThinking: process.env.ENABLE_THINKING !== "false",
    multiCrop: process.env.MULTI_CROP !== "false",
    multiCropMaxTiles,
    baseVisionPrompt: process.env.BASE_VISION_PROMPT,
    includeMeta,
    customProvider,
  };
}

/**
 * Provider env key name for user-facing warnings
 */
export function getProviderApiKeyEnvName(provider: ModelProvider): string {
  switch (provider) {
    case "siliconflow":
      return "SILICONFLOW_API_KEY";
    case "qwen":
      return "DASHSCOPE_API_KEY";
    case "volcengine":
      return "VOLCENGINE_API_KEY";
    case "hunyuan":
      return "HUNYUAN_API_KEY";
    case "custom":
      return "CUSTOM_API_KEY";
    default:
      return "ZHIPU_API_KEY";
  }
}
