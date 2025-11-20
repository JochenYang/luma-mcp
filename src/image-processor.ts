/**
 * 图片处理工具
 * 负责读取、压缩和编码图片
 * 支持本地文件和远程URL
 */

import { readFile, stat } from 'fs/promises';
import sharp from 'sharp';
import { isUrl } from './utils/helpers.js';
import { logger } from './utils/logger.js';

// 判断是否为 Data URI（data:image/png;base64,....）
function isDataUri(input: string): boolean {
  return typeof input === 'string' && input.startsWith('data:') && /;base64,/.test(input);
}

// 从 Data URI 获取 mimeType
function getMimeFromDataUri(input: string): string | null {
  const match = input.match(/^data:([^;]+);base64,/i);
  return match ? match[1].toLowerCase() : null;
}

// 估算 Data URI 的原始字节大小（不含头部）
function estimateBytesFromDataUri(input: string): number {
  try {
    const base64 = input.split(',')[1] || '';
    // base64 长度 * 3/4，忽略 padding 近似即可
    return Math.floor((base64.length * 3) / 4);
  } catch {
    return 0;
  }
}

/**
 * 移除 Claude Code 的 @ 路径前缀
 */
function stripAtPrefix(path: string): string {
  // Claude Code 使用 @ 作为文件引用的语法糖
  if (path.startsWith('@')) {
    const stripped = path.substring(1);
    logger.debug('Stripped @ prefix from path', { original: path, stripped });
    return stripped;
  }
  return path;
}

/**
 * 验证图片来源（文件或URL）
 */
export async function validateImageSource(imageSource: string, maxSizeMB: number = 10): Promise<void> {
  // 首先移除可能的 @ 前缀
  const cleanSource = stripAtPrefix(imageSource);
  
  // 如果是 Data URI，则验证 mime 与大小后直接返回
  if (isDataUri(cleanSource)) {
    const mime = getMimeFromDataUri(cleanSource);
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!mime || !allowed.includes(mime)) {
      throw new Error(`Unsupported data URI mimeType: ${mime || 'unknown'}. Supported: ${allowed.join(', ')}`);
    }
    const bytes = estimateBytesFromDataUri(cleanSource);
    const sizeMB = bytes / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      throw new Error(`Image data URI too large: ${sizeMB.toFixed(2)}MB (max: ${maxSizeMB}MB)`);
    }
    logger.debug('Image source is data URI, validated', { mime, sizeMB: sizeMB.toFixed(2) });
    return;
  }
  // 如果是 URL，直接返回
  if (isUrl(cleanSource)) {
    logger.debug('Image source is URL, skipping validation', { imageSource: cleanSource });
    return;
  }

  // 验证本地文件
  try {
    const stats = await stat(cleanSource);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (fileSizeMB > maxSizeMB) {
      throw new Error(`Image file too large: ${fileSizeMB.toFixed(2)}MB (max: ${maxSizeMB}MB)`);
    }

    // 验证文件格式
    const ext = cleanSource.toLowerCase().split('.').pop();
    const supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    
    if (!ext || !supportedFormats.includes(ext)) {
      throw new Error(`Unsupported image format: ${ext}. Supported: ${supportedFormats.join(', ')}`);
    }
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      throw new Error(`Image file not found: ${cleanSource}`);
    }
    throw error;
  }
}

/**
 * 将图片转换为 base64 data URL 或返回URL
 */
export async function imageToBase64(imagePath: string): Promise<string> {
  try {
    // 首先移除可能的 @ 前缀
    const cleanPath = stripAtPrefix(imagePath);
    
    // 如果是 Data URI，直接返回（已是 data:*;base64, 格式）
    if (isDataUri(cleanPath)) {
      logger.info('Using data URI image');
      return cleanPath;
    }

    // 如果是 URL，直接返回
    if (isUrl(cleanPath)) {
      logger.info('Using remote image URL', { url: cleanPath });
      return cleanPath;
    }

    // 本地文件：读取并编码
    let imageBuffer: Buffer = await readFile(cleanPath);
    
    // 检查文件大小，如果超过 2MB 则压缩
    if (imageBuffer.length > 2 * 1024 * 1024) {
      logger.info('Compressing large image', { originalSize: `${(imageBuffer.length / (1024 * 1024)).toFixed(2)}MB` });
      imageBuffer = Buffer.from(await compressImage(imageBuffer));
    }
    
    // 转换为 base64
    const base64 = imageBuffer.toString('base64');
    const mimeType = getMimeType(cleanPath);
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 压缩图片
 */
async function compressImage(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(2048, 2048, { 
      fit: 'inside', 
      withoutEnlargement: true 
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

/**
 * 根据文件扩展名获取 MIME 类型
 */
function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split('.').pop();
  
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg'; // 默认使用 jpeg
  }
}
