/**
 * 工具函数
 */

/**
 * 带重试机制的异步函数包装器
 */
export function withRetry<T>(
  fn: (...args: any[]) => Promise<T>,
  maxRetries: number = 2,
  initialDelay: number = 1000
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // 指数退避
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
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
