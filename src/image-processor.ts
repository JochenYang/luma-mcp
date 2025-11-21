/**
 * 图片处理工具
 * 负责读取、压缩和编码图片（支持本地文件和远程 URL）
 */

import { readFile, stat } from "fs/promises";
import sharp from "sharp";
import { isUrl } from "./utils/helpers.js";
import { logger } from "./utils/logger.js";

// 判断是否为 Data URI（data:image/png;base64,....）
function isDataUri(input: string): boolean {
  return (
    typeof input === "string" &&
    input.startsWith("data:") &&
    /;base64,/.test(input)
  );
}

// 从 Data URI 获取 mimeType
function getMimeFromDataUri(input: string): string | null {
  const match = input.match(/^data:([^;]+);base64,/i);
  return match ? match[1].toLowerCase() : null;
}

// 估算 Data URI 的原始字节大小（不含头部）
function estimateBytesFromDataUri(input: string): number {
  try {
    const base64 = input.split(",")[1] || "";
    // base64 长度 * 3/4，忽略 padding 近似即可
    return Math.floor((base64.length * 3) / 4);
  } catch {
    return 0;
  }
}

/**
 * 规范化本地图像路径（例如去掉前缀符号）
 * 某些客户端会使用 "@path/to/file" 作为文件引用，这里统一转换为真实路径
 */
function normalizeImageSourcePath(source: string): string {
  if (typeof source === "string" && source.startsWith("@")) {
    const normalized = source.slice(1);
    logger.debug("Normalized @-prefixed image path", {
      original: source,
      normalized,
    });
    return normalized;
  }
  return source;
}

/**
 * 验证图片来源（文件或URL）
 */
export async function validateImageSource(
  imageSource: string,
  maxSizeMB: number = 10
): Promise<void> {
  // 先规范化可能带有前缀符号的本地路径（如 "@image.png"）
  const normalizedSource = normalizeImageSourcePath(imageSource);

  // 如果是 URL，直接返回
  if (isUrl(normalizedSource)) {
    logger.debug("Image source is URL, skipping validation");
    return;
  }

  // 验证本地文件
  try {
    const stats = await stat(normalizedSource);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (fileSizeMB > maxSizeMB) {
      throw new Error(
        `Image file too large: ${fileSizeMB.toFixed(2)}MB (max: ${maxSizeMB}MB)`
      );
    }

    // 验证文件格式
    const ext = normalizedSource.toLowerCase().split(".").pop();
    const supportedFormats = ["jpg", "jpeg", "png", "webp", "gif"];

    if (!ext || !supportedFormats.includes(ext)) {
      throw new Error(
        `Unsupported image format: ${ext}. Supported: ${supportedFormats.join(
          ", "
        )}`
      );
    }
  } catch (error) {
    if ((error as any).code === "ENOENT") {
      throw new Error(`Image file not found: ${normalizedSource}`);
    }
    throw error;
  }
}

/**
 * 将图片转换为 base64 data URL 或返回URL
 */
export async function imageToBase64(imagePath: string): Promise<string> {
  try {
    // 规范化本地路径（处理可能的前缀符号）
    const normalizedPath = normalizeImageSourcePath(imagePath);

    // 如果是 URL，直接返回
    if (isUrl(normalizedPath)) {
      logger.info("Using remote image URL", { url: normalizedPath });
      return normalizedPath;
    }

    // 本地文件：读取并编码
    let imageBuffer: Buffer = await readFile(normalizedPath);

    // 检查文件大小，如果超过 2MB 则压缩
    if (imageBuffer.length > 2 * 1024 * 1024) {
      logger.info("Compressing large image", {
        originalSize: `${(imageBuffer.length / (1024 * 1024)).toFixed(2)}MB`,
      });
      imageBuffer = Buffer.from(await compressImage(imageBuffer));
    }

    // 转换为 base64
    const base64 = imageBuffer.toString("base64");
    const mimeType = getMimeType(normalizedPath);

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    throw new Error(
      `Failed to process image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * 压缩图片
 */
async function compressImage(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(2048, 2048, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

/**
 * 根据文件扩展名获取 MIME 类型
 */
function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split(".").pop();

  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg"; // 默认使用 jpeg
  }
}
