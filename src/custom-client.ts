/**
 * 通用 OpenAI 兼容 Provider 客户端
 * 支持任意 OpenAI 兼容端点（OpenAI、OpenRouter、Together AI、Anthropic 代理等）
 *
 * 配置示例（.env）：
 * MODEL_PROVIDER=custom
 * CUSTOM_API_KEY=sk-your-key
 * CUSTOM_BASE_URL=https://your-endpoint.com/v1
 * CUSTOM_MODEL_NAME=your-model-name
 * CUSTOM_AUTH_HEADER=bearer           # bearer | x-api-key | custom
 * CUSTOM_PATH=/chat/completions        # 默认 /chat/completions
 * CUSTOM_TIMEOUT_MS=60000              # 默认 60s
 * CUSTOM_THINKING_MODE=disabled        # disabled | openai | qwen_extra_body
 */

import axios, { type AxiosInstance } from "axios";
import type { LumaConfig, CustomProviderConfig } from "./config.js";
import { buildImageContent, type VisionClient } from "./vision-client.js";
import { logger } from "./utils/logger.js";

interface CustomRequestBody {
  model: string;
  messages: Array<{
    role: string;
    content: Array<{
      type: string;
      text?: string;
      image_url?: { url: string };
    }>;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  enable_thinking?: boolean;
  extra_body?: { enable_thinking?: boolean };
}

interface CustomResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    total_tokens?: number;
  };
}

export class CustomClient implements VisionClient {
  private client: AxiosInstance;
  private cfg: CustomProviderConfig;
  private config: LumaConfig;

  constructor(config: LumaConfig) {
    if (!config.customProvider) {
      throw new Error(
        "CustomClient requires customProvider configuration. Set MODEL_PROVIDER=custom and provide CUSTOM_* environment variables."
      );
    }
    this.config = config;
    this.cfg = config.customProvider;

    const headers = this.buildHeaders();

    this.client = axios.create({
      baseURL: this.cfg.baseUrl.replace(/\/+$/, ""),
      timeout: this.cfg.timeoutMs,
      headers,
    });
  }

  /**
   * 构造鉴权头
   * - bearer: Authorization: Bearer <key>
   * - x-api-key: x-api-key: <key>
   * - custom: 自定义 Header，支持 {{key}} 模板替换
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.cfg.authHeader === "bearer") {
      headers.Authorization = `Bearer ${this.cfg.apiKey}`;
    } else if (this.cfg.authHeader === "x-api-key") {
      headers["x-api-key"] = this.cfg.apiKey;
    } else {
      // 自定义：从 authHeaderValue 解析 "Header-Name: value"
      // 也支持 {{key}} 模板替换
      const headerTemplate = this.cfg.authHeaderValue ?? "";
      const value = headerTemplate.replace(/\{\{key\}\}/g, this.cfg.apiKey);
      const colonIndex = value.indexOf(":");
      if (colonIndex > 0) {
        const name = value.substring(0, colonIndex).trim();
        const val = value.substring(colonIndex + 1).trim();
        if (name) headers[name] = val;
      } else {
        // 没有冒号，假定整段是 header 名称
        headers[value] = this.cfg.apiKey;
      }
    }

    return headers;
  }

  async analyzeImage(
    imageDataUrl: string | string[],
    prompt: string,
    enableThinking?: boolean
  ): Promise<string> {
    const body: CustomRequestBody = {
      model: this.cfg.model,
      messages: [
        {
          role: "user",
          content: [
            ...buildImageContent(imageDataUrl),
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      top_p: this.config.topP,
      stream: false,
    };

    // thinking 模式处理
    if (enableThinking !== false && this.cfg.thinkingMode === "openai") {
      body.enable_thinking = true;
    } else if (
      enableThinking !== false &&
      this.cfg.thinkingMode === "qwen_extra_body"
    ) {
      body.extra_body = { enable_thinking: true };
    }

    logger.info("Calling Custom API", {
      model: this.cfg.model,
      baseUrl: this.cfg.baseUrl,
      path: this.cfg.path,
      thinkingMode: this.cfg.thinkingMode,
      imageCount: Array.isArray(imageDataUrl) ? imageDataUrl.length : 1,
    });

    try {
      const response = await this.client.post<CustomResponse>(
        this.cfg.path,
        body
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error(
          "Invalid response from Custom API: missing choices[0].message.content"
        );
      }

      const result = response.data.choices[0].message.content;
      const usage = response.data.usage;

      logger.info("Custom API call successful", {
        tokens: usage?.total_tokens ?? 0,
        model: response.data.model ?? this.cfg.model,
      });

      return result;
    } catch (error) {
      logger.error("Custom API call failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const apiError = error.response?.data?.error?.message || error.message;
        throw new Error(`Custom API error (${status || "unknown"}): ${apiError}`);
      }

      throw error;
    }
  }

  getModelName(): string {
    return `Custom (${this.cfg.model})`;
  }
}
