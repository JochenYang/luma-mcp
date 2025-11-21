/**
 * 视觉模型客户端统一接口
 */

export interface VisionClient {
  /**
   * 分析图片
   * @param imageDataUrl 图片 Data URL 或 URL
   * @param prompt 分析提示词
   * @param enableThinking 是否启用思考模式（如果模型支持）
   * @returns 分析结果文本
   */
  analyzeImage(
    imageDataUrl: string,
    prompt: string,
    enableThinking?: boolean
  ): Promise<string>;

  /**
   * 获取模型名称
   */
  getModelName(): string;
}
