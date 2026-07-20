# Changelog

本项目的所有重大变更都将记录在此文件中。

## [1.6.0] - 2026-07-20

### Added

- OpenAI-compatible client base: shared chat-completions logic; provider files are thin presets
- Optional task_type on image_understand: auto|general|ocr|ui|debug|describe (omit/auto keeps pre-1.6 behavior)
- Response meta (opt-in): INCLUDE_META=true or LUMA_DEBUG=1 appends preprocess/API timing and tile count
- Config hardening: provider allowlist, numeric clamps, missing API key startup warning, MCP server version from package.json
- Unit tests: npm run test:unit

### Changed

- Provider clients refactored onto shared base (behavior-preserving)
- OCR task_type defaults to single-image high-fidelity (skips multi-crop)
- Error messages redact Bearer tokens and common secret query params

### Compatibility

- Single tool name image_understand unchanged
- Existing env vars and provider names unchanged; new env vars are optional

## [1.5.0] - 2026-06-13

### Added

- 🆕 **Custom Provider 支持**: 新增通用 OpenAI 兼容客户端 `CustomClient`，支持任意 OpenAI 兼容端点（OpenAI、OpenRouter、Together AI、Anthropic 代理、本地 vLLM/Ollama 等）
- 🆕 **Provider Registry 模式**: 用 Map 取代 if/else 链，新增 provider 只需添加一行工厂映射
- 🆕 **灵活鉴权配置**: 支持 `bearer` / `x-api-key` / `custom` 三种鉴权方式，自定义模式支持 `{{key}}` 模板替换
- 🆕 **Thinking 模式适配**: CustomClient 支持 `disabled` / `openai` / `qwen_extra_body` 三种 thinking 字段位置配置
- 🆕 **CustomProviderConfig 类型**: `LumaConfig` 新增 `customProvider?` 字段，集中管理自定义 provider 配置
- 🆕 **测试覆盖**: `test/test-custom.ts` 覆盖鉴权头构造、构造函数校验、baseURL 尾斜杠处理、getModelName

### Configuration

使用自定义 provider 的 `.env` 配置示例：

```ini
MODEL_PROVIDER=custom

# 必填三项
CUSTOM_API_KEY=sk-your-key
CUSTOM_BASE_URL=https://your-endpoint.com/v1
CUSTOM_MODEL_NAME=your-model-name

# 可选（都有默认值）
CUSTOM_AUTH_HEADER=bearer         # bearer | x-api-key | custom
CUSTOM_PATH=/chat/completions
CUSTOM_TIMEOUT_MS=60000
CUSTOM_THINKING_MODE=disabled     # disabled | openai | qwen_extra_body

# 自定义 Header（authHeader=custom 时使用）
CUSTOM_AUTH_HEADER=custom
CUSTOM_AUTH_HEADER_VALUE="X-API-Key: {{key}}"
```

### Technical Details

- 新增文件:
  - `src/custom-client.ts` — 通用 OpenAI 兼容客户端（实现 `VisionClient` 接口）
  - `test/test-custom.ts` — CustomClient 单元测试
- 修改文件:
  - `src/config.ts` — `ModelProvider` union 新增 `custom`，新增 `CustomProviderConfig` 接口，`LumaConfig` 新增 `customProvider?`，`loadConfig` 解析 `CUSTOM_*` 环境变量
  - `src/index.ts` — provider 选择改为 `CLIENT_REGISTRY` 模式，import `CustomClient` 和 `LumaConfig`
  - `.env.example` — 新增 Custom Provider 区块

## [1.4.1] - 2026-06-13

### Fixed

