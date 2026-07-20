/**
 * Shared OpenAI-compatible vision client base.
 * Provider-specific clients only supply endpoint / thinking / token quirks.
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { LumaConfig } from "./config.js";
import { buildImageContent, type VisionClient } from "./vision-client.js";
import { logger } from "./utils/logger.js";

export type ThinkingMode =
  | "none"
  | "openai_thinking_object"
  | "enable_thinking_field"
  | "qwen_extra_body";

export interface OpenAICompatibleClientOptions {
  /** Display name prefix, e.g. "GLM", "Qwen" */
  displayName: string;
  /** Full chat completions URL, or baseURL + path below */
  endpoint?: string;
  /** Axios baseURL when using relative path */
  baseURL?: string;
  /** Relative path under baseURL (default "") */
  path?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  thinkingMode?: ThinkingMode;
  /** Cap max_tokens sent to API */
  maxTokensCap?: number;
  /** Include top_p in request body */
  includeTopP?: boolean;
  /** Always send stream: false */
  includeStreamFalse?: boolean;
  /** How enableThinking maps when thinkingMode is enable_thinking_field */
  enableThinkingFieldWhen?: "always_if_defined" | "when_true";
}

interface ChatCompletionResponse {
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

export class OpenAICompatibleVisionClient implements VisionClient {
  protected client: AxiosInstance;
  protected model: string;
  protected maxTokens: number;
  protected temperature: number;
  protected topP: number;
  protected options: Required<
    Pick<
      OpenAICompatibleClientOptions,
      | "displayName"
      | "path"
      | "thinkingMode"
      | "includeTopP"
      | "includeStreamFalse"
      | "enableThinkingFieldWhen"
    >
  > &
    OpenAICompatibleClientOptions;

  constructor(config: LumaConfig, options: OpenAICompatibleClientOptions) {
    this.model = config.model;
    this.maxTokens = config.maxTokens;
    this.temperature = config.temperature;
    this.topP = config.topP;
    this.options = {
      path: "",
      thinkingMode: "none",
      includeTopP: false,
      includeStreamFalse: false,
      enableThinkingFieldWhen: "always_if_defined",
      ...options,
    };

    const axiosConfig: AxiosRequestConfig = {
      timeout: options.timeoutMs ?? 60000,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    if (options.endpoint) {
      axiosConfig.baseURL = options.endpoint;
    } else if (options.baseURL) {
      axiosConfig.baseURL = options.baseURL.replace(/\/+$/, "");
    }

    this.client = axios.create(axiosConfig);
  }

  protected buildRequestBody(
    imageDataUrl: string | string[],
    prompt: string,
    enableThinking?: boolean
  ): Record<string, unknown> {
    const maxTokens =
      this.options.maxTokensCap !== undefined
        ? Math.min(this.maxTokens, this.options.maxTokensCap)
        : this.maxTokens;

    const body: Record<string, unknown> = {
      model: this.model,
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
      temperature: this.temperature,
      max_tokens: maxTokens,
    };

    if (this.options.includeTopP) {
      body.top_p = this.topP;
    }

    if (this.options.includeStreamFalse) {
      body.stream = false;
    }

    this.applyThinking(body, enableThinking);
    return body;
  }

  protected applyThinking(
    body: Record<string, unknown>,
    enableThinking?: boolean
  ): void {
    const mode = this.options.thinkingMode;
    if (mode === "none") {
      return;
    }

    if (mode === "openai_thinking_object") {
      if (enableThinking !== false) {
        body.thinking = { type: "enabled" };
      }
      return;
    }

    if (mode === "qwen_extra_body") {
      if (enableThinking !== false) {
        body.extra_body = {
          enable_thinking: true,
          thinking_budget: 81920,
        };
      }
      return;
    }

    if (mode === "enable_thinking_field") {
      if (this.options.enableThinkingFieldWhen === "when_true") {
        if (enableThinking) {
          body.enable_thinking = true;
        }
      } else if (enableThinking !== undefined) {
        body.enable_thinking = enableThinking;
      }
    }
  }

  async analyzeImage(
    imageDataUrl: string | string[],
    prompt: string,
    enableThinking?: boolean
  ): Promise<string> {
    const body = this.buildRequestBody(imageDataUrl, prompt, enableThinking);
    const imageCount = Array.isArray(imageDataUrl) ? imageDataUrl.length : 1;

    logger.info(`Calling ${this.options.displayName} API`, {
      model: this.model,
      thinking: this.describeThinking(body),
      imageCount,
    });

    try {
      const response = await this.client.post<ChatCompletionResponse>(
        this.options.path,
        body
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error(
          `Invalid response from ${this.options.displayName}: missing choices[0].message.content`
        );
      }

      logger.info(`${this.options.displayName} API call successful`, {
        tokens: response.data.usage?.total_tokens ?? 0,
        model: response.data.model ?? this.model,
      });

      return content;
    } catch (error) {
      logger.error(`${this.options.displayName} API call failed`, {
        error: error instanceof Error ? error.message : String(error),
      });

      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.error?.message || error.message;
        const status = error.response?.status;
        throw new Error(
          `${this.options.displayName} API error (${status || "unknown"}): ${message}`
        );
      }
      throw error;
    }
  }

  private describeThinking(body: Record<string, unknown>): boolean {
    return !!(
      body.thinking ||
      body.enable_thinking ||
      body.extra_body
    );
  }

  getModelName(): string {
    return `${this.options.displayName} (${this.model})`;
  }
}
