# Changelog

All notable changes to this project will be documented in this file.

## [1.2.2] - 2025-11-20

### Added
- ✨ **@ 路径支持**: 自动处理 Claude Code 的 @ 文件引用前缀，修复第一次调用失败的问题
- 📝 **智能 Prompt**: 通用请求自动添加详细指引，保证全面分析

### Changed
- 🔧 **Prompt 统一**: 简化为单一通用 prompt，智能处理不同场景
- ✨ **表述优化**: 融合 Minimax 的经典表述，强调“不遗漏细节”和“完整提取”
- 📚 **文档更新**: 更新项目结构，添加 qwen-client.ts 和测试文件

### Fixed
- 🐛 **@ 路径问题**: 修复 Claude Code 中 `@folder/image.png` 导致的路径错误
- 🐛 **编译错误**: 修复 image-processor.ts 中重复声明的变量

### Technical Details
- 新增 `stripAtPrefix()` 函数处理 Claude Code 的文件引用语法
- 简化 `buildAnalysisPrompt()` 从两套逻辑到单一逻辑
- 添加智能请求检测，自动补充详细分析指引
- 在 minimax_mcp 上验证修复，真实 API 测试通过

## [1.2.1] - 2025-11-18

### Changed
- 📝 **文档优化**: 精简 README，移除冲余配置文件路径说明
- 📝 **更新日志简化**: 将 README 中的详细更新日志替换为 CHANGELOG.md 链接
- ✨ **Qwen 测试示例**: 添加 Qwen3-VL-Flash 本地测试命令
- 💰 **定价信息**: 添加阿里云通义千问定价参考链接
- 📋 **模型对比**: 更新模型选择表，完善 Qwen3-VL-Flash 信息
- 🔗 **API Key 获取**: 添加阿里云百炼 API Key 获取指南
- 📚 **相关链接**: 新增阿里云百炼平台和 Qwen3-VL 文档链接
- 🐛 **错误信息**: 优化 API 调用失败排查提示，包含阿里云账户

### Fixed
- 🐛 **描述修正**: 修正 package.json 中模型名称为 qwen3-vl-flash
- 📝 **注释精简**: 简化 prompts.ts 注释头

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
