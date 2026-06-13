# Luma MCP

Multi-model vision MCP server for AI assistants that do not have native image understanding.

English | [中文](../README.md)

## Features

- Multi-model support: GLM-4.6V, DeepSeek-OCR, Qwen3-VL-Flash, Doubao-Seed-1.6, and Hunyuan-Vision-1.5
- Single-tool surface: everything goes through `image_understand`
- Better handling for difficult screenshots: multi-crop support for large images and detail-preserving processing for text-heavy inputs
- Unified preprocessing pipeline for local files, remote URLs, and Data URIs
- Works well for code screenshots, UI screenshots, error screens, documents, and OCR
- Standard MCP integration for Claude Desktop, Cline, Claude Code, and similar clients
- Built-in retry for transient request failures

## Quick Start

### Requirements

- Node.js >= 18
- One provider API key

### Install

```bash
git clone https://github.com/JochenYang/luma-mcp.git
cd luma-mcp
npm install
npm run build
```

Or run directly from MCP config:

```bash
npx -y luma-mcp
```

## Configuration

### Claude Desktop example

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

Replace `MODEL_PROVIDER` and its matching key with the provider you want:

- `zhipu` -> `ZHIPU_API_KEY`
- `siliconflow` -> `SILICONFLOW_API_KEY`
- `qwen` -> `DASHSCOPE_API_KEY`
- `volcengine` -> `VOLCENGINE_API_KEY`
- `hunyuan` -> `HUNYUAN_API_KEY`
- `custom` -> `CUSTOM_API_KEY` + `CUSTOM_BASE_URL` + `CUSTOM_MODEL_NAME` (any OpenAI-compatible endpoint)

Optional model override:

- `MODEL_NAME=doubao-seed-1-6-flash-250828`
- `MODEL_NAME=hunyuan-t1-vision-20250916`
- `MODEL_NAME=HY-vision-1.5-instruct`

#### Custom Provider (v1.5.0+)

Use any OpenAI-compatible endpoint (OpenAI, OpenRouter, Together AI, Anthropic proxy, local vLLM/Ollama, etc.):

```bash
claude mcp add -s user luma-mcp \
  --env MODEL_PROVIDER=custom \
  --env CUSTOM_API_KEY=sk-your-key \
  --env CUSTOM_BASE_URL=https://your-endpoint.com/v1 \
  --env CUSTOM_MODEL_NAME=your-model \
  -- npx -y luma-mcp
```

Optional config (all have defaults):

- `CUSTOM_AUTH_HEADER=bearer` — `bearer` / `x-api-key` / `custom`
- `CUSTOM_PATH=/chat/completions` — API path
- `CUSTOM_TIMEOUT_MS=60000` — timeout in ms
- `CUSTOM_THINKING_MODE=disabled` — `disabled` / `openai` / `qwen_extra_body`
- `CUSTOM_AUTH_HEADER_VALUE="X-API-Key: {{key}}"` — custom header template

### Quick Setup Commands

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

#### Local Development Mode

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

Create `mcp.json` in the project root or under `.vscode/`:

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

## Usage

### `image_understand`

Parameters:

- `image_source`: local path, HTTP(S) image URL, or Data URI
- `prompt`: the user's original question about the image

Example:

```typescript
image_understand({
  image_source: "./screenshot.png",
  prompt: "Analyze the layout and main component structure of this page",
});

image_understand({
  image_source: "./code-error.png",
  prompt: "Why is this code failing? Suggest a fix",
});

image_understand({
  image_source: "https://example.com/ui.png",
  prompt: "Find usability issues in this interface",
});
```

### Notes

- Non-vision models usually need an explicit instruction to call the MCP tool
- Text-heavy screenshots such as OCR images, code, tables, and long documents use a more detail-preserving preprocessing path
- Large images can be expanded into an original image plus cropped tiles before being sent to the model

## Environment Variables

### General

