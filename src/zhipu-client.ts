/**
 * 智谱 GLM-4.6V API 客户端
 */

import axios from "axios";
import type { VisionClient } from "./vision-client.js";
import type { LumaConfig } from "./config.js";
import { logger } from "./utils/logger.js";

interface ZhipuMessage {
  role: string;
  content: Array<{
    type: string;
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

interface ZhipuRequest {
  model: string;
  messages: ZhipuMessage[];
  temperature: number;
  max_tokens: number;
  top_p: number;
  thinking?: {
    type: string;
  };
}

interface ZhipuResponse {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 智谱 API 客户端
 */
export class ZhipuClient implements VisionClient {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private topP: number;
  private apiEndpoint = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

  constructor(config: LumaConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.maxTokens = config.maxTokens;
    this.temperature = config.temperature;
    this.topP = config.topP;
  }

  /**
   * 分析图片
   */
  async analyzeImage(
    imageDataUrl: string,
    prompt: string,
    enableThinking?: boolean
  ): Promise<string> {
    const requestBody: ZhipuRequest = {
      model: this.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      top_p: this.topP,
    };

    // 根据参数决定是否启用思考模式
    if (enableThinking !== false) {
      requestBody.thinking = { type: "enabled" };
    }

    logger.info("Calling GLM-4.6V API", {
      model: this.model,
      thinking: !!requestBody.thinking,
    });

    try {
      const response = await axios.post<ZhipuResponse>(
        this.apiEndpoint,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60000, // 60秒超时
        }
      );

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error("No response from GLM-4.6V");
      }

      const result = response.data.choices[0].message.content;
      const usage = response.data.usage;

      logger.info("GLM-4.6V API call successful", {
        tokens: usage?.total_tokens || 0,
        model: response.data.model,
      });

      return result;
    } catch (error) {
      logger.error("GLM-4.6V API call failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        const status = error.response?.status;
        throw new Error(
          `GLM-4.6V API error (${status || "unknown"}): ${message}`
        );
      }
      throw error;
    }
  }

  /**
   * 获取模型名称
   */
  getModelName(): string {
    return `GLM (${this.model})`;
  }
}
