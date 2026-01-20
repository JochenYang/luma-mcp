/**
 * 图片处理工具
 * 读取、压缩并编码图片（本地文件与远程 URL）
 */

import { readFile, stat } from "fs/promises";
import sharp from "sharp";
import { isUrl } from "./utils/helpers.js";
import { logger } from "./utils/logger.js";

// 判断输入是否为 Data URI（data:image/png;base64,...）
function isDataUri(input: string): boolean {
  return (
    typeof input === "string" &&
    input.startsWith("data:") &&
    /;base64,/.test(input)
  );
}

// 从 Data URI 提取 mimeType
function getMimeFromDataUri(input: string): string | null {
  const match = input.match(/^data:([^;]+);base64,/i);
  return match ? match[1].toLowerCase() : null;
}

// 估算 Data URI 的原始字节大小（不含头部）
function estimateBytesFromDataUri(input: string): number {
  try {
    const base64 = input.split(",")[1] || "";
    // base64 长度 * 3/4，忽略 padding 进行近似计算
    return Math.floor((base64.length * 3) / 4);
  } catch {
    return 0;
  }
}

/**
 * 规范化本地图片路径（例如移除前缀符号）
 * 部分客户端使用 "@path/to/file" 引用，需要转为真实路径
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
 * 校验图片来源（文件或 URL）
 */
export async function validateImageSource(
  imageSource: string,
  maxSizeMB: number = 10
): Promise<void> {
  // 规范化本地路径（处理可能的前缀符号，如 "@image.png"）
  const normalizedSource = normalizeImageSourcePath(imageSource);

  if (isDataUri(normalizedSource)) {
    const mimeType = getMimeFromDataUri(normalizedSource);
    const supportedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!mimeType || !supportedMimeTypes.includes(mimeType)) {
      throw new Error(
        `Unsupported image format: ${mimeType || "unknown"}. Supported: ${supportedMimeTypes.join(
          ", "
        )}`
      );
    }

    const bytes = estimateBytesFromDataUri(normalizedSource);
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (bytes > maxBytes) {
      throw new Error(
        `Image file too large: ${(bytes / (1024 * 1024)).toFixed(
          2
        )}MB (max: ${maxSizeMB}MB)`
      );
    }

    return;
  }

  // URL 直接跳过校验
  if (isUrl(normalizedSource)) {
    logger.debug("Image source is URL, skipping validation");
    return;
  }

  // 校验本地文件
  try {
    const stats = await stat(normalizedSource);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (fileSizeMB > maxSizeMB) {
      throw new Error(
        `Image file too large: ${fileSizeMB.toFixed(2)}MB (max: ${maxSizeMB}MB)`
      );
    }

    // 校验文件格式
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
 * 将图片转为 base64 Data URL 或直接返回 URL
 */
export async function imageToBase64(imagePath: string): Promise<string> {
  try {
    // 规范化本地路径（处理可能的前缀符号）
    const normalizedPath = normalizeImageSourcePath(imagePath);

    if (isDataUri(normalizedPath)) {
      return normalizedPath;
    }

    // 直接返回 URL
    if (isUrl(normalizedPath)) {
      logger.info("Using remote image URL", { url: normalizedPath });
      return normalizedPath;
    }

    const result = await encodeLocalImage(normalizedPath);

    return `data:${result.mimeType};base64,${result.base64}`;
  } catch (error) {
    throw new Error(
      `Failed to process image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function imageToBase64WithOptions(
  imagePath: string,
  options?: { preferText?: boolean }
): Promise<string> {
  try {
    const normalizedPath = normalizeImageSourcePath(imagePath);

    if (isDataUri(normalizedPath)) {
      return normalizedPath;
    }

    if (isUrl(normalizedPath)) {
      logger.info("Using remote image URL", { url: normalizedPath });
      return normalizedPath;
    }

    const result = await encodeLocalImage(normalizedPath, options);

    return `data:${result.mimeType};base64,${result.base64}`;
  } catch (error) {
    throw new Error(
      `Failed to process image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function encodeLocalImage(
  normalizedPath: string,
  options?: { preferText?: boolean }
): Promise<{ base64: string; mimeType: string }> {
  let imageBuffer: Buffer = await readFile(normalizedPath);
  let mimeType = getMimeType(normalizedPath);

  if (imageBuffer.length > 2 * 1024 * 1024) {
    logger.info("Compressing large image", {
      originalSize: `${(imageBuffer.length / (1024 * 1024)).toFixed(2)}MB`,
    });
    const compressed = await compressImage(
      imageBuffer,
      mimeType,
      options?.preferText
    );
    imageBuffer = compressed.buffer;
    mimeType = compressed.mimeType;
  }

  return {
    base64: imageBuffer.toString("base64"),
    mimeType,
  };
}

/**
 * 压缩图片
 */
async function compressImage(
  imageBuffer: Buffer,
  inputMimeType: string,
  preferText?: boolean
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (inputMimeType === "image/gif") {
    return { buffer: imageBuffer, mimeType: inputMimeType };
  }

  const maxSize = preferText ? 3072 : 2048;
  const pipeline = sharp(imageBuffer).resize(maxSize, maxSize, {
    fit: "inside",
    withoutEnlargement: true,
  });

  if (inputMimeType === "image/png") {
    const buffer = await pipeline.png({ compressionLevel: preferText ? 3 : 6 }).toBuffer();
    return { buffer, mimeType: "image/png" };
  }

  if (inputMimeType === "image/webp") {
    const buffer = await pipeline.webp({ quality: preferText ? 90 : 85 }).toBuffer();
    return { buffer, mimeType: "image/webp" };
  }

  const buffer = await pipeline.jpeg({ quality: preferText ? 90 : 85 }).toBuffer();
  return { buffer, mimeType: "image/jpeg" };
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