- 🐛 **HTTPS 远程图拉取修复**: `fetchRemoteImage` 改回 `lookup` 函数返回预验证 IP + `https.Agent({ servername })` 组合，避免 TLS 证书主机名校验失败（v1.4.0 引入的回归导致 HTTPS 远程图基本全挂）
- 🐛 **LRU 缓存 key 内存膨胀**: 缓存 key 对长输入（Data URI / 大 URL）走 SHA-256 摘要，避免单条 key 几 MB 导致 100 条可达 500MB+ 内存
- 🐛 **路径遍历 symlink 漏洞**: `loadImageBuffer` 增加 `fs.realpath` 解析真实物理路径，防止符号链接越界
- 🐛 **`isPrivateIP` 覆盖增强**: 补充 `100.64.0.0/10`（CGNAT）、`224.0.0.0/4`（多播）、`255.255.255.255`（广播）、IPv6 `ff00::/8`（多播）检查
- 🐛 **logger 浮动 Promise 崩溃**: `write` 方法最外层 try/catch 兜底，确保 36 个未 await 调用点永不引发 unhandledRejection
- 🐛 **`Buffer.from` 隐式拷贝**: 远程图响应 `Buffer.isBuffer(data)` 判断避免不必要的 Buffer 拷贝
- 🐛 **`withRetry` 跳过 408**: 408 Request Timeout 加入重试白名单（属临时性问题）
- 🐛 **`.env.example` 补充 Hunyuan 区块**: 用户首次配置 `MODEL_PROVIDER=hunyuan` 可直接参考模板
- 🐛 **`test-data-uri.ts` 过时断言**: 第 3 个断言改为 round-trip 字节级语义等价（v1.4.0 后 Data URI 走完整预处理，断言"未修改"已不成立）

### Security

- 🛡️ **HTTPS 兼容性回归修复**: v1.4.0 的 `URL.hostname = IP` 重写在 HTTPS 场景下因证书校验失败而无法拉取远程图，本版本彻底修复

### Technical Details

- `src/image-processor.ts`:
  - `fetchRemoteImage` 改用 axios `lookup` 拦截 + `https.Agent.servername` 方案
  - 新增 `makeCacheKey` 函数（短路径保留可读性，长输入走 SHA-256）
  - `loadImageBuffer` 增加 `fs.realpath` 解析 symlink
  - `isPrivateIP` 补充 CGNAT/multicast/broadcast 段
  - `Buffer.from(response.data as ArrayBuffer)` 改为 `Buffer.isBuffer` 零拷贝
- `src/utils/logger.ts`: `write` 方法最外层 try/catch 兜底
- `src/utils/helpers.ts`: `withRetry` 4xx 跳过增加 408 例外
- `.env.example`: 补充 Hunyuan provider 区块
- `test/test-data-uri.ts`: 第 3 断言改为 round-trip 字节比对

## [1.4.0] - 2026-05-24

### Added

- 🛡️ **SSRF 防护**: 远程图片下载增加 DNS 解析 + 私有 IP 检查 + `maxRedirects: 0`，防止内网地址攻击
- 🛡️ **路径遍历防护**: 本地图片路径增加 `path.resolve()` + 白名单目录校验，防止任意文件读取
- 🛡️ **像素尺寸限制**: 新增 `checkImageResolution` 限制最大 1600 万像素，防止 sharp OOM
- 🆕 **公共常量模块**: 新增 `src/constants.ts`，集中管理视觉提示词和正则常量

### Fixed

- 🐛 **混元 thinking 修复**: `enableThinking` 参数现在正确传递给混元 API 请求体（`enable_thinking` 字段）
- 🐛 **withRetry 4xx 优化**: 4xx 客户端错误（429 除外）不再重试，避免无效配额消耗
- 🐛 **`TEXT_HEAVY_PROMPT_PATTERN` 去重**: 消除三处重复定义，统一从 `constants.ts` 导入

### Changed

- 🚀 **多 tile 裁剪并行化**: `for...of` 串行改为 `Promise.all` 并行，多图场景延迟降低约 65%
- ⚡ **LRU 缓存**: 新增 `LRUCache`，同一图片二次分析时跳过处理直达结果
- ⚡ **axios 实例复用**: SiliconFlow、智谱、火山引擎 3 个客户端统一使用 `axios.create()` 连接池
- ⚡ **日志异步化**: `appendFileSync` → `appendFile`，不再阻塞事件循环
- ⚡ **退避算法加 jitter**: 随机抖动（1x ~ 1.5x），防止并发重试惊群效应
- 🔧 **魔法数字提取**: 压缩/裁剪参数（3072/2048/85/90/3/6）提取为命名常量
- 🔧 **prompt 空值校验**: Zod schema 增加 `.min(1)` 防止空 prompt 调用
- 🔧 **常量统一管理**: `DEFAULT_BASE_VISION_PROMPT` 和 `TEXT_HEAVY_PROMPT_PATTERN` 移入 `constants.ts`
- 🔒 **DNS rebinding 防护**: axios 请求使用已解析 IP 替换 URL hostname，消除二次 DNS 解析窗口
- 🔒 **IPv6 SSRF 覆盖**: `isPrivateIP` 增加 `fc00::/7`（ULA）和 `fe80::/10`（链路本地）检查

