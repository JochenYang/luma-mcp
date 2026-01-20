/**
 * 腾讯混元视觉 API 客户端
 * api文档：https://cloud.tencent.com/document/product/1729/101848
 * OpenAI 兼容接口
 */

import axios, { AxiosInstance } from "axios";
import type { VisionClient } from "./vision-client.js";
import type { LumaConfig } from "./config.js";
import { logger } from "./utils/logger.js";

interface HunyuanMessage {
  role: string;
  content: Array<{
    type: string;
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

interface HunyuanRequest {
  model: string;
  messages: HunyuanMessage[];
  temperature: number;
  max_tokens: number;
  top_p: number;
}

interface HunyuanResponse {
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
 * 混元视觉客户端
 */
export class HunyuanClient implements VisionClient {
  private client: AxiosInstance;
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private topP: number;

  constructor(config: LumaConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.maxTokens = config.maxTokens;
    this.temperature = config.temperature;
    this.topP = config.topP;

    this.client = axios.create({
      baseURL: "https://api.hunyuan.cloud.tencent.com/v1",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 180000,
    });
  }

  /**
   * 分析图片
   */
  async analyzeImage(
    imageDataUrl: string,
    prompt: string,
    enableThinking?: boolean
  ): Promise<string> {
    try {
      const requestBody: HunyuanRequest = {
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

      logger.info("Calling Hunyuan Vision API", {
        model: this.model,
        thinking: enableThinking !== false,
      });

      const response = await this.client.post<HunyuanResponse>(
        "/chat/completions",
        requestBody
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error("Invalid response format from Hunyuan API");
      }

      const result = response.data.choices[0].message.content;
      const usage = response.data.usage;

      logger.info("Hunyuan Vision API call successful", {
        tokens: usage?.total_tokens || 0,
        model: response.data.model,
      });

      return result;
    } catch (error) {
      logger.error("Hunyuan Vision API call failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.error?.message || error.message;
        const status = error.response?.status;
        throw new Error(
          `Hunyuan API error (${status || "unknown"}): ${errorMessage}`
        );
      }

      throw error;
    }
  }

  /**
   * 获取模型名称
   */
  getModelName(): string {
    return `Hunyuan (${this.model})`;
  }
}
