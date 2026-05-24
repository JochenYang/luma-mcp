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
        // 4xx 客户端错误直接抛出，不重试（429 Too Many Requests 除外，应带退避重试）
        if (axios.isAxiosError(error) && error.response?.status) {
          const status = error.response.status;
          if (status >= 400 && status < 500 && status !== 429) {
            throw error;
          }
        }

        if (attempt === maxRetries) {
          throw error;
        }

        // 指数退避 + 随机抖动（1x ~ 1.5x），避免惊群效应
        const delay = initialDelay * Math.pow(2, attempt) * (1 + Math.random() * 0.5);
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
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 创建成功响应
 */
export function createSuccessResponse(data: string) {
  return {
    content: [{ type: 'text' as const, text: data }],
  };
}

/**
 * 创建错误响应
 */
export function createErrorResponse(message: string) {
  return {
    content: [{ type: 'text' as const, text: `错误: ${message}` }],
    isError: true,
  };
}
