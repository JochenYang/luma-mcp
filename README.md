# Luma MCP

多模型视觉理解 MCP 服务器，为不支持图片理解的 AI 助手提供视觉能力。

[English](./docs/README_EN.md) | 中文

## 特性

- **多模型支持**: 支持五个视觉模型
  - GLM-4.6V（智谱清言）- 付费，中文理解优秀
  - DeepSeek-OCR（硅基流动）- **免费使用**，OCR 能力强
  - Qwen3-VL-Flash（阿里云通义千问）- 付费，速度快成本低，支持思考模式
  - Doubao-Seed-1.6（火山方舟）- 付费，性价比高，支持多种版本
  - Hunyuan-Vision-1.5（腾讯混元）- 付费，图文推理强，多语言表现优秀
- **简单设计**: 单一 `analyze_image` 工具处理所有图片分析任务
- **智能理解**: 自动识别代码、UI、错误等不同场景
- **全面支持**: 代码截图、界面设计、错误诊断、OCR 文字识别
- **标准 MCP 协议**: 无缝集成 Claude Desktop、Cline 等 MCP 客户端
- **URL 支持**: 支持本地文件和远程图片 URL
- **重试机制**: 内置指数退避重试，提高可靠性

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- **选择一种模型**：
  - **方案 A**: 智谱 AI API Key ([获取地址](https://open.bigmodel.cn/)) - 中文理解优秀
  - **方案 B**: 硅基流动 API Key ([获取地址](https://cloud.siliconflow.cn/)) - **免费使用**，OCR 能力强
  - **方案 C**: 阿里云百炼 API Key ([获取地址](https://bailian.console.aliyun.com/)) - 速度快成本低，支持思考模式
  - **方案 D**: 火山方舟 API Key ([获取地址](https://console.volcengine.com/ark)) - 性价比高，支持多种版本
- **方案 E**: 腾讯混元 API Key ([获取地址](https://cloud.tencent.com/product/hunyuan)) - 图文推理强，多语言表现优秀

### 安装

#### 方式 1: 本地开发（推荐用于测试）

```bash
git clone https://github.com/JochenYang/luma-mcp.git
cd luma-mcp
npm install
npm run build
```

#### 方式 2: 使用 npx（需要先发布到 npm）

```bash
npx luma-mcp
```

### 配置

#### Claude Desktop

**方案 A: 使用智谱 GLM-4.6V**:

```json
{
  "mcpServers": {
    "luma": {
      "command": "npx",
      "args": ["-y", "luma-mcp"],
      "env": {
        "ZHIPU_API_KEY": "your-zhipu-api-key"
      }
    }
  }
}
```

**方案 B: 使用硅基流动 DeepSeek-OCR（免费）**:

```json
{
  "mcpServers": {
    "luma": {
      "command": "npx",
      "args": ["-y", "luma-mcp"],
      "env": {
        "MODEL_PROVIDER": "siliconflow",
        "SILICONFLOW_API_KEY": "your-siliconflow-api-key"
      }
    }
  }
}
```

**方案 C: 使用阿里云通义千问 Qwen3-VL-Flash**:

```json
{
  "mcpServers": {
    "luma": {
      "command": "npx",
      "args": ["-y", "luma-mcp"],
      "env": {
        "MODEL_PROVIDER": "qwen",
        "DASHSCOPE_API_KEY": "your-dashscope-api-key"
      }
    }
  }
}
```

**方案 D: 使用火山方舟 Doubao-Seed-1.6**:

```json
{
  "mcpServers": {
    "luma": {
      "command": "npx",
      "args": ["-y", "luma-mcp"],
      "env": {
        "MODEL_PROVIDER": "volcengine",
        "VOLCENGINE_API_KEY": "your-volcengine-api-key",
        "MODEL_NAME": "doubao-seed-1-6-flash-250828"
      }
    }
  }
}
```

**方案 E: 使用腾讯混元 Hunyuan-Vision-1.5**:

MODEL_NAME 可选：`hunyuan-t1-vision-20250916`（默认）或 `HY-vision-1.5-instruct`

```json
{
  "mcpServers": {
    "luma": {
      "command": "npx",
      "args": ["-y", "luma-mcp"],
      "env": {
        "MODEL_PROVIDER": "hunyuan",
        "HUNYUAN_API_KEY": "your-hunyuan-api-key",
        "MODEL_NAME": "hunyuan-t1-vision-20250916"
      }
    }
  }
}
```

**本地开发（智谱）**:

```json
{
  "mcpServers": {
    "luma": {
      "command": "node",
      "args": ["D:\\codes\\luma-mcp\\build\\index.js"],
      "env": {
        "ZHIPU_API_KEY": "your-zhipu-api-key"
      }
    }
  }
}
```

**本地开发（硅基流动）**:

```json
{
  "mcpServers": {
    "luma": {
      "command": "node",
      "args": ["D:\\codes\\luma-mcp\\build\\index.js"],
      "env": {
        "MODEL_PROVIDER": "siliconflow",
        "SILICONFLOW_API_KEY": "your-siliconflow-api-key"
      }
    }
  }
}
```

**本地开发（腾讯混元）**:

```json
{
  "mcpServers": {
    "luma": {
      "command": "node",
      "args": ["D:\\codes\\luma-mcp\\build\\index.js"],
      "env": {
        "MODEL_PROVIDER": "hunyuan",
        "HUNYUAN_API_KEY": "your-hunyuan-api-key",
        "MODEL_NAME": "hunyuan-t1-vision-20250916"
      }
    }
  }
}
```

配置完成后重启 Claude Desktop。

#### Cline (VSCode)

在项目根目录或 `.vscode/` 目录下创建 `mcp.json`

**方案 A: 使用智谱 GLM-4.6V**:

```json
{
  "mcpServers": {
    "luma": {
      "command": "npx",
      "args": ["-y", "luma-mcp"],
      "env": {
        "ZHIPU_API_KEY": "your-zhipu-api-key"
      }
    }
  }
}
```

**方案 B: 使用硅基流动 DeepSeek-OCR（免费）**:

```json
{
  "mcpServers": {
    "luma": {
      "command": "npx",
      "args": ["-y", "luma-mcp"],
      "env": {
        "MODEL_PROVIDER": "siliconflow",
        "SILICONFLOW_API_KEY": "your-siliconflow-api-key"
      }
    }
  }
}
```

**方案 C: 使用阿里云通义千问 Qwen3-VL-Flash**:

```json
{
  "mcpServers": {
    "luma": {
      "command": "npx",
      "args": ["-y", "luma-mcp"],
      "env": {
        "MODEL_PROVIDER": "qwen",
        "DASHSCOPE_API_KEY": "your-dashscope-api-key"
      }
    }
  }
}
```

**方案 D: 使用火山方舟 Doubao-Seed-1.6**:

```json
{
  "mcpServers": {
    "luma": {
      "command": "npx",
      "args": ["-y", "luma-mcp"],
      "env": {
        "MODEL_PROVIDER": "volcengine",
        "VOLCENGINE_API_KEY": "your-volcengine-api-key",
        "MODEL_NAME": "doubao-seed-1-6-flash-250828"
      }
    }
  }
}
```

**方案 E: 使用腾讯混元 Hunyuan-Vision-1.5**:

MODEL_NAME 可选：`hunyuan-t1-vision-20250916`（默认）或 `HY-vision-1.5-instruct`

```json
{
  "mcpServers": {
    "luma": {
      "command": "npx",
      "args": ["-y", "luma-mcp"],
      "env": {
        "MODEL_PROVIDER": "hunyuan",
        "HUNYUAN_API_KEY": "your-hunyuan-api-key",
        "MODEL_NAME": "hunyuan-t1-vision-20250916"
      }
    }
  }
}
```

#### Claude Code (命令行)

**使用智谱 GLM-4.6V**:

```bash
claude mcp add -s user luma-mcp --env ZHIPU_API_KEY=your-api-key -- npx -y luma-mcp
```

**使用硅基流动 DeepSeek-OCR（免费）**:

```bash
claude mcp add -s user luma-mcp --env MODEL_PROVIDER=siliconflow --env SILICONFLOW_API_KEY=your-api-key -- npx -y luma-mcp
```

**使用阿里云通义千问 Qwen3-VL-Flash**:

```bash
claude mcp add -s user luma-mcp --env MODEL_PROVIDER=qwen --env DASHSCOPE_API_KEY=your-api-key -- npx -y luma-mcp
```

**使用火山方舟 Doubao-Seed-1.6**:

```bash
claude mcp add -s user luma-mcp --env MODEL_PROVIDER=volcengine --env VOLCENGINE_API_KEY=your-api-key --env MODEL_NAME=doubao-seed-1-6-flash-250828 -- npx -y luma-mcp
```

**使用腾讯混元 Hunyuan-Vision-1.5**:

```bash
claude mcp add -s user luma-mcp --env MODEL_PROVIDER=hunyuan --env HUNYUAN_API_KEY=your-api-key --env MODEL_NAME=hunyuan-t1-vision-20250916 -- npx -y luma-mcp
```

#### 其他工具

更多 MCP 客户端配置方法请参考[智谱官方文档](https://docs.bigmodel.cn/cn/coding-plan/mcp/vision-mcp-server#claude-code)

## 使用方法

### 重要提示

**MCP 工具调用机制**:

- MCP 工具需要 AI 模型**主动调用**才会执行
- 如果使用的 AI 模型本身支持视觉（如 Claude 4.5 Sonnet），它会优先使用自己的视觉能力
- Luma MCP 主要服务于**不支持视觉的模型**（如 GPT-4、Claude Opus 等文本模型）

**如何确保工具被调用**:

1. 使用完整工具名：`使用 mcp__luma-mcp__analyze_image 工具分析这张图片`
2. 使用简化名称：`用 analyze_image 工具查看 ./screenshot.png`
3. 提供图片路径：`请用图片分析工具查看 ./screenshot.png 中的代码错误`
4. 明确提及服务器：`通过 luma-mcp 服务器分析这张图片`

**注意**: 直接在聊天框粘贴图片，非视觉模型不会自动调用 Luma，需要明确指示。

### 在 Claude code 中使用

配置完成后，在 Claude 对话中可以这样使用：

**推荐用法（明确指示）**:

```
用户: 使用 Luma 分析 ./code-error.png，这段代码为什么报错？
Claude: [调用 Luma 分析图片，返回详细分析]
```

**或提供图片路径**:

```
用户: 请分析 https://example.com/screenshot.jpg 中的界面问题
Claude: [自动调用 analyze_image 工具]
```

### 本地测试

不需要 MCP 客户端即可测试：

**测试智谱 GLM-4.6V**:

```bash
# 设置 API Key
export ZHIPU_API_KEY="your-api-key"  # macOS/Linux
$env:ZHIPU_API_KEY="your-api-key"    # Windows PowerShell

# 测试本地图片
npm run test:local ./test.png
```

**测试硅基流动 DeepSeek-OCR**:

```bash
# 设置 API Key 和提供商
export MODEL_PROVIDER=siliconflow
export SILICONFLOW_API_KEY="your-api-key"  # macOS/Linux

$env:MODEL_PROVIDER="siliconflow"
$env:SILICONFLOW_API_KEY="your-api-key"    # Windows PowerShell

# 测试本地图片
npm run test:local ./test.png
```

**测试阿里云通义千问 Qwen3-VL-Flash**:

```bash
# 设置 API Key 和提供商
export MODEL_PROVIDER=qwen
export DASHSCOPE_API_KEY="your-api-key"  # macOS/Linux

$env:MODEL_PROVIDER="qwen"
$env:DASHSCOPE_API_KEY="your-api-key"    # Windows PowerShell

# 测试本地图片
npm run test:local ./test.png
```

**测试腾讯混元 Hunyuan-Vision-1.5**:

```bash
# 设置 API Key 和提供商
export MODEL_PROVIDER=hunyuan
export HUNYUAN_API_KEY="your-api-key"  # macOS/Linux

$env:MODEL_PROVIDER="hunyuan"
$env:HUNYUAN_API_KEY="your-api-key"    # Windows PowerShell

# 测试本地图片
npm run test:local ./test.png
```

**其他测试命令**:

```bash
# 测试并提问
npm run test:local ./code-error.png "这段代码有什么问题？"

# 测试远程URL
npm run test:local https://example.com/image.jpg
```

## 工具说明

### analyze_image

分析图片内容的通用工具。

**参数**:

- `image_source` (必需): 图片来源，支持三种格式
  - **本地文件**: 绝对路径或相对路径（例：`./image.png`, `C:\Users\...\image.jpg`）
  - **远程 URL**: https:// 开头的 URL（例：`https://example.com/pic.jpg`）
  - **Data URI**: Base64 编码的图片数据（例：`data:image/png;base64,iVBORw0KGg...`）
  - 支持格式: JPG, PNG, WebP, GIF
- `prompt` (必需): 分析指令或问题

**示例**:

```typescript
// 通用分析
analyze_image({
  image_source: "./screenshot.png",
  prompt: "请详细分析这张图片的内容",
});

// 代码分析
analyze_image({
  image_source: "./code-error.png",
  prompt: "这段代码为什么报错？请提供修复建议",
});

// UI 分析
analyze_image({
  image_source: "https://example.com/ui.png",
  prompt: "分析这个界面的布局和可用性问题",
});

// Data URI （当客户端支持时）
analyze_image({
  image_source: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...",
  prompt: "识别图片中的所有文字",
});
```

## 环境变量

### 通用配置

| 变量名            | 必需 | 默认值  | 说明                                                           |
|-------------------|------|---------|----------------------------------------------------------------|
| `MODEL_PROVIDER`  | 否   | `zhipu` | 模型提供商：`zhipu`、`siliconflow`、`qwen`、`volcengine`、`hunyuan` |
| `MODEL_NAME`      | 否   | 见下文  | 模型名称（自动根据提供商选择）                                   |
| `MAX_TOKENS`      | 否   | `16384` | 最大生成 tokens                                                |
| `TEMPERATURE`     | 否   | `0.7`   | 温度参数 (0-1)                                                 |
| `TOP_P`           | 否   | `0.7`   | Top-p 参数 (0-1)                                               |
| `ENABLE_THINKING` | 否   | `true`  | 是否启用思考模式（GLM-4.6V、Qwen3-VL-Flash、Doubao-Seed-1.6）      |

### 智谱 GLM-4.6V 专用

| 变量名          | 必需           | 默认值 | 说明                |
|-----------------|----------------|--------|---------------------|
| `ZHIPU_API_KEY` | 是（使用智谱时） | -      | 智谱 AI 的 API 密钥 |

默认模型：`glm-4.6v`

### 硅基流动 DeepSeek-OCR 专用

| 变量名                | 必需               | 默认值 | 说明                |
|-----------------------|--------------------|--------|---------------------|
| `SILICONFLOW_API_KEY` | 是（使用硅基流动时） | -      | 硅基流动的 API 密钥 |

默认模型：`deepseek-ai/DeepSeek-OCR`

### 阿里云通义千问 Qwen3-VL-Flash 专用

| 变量名              | 必需           | 默认值 | 说明                  |
|---------------------|----------------|--------|-----------------------|
| `DASHSCOPE_API_KEY` | 是（使用千问时） | -      | 阿里云百炼的 API 密钥 |

默认模型：`qwen3-vl-flash`

### 腾讯混元 Hunyuan-Vision-1.5 专用

| 变量名            | 必需           | 默认值 | 说明              |
|-------------------|----------------|--------|-------------------|
| `HUNYUAN_API_KEY` | 是（使用混元时） | -      | 腾讯混元 API 密钥 |

默认模型：`hunyuan-t1-vision-20250916`

可选模型：`HY-vision-1.5-instruct`

**思考模式说明**:

- 默认开启，提高图片分析的准确性和详细程度
- 如需关闭（提高速度、降低成本），请在配置文件中设置：
  ```json
  {
    "mcpServers": {
      "luma": {
        "command": "npx",
        "args": ["-y", "luma-mcp"],
        "env": {
          "ZHIPU_API_KEY": "your-api-key",
          "ENABLE_THINKING": "false"
        }
      }
    }
  }
  ```
- 关闭后可节省 20-30% tokens 消耗，响应速度提升约 30%

## 开发

```bash
# 开发模式（监听文件变化）
npm run watch

# 构建
npm run build

# 本地测试
npm run test:local <图片路径> [问题]
```

## 项目结构

```
luma-mcp/
├── src/
│   ├── index.ts              # MCP 服务器入口
│   ├── config.ts             # 配置管理（支持多模型）
│   ├── vision-client.ts      # 视觉模型客户端接口
│   ├── zhipu-client.ts       # GLM-4.6V API 客户端
│   ├── siliconflow-client.ts # DeepSeek-OCR API 客户端
│   ├── qwen-client.ts        # Qwen3-VL API 客户端
│   ├── volcengine-client.ts  # Doubao-Seed-1.6 API 客户端
│   ├── hunyuan-client.ts     # Hunyuan-Vision-1.5 API 客户端
│   ├── image-processor.ts    # 图片处理
│   └── utils/
│       ├── logger.ts         # 日志工具
│       └── helpers.ts        # 工具函数
├── test/
│   ├── test-local.ts         # 本地测试脚本
│   ├── test-qwen.ts          # Qwen 测试脚本
│   ├── test-deepseek-raw.ts  # DeepSeek 原始测试脚本
│   └── test-data-uri.ts      # Data URI 测试脚本
├── docs/
│   ├── design.md             # 设计文档
│   ├── installation.md       # 安装指南
│   └── README_EN.md          # 英文文档
├── build/                    # 编译输出
└── package.json
```

## 常见问题

### 如何获取 API Key？

**智谱 GLM-4.6V**:

1. 访问 [智谱开放平台](https://open.bigmodel.cn/)
2. 注册/登录账号
3. 进入控制台创建 API Key
4. 复制 API Key 到配置文件

**硅基流动 DeepSeek-OCR（免费）**:

1. 访问 [硅基流动平台](https://cloud.siliconflow.cn/)
2. 注册/登录账号
3. 进入 API 管理创建 API Key
4. 复制 API Key 到配置文件

**阿里云通义千问 Qwen3-VL-Flash**:

1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. 注册/登录账号
3. 进入 API-KEY 管理创建 API Key
4. 复制 API Key 到配置文件

**腾讯混元 Hunyuan-Vision-1.5**:

1. 访问 [腾讯混元控制台](https://cloud.tencent.com/product/hunyuan)
2. 注册/登录账号
3. 进入 API Key 管理创建 API Key
4. 复制 API Key 到配置文件

### 支持哪些图片格式？

支持 JPG、PNG、WebP、GIF 格式。建议使用 JPG 格式以获得更好的压缩率。

### 什么是 Data URI？

Data URI 是一种将图片数据嵌入字符串的方式，格式为：

```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...
```

**使用场景**：

- 当 MCP 客户端（如 Claude Desktop）支持时，可以直接传递用户粘贴的图片
- 无需保存为临时文件，更加高效
- 当前支持状态：**服务器已支持**，等待客户端实现

### 图片大小限制？

- 最大文件大小: 10MB
- 超过 2MB 的图片会自动压缩
- 推荐分辨率: 800-2048 像素

### 如何查看日志？

日志文件位置: `~/.luma-mcp/luma-mcp-YYYY-MM-DD.log`

### API 调用失败怎么办？

1. 检查 API Key 是否正确
2. 确认账户余额充足（智谱/阿里云）
3. 检查网络连接
4. 查看日志文件了解详细错误信息

### 成本如何？

**硅基流动 DeepSeek-OCR**: **完全免费**，无需付费！

**智谱 GLM-4.6V**: 定价请参考[智谱官方定价](https://open.bigmodel.cn/pricing)。

**阿里云通义千问 Qwen3-VL-Flash**: 定价请参考[阿里云百炼定价](https://help.aliyun.com/zh/model-studio/getting-started/models)。

典型场景估算（已启用思考模式）：

- 简单图片理解: 500-1000 tokens
- 代码截图分析: 1500-2500 tokens
- 详细 UI 分析: 2000-3000 tokens

关闭思考模式可节省约 20-30% tokens。如需关闭，请设置 `ENABLE_THINKING=false`。

### 如何选择模型？

| 特性          | GLM-4.6V（智谱） | DeepSeek-OCR（硅基流动） | Qwen3-VL-Flash（阿里云） | Doubao-Seed-1.6（火山方舟） | Hunyuan-Vision-1.5（腾讯混元） |
|---------------|----------------|------------------------|------------------------|---------------------------|------------------------------|
| **费用**      | 收费           | **完全免费**           | 收费                   | 收费                      | 收费                         |
| **中文理解**  | 优秀           | 良好                   | **优秀**               | 优秀                      | **优秀**                     |
| **OCR 能力**  | 良好           | **优秀**               | 优秀                   | 良好                      | 优秀                         |
| **思考模式**  | 支持           | 不支持                 | 支持                   | 支持                      | 默认思考版模型               |
| **速度/成本** | 中等           | 免费                   | **快速/低成本**        | 高性价比                  | 中等                         |
| **适用场景**  | 通用图片分析   | OCR、文字识别           | 快速分析、3D 定位       | 高性价比通用分析          | 复杂图文推理、多语言理解      |

**推荐**:

- 需要 OCR 或文字识别：选择 **DeepSeek-OCR**（免费）
- 需要快速低成本分析：选择 **Qwen3-VL-Flash**
- 需要高性价比通用分析：选择 **Doubao-Seed-1.6**
- 需要深度图片理解：选择 **GLM-4.6V**
- 需要复杂图文推理或多语言理解：选择 **Hunyuan-Vision-1.5**

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 相关链接

- [智谱 AI 开放平台](https://open.bigmodel.cn/)
- [GLM-4.6V 文档](https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.6v)
- [硅基流动平台](https://cloud.siliconflow.cn/)
- [DeepSeek-OCR 文档](https://docs.siliconflow.cn/cn/api-reference/chat-completions/chat-completions)
- [阿里云百炼平台](https://bailian.console.aliyun.com/)
- [Qwen3-VL 文档](https://help.aliyun.com/zh/model-studio/getting-started/models)
- [腾讯混元平台](https://cloud.tencent.com/product/hunyuan)
- [MCP 协议文档](https://modelcontextprotocol.io/)

## 更新日志

更多更新历史请查看 [CHANGELOG.md](./CHANGELOG.md)

## 作者

Jochen

---

**注意**: 请勿在公开仓库中提交包含真实 API Key 的配置文件。