| Variable | Default | Description |
| --- | --- | --- |
| `MODEL_PROVIDER` | `zhipu` | Provider: `zhipu`, `siliconflow`, `qwen`, `volcengine`, `hunyuan` |
| `MODEL_NAME` | auto-selected | Model name override |
| `MAX_TOKENS` | `8192` | Max generated tokens (some models have hard caps, see below) |
| `TEMPERATURE` | `0.7` | Temperature |
| `TOP_P` | `0.7` | Top-p |
| `ENABLE_THINKING` | `true` | Enable thinking mode where supported |
| `MULTI_CROP` | `true` | Enable multi-crop analysis for large images |
| `MULTI_CROP_MAX_TILES` | `5` | Max number of tiles including the original image |
| `BASE_VISION_PROMPT` | built-in default | Override the base vision prompt |

> [!IMPORTANT]
> **Special Note on Token Limits:**
> 1. **SiliconFlow (DeepSeek-OCR)**: This model has a total context length (input + output) of only **8192**. To ensure images can be processed, Luma enforces a hard limit of **4096** for `MAX_TOKENS` internally for this provider. Any higher value in environment variables will be truncated.
> 2. **General Recommendation**: Vision understanding tasks rarely require extremely long outputs. It is recommended to keep `MAX_TOKENS` at `4096` or `8192`. Setting it to `16384` may lead to `400` errors when processing large images if the total length exceeds the model's capacity.

### Provider Keys

| Provider | Required env var | Default model |
| --- | --- | --- |
| Zhipu | `ZHIPU_API_KEY` | `glm-4.6v` |
| SiliconFlow | `SILICONFLOW_API_KEY` | `deepseek-ai/DeepSeek-OCR` |
| Qwen | `DASHSCOPE_API_KEY` | `qwen3-vl-flash` |
| Volcengine | `VOLCENGINE_API_KEY` | `doubao-seed-1-6-flash-250828` |
| Hunyuan | `HUNYUAN_API_KEY` | `hunyuan-t1-vision-20250916` |

## Local Testing

```bash
# Basic test
npm run test:local ./test.png

# Test with a question
npm run test:local ./code-error.png "What's wrong with this code?"

# Remote image test
npm run test:local https://example.com/image.jpg

# Check source and test types
npm run typecheck
```

## Image Limits and Processing

- Supported formats: JPG, PNG, WebP, GIF
- Maximum input size: 10MB
- Images larger than 2MB are compressed automatically
- Remote URLs are fetched into the same preprocessing pipeline before being sent to the model

## Project Structure

```text
luma-mcp/
├── src/
│   ├── index.ts              # MCP server entry
│   ├── config.ts             # Configuration management
│   ├── vision-client.ts      # Shared vision client interface
│   ├── zhipu-client.ts       # GLM-4.6V client
│   ├── siliconflow-client.ts # DeepSeek-OCR client
│   ├── qwen-client.ts        # Qwen3-VL client
│   ├── volcengine-client.ts  # Doubao-Seed-1.6 client
│   ├── hunyuan-client.ts     # Hunyuan-Vision-1.5 client
│   ├── image-processor.ts    # Image preprocessing and tiling
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

## Model Selection

- OCR and text extraction: DeepSeek-OCR
- Fast low-cost general analysis: Qwen3-VL-Flash
- Cost-effective general analysis: Doubao-Seed-1.6
- Deep image understanding: GLM-4.6V
- Complex multimodal reasoning and multilingual tasks: Hunyuan-Vision-1.5

## Development

```bash
npm run watch
npm run build
npm run typecheck
```

## Links

- [Zhipu Open Platform](https://open.bigmodel.cn/)
- [SiliconFlow](https://cloud.siliconflow.cn/)
- [Aliyun Bailian](https://bailian.console.aliyun.com/)
- [Volcengine Ark](https://console.volcengine.com/ark)
- [Tencent Hunyuan](https://cloud.tencent.com/product/hunyuan)
- [MCP Protocol](https://modelcontextprotocol.io/)

## Changelog

[CHANGELOG.md](../CHANGELOG.md)

## License

MIT
