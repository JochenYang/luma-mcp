/**
 * 直接测试 DeepSeek-OCR API（无任何包装）
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function testDeepSeekOCR(imagePath: string) {
  console.log('\n🧪 测试 DeepSeek-OCR API（原始调用）\n');

  const apiKey = 'sk-skrldwndjawxvzzomztwmoinnwmvumezqyejysqutjwkjcdt';
  
  // 读取图片并转为 base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

  console.log(`📸 图片: ${imagePath}`);
  console.log(`📦 大小: ${(imageBuffer.length / 1024).toFixed(2)} KB\n`);

  // 测试不同的 prompt
  const prompts = [
    '识别图片中的所有文字',
    'OCR',
    'Extract all text from this image',
    'What do you see in this image?',
    '请详细描述这张图片'
  ];

  for (const prompt of prompts) {
    console.log(`\n🔍 测试 Prompt: "${prompt}"`);
    console.log('─'.repeat(50));

    try {
      const response = await axios.post(
        'https://api.siliconflow.cn/v1/chat/completions',
        {
          model: 'deepseek-ai/DeepSeek-OCR',
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
          temperature: 0.7,
          max_tokens: 4096,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const result = response.data.choices[0].message.content;
      const usage = response.data.usage;

      console.log(`✅ Tokens: ${usage.total_tokens} (prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens})`);
      console.log(`📝 响应长度: ${result?.length || 0} 字符`);
      
      if (result && result.trim().length > 0) {
        console.log('\n📊 结果:');
        console.log('─'.repeat(50));
        console.log(result);
        console.log('─'.repeat(50));
        console.log('\n✅ 找到有效响应！');
        break;
      } else {
        console.log('❌ 空响应');
      }
    } catch (error: any) {
      console.log(`❌ 错误: ${error.message}`);
    }
  }
}

// 运行测试
const imagePath = path.join(process.cwd(), 'test.png');
testDeepSeekOCR(imagePath).catch(console.error);
