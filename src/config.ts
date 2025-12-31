/**
 * 配置管理模块
 * 从环境变量读取配置
 */

export type ModelProvider = 'zhipu' | 'siliconflow' | 'qwen' | 'volcengine';

export interface LumaConfig {
	provider: ModelProvider;
	apiKey: string;
	model: string;
	maxTokens: number;
	temperature: number;
	topP: number;
	enableThinking: boolean;
	baseVisionPrompt?: string;
}

/**
 * 从环境变量加载配置
 */
export function loadConfig(): LumaConfig {
  // 确定使用的模型提供商
  const provider = (process.env.MODEL_PROVIDER?.toLowerCase() || 'zhipu') as ModelProvider;
  
  // 根据提供商获取 API Key
  let apiKey: string | undefined;
  let defaultModel: string;
  
  if (provider === 'siliconflow') {
    apiKey = process.env.SILICONFLOW_API_KEY;
    defaultModel = 'deepseek-ai/DeepSeek-OCR';
    
    if (!apiKey) {
      throw new Error('SILICONFLOW_API_KEY environment variable is required. Please configure it in your MCP settings.');
    }
  } else if (provider === 'qwen') {
    apiKey = process.env.DASHSCOPE_API_KEY;
    defaultModel = 'qwen3-vl-flash';

    if (!apiKey) {
      throw new Error('DASHSCOPE_API_KEY environment variable is required. Please configure it in your MCP settings.');
    }
  } else if (provider === 'volcengine') {
    apiKey = process.env.VOLCENGINE_API_KEY;
    defaultModel = 'doubao-seed-1-6-flash-250828';

    if (!apiKey) {
      throw new Error('VOLCENGINE_API_KEY environment variable is required. Please configure it in your MCP settings.');
    }
  } else {
    apiKey = process.env.ZHIPU_API_KEY;
    defaultModel = 'glm-4.6v';

    if (!apiKey) {
      throw new Error('ZHIPU_API_KEY environment variable is required. Please configure it in your MCP settings.');
    }
  }

  return {
    provider,
    apiKey,
    model: process.env.MODEL_NAME || defaultModel,
    maxTokens: parseInt(process.env.MAX_TOKENS || '16384', 10),
    temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
    topP: parseFloat(process.env.TOP_P || '0.7'),
		enableThinking: process.env.ENABLE_THINKING !== 'false',
		baseVisionPrompt: process.env.BASE_VISION_PROMPT,
  };
}
