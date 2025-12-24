/**
 * 阿里云通义千问VL客户端
 * 使用 OpenAI 兼容接口
 * API 文档: https://help.aliyun.com/zh/model-studio/vision
 */

import axios, { AxiosInstance } from "axios";
import { VisionClient } from "./vision-client.js";
import type { LumaConfig } from "./config.js";
import { logger } from "./utils/logger.js";

export class QwenClient implements VisionClient {
  private client: AxiosInstance;
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: LumaConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.maxTokens = config.maxTokens;
    this.temperature = config.temperature;

    // 使用阿里云百炼的 OpenAI 兼容接口
    this.client = axios.create({
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 180000, // 180秒超时
    });
  }

  async analyzeImage(
    imageDataUrl: string,
    prompt: string,
    enableThinking?: boolean
  ): Promise<string> {
    try {
      // Qwen3-VL 支持思考模式，使用 extra_body 传递非标准参数
      const requestBody: any = {
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
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: false,
      };

      // 根据参数决定是否启用思考模式
      if (enableThinking !== false) {
        requestBody.extra_body = {
          enable_thinking: true,
          thinking_budget: 81920, // 最大思考 Token 数
        };
      }

      logger.info("Calling Qwen3-VL API", {
        model: this.model,
        thinking: !!requestBody.extra_body,
      });

      const response = await this.client.post("/chat/completions", requestBody);

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error("Invalid response format from Qwen API");
      }

      const result = response.data.choices[0].message.content;
      const usage = response.data.usage;

      logger.info("Qwen3-VL API call successful", {
        tokens: usage?.total_tokens || 0,
        model: response.data.model,
      });

      return result;
    } catch (error) {
      logger.error("Qwen3-VL API call failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.error?.message || error.message;
        throw new Error(`Qwen API error: ${errorMessage}`);
      }
      throw error;
    }
  }

  getModelName(): string {
    return `Qwen (${this.model})`;
  }
}
