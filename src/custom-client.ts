/**
 * 通用 OpenAI 兼容 Provider 客户端
 * 支持任意 OpenAI 兼容端点（OpenAI、OpenRouter、Together AI、本地 vLLM/Ollama 等）
 */

import type { LumaConfig } from "./config.js";
import {
  OpenAICompatibleVisionClient,
  type ThinkingMode,
} from "./openai-compatible-client.js";

function mapCustomThinkingMode(
  mode: "disabled" | "openai" | "qwen_extra_body"
): ThinkingMode {
  if (mode === "openai") {
    return "enable_thinking_field";
  }
  if (mode === "qwen_extra_body") {
    return "qwen_extra_body";
  }
  return "none";
}

function buildAuthHeaders(
  apiKey: string,
  authHeader: "bearer" | "x-api-key" | "custom",
  authHeaderValue?: string
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (authHeader === "bearer") {
    headers.Authorization = `Bearer ${apiKey}`;
  } else if (authHeader === "x-api-key") {
    headers["x-api-key"] = apiKey;
  } else {
    const headerTemplate = authHeaderValue ?? "";
    const value = headerTemplate.replace(/\{\{key\}\}/g, apiKey);
    const colonIndex = value.indexOf(":");
    if (colonIndex > 0) {
      const name = value.substring(0, colonIndex).trim();
      const val = value.substring(colonIndex + 1).trim();
      if (name) headers[name] = val;
    } else if (value) {
      headers[value] = apiKey;
    }
  }

  return headers;
}

export class CustomClient extends OpenAICompatibleVisionClient {
  private customThinkingMode: "disabled" | "openai" | "qwen_extra_body";
  private customModelName: string;

  constructor(config: LumaConfig) {
    if (!config.customProvider) {
      throw new Error(
        "CustomClient requires customProvider configuration. Set MODEL_PROVIDER=custom and provide CUSTOM_* environment variables."
      );
    }

    const cfg = config.customProvider;
    const thinkingMode = mapCustomThinkingMode(cfg.thinkingMode);

    // Prefer CUSTOM_MODEL_NAME for request body (legacy: customProvider.model)
    const configWithModel: LumaConfig = {
      ...config,
      model: cfg.model || config.model,
    };

    super(configWithModel, {
      displayName: "Custom",
      baseURL: cfg.baseUrl,
      path: cfg.path || "/chat/completions",
      timeoutMs: cfg.timeoutMs,
      headers: buildAuthHeaders(cfg.apiKey, cfg.authHeader, cfg.authHeaderValue),
      thinkingMode,
      includeTopP: true,
      includeStreamFalse: true,
    });

    this.customThinkingMode = cfg.thinkingMode;
    this.customModelName = cfg.model;
  }

  override getModelName(): string {
    return `Custom (${this.customModelName})`;
  }

  /**
   * Preserve custom provider thinking field shapes from v1.5.0.
   */
  protected override applyThinking(
    body: Record<string, unknown>,
    enableThinking?: boolean
  ): void {
    if (this.customThinkingMode === "disabled") {
      return;
    }

    if (enableThinking === false) {
      return;
    }

    if (this.customThinkingMode === "openai") {
      body.enable_thinking = true;
      return;
    }

    if (this.customThinkingMode === "qwen_extra_body") {
      body.extra_body = { enable_thinking: true };
    }
  }
}
