[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/jochenyang-luma-mcp-badge.png)](https://mseep.ai/app/jochenyang-luma-mcp)

# Luma MCP

多模型视觉理解 MCP 服务器，为不支持原生视觉能力的 AI 助手提供统一的图片分析能力。

[English](./docs/README_EN.md) | 中文

## 特性

- 多模型支持：GLM-4.6V、DeepSeek-OCR、Qwen3-VL-Flash、Doubao-Seed-1.6、Hunyuan-Vision-1.5
- 单工具设计：统一通过 `image_understand` 完成图片理解
- 面向复杂截图优化：支持大图多裁剪、文本密集场景保真处理
- 统一预处理链路：本地文件、远程 URL、Data URI 都进入同一套处理流程
- 适用场景完整：代码截图、UI 截图、报错截图、文档截图、OCR
- 标准 MCP 协议：可接入 Claude Desktop、Cline、Claude Code 等客户端
- 内置重试：降低临时网络或模型请求失败带来的影响

## 快速开始

### 前置要求

- Node.js >= 18
- 任意一个模型提供商的 API Key

### 安装

```bash
git clone https://github.com/JochenYang/luma-mcp.git
cd luma-mcp
npm install
npm run build
```

也可以在 MCP 配置中直接使用：

```bash
npx -y luma-mcp
```

## 配置

### Claude Desktop 示例

```json
{
  "mcpServers": {
    "luma": {
      "command": "npx",
      "args": ["-y", "luma-mcp"],
      "env": {
        "MODEL_PROVIDER": "zhipu",
        "ZHIPU_API_KEY": "your-api-key"
      }
    }
  }
}
```

把 `MODEL_PROVIDER` 和对应密钥替换为你实际使用的提供商：

- `zhipu` -> `ZHIPU_API_KEY`
- `siliconflow` -> `SILICONFLOW_API_KEY`
- `qwen` -> `DASHSCOPE_API_KEY`
- `volcengine` -> `VOLCENGINE_API_KEY`
- `hunyuan` -> `HUNYUAN_API_KEY`

可选模型覆盖：

- `MODEL_NAME=doubao-seed-1-6-flash-250828`
- `MODEL_NAME=hunyuan-t1-vision-20250916`
- `MODEL_NAME=HY-vision-1.5-instruct`

### 快捷配置命令

#### Claude Code

```bash
# Zhipu
claude mcp add -s user luma-mcp --env MODEL_PROVIDER=zhipu --env ZHIPU_API_KEY=your-api-key -- npx -y luma-mcp

# SiliconFlow
claude mcp add -s user luma-mcp --env MODEL_PROVIDER=siliconflow --env SILICONFLOW_API_KEY=your-api-key -- npx -y luma-mcp

# Qwen
claude mcp add -s user luma-mcp --env MODEL_PROVIDER=qwen --env DASHSCOPE_API_KEY=your-api-key -- npx -y luma-mcp

# Volcengine
claude mcp add -s user luma-mcp --env MODEL_PROVIDER=volcengine --env VOLCENGINE_API_KEY=your-api-key --env MODEL_NAME=doubao-seed-1-6-flash-250828 -- npx -y luma-mcp

# Hunyuan
claude mcp add -s user luma-mcp --env MODEL_PROVIDER=hunyuan --env HUNYUAN_API_KEY=your-api-key --env MODEL_NAME=hunyuan-t1-vision-20250916 -- npx -y luma-mcp
```

#### 本地开发模式

```json
{
  "mcpServers": {
    "luma": {
      "command": "node",
      "args": ["D:\\codes\\luma-mcp\\build\\index.js"],
      "env": {
        "MODEL_PROVIDER": "zhipu",
        "ZHIPU_API_KEY": "your-api-key"
      }
    }
  }
}
```

#### Cline / VSCode

在项目根目录或 `.vscode/` 下创建 `mcp.json`：

```json
{
  "mcpServers": {
    "luma": {
      "command": "npx",
      "args": ["-y", "luma-mcp"],
      "env": {
        "MODEL_PROVIDER": "zhipu",
        "ZHIPU_API_KEY": "your-api-key"
      }
    }
  }
}
```

## 使用方式

### `image_understand`

参数：

- `image_source`：本地路径、HTTP(S) 图片 URL、Data URI
- `prompt`：用户对图片的原始问题

示例：

```typescript
image_understand({
  image_source: "./screenshot.png",
  prompt: "分析这个页面的布局和主要组件结构",
});

image_understand({
  image_source: "./code-error.png",
  prompt: "这段代码为什么报错？请给出修复建议",
});

image_understand({
  image_source: "https://example.com/ui.png",
  prompt: "找出这个界面的可用性问题",
});
```

### 使用建议

- 非视觉模型需要明确提示调用 MCP 工具
- 代码截图、OCR、长图、表格这类文本密集图片会自动启用更保真的处理方式
- 大图会按配置自动生成原图加裁剪图，提高细节理解能力

## 环境变量

### 通用配置

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `MODEL_PROVIDER` | `zhipu` | 模型提供商：`zhipu`、`siliconflow`、`qwen`、`volcengine`、`hunyuan` |
| `MODEL_NAME` | 自动选择 | 模型名称 |
| `MAX_TOKENS` | `16384` | 最大生成 token 数 |
| `TEMPERATURE` | `0.7` | 温度参数 |
| `TOP_P` | `0.7` | Top-p 参数 |
| `ENABLE_THINKING` | `true` | 启用思考模式（若模型支持） |
| `MULTI_CROP` | `true` | 启用大图多裁剪分析 |
| `MULTI_CROP_MAX_TILES` | `5` | 最大分片数（含原图） |
| `BASE_VISION_PROMPT` | 内置默认值 | 自定义基础视觉提示词 |

### 提供商密钥

| 提供商 | 必填环境变量 | 默认模型 |
| --- | --- | --- |
| Zhipu | `ZHIPU_API_KEY` | `glm-4.6v` |
| SiliconFlow | `SILICONFLOW_API_KEY` | `deepseek-ai/DeepSeek-OCR` |
| Qwen | `DASHSCOPE_API_KEY` | `qwen3-vl-flash` |
| Volcengine | `VOLCENGINE_API_KEY` | `doubao-seed-1-6-flash-250828` |
| Hunyuan | `HUNYUAN_API_KEY` | `hunyuan-t1-vision-20250916` |

## 本地测试

```bash
# 基础测试
npm run test:local ./test.png

# 带问题测试
npm run test:local ./code-error.png "这段代码为什么报错？"

# 远程图片测试
npm run test:local https://example.com/image.jpg

# 检查源码和测试脚本类型
npm run typecheck
```

## 图片与处理限制

- 支持格式：JPG、PNG、WebP、GIF
- 最大输入大小：10MB
- 超过 2MB 的图片会自动压缩
- 远程 URL 会先拉取到统一预处理链路，再发送给模型

## 项目结构

```text
luma-mcp/
├── src/
│   ├── index.ts              # MCP 服务器入口
│   ├── config.ts             # 配置管理
│   ├── vision-client.ts      # 视觉模型客户端接口
│   ├── zhipu-client.ts       # GLM-4.6V 客户端
│   ├── siliconflow-client.ts # DeepSeek-OCR 客户端
│   ├── qwen-client.ts        # Qwen3-VL 客户端
│   ├── volcengine-client.ts  # Doubao-Seed-1.6 客户端
│   ├── hunyuan-client.ts     # Hunyuan-Vision-1.5 客户端
│   ├── image-processor.ts    # 图片预处理与裁剪
│   └── utils/
│       ├── helpers.ts
│       └── logger.ts
├── test/
│   ├── test-local.ts
│   ├── test-qwen.ts
│   ├── test-deepseek-raw.ts
│   └── test-data-uri.ts
├── docs/
│   └── README_EN.md
├── build/
├── package.json
└── tsconfig.json
```

## 模型选择建议

- OCR、文字识别：DeepSeek-OCR
- 快速低成本通用分析：Qwen3-VL-Flash
- 高性价比通用分析：Doubao-Seed-1.6
- 深度图片理解：GLM-4.6V
- 复杂图文推理、多语言：Hunyuan-Vision-1.5

## 开发

```bash
npm run watch
npm run build
npm run typecheck
```

## 相关链接

- [智谱开放平台](https://open.bigmodel.cn/)
- [硅基流动平台](https://cloud.siliconflow.cn/)
- [阿里云百炼](https://bailian.console.aliyun.com/)
- [火山方舟](https://console.volcengine.com/ark)
- [腾讯混元](https://cloud.tencent.com/product/hunyuan)
- [MCP 协议](https://modelcontextprotocol.io/)

## 更新历史

[CHANGELOG.md](./CHANGELOG.md)

## 许可证

MIT
