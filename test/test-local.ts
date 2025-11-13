/**
 * Luma MCP 本地测试脚本
 * 直接测试图片分析功能，不需要MCP客户端
 */

import { loadConfig } from '../src/config.js';
import type { VisionClient } from '../src/vision-client.js';
import { ZhipuClient } from '../src/zhipu-client.js';
import { SiliconFlowClient } from '../src/siliconflow-client.js';
import { imageToBase64, validateImageSource } from '../src/image-processor.js';
import { buildAnalysisPrompt } from '../src/prompts.js';
import { logger } from '../src/utils/logger.js';

async function testImageAnalysis(imagePath: string, question?: string) {
  console.log('\n==========================================');
  console.log('🧪 测试 Luma MCP 图片分析');
  console.log('==========================================\n');

  try {
    // 1. 加载配置
    console.log('📝 加载配置...');
    const config = loadConfig();
    console.log(`✅ 配置加载成功: 提供商 ${config.provider}, 模型 ${config.model}\n`);

    // 2. 验证图片
    console.log('🔍 验证图片来源...');
    await validateImageSource(imagePath);
    console.log(`✅ 图片验证通过: ${imagePath}\n`);

    // 3. 处理图片
    console.log('🖼️  处理图片...');
    const imageDataUrl = await imageToBase64(imagePath);
    const isUrl = imagePath.startsWith('http');
    console.log(`✅ 图片处理完成: ${isUrl ? 'URL' : 'Base64编码'}\n`);

    // 4. 构建提示词
    console.log('💬 构建提示词...');
    // DeepSeek-OCR 需要简洁 prompt
    const prompt = config.provider === 'siliconflow'
      ? (question || '请详细分析这张图片的内容')
      : buildAnalysisPrompt(question);
    console.log(`✅ 提示词: ${question || '通用描述'}\n`);

    // 5. 创建客户端并调用API
    const client: VisionClient = config.provider === 'siliconflow'
      ? new SiliconFlowClient(config)
      : new ZhipuClient(config);
    
    const modelName = config.provider === 'siliconflow' ? 'DeepSeek-OCR' : 'GLM-4.5V';
    console.log(`🤖 调用 ${modelName} API...`);
    const result = await client.analyzeImage(imageDataUrl, prompt);

    // 6. 显示结果
    console.log('\n==========================================');
    console.log('📊 分析结果');
    console.log('==========================================\n');
    console.log(result);
    console.log('\n==========================================');
    console.log('✅ 测试完成！');
    console.log('==========================================\n');

  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// 解析命令行参数
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
使用方法:
  npm run test:local <图片路径或URL> [问题]

示例:
  # 分析本地图片
  npm run test:local ./test.png

  # 分析本地图片并提问
  npm run test:local ./code-error.png "这段代码为什么报错？"

  # 分析远程图片
  npm run test:local https://example.com/image.jpg

环境变量:
  # 使用智谱 GLM-4.5V
  ZHIPU_API_KEY=your-api-key
  
  # 使用硅基流动 DeepSeek-OCR
  MODEL_PROVIDER=siliconflow
  SILICONFLOW_API_KEY=your-api-key
  `);
  process.exit(1);
}

const imagePath = args[0];
const question = args.slice(1).join(' ') || undefined;

testImageAnalysis(imagePath, question);
