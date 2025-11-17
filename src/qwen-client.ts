/**
 * 阿里云通义千问VL客户端
 * 使用 OpenAI 兼容接口
 * API 文档: https://help.aliyun.com/zh/model-studio/vision
 */

import axios, { AxiosInstance } from 'axios';
import { VisionClient } from './vision-client.js';
import { buildAnalysisPrompt } from './prompts.js';

export class QwenClient implements VisionClient {
  private client: AxiosInstance;
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(apiKey: string, model: string = 'qwen3-vl-flash', maxTokens: number = 4096, temperature: number = 0.7) {
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
    this.temperature = temperature;

    // 使用阿里云百炼的 OpenAI 兼容接口
    this.client = axios.create({
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 180000, // 180秒超时
    });
  }

  async analyzeImage(imageDataUrl: string, prompt: string, enableThinking?: boolean): Promise<string> {
    try {
      // Qwen3-VL 支持思考模式，使用 extra_body 传递非标准参数
      const requestBody: any = {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl
                }
              },
              {
                type: 'text',
                text: buildAnalysisPrompt(prompt)
              }
            ]
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: false
      };

      // 如果启用思考模式，添加 extra_body 参数
      if (enableThinking) {
        requestBody.extra_body = {
          enable_thinking: true,
          thinking_budget: 81920  // 最大思考 Token 数
        };
      }

      const response = await this.client.post('/chat/completions', requestBody);

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from Qwen API');
      }

      return response.data.choices[0].message.content;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        throw new Error(`Qwen API error: ${errorMessage}`);
      }
      throw error;
    }
  }

  getModelName(): string {
    return `Qwen (${this.model})`;
  }
}
