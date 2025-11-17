# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-11-17

### Added
- 🎉 **第三个视觉模型**: 新增阿里云通义千问 Qwen3-VL-Flash 支持
- 💡 **思考模式**: Qwen3-VL-Flash 支持深度思考模式（enable_thinking），提升复杂场景分析准确性
- ⚡ **高性价比**: Flash 版本速度更快、成本更低，适合大量使用
- 🔌 **OpenAI 兼容**: 使用阿里云百炼的 OpenAI 兼容 API，统一接口设计
- 🌐 **多地域支持**: 默认使用北京地域，支持新加坡地域配置

### Changed
- ⚙️ 新增 `MODEL_PROVIDER=qwen` 和 `DASHSCOPE_API_KEY` 环境变量配置
- 📝 更新所有文档（中英文），添加 Qwen3-VL-Flash 配置示例
- 💰 默认使用 qwen3-vl-flash 模型，兹顾性能与成本
- 🏗️ 重构客户端构造函数，统一参数传递方式

### Technical Details
- 新增文件:
  - `src/qwen-client.ts` - 阿里云通义千问 VL API 客户端实现
- 修改文件:
  - `src/config.ts` - 添加 'qwen' 提供商支持
  - `src/zhipu-client.ts` - 重构构造函数，支持独立参数
  - `src/siliconflow-client.ts` - 重构构造函数，支持独立参数
  - `src/index.ts` - 添加 Qwen 客户端初始化逻辑
  - `package.json` - 更新版本至 1.2.0，添加 qwen/aliyun/dashscope 关键词

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

## [1.0.3] - 2025-11-12

### Features
- 基于智谱 GLM-4.5V 的视觉理解能力
- 支持本地文件和远程 URL
- 内置重试机制
- 思考模式支持

---

**模型对比**:

|| 特性     | GLM-4.5V | DeepSeek-OCR | Qwen3-VL-Flash |
||----------|----------|--------------|----------------|
|| 提供商   | 智谱清言 | 硅基流动     | 阿里云百炼     |
|| 费用     | 收费     | **免费**     | 收费           |
|| 中文理解 | 优秀     | 良好         | **优秀**       |
|| OCR 能力 | 良好     | **优秀**     | 优秀           |
|| 思考模式 | ✅        | ❌            | ✅              |
|| 速度/成本 | 中等     | 免费         | **快/低**      |
|| 综合能力 | 良好     | OCR专精      | **优秀**       |
|| 3D定位   | ❌        | ❌            | ✅              |

**推荐使用场景**:
- 需要 OCR/文字识别 → **DeepSeek-OCR** (免费)
- 需要深度图片理解 → **Qwen3-VL-Flash** 或 **GLM-4.5V**
- 需要思考模式 → **Qwen3-VL-Flash** 或 **GLM-4.5V**
- 需要高性价比 → **Qwen3-VL-Flash** (速度快、成本低)
- 需要 3D 定位/复杂分析 → **Qwen3-VL-Flash**
