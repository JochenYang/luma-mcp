/**
 * 测试 Data URI 支持
 */

import { validateImageSource, imageToBase64 } from '../src/image-processor.js';

// 一个有效的 1x1 像素 PNG 图片的 Data URI
const validDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// 无效的 Data URI（不支持的格式）
const invalidDataUri = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3R5bGU9ImZpbGw6I2ZmZiIgLz48L3N2Zz4=';

async function testDataUri() {
  console.log('🧪 测试 Data URI 支持\n');

  // 测试 1: 验证有效的 Data URI
  try {
    console.log('测试 1: 验证有效的 PNG Data URI');
    await validateImageSource(validDataUri);
    console.log('✅ 通过：有效的 Data URI 验证成功\n');
  } catch (error) {
    console.log(`❌ 失败: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // 测试 2: 验证无效的 Data URI（不支持的格式）
  try {
    console.log('测试 2: 验证不支持的格式 (SVG)');
    await validateImageSource(invalidDataUri);
    console.log('❌ 失败：应该抛出错误\n');
  } catch (error) {
    console.log(`✅ 通过：正确拒绝不支持的格式 - ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // 测试 3: Data URI 转换（应该直接返回）
  try {
    console.log('测试 3: Data URI 转换');
    const result = await imageToBase64(validDataUri);
    if (result === validDataUri) {
      console.log('✅ 通过：Data URI 正确传递（未修改）\n');
    } else {
      console.log('❌ 失败：Data URI 被修改了\n');
    }
  } catch (error) {
    console.log(`❌ 失败: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // 测试 4: 大小验证（创建一个超过10MB的Data URI）
  try {
    console.log('测试 4: 验证大小限制 (>10MB)');
    // 创建一个约 15MB 的 base64 字符串（20MB * 3/4 = 15MB）
    const largeBase64 = 'A'.repeat(20 * 1024 * 1024);
    const largeDataUri = `data:image/png;base64,${largeBase64}`;
    await validateImageSource(largeDataUri);
    console.log('❌ 失败：应该拒绝过大的文件\n');
  } catch (error) {
    console.log(`✅ 通过：正确拒绝超大文件 - ${error instanceof Error ? error.message : String(error)}\n`);
  }

  console.log('==========================================');
  console.log('✅ Data URI 测试完成！');
  console.log('==========================================\n');
}

testDataUri().catch(console.error);
