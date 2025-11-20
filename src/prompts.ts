/**
 * 视觉提示词
 */

/**
 * 构建图片分析提示词
 */
export function buildAnalysisPrompt(userPrompt: string): string {
  // 判断是否为通用请求（过于简单或模糊）
  const isGenericRequest = /^(分析|查看|识别|描述|理解|看一下|看看|分析一下|请分析|analyze|describe|view|check)/i.test(userPrompt) 
    && userPrompt.length < 30;
  
  // 如果是通用请求，添加详细指引
  const finalPrompt = isGenericRequest 
    ? `请详细分析这张图片的内容，包括图片中的主要元素、文字、场景等所有可见信息。`
    : userPrompt;
  
  return `
<image_analysis>
${finalPrompt}

分析要求：
1. **系统性观察**：从整体到细节，全面观察图片内容（不遗漏任何细节）
2. **准确识别**：精确识别并完整提取所有文字、符号、代码、数字等
3. **结构化输出**：使用清晰的标题和列表组织信息
4. **具体可执行**：如果涉及问题或代码，提供具体的解决方案

请用中文清晰描述。
</image_analysis>
`.trim();
}
