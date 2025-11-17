/**
 * Qwen 客户端测试
 * 测试阿里云通义千问VL视觉理解
 */

import { QwenClient } from '../src/qwen-client.js';
import { imageToBase64 } from '../src/image-processor.js';

async function testQwen() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  
  if (!apiKey) {
    console.error('❌ 错误: 需要设置 DASHSCOPE_API_KEY 环境变量');
    console.log('设置方法:');
    console.log('  macOS/Linux: export DASHSCOPE_API_KEY="your-api-key"');
    console.log('  Windows: $env:DASHSCOPE_API_KEY="your-api-key"');
    process.exit(1);
  }

  // 获取图片路径
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error('❌ 错误: 请提供图片路径');
    console.log('用法: tsx test/test-qwen.ts <图片路径>');
    console.log('示例: tsx test/test-qwen.ts ./test.png');
    process.exit(1);
  }

  console.log('🚀 开始测试 Qwen3-VL-Flash...\n');

  try {
    // 1. 初始化客户端
    console.log('1️⃣ 初始化 Qwen 客户端...');
    const client = new QwenClient(
      apiKey,
      'qwen3-vl-flash',  // 使用高性价比的 Flash 版本
      4096,
      0.7
    );
    console.log(`✅ 客户端初始化成功: ${client.getModelName()}\n`);

    // 2. 读取图片
    console.log('2️⃣ 读取图片...');
    const imageData = await imageToBase64(imagePath);
    console.log(`✅ 图片读取成功 (${imagePath})\n`);

    // 3. 测试基础分析
    console.log('3️⃣ 测试基础分析（不启用思考模式）...');
    const basicResult = await client.analyzeImage(
      imageData,
      '请详细分析这张图片的内容',
      false
    );
    console.log('📊 基础分析结果:');
    console.log(basicResult);
    console.log('\n');

    // 4. 测试思考模式
    console.log('4️⃣ 测试思考模式（enable_thinking=true）...');
    const thinkingResult = await client.analyzeImage(
      imageData,
      '请详细分析这张图片的内容，包括所有细节',
      true  // 启用思考模式
    );
    console.log('🧠 思考模式分析结果:');
    console.log(thinkingResult);
    console.log('\n');

    // 5. 测试 OCR
    console.log('5️⃣ 测试 OCR 能力...');
    const ocrResult = await client.analyzeImage(
      imageData,
      '识别图片中的所有文字',
      false
    );
    console.log('📝 OCR 结果:');
    console.log(ocrResult);
    console.log('\n');

    console.log('✅ 所有测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testQwen();
