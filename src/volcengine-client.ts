/**
 * 火山方舟 Doubao 视觉模型客户端
 * 支持 Doubao-Seed-1.6 系列（flash、vision、lite）
 * 使用 Chat Completions API 格式
 */

import axios from "axios";
import type { VisionClient } from "./vision-client.js";
import type { LumaConfig } from "./config.js";
import { logger } from "./utils/logger.js";

interface VolcengineMessage {
  role: string;
  content: Array<{
    type: string;
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

interface VolcengineRequest {
  model: string;
  messages: VolcengineMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  thinking?: {
    type: string;
  };
}

interface VolcengineResponse {
  id: string;
  object: string;
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
 * 火山方舟客户端
 */
export class VolcengineClient implements VisionClient {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private apiEndpoint =
    "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

  constructor(config: LumaConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.maxTokens = config.maxTokens;
    this.temperature = config.temperature;
  }

  /**
   * 分析图片
   */
  async analyzeImage(
    imageDataUrl: string,
    prompt: string,
    enableThinking?: boolean
  ): Promise<string> {
    const requestBody: VolcengineRequest = {
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
      stream: false,
    };

    // 根据参数启用思考模式
    if (enableThinking !== false) {
      requestBody.thinking = { type: "enabled" };
    }

    logger.info("Calling Volcengine Doubao API", {
      model: this.model,
      thinking: !!requestBody.thinking,
    });

    try {
      const response = await axios.post<VolcengineResponse>(
        this.apiEndpoint,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 120000, // 120s 超时
        }
      );

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error("No response from Volcengine Doubao");
      }

      const result = response.data.choices[0].message.content;
      const usage = response.data.usage;

      logger.info("Volcengine Doubao API call successful", {
        tokens: usage?.total_tokens || 0,
        model: response.data.model,
      });

      return result;
    } catch (error) {
      logger.error("Volcengine Doubao API call failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        const status = error.response?.status;
        throw new Error(
          `Volcengine Doubao API error (${status || "unknown"}): ${message}`
        );
      }
      throw error;
    }
  }

  /**
   * 获取模型名称
   */
  getModelName(): string {
    return `Doubao (${this.model})`;
  }
}
