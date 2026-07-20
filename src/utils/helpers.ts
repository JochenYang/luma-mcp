/**
 * 工具函数
 */
import axios from "axios";

/**
 * 带重试机制的异步函数包装器
 * - 4xx 客户端错误直接抛出，不重试
 * - 其他错误使用带随机抖动的指数退避重试
 */
export function withRetry<T>(
  fn: (...args: any[]) => Promise<T>,
  maxRetries: number = 2,
  initialDelay: number = 1000
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        // 4xx 客户端错误直接抛出，不重试
        // 例外：429 Too Many Requests / 408 Request Timeout 应带退避重试
        if (axios.isAxiosError(error) && error.response?.status) {
          const status = error.response.status;
          if (
            status >= 400 &&
            status < 500 &&
            status !== 429 &&
            status !== 408
          ) {
            throw error;
          }
        }

        if (attempt === maxRetries) {
          throw error;
        }

        // 指数退避 + 随机抖动（1x ~ 1.5x），避免惊群效应
        const delay =
          initialDelay * Math.pow(2, attempt) * (1 + Math.random() * 0.5);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("Unreachable");
  };
}

/**
 * 检查字符串是否为 URL
 */
export function isUrl(source: string): boolean {
  try {
    const url = new URL(source);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 创建成功响应
 */
export function createSuccessResponse(data: string) {
  return {
    content: [{ type: "text" as const, text: data }],
  };
}

/**
 * 创建错误响应
 */
export function createErrorResponse(message: string) {
  return {
    content: [{ type: "text" as const, text: `错误: ${message}` }],
    isError: true,
  };
}

export interface CallMeta {
  provider: string;
  model: string;
  taskType: string;
  tileCount: number;
  multiCrop: boolean;
  preferText: boolean;
  preprocessMs: number;
  apiMs: number;
  totalMs: number;
}

/**
 * Optionally append machine-readable meta block for debugging / cost awareness.
 * Default off so host models still see plain analysis text.
 */
export function formatResultWithMeta(
  analysis: string,
  meta: CallMeta | undefined,
  includeMeta: boolean
): string {
  if (!includeMeta || !meta) {
    return analysis;
  }

  const lines = [
    analysis,
    "",
    "---",
    "luma_meta:",
    `- provider: ${meta.provider}`,
    `- model: ${meta.model}`,
    `- task_type: ${meta.taskType}`,
    `- tiles: ${meta.tileCount}`,
    `- multi_crop: ${meta.multiCrop}`,
    `- prefer_text: ${meta.preferText}`,
    `- preprocess_ms: ${meta.preprocessMs}`,
    `- api_ms: ${meta.apiMs}`,
    `- total_ms: ${meta.totalMs}`,
  ];
  return lines.join("\n");
}

/**
 * Redact secrets from paths/URLs in user-facing errors
 */
export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/([?&](api[_-]?key|token|key|secret|password)=)[^&\s]+/gi, "$1***")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer ***");
}
