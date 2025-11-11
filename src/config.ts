/**
 * 配置管理模块
 * 从环境变量读取配置
 */

export interface LumaConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  enableThinking: boolean;
}

/**
 * 从环境变量加载配置
 */
export function loadConfig(): LumaConfig {
  const apiKey = process.env.ZHIPU_API_KEY;
  
  if (!apiKey) {
    throw new Error('ZHIPU_API_KEY environment variable is required');
  }

  return {
    apiKey,
    model: process.env.ZHIPU_MODEL || 'glm-4.5v',
    maxTokens: parseInt(process.env.ZHIPU_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.ZHIPU_TEMPERATURE || '0.7'),
    topP: parseFloat(process.env.ZHIPU_TOP_P || '0.7'),
    enableThinking: process.env.ZHIPU_ENABLE_THINKING === 'true',
  };
}
