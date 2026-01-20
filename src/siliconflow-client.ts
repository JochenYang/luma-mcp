/**
 * 硅基流动 DeepSeek-OCR API 客户端
 * OpenAI 兼容接口
 */

import axios from 'axios';
import type { VisionClient } from './vision-client.js';
import type { LumaConfig } from './config.js';
import { logger } from './utils/logger.js';

interface SiliconFlowMessage {
  role: string;
  content: Array<{
    type: string;
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

interface SiliconFlowRequest {
  model: string;
  messages: SiliconFlowMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

interface SiliconFlowResponse {
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
 * 硅基流动 API 客户端
 */
export class SiliconFlowClient implements VisionClient {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private apiEndpoint = 'https://api.siliconflow.cn/v1/chat/completions';

  constructor(config: LumaConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.maxTokens = config.maxTokens;
    this.temperature = config.temperature;
  }

  /**
   * 分析图片
   */
  async analyzeImage(imageDataUrl: string, prompt: string, enableThinking?: boolean): Promise<string> {
    const requestBody: SiliconFlowRequest = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: false,
    };

    logger.info('Calling SiliconFlow DeepSeek-OCR API', { 
      model: this.model,
    });

    try {
      const response = await axios.post<SiliconFlowResponse>(
        this.apiEndpoint,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60s 超时
        }
      );

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('No response from DeepSeek-OCR');
      }

      const result = response.data.choices[0].message.content;
      const usage = response.data.usage;

      logger.info('SiliconFlow API call successful', { 
        tokens: usage?.total_tokens || 0,
        model: response.data.model
      });

      return result;
    } catch (error) {
      logger.error('SiliconFlow API call failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });

      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        const status = error.response?.status;
        throw new Error(`SiliconFlow API error (${status || 'unknown'}): ${message}`);
      }
      throw error;
    }
  }

  /**
   * 获取模型名称
   */
  getModelName(): string {
    return `DeepSeek (${this.model})`;
  }
}
