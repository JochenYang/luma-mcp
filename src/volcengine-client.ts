/**
 * 火山方舟 Doubao 视觉模型客户端
 */

import type { LumaConfig } from "./config.js";
import { OpenAICompatibleVisionClient } from "./openai-compatible-client.js";

export class VolcengineClient extends OpenAICompatibleVisionClient {
  constructor(config: LumaConfig) {
    super(config, {
      displayName: "Doubao",
      endpoint: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      timeoutMs: 120000,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      thinkingMode: "openai_thinking_object",
      includeStreamFalse: true,
    });
  }
}
