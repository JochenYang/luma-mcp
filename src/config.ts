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
  customProvider?: CustomProviderConfig;
}

/**
 * 从环境变量加载配置
 */
export function loadConfig(): LumaConfig {
  // 确定模型提供商
  const provider = (process.env.MODEL_PROVIDER?.toLowerCase() ||
    "zhipu") as ModelProvider;

  // 根据提供商读取 API Key
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
  } else {
    apiKey = process.env.ZHIPU_API_KEY;
    defaultModel = "glm-4.6v";
  }

  // API Key will be validated when actually calling the vision model
  if (!apiKey) {
    apiKey = ""; // Set empty string to allow server to start
  }

  // 解析 custom provider 配置（仅在 provider === "custom" 时生效）
  let customProvider: CustomProviderConfig | undefined;
  if (provider === "custom") {
    const apiKey = process.env.CUSTOM_API_KEY;
    const baseUrl = process.env.CUSTOM_BASE_URL;
    const model = process.env.CUSTOM_MODEL_NAME;

    if (!apiKey) {
      throw new Error("CUSTOM_API_KEY is required when MODEL_PROVIDER=custom");
    }
    if (!baseUrl) {
      throw new Error("CUSTOM_BASE_URL is required when MODEL_PROVIDER=custom");
    }
    if (!model) {
      throw new Error("CUSTOM_MODEL_NAME is required when MODEL_PROVIDER=custom");
    }

    customProvider = {
      apiKey,
      baseUrl,
      model,
      authHeader:
        (process.env.CUSTOM_AUTH_HEADER as "bearer" | "x-api-key" | "custom") ||
        "bearer",
      authHeaderValue: process.env.CUSTOM_AUTH_HEADER_VALUE,
      path: process.env.CUSTOM_PATH || "/chat/completions",
      timeoutMs: parseInt(process.env.CUSTOM_TIMEOUT_MS || "60000", 10),
      thinkingMode:
        (process.env.CUSTOM_THINKING_MODE as
          | "disabled"
          | "openai"
          | "qwen_extra_body") || "disabled",
    };
  }

  return {
    provider,
    apiKey,
    model: process.env.MODEL_NAME || defaultModel,
    maxTokens: parseInt(process.env.MAX_TOKENS || "8192", 10),
    temperature: parseFloat(process.env.TEMPERATURE || "0.7"),
    topP: parseFloat(process.env.TOP_P || "0.95"),
    enableThinking: process.env.ENABLE_THINKING !== "false",
    multiCrop: process.env.MULTI_CROP !== "false",
    multiCropMaxTiles: parseInt(process.env.MULTI_CROP_MAX_TILES || "5", 10),
    baseVisionPrompt: process.env.BASE_VISION_PROMPT,
    customProvider,
  };
}
