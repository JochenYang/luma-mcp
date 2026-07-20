/**
 * 智谱 GLM 视觉 API 客户端
 */

import type { LumaConfig } from "./config.js";
import { OpenAICompatibleVisionClient } from "./openai-compatible-client.js";

export class ZhipuClient extends OpenAICompatibleVisionClient {
  constructor(config: LumaConfig) {
    super(config, {
      displayName: "GLM",
      endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      timeoutMs: 60000,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      thinkingMode: "openai_thinking_object",
      includeTopP: true,
    });
  }
}