### Security

- 🔑 **依赖漏洞修复**: axios `^1.7.9` → `^1.15.1`，MCP SDK `^1.0.4` → `^1.25.4`，消除 12+ 个已知 CVE（含 6 个 HIGH），`npm audit` 现报 **0 vulnerabilities**

### Technical Details

- `src/image-processor.ts`:
  - 新增 `isPrivateIP()` 覆盖全部私有 IP 段（IPv4/IPv6）
  - 新增 `fetchRemoteImage` DNS 预解析 + IP 校验 + `Host` 头保留
  - 新增 `loadImageBuffer` 路径遍历防护（`allowedDirs` 白名单）
  - 新增 `checkImageResolution` 像素尺寸限制（16M pixels）
  - `for...of` 裁剪串行 → `Promise.all` 并行
  - 新增模块级 `LRUCache` 实例，缓存 `prepareVisionImageInput` 结果
  - 所有魔法数字（压缩阈值/质量/尺寸）提取为命名常量
- `src/hunyuan-client.ts`: `HunyuanRequest` 接口 + request body 增加 `enable_thinking`
- `src/utils/helpers.ts`: `withRetry` 4xx（除 429）跳过重试，退避加随机 jitter
- `src/utils/logger.ts`: 所有 `write`/`info`/`error`/`warn`/`debug` 方法改为 async
- `src/siliconflow-client.ts`, `src/zhipu-client.ts`, `src/volcengine-client.ts`: 构造函数创建 `axios.create()` 实例，`analyzeImage` 使用 `this.client.post()`
- `src/constants.ts`: 新文件，导出 `DEFAULT_BASE_VISION_PROMPT` 和 `TEXT_HEAVY_PROMPT_PATTERN`
- `src/index.ts`: 常量导入改为 `constants.ts`，prompt Zod schema 加 `.min(1)`
- `package.json`: axios `^1.7.9` → `^1.15.1`，MCP SDK `^1.0.4` → `^1.25.4`

## [1.3.8] - 2026-05-02

### Fixed

