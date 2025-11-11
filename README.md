# Luma MCP

基于智谱 GLM-4.5V 的视觉理解 MCP 服务器，为不支持图片理解的 AI 助手提供视觉能力。

[English](./docs/README_EN.md) | 中文

## 特性

- **简单设计**: 单一 `analyze_image` 工具处理所有图片分析任务
- **智能理解**: 自动识别代码、UI、错误等不同场景
- **全面支持**: 代码截图、界面设计、错误诊断、通用图片
- **标准 MCP 协议**: 无缝集成 Claude Desktop、Cline 等 MCP 客户端
- **GLM-4.5V 驱动**: 中文理解优秀，API 性价比高
- **URL 支持**: 支持本地文件和远程图片 URL
- **重试机制**: 内置指数退避重试，提高可靠性
- **思考模式**: 默认启用深度分析

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- 智谱 AI API Key ([获取地址](https://open.bigmodel.cn/))

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

**Windows 配置文件位置**: `%APPDATA%\Claude\claude_desktop_config.json`

**macOS 配置文件位置**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**使用 npx（推荐）**:

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

**本地开发**:

```json
{
  "mcpServers": {
    "luma": {
      "command": "node",
      "args": ["D:\\codes\\Luma_mcp\\build\\index.js"],
      "env": {
        "ZHIPU_API_KEY": "your-zhipu-api-key"
      }
    }
  }
}
```

配置完成后重启 Claude Desktop。

#### Cline (VSCode)

**使用 npx（推荐）**:

在项目根目录或 `.vscode/` 目录下创建 `mcp.json`:

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

**本地开发**:

```json
{
  "mcpServers": {
    "luma": {
      "command": "node",
      "args": ["D:\\codes\\Luma_mcp\\build\\index.js"],
      "env": {
        "ZHIPU_API_KEY": "your-zhipu-api-key"
      }
    }
  }
}
```

#### Claude Code (命令行)

```bash
claude mcp add -s user luma-mcp --env ZHIPU_API_KEY=your-api-key -- npx -y luma-mcp
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

### 在 Claude Desktop 中使用

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

```bash
# 设置 API Key
export ZHIPU_API_KEY="your-api-key"  # macOS/Linux
$env:ZHIPU_API_KEY="your-api-key"    # Windows PowerShell

# 测试本地图片
npm run test:local ./test.png

# 测试并提问
npm run test:local ./code-error.png "这段代码有什么问题？"

# 测试远程URL
npm run test:local https://example.com/image.jpg
```

## 工具说明

### analyze_image

分析图片内容的通用工具。

**参数**:

- `image_source` (必需): 图片路径或 URL
  - 支持格式: JPG, PNG, WebP, GIF
  - 本地文件: 绝对路径或相对路径
  - 远程图片: https:// 开头的 URL
- `question` (可选): 关于图片的问题或分析指令

**示例**:

```typescript
// 通用分析
analyze_image({
  image_source: "./screenshot.png"
})

// 代码分析
analyze_image({
  image_source: "./code-error.png",
  question: "这段代码为什么报错？请提供修复建议"
})

// UI 分析
analyze_image({
  image_source: "https://example.com/ui.png",
  question: "分析这个界面的布局和可用性问题"
})
```

## 环境变量

| 变量名                  | 必需 | 默认值     | 说明                 |
|-------------------------|------|------------|----------------------|
| `ZHIPU_API_KEY`         | 是   | -          | 智谱 AI 的 API 密钥  |
| `ZHIPU_MODEL`           | 否   | `glm-4.5v` | 使用的模型           |
| `ZHIPU_MAX_TOKENS`      | 否   | `4096`     | 最大生成 tokens      |
| `ZHIPU_TEMPERATURE`     | 否   | `0.7`      | 温度参数 (0-1)       |
| `ZHIPU_TOP_P`           | 否   | `0.7`      | Top-p 参数 (0-1)     |
| `ZHIPU_ENABLE_THINKING` | 否   | `false`    | 是否强制启用思考模式 |

注意: 思考模式默认已启用，无需额外配置。

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
│   ├── config.ts             # 配置管理
│   ├── zhipu-client.ts       # GLM-4.5V API 客户端
│   ├── image-processor.ts    # 图片处理
│   ├── prompts.ts            # 提示词模板
│   └── utils/
│       ├── logger.ts         # 日志工具
│       └── helpers.ts        # 工具函数
├── test/
│   └── test-local.ts         # 本地测试脚本
├── docs/
│   ├── design.md             # 设计文档
│   ├── installation.md       # 安装指南
│   └── README_EN.md          # 英文文档
├── build/                    # 编译输出
└── package.json
```

## 常见问题

### 如何获取 API Key？

1. 访问 [智谱开放平台](https://open.bigmodel.cn/)
2. 注册/登录账号
3. 进入控制台创建 API Key
4. 复制 API Key 到配置文件

### 支持哪些图片格式？

支持 JPG、PNG、WebP、GIF 格式。建议使用 JPG 格式以获得更好的压缩率。

### 图片大小限制？

- 最大文件大小: 10MB
- 超过 2MB 的图片会自动压缩
- 推荐分辨率: 800-2048 像素

### 如何查看日志？

日志文件位置: `~/.luma-mcp/luma-mcp-YYYY-MM-DD.log`

### API 调用失败怎么办？

1. 检查 API Key 是否正确
2. 确认智谱账户余额充足
3. 检查网络连接
4. 查看日志文件了解详细错误信息

### 成本如何？

GLM-4.5V 定价请参考[智谱官方定价](https://open.bigmodel.cn/pricing)。

典型场景估算:
- 简单图片理解: 500-1000 tokens
- 代码截图分析: 1500-2500 tokens
- 详细 UI 分析: 2000-3000 tokens

启用思考模式会增加约 20-30% tokens。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 相关链接

- [智谱 AI 开放平台](https://open.bigmodel.cn/)
- [GLM-4.5V 文档](https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.5v)
- [MCP 协议文档](https://modelcontextprotocol.io/)
- [设计文档](./docs/design.md)
- [安装配置指南](./docs/installation.md)

## 作者

Jochen

---

**注意**: 请勿在公开仓库中提交包含真实 API Key 的配置文件。
