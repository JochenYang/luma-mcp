# Luma MCP

Multi-model vision understanding MCP server, providing visual capabilities to AI assistants that don't natively support image understanding.

English | [中文](../README.md)

## Features

- **Multi-Model Support**: Supports four vision models
  - GLM-4.6V (Zhipu) - Paid, excellent Chinese understanding
  - DeepSeek-OCR (SiliconFlow) - **Free to use**, strong OCR capability
  - Qwen3-VL-Flash (Aliyun) - Paid, fast and cost-effective, supports thinking mode
  - Doubao-Seed-1.6 (Volcengine) - Paid, cost-effective, supports multiple versions
- **Simple Design**: Single `analyze_image` tool handles all image analysis tasks
- **Smart Understanding**: Automatically recognizes different scenarios (code, UI, errors, etc.)
- **Comprehensive Support**: Code screenshots, UI design, error diagnosis, OCR text recognition
- **Standard MCP Protocol**: Seamless integration with Claude Desktop, Cline, and other MCP clients
- **URL Support**: Handles both local files and remote image URLs
- **Retry Mechanism**: Built-in exponential backoff retry for reliability

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- **Choose one model**:
  - **Option A**: Zhipu AI API Key ([Get it here](https://open.bigmodel.cn/)) - Excellent Chinese understanding
  - **Option B**: SiliconFlow API Key ([Get it here](https://cloud.siliconflow.cn/)) - **Free to use**, Strong OCR capability
  - **Option C**: Aliyun Bailian API Key ([Get it here](https://bailian.console.aliyun.com/)) - Fast and cost-effective, supports thinking mode
  - **Option D**: Volcengine API Key ([Get it here](https://console.volcengine.com/ark)) - Cost-effective, supports multiple versions

### Installation

#### Method 1: Local Development (Recommended for testing)

```bash
git clone https://github.com/yourusername/luma-mcp.git
cd luma-mcp
npm install
npm run build
```

#### Method 2: Using npx (After publishing to npm)

```bash
npx luma-mcp
```

### Configuration

#### Claude Desktop

**Option A: Using Zhipu GLM-4.6V**:

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

**Option B: Using SiliconFlow DeepSeek-OCR (Free)**:

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

**Option C: Using Aliyun Qwen3-VL-Flash**:

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

**Option D: Using Volcengine Doubao-Seed-1.6**:

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

**Local Development (Zhipu)**:

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

**Local Development (SiliconFlow)**:

```json
{
  "mcpServers": {
    "luma": {
      "command": "node",
      "args": ["D:\\codes\\Luma_mcp\\build\\index.js"],
      "env": {
        "MODEL_PROVIDER": "siliconflow",
        "SILICONFLOW_API_KEY": "your-siliconflow-api-key"
      }
    }
  }
}
```

Restart Claude Desktop after configuration.

#### Cline (VSCode)

Create `mcp.json` in project root or `.vscode/` directory

**Option A: Using Zhipu GLM-4.6V**:

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

**Option B: Using SiliconFlow DeepSeek-OCR (Free)**:

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

**Option C: Using Aliyun Qwen3-VL-Flash**:

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

#### Claude Code (CLI)

**Using Zhipu GLM-4.6V**:
```bash
claude mcp add -s user luma-mcp --env ZHIPU_API_KEY=your-api-key -- npx -y luma-mcp
```

**Using SiliconFlow DeepSeek-OCR (Free)**:
```bash
claude mcp add -s user luma-mcp --env MODEL_PROVIDER=siliconflow --env SILICONFLOW_API_KEY=your-api-key -- npx -y luma-mcp
```

**Using Aliyun Qwen3-VL-Flash**:
```bash
claude mcp add -s user luma-mcp --env MODEL_PROVIDER=qwen --env DASHSCOPE_API_KEY=your-api-key -- npx -y luma-mcp
```

#### Other Tools

For more MCP client configuration methods, refer to [Zhipu Official Documentation](https://docs.bigmodel.cn/cn/coding-plan/mcp/vision-mcp-server#claude-code)

## Usage

### Important Notes

**MCP Tool Invocation Mechanism**:
- MCP tools require the AI model to **actively call** them to execute
- If the AI model itself supports vision (like Claude 4.5 Sonnet), it will prioritize its native vision capabilities
- Luma MCP primarily serves **non-vision models** (like GPT-4, Claude Opus, etc.)

**How to Ensure Tool Invocation**:
1. Use full tool name: `Use mcp__luma-mcp__analyze_image tool to analyze this image`
2. Use simplified name: `Use analyze_image tool to view ./screenshot.png`
3. Provide image path: `Use image analysis tool to check ./screenshot.png for code errors`
4. Mention server explicitly: `Analyze this image via luma-mcp server`

**Note**: Simply pasting an image in the chat box won't automatically trigger Luma for non-vision models - explicit instruction is required.

### Using in Claude Desktop

After configuration, use it in Claude conversations like this:

**Recommended Usage (Explicit Instruction)**:
```
User: Use Luma to analyze ./code-error.png, why is this code throwing an error?
Claude: [Calls Luma to analyze the image and returns detailed analysis]
```

**Or Provide Image Path**:
```
User: Please analyze the interface issues in https://example.com/screenshot.jpg
Claude: [Automatically calls analyze_image tool]
```

### Local Testing

Test without MCP clients:

**Test Zhipu GLM-4.6V**:
```bash
# Set API Key
export ZHIPU_API_KEY="your-api-key"  # macOS/Linux
$env:ZHIPU_API_KEY="your-api-key"    # Windows PowerShell

# Test local image
npm run test:local ./test.png
```

**Test SiliconFlow DeepSeek-OCR**:
```bash
# Set API Key and provider
export MODEL_PROVIDER=siliconflow
export SILICONFLOW_API_KEY="your-api-key"  # macOS/Linux

$env:MODEL_PROVIDER="siliconflow"
$env:SILICONFLOW_API_KEY="your-api-key"    # Windows PowerShell

# Test local image
npm run test:local ./test.png
```

**Test Aliyun Qwen3-VL-Flash**:
```bash
# Set API Key and provider
export MODEL_PROVIDER=qwen
export DASHSCOPE_API_KEY="your-api-key"  # macOS/Linux

$env:MODEL_PROVIDER="qwen"
$env:DASHSCOPE_API_KEY="your-api-key"    # Windows PowerShell

# Test local image
npm run test:local ./test.png
```

**Other test commands**:
```bash
# Test with question
npm run test:local ./code-error.png "What's wrong with this code?"

# Test remote URL
npm run test:local https://example.com/image.jpg
```

## Tool Reference

### analyze_image

Universal tool for analyzing image content.

**Parameters**:

- `image_source` (required): Image source, supports three formats
  - **Local file**: Absolute or relative path (e.g., `./image.png`, `C:\Users\...\image.jpg`)
  - **Remote URL**: URL starting with https:// (e.g., `https://example.com/pic.jpg`)
  - **Data URI**: Base64-encoded image data (e.g., `data:image/png;base64,iVBORw0KGg...`)
  - Supported formats: JPG, PNG, WebP, GIF
- `prompt` (required): Analysis instruction or question about the image

**Examples**:

```typescript
// General analysis
analyze_image({
  image_source: "./screenshot.png",
  prompt: "Please analyze this image in detail"
})

// Code analysis
analyze_image({
  image_source: "./code-error.png",
  prompt: "Why is this code throwing an error? Provide fix suggestions"
})

// UI analysis
analyze_image({
  image_source: "https://example.com/ui.png",
  prompt: "Analyze the layout and usability issues of this interface"
})

// Data URI (when client supports it)
analyze_image({
  image_source: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...",
  prompt: "Extract all text from the image"
})
```

## Environment Variables

### General Configuration

| Variable          | Required | Default   | Description                                                  |
|-------------------|----------|-----------|--------------------------------------------------------------|
| `MODEL_PROVIDER`  | No       | `zhipu`   | Model provider: `zhipu`, `siliconflow`, or `qwen`            |
| `MODEL_NAME`      | No       | See below | Model name (auto-selected based on provider)                 |
| `MAX_TOKENS`      | No       | `4096`    | Maximum tokens to generate                                   |
| `TEMPERATURE`     | No       | `0.7`     | Temperature (0-1)                                            |
| `TOP_P`           | No       | `0.7`     | Top-p parameter (0-1)                                        |
| `ENABLE_THINKING` | No       | `false`   | Enable thinking mode (GLM-4.6V and Qwen3-VL-Flash)           |

### Zhipu GLM-4.6V Specific

| Variable         | Required             | Default    | Description       |
|------------------|----------------------|------------|-------------------|
| `ZHIPU_API_KEY`  | Yes (when using Zhipu) | -        | Zhipu AI API key  |

Default model: `glm-4.5v`

### SiliconFlow DeepSeek-OCR Specific

| Variable               | Required                      | Default                      | Description            |
|------------------------|-------------------------------|------------------------------|------------------------|
| `SILICONFLOW_API_KEY`  | Yes (when using SiliconFlow)  | -                            | SiliconFlow API key    |

Default model: `deepseek-ai/DeepSeek-OCR`

### Aliyun Qwen3-VL-Flash Specific

| Variable              | Required                   | Default  | Description                  |
|-----------------------|----------------------------|----------|------------------------------|
| `DASHSCOPE_API_KEY`   | Yes (when using Qwen)      | -        | Aliyun Bailian API key       |

Default model: `qwen3-vl-flash`

**Thinking Mode**:
- Enabled by default for better accuracy and detailed analysis
- To disable (faster speed, lower cost), set in config:
  ```json
  {
    "mcpServers": {
      "luma": {
        "command": "npx",
        "args": ["-y", "luma-mcp"],
        "env": {
          "ZHIPU_API_KEY": "your-api-key",
          "ZHIPU_ENABLE_THINKING": "false"
        }
      }
    }
  }
  ```
- Disabling saves ~20-30% tokens and improves speed by ~30%

## Development

```bash
# Development mode (watch for changes)
npm run watch

# Build
npm run build

# Local test
npm run test:local <image-path> [question]
```

## Project Structure

```
luma-mcp/
├── src/
│   ├── index.ts              # MCP server entry
│   ├── config.ts             # Configuration management (multi-model)
│   ├── vision-client.ts      # Vision model client interface
│   ├── zhipu-client.ts       # GLM-4.6V API client
│   ├── siliconflow-client.ts # DeepSeek-OCR API client
│   ├── qwen-client.ts        # Qwen3-VL API client
│   ├── volcengine-client.ts  # Doubao-Seed-1.6 API client
│   ├── image-processor.ts    # Image processing
│   └── utils/
│       ├── logger.ts         # Logging utilities
│       └── helpers.ts        # Helper functions
├── test/
│   ├── test-local.ts         # Local testing script
│   ├── test-qwen.ts          # Qwen testing script
│   ├── test-deepseek-raw.ts  # DeepSeek raw testing script
│   └── test-data-uri.ts      # Data URI testing script
├── docs/
│   ├── design.md             # Design documentation
│   ├── installation.md       # Installation guide
│   └── README_EN.md          # English documentation
├── build/                    # Build output
└── package.json
```

## FAQ

### How to get API Key?

**Zhipu GLM-4.6V**:
1. Visit [Zhipu Open Platform](https://open.bigmodel.cn/)
2. Register/Login
3. Go to console and create API Key
4. Copy API Key to configuration file

**SiliconFlow DeepSeek-OCR (Free)**:
1. Visit [SiliconFlow Platform](https://cloud.siliconflow.cn/)
2. Register/Login
3. Go to API management and create API Key
4. Copy API Key to configuration file

**Aliyun Qwen3-VL-Flash**:
1. Visit [Aliyun Bailian Platform](https://bailian.console.aliyun.com/)
2. Register/Login
3. Go to API-KEY management and create API Key
4. Copy API Key to configuration file

### What image formats are supported?

Supports JPG, PNG, WebP, GIF. JPG format is recommended for better compression.

### What is a Data URI?

A Data URI is a way to embed image data into a string, formatted as:
```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...
```

**Use cases**:
- When MCP clients (like Claude Desktop) support it, can directly pass user-pasted images
- No need to save as temporary files, more efficient
- Current status: **Server supports**, waiting for client implementation

### Image size limits?

- Maximum file size: 10MB
- Images over 2MB will be automatically compressed
- Recommended resolution: 800-2048 pixels

### How to view logs?

Log file location: `~/.luma-mcp/luma-mcp-YYYY-MM-DD.log`

### What if API call fails?

1. Check if API Key is correct
2. Confirm sufficient balance in your account (Zhipu/Aliyun)
3. Check network connection
4. View log file for detailed error information

### What's the cost?

**SiliconFlow DeepSeek-OCR**: **Completely free**, no charges!

**Zhipu GLM-4.6V**: For pricing, refer to [Zhipu Official Pricing](https://open.bigmodel.cn/pricing).

**Aliyun Qwen3-VL-Flash**: For pricing, refer to [Aliyun Bailian Pricing](https://help.aliyun.com/zh/model-studio/getting-started/models).

Typical scenario estimates:
- Simple image understanding: 500-1000 tokens
- Code screenshot analysis: 1500-2500 tokens
- Detailed UI analysis: 2000-3000 tokens

Enabling thinking mode (GLM-4.6V/Qwen3-VL-Flash) increases tokens by approximately 20-30%.

### How to choose a model?

| Feature          | GLM-4.6V (Zhipu)  | DeepSeek-OCR (SiliconFlow) | Qwen3-VL-Flash (Aliyun) |
|------------------|-------------------|----------------------------|-------------------------|
| **Cost**         | Paid              | **Completely Free**        | Paid                    |
| **Chinese**      | Excellent         | Good                       | **Excellent**           |
| **OCR**          | Good              | **Excellent**              | Excellent               |
| **Thinking Mode**| Supported         | Not supported              | Supported               |
| **Speed/Cost**   | Medium            | Free                       | **Fast/Low Cost**       |
| **Use Cases**    | General analysis  | OCR, Text recognition      | Fast analysis, 3D positioning |

**Recommendations**:
- Need OCR/text recognition → **DeepSeek-OCR** (free)
- Need fast and cost-effective analysis → **Qwen3-VL-Flash**
- Need deep image understanding → **GLM-4.6V**

## Contributing

Issues and Pull Requests are welcome!

## License

MIT License

## Related Links

- [Zhipu AI Open Platform](https://open.bigmodel.cn/)
- [GLM-4.6V Documentation](https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.5v)
- [SiliconFlow Platform](https://cloud.siliconflow.cn/)
- [DeepSeek-OCR Documentation](https://docs.siliconflow.cn/cn/api-reference/chat-completions/chat-completions)
- [Aliyun Bailian Platform](https://bailian.console.aliyun.com/)
- [Qwen3-VL Documentation](https://help.aliyun.com/zh/model-studio/getting-started/models)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)

## Changelog

For more update history, see [CHANGELOG.md](../CHANGELOG.md)

## Author

Jochen

---

**Note**: Do not commit configuration files containing real API Keys to public repositories.
