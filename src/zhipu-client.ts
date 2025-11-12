/**
 * 智谱 GLM-4.5V API 客户端
 */

import axios from 'axios';
import type { LumaConfig } from './config.js';
import { logger } from './utils/logger.js';

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
export class ZhipuClient {
  private config: LumaConfig;
  private apiEndpoint = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  constructor(config: LumaConfig) {
    this.config = config;
  }

  /**
   * 分析图片
   */
  async analyzeImage(imageDataUrl: string, prompt: string, enableThinking?: boolean): Promise<string> {
    const requestBody: ZhipuRequest = {
      model: this.config.model,
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
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      top_p: this.config.topP,
      thinking: { type: 'enabled' }, // 默认启用思考模式，提高分析准确性
    };

    // 允许显式禁用 thinking（如需要更快速度）
    if (this.config.enableThinking === false || enableThinking === false) {
      delete requestBody.thinking;
    }

    logger.info('Calling GLM-4.5V API', { 
      model: this.config.model,
      thinking: !!requestBody.thinking 
    });

    try {
      const response = await axios.post<ZhipuResponse>(
        this.apiEndpoint,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60秒超时
        }
      );

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('No response from GLM-4.5V');
      }

      const result = response.data.choices[0].message.content;
      const usage = response.data.usage;

      logger.info('GLM-4.5V API call successful', { 
        tokens: usage?.total_tokens || 0,
        model: response.data.model 
      });

      return result;
    } catch (error) {
      logger.error('GLM-4.5V API call failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });

      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        const status = error.response?.status;
        throw new Error(`GLM-4.5V API error (${status || 'unknown'}): ${message}`);
      }
      throw error;
    }
  }
}
