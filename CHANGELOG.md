# Changelog

本项目的所有重大变更都将记录在此文件中。

## [1.2.8] - 2025-12-23

### Fixed

- 🐛 **修复 enableThinking 参数传递**: 修复 index.ts 中未将 enableThinking 参数传递给视觉模型客户端的问题
- 🔧 **统一 thinking 逻辑**: 所有支持 thinking 的客户端（智谱、千问、火山方舟）现在使用统一的启用逻辑
- 📝 **完善日志记录**: 千问客户端新增 API 调用日志，与其他客户端保持一致

### Changed

- ♻️ **重构智谱客户端**: 优化 thinking 参数处理逻辑，使代码更清晰易懂
- ♻️ **重构千问客户端**: 统一 thinking 启用逻辑，默认启用思考模式
- ✨ **火山方舟 thinking 支持**: 火山方舟 Doubao 模型现在正确支持思考模式

### Technical Details

- `src/index.ts`: 在 analyzeWithRetry 中正确传递 config.enableThinking 参数
- `src/zhipu-client.ts`: 重构 thinking 逻辑，使用 `if (enableThinking !== false)` 统一判断
- `src/qwen-client.ts`: 
  - 统一 thinking 启用逻辑为 `if (enableThinking !== false)`
  - 新增 logger 导入和 API 调用日志
  - 添加成功/失败日志记录
- `src/volcengine-client.ts`: 
  - 新增 thinking 参数支持到 VolcengineRequest 接口
  - 实现 thinking 模式启用逻辑
  - 更新日志记录以反映实际 thinking 状态

### Thinking Mode Support

现在所有支持的模型都正确启用思考模式：

| 模型                  | Thinking 支持 | 实现方式                        | 默认状态 |
|-----------------------|---------------|---------------------------------|----------|
| 智谱 GLM-4.6V         | ✅             | `thinking: { type: "enabled" }` | 启用     |
| 千问 Qwen3-VL         | ✅             | `extra_body.enable_thinking`    | 启用     |
| 火山方舟 Doubao       | ✅             | `thinking: { type: "enabled" }` | 启用     |
| 硅基流动 DeepSeek-OCR | ❌             | 不支持                          | N/A      |

用户可通过 `ENABLE_THINKING=false` 环境变量禁用思考模式以提升速度和降低成本。

## [1.2.7] - 2025-12-17

### Added

- 🆕 **火山方舟 Provider**: 新增第四个视觉模型提供商 - 火山方舟 Volcengine
- 🎯 **Doubao-Seed-1.6 系列**: 支持 flash、vision、lite 多种版本
- 🔧 **统一配置架构**: 客户端构造函数改为接受 LumaConfig 对象，实现配置集中管理
- 🖼️ **完整图片格式支持**: 火山方舟支持 base64 数据、URL 链接和本地文件

### Changed

- 🏗️ **架构重构**: 三个现有客户端（Zhipu、SiliconFlow、Qwen）重构为统一配置对象模式
- 🗃️ **客户端优化**: 移除硬编码默认值，所有配置统一从环境变量读取
- 📝 **API 格式统一**: 火山方舟客户端改为使用 Chat Completions API 格式，与其他 provider 保持一致
- 📚 **文档完善**: 更新中英文 README，添加火山方舟配置示例和模型对比

### Technical Details

- `src/config.ts`: 新增 volcengine provider 支持，添加 VOLCENGINE_API_KEY 环境变量
- `src/volcengine-client.ts`: 新文件，完整实现 VolcengineClient 类，支持 Chat Completions API
- `src/zhipu-client.ts`: 重构构造函数，移除硬编码参数，支持 LumaConfig
- `src/siliconflow-client.ts`: 重构构造函数，支持统一配置对象
- `src/qwen-client.ts`: 重构构造函数，支持统一配置对象
- `src/index.ts`: 添加 VolcengineClient 导入和实例化逻辑
- `.env.example`: 添加火山方舟配置示例和说明
- `README.md` & `docs/README_EN.md`: 新增火山方舟特性说明和配置示例

### Provider Summary

现在支持 4 个视觉模型提供商:

1. **智谱 GLM-4.6V** (默认): 中文理解优秀，16384 tokens
2. **硅基流动 DeepSeek-OCR**: 免费使用，OCR 能力强
3. **阿里云 Qwen3-VL-Flash**: 速度快成本低，支持思考模式
4. **火山方舟 Doubao-Seed-1.6**: 性价比高，256k 上下文，支持多种版本

## [1.2.6] - 2025-12-16

### Changed

- 🚀 **模型升级**: 更新智谱模型从 GLM-4.5V 升级至 GLM-4.6V，性能和理解能力提升
- 📈 **Token 限制提升**: 默认 maxTokens 从 8192 提升至 16384，支持更详细的分析输出
- 💡 **思考模式默认开启**: ENABLE_THINKING 默认为 true，提供更准确的分析结果
- 🧹 **代码清理**: 移除 prompts.ts 提示词模板文件，简化架构
- 🔧 **TypeScript 优化**: 清理未使用的类型导入，修复 TS6133 警告
- 📝 **文档完善**: 更新中英文 README，强化三种使用方式说明（粘贴图片、本地路径、URL）

### Technical Details

- `src/config.ts`: 更新默认模型为 glm-4.6v，默认 maxTokens 改为 16384，enableThinking 默认为 true
- `src/zhipu-client.ts`: 更新模型引用，清理未使用导入
- `src/siliconflow-client.ts`: 清理未使用的类型导入
- `src/index.ts`: 简化 prompt 处理逻辑，直接使用原始提示词
- 删除 `src/prompts.ts`: 移除 buildAnalysisPrompt 函数
- README 更新: 模型信息、Token 配置、项目结构、思考模式配置

## [1.2.4] - 2025-12-16 (Reverted)

### Note

此版本因代码回滚问题被回退，所有优化内容已整合至 v1.2.6

## [1.2.3] - 2025-11-21

### Changed

- 🧹 **代码清理**: 移除 Claude 特定调试注释和实验性代码
- 📝 **工具描述优化**: 简化和专业化工具说明，提升 AI 模型调用成功率
- 🔧 **路径处理通用化**: 重构 @ 前缀路径处理，移除平台特定命名

### Technical Details

- 移除 Claude 资源读取相关的实验性代码
- 重命名 `stripAtPrefix()` 为 `normalizeImageSourcePath()`
- 清理所有客户端适配器中的调试日志和注释
- 统一代码风格和注释规范

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

|| 特性 | GLM-4.5V | DeepSeek-OCR | Qwen3-VL-Flash |
||----------|----------|--------------|----------------|
|| 提供商 | 智谱清言 | 硅基流动 | 阿里云百炼 |
|| 费用 | 收费 | **免费** | 收费 |
|| 中文理解 | 优秀 | 良好 | **优秀** |
|| OCR 能力 | 良好 | **优秀** | 优秀 |
|| 思考模式 | ✅ | ❌ | ✅ |
|| 速度/成本 | 中等 | 免费 | **快/低** |
|| 综合能力 | 良好 | OCR 专精 | **优秀** |
|| 3D 定位 | ❌ | ❌ | ✅ |

**推荐使用场景**:

- 需要 OCR/文字识别 → **DeepSeek-OCR** (免费)
- 需要深度图片理解 → **Qwen3-VL-Flash** 或 **GLM-4.5V**
- 需要思考模式 → **Qwen3-VL-Flash** 或 **GLM-4.5V**
- 需要高性价比 → **Qwen3-VL-Flash** (速度快、成本低)
- 需要 3D 定位/复杂分析 → **Qwen3-VL-Flash**
