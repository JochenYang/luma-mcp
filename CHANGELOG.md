# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2025-11-13

### Added
- 🖼️ **Data URI 支持**: 支持接收 base64 编码的图片数据 (data:image/png;base64,...)
- 🚀 **为未来做准备**: 当 MCP 客户端支持时，可直接传递用户粘贴的图片

### Changed
- 📝 更新工具描述，说明支持三种输入格式：本地路径、URL、Data URI
- ✅ 新增 Data URI 格式验证（MIME 类型、大小限制）

## [1.1.0] - 2025-11-13

### Added
- 🎉 **多模型支持**: 新增硅基流动 DeepSeek-OCR 支持
- 🆓 **免费选项**: DeepSeek-OCR 通过硅基流动提供完全免费的 OCR 服务
- 📐 **统一接口**: 创建 VisionClient 接口，支持灵活扩展更多视觉模型
- ⚙️ **灵活配置**: 通过 `MODEL_PROVIDER` 环境变量轻松切换模型

### Changed
- 🔧 环境变量命名优化，支持通用配置（`MODEL_NAME`、`MAX_TOKENS` 等）
- 📝 更新文档，提供双模型配置说明和选择建议
- 🏗️ 重构代码结构，提升可维护性

### Technical Details
- 新增文件:
  - `src/vision-client.ts` - 视觉模型客户端统一接口
  - `src/siliconflow-client.ts` - 硅基流动 API 客户端实现
  - `.env.example` - 配置示例文件
- 修改文件:
  - `src/config.ts` - 支持多提供商配置
  - `src/zhipu-client.ts` - 实现 VisionClient 接口
  - `src/index.ts` - 根据配置动态选择客户端
  - `README.md` - 完整的双模型使用文档

## [1.0.3] - 2025-11-XX

### Features
- 基于智谱 GLM-4.5V 的视觉理解能力
- 支持本地文件和远程 URL
- 内置重试机制
- 思考模式支持

---

**模型对比**:

| 特性     | GLM-4.5V | DeepSeek-OCR |
|----------|----------|--------------|
| 费用     | 收费     | **免费**     |
| 中文理解 | 优秀     | 良好         |
| OCR 能力 | 良好     | **优秀**     |
| 思考模式 | ✅        | ❌            |

**推荐使用场景**:
- 需要 OCR/文字识别 → **DeepSeek-OCR** (免费)
- 需要深度图片理解 → **GLM-4.5V**