- 🐛 **修复 SiliconFlow 400 错误 (Issue #4)**: 针对 DeepSeek-OCR 的 8K 上下文限制，强制将输出 `max_tokens` 限制在 4096 以内，确保为图片输入留出足够空间。
- 🛡️ **全线模型稳定性增强**: 将全局默认 `MAX_TOKENS` 下调至 8192，并为所有 Provider 增加了安全阈值保护，防止因总长度爆表导致的请求失败。

## [1.3.7] - 2026-04-28

### Changed

- 🧩 **多图输入语义增强**: 多裁剪场景除了发送总览图和局部图，还会自动补充阅读顺序提示，明确第 1 张为总览、后续图片为按顺序排列的局部细节图，减少模型把多张图误当作无关图片的情况
- 🖼️ **Data URI 纳入统一预处理**: 粘贴图片不再绕过图片处理链路，现已与本地文件、远程 URL 一样支持统一校验、压缩、保真和分片
- 📐 **自适应裁剪策略**: 多裁剪从固定四宫格升级为按长宽比自适应切分，长图优先纵向分条、宽图优先横向分条，并加入少量重叠以减少文字和边界内容被切断
- 🔎 **文本密集场景自动识别**: 文本优先处理不再只依赖 prompt 关键词，未显式命中时会根据图片尺寸、长宽比和格式自动判断是否保留更多细节
- ♻️ **重试范围优化**: 将图片准备与模型调用重试拆开，避免 provider 重试时重复执行远程下载、sharp 解码和多裁剪
- 🧪 **回归验证增强**: 新增独立的图片处理回归脚本，覆盖 Data URI、多裁剪方向、自动文本模式和多图提示生成

### Technical Details

- `src/image-processor.ts`:
  - 新增 Data URI 解码与统一缓冲区读取逻辑
  - 新增自适应裁剪区域生成与多图输入提示生成
  - 新增基于图片元数据的文本密集场景自动判断
- `src/index.ts`: 主链路接入多图阅读顺序提示，并将模型重试范围缩小到 API 调用阶段
- `test/test-local.ts`: 本地测试脚本同步到与主链路一致的多图输入策略
- `test/image-processor-regression.ts`: 新增无需真实模型密钥的回归测试脚本
- `package.json`: 去除 BOM，避免部分运行时工具解析失败

## [1.3.6] - 2026-03-06

### Changed

- 🖼️ **视觉理解链路增强**: 恢复并正式接通多裁剪能力，支持按配置将原图与局部裁剪图一并送入视觉模型，提升长图、代码截图、密集 UI 和 OCR 场景的细节识别稳定性
- 🔍 **统一图片预处理**: 远程 URL 不再直接透传给模型，改为纳入与本地文件一致的拉取、校验、压缩与分片流程，减少不同图片来源导致的理解波动
- 🧠 **文本密集场景优化**: 主流程增加面向文字内容的保真处理策略，在代码、表格、日志、文档截图等场景中尽量保留可读细节
- ⚙️ **配置项重新接通**: `MULTI_CROP` 与 `MULTI_CROP_MAX_TILES` 恢复为真实生效的运行时配置，和文档描述保持一致
- 🧪 **验证链路补齐**: 更新本地测试脚本与类型检查配置，确保多图输入和图片处理逻辑具备基础回归校验
- 📝 **文档整理**: README 与英文文档同步收敛到当前实现，保留项目结构、快捷配置和必要说明，移除重复与过时描述

### Technical Details

- `src/index.ts`: 接入多裁剪主流程，并根据提示词对文本密集图片采用更保真的处理方式
- `src/image-processor.ts`: 统一本地文件与远程 URL 的预处理路径，支持多裁剪与单图输出
- `src/vision-client.ts` 及各 provider 客户端: 扩展为支持多图输入
- `src/config.ts`: 重新启用 `multiCrop` / `multiCropMaxTiles` 配置
- `test/test-local.ts`、`test/test-qwen.ts`、`tsconfig.check.json`: 补齐本地验证与类型检查
- `README.md`、`docs/README_EN.md`: 更新功能说明与配置示例，压缩冗余内容

## [1.3.5] - 2026-02-14

### Changed

- 🔄 **工具重命名与定位升级**: 将 `analyze_image` 重命名为 `image_understand`，从单纯的"分析"升级为"理解"，更能体现大模型的认知能力。
- 🧠 **视觉认知协议 v2.0**: 引入全新的内部视觉认知协议 (Visual Cognitive Protocol)，强制模型执行严谨的分析流程：
  - **场景分类**: 自动识别图片类型（UI/Photo/Code）。
  - **空间扫描**: 强制进行 Vertical/Horizontal 结构分析，根治空间幻觉。
  - **异常归因**: 引入通用规则判断"截断"与"缺损"，解决模型显示不全的误判问题。

### Technical Details

- `src/index.ts`:
  - 工具注册名从 `analyze_image` 变更为 `image_understand`。
  - 显示名称更新为 `图像理解工具`。
  - 系统 Prompt 完全重构，植入 `Visual Cognitive Protocol` 逻辑。

## [1.3.4] - 2026-01-06

### Changed

- 🔄 **回退到简洁实现**: 移除 v1.3.2 和 v1.3.3 引入的复杂逻辑,回归原生多模态能力
  - 删除意图识别 (`getPromptProfile`)
  - 删除多阶段 prompt 构建 (`buildStagePrompt`)
  - 删除图片分块处理 (`extractWithVariants`, `imageToBase64Variants`)
  - 删除两阶段调用逻辑 (`needsTwoPass`)
  - 删除 `multiCropEnabled` 和 `multiCropMaxTiles` 配置字段
- ✨ **恢复核心原则**: 一次 API 调用完成,完全依赖原生视觉模型能力
- 📝 **优化视觉提示词**: 重新设计 `DEFAULT_BASE_VISION_PROMPT`,激发而非限制模型能力
  - 明确角色定位: "专业的视觉理解助手"
  - 激活视觉能力: "充分发挥你的视觉理解能力,仔细观察图片中的所有细节"
  - 提供场景指引: 针对界面/代码/日志/图表给出分析建议
  - 鼓励推理: "如果需要推断或建议,请基于可见证据并说明你的推理过程"
- 🔧 **修复启动问题**: 移除启动时的 API Key 强制检查,允许服务器在未配置时也能启动并注册工具
- 📝 **保留可选增强**: 仍支持通过 `BASE_VISION_PROMPT` 环境变量自定义或禁用基础提示词

### Fixed

- 🐛 **修复 MCP 工具注册失败**: 之前因启动时检查 API Key 导致服务器无法启动,工具无法注册。现在 API Key 在实际调用时才验证

### Rationale

v1.3.2/v1.3.3 引入的"优化"实际上:

- 增加了不必要的复杂度 (200+ 行额外代码)
- 增加了 API 调用次数和成本 (两阶段调用)
- 重复造轮子 (手动图片分块,而模型已内置高分辨率处理)
- 限制了模型的自然理解能力 (过度的意图分类和 prompt 工程)

回退后的实现:

- ✅ 代码量减少 60%,逻辑清晰
- ✅ 一次调用完成,延迟和成本更低
- ✅ 完全发挥原生多模态模型能力
- ✅ 符合"简单优先"的设计原则
- ✅ 实测视觉理解效果优秀(能准确分析页面结构、设计细节、用 ASCII 图展示布局)

### Technical Details

- `src/index.ts`: 回退到 v1.3.1 的简洁实现,核心流程仅 4 步:
  1. 验证图片来源
  2. 处理图片 (读取或返回 URL)
  3. 拼接优化后的基础提示词和用户提示词
  4. 一次调用视觉模型完成分析
- `src/config.ts`:
  - 删除 `multiCropEnabled` 和 `multiCropMaxTiles` 字段
  - 移除启动时的 API Key 强制检查,改为返回空字符串允许服务器启动
- `DEFAULT_BASE_VISION_PROMPT`: 从限制性规则改为激发性指引,更好地发挥原生多模态能力

## [1.3.3] - 2026-01-23

### Changed

- 🔎 **多裁剪分析**: 大图文字场景启用分片提取并合并结果，支持开关与分片数控制

## [1.3.2] - 2026-01-20

### Changed

- 📝 **文档更新**: README 中补充混元模型可选 ID（hunyuan-t1-vision-20250916 / HY-vision-1.5-instruct）
- 🌍 **英文文档同步**: 更新 README_EN 的混元配置与模型对比信息
- 🧠 **视觉理解优化**: 增加两阶段提取/回答策略，短问题与报错场景优先提取可见信息

## [1.3.1] - 2026-01-06

### Changed

- 📝 **优化视觉提示词**: 修改 DEFAULT_BASE_VISION_PROMPT 第 4 条规则,避免在识图时给出不必要的免责声明
  - 旧规则: "任何基于猜测的内容,都要使用'从截图中无法确认,但一般建议……'这样的表述"
  - 新规则: "只在确实需要推测时才说明'无法从截图确认';对于可以直接观察到的内容,直接描述即可,无需添加任何免责声明"

### Technical Details

- `src/index.ts`: 更新 DEFAULT_BASE_VISION_PROMPT 数组第 4 条规则,减少模型在描述可见内容时的过度谨慎

## [1.3.0] - 2025-12-31

### Fixed

- 🐛 **修复 npm 包包含源码问题**: 添加 `files` 字段到 `package.json`，确保发布到 npm 时只包含 `build/` 编译文件，不包含 `src/` 源码
- 💡 **优化 API Key 错误提示**: 改进配置缺失时的错误信息，更清晰地指导用户如何在 MCP 设置中配置

### Technical Details

- `package.json`: 新增 `files` 字段，指定只发布 `build/`、`package.json`、`README.md`
- `src/config.ts`: 更新 API Key 缺失错误信息，添加"Please configure it in your MCP settings"提示

## [1.2.9] - 2025-12-31

### Changed

- ✨ **视觉基础提示词优化**: 重写默认视觉系统提示词，强调基于截图中可见事实进行结构/布局/组件分析，减少对实现细节和不可见交互的主观猜测
- 📝 **工具说明收紧边界**: 更新 `image_understand` 工具描述，建议上层模型直接传入用户原始问题，避免重复封装复杂视觉 prompt

### Technical Details

- `src/index.ts`: 调整 `DEFAULT_BASE_VISION_PROMPT` 内容与结构，增加对“只说可见事实、推测需显式标注”的约束；完善工具描述文案
- `src/config.ts`: 明确 `ENABLE_THINKING` 配置逻辑，默认启用思考模式，仅当环境变量显式设置为 `false` 时关闭

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
| --------------------- | ------------- | ------------------------------- | -------- |
| 智谱 GLM-4.6V         | ✅            | `thinking: { type: "enabled" }` | 启用     |
| 千问 Qwen3-VL         | ✅            | `extra_body.enable_thinking`    | 启用     |
| 火山方舟 Doubao       | ✅            | `thinking: { type: "enabled" }` | 启用     |
| 硅基流动 DeepSeek-OCR | ❌            | 不支持                          | N/A      |

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
