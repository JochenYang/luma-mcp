# Luma MCP

Vision understanding MCP server powered by Zhipu GLM-4.5V, providing visual capabilities to AI assistants that don't natively support image understanding.

English | [中文](../README.md)

## Features

- **Simple Design**: Single `analyze_image` tool handles all image analysis tasks
- **Smart Understanding**: Automatically recognizes different scenarios (code, UI, errors, etc.)
- **Comprehensive Support**: Code screenshots, UI design, error diagnosis, general images
- **Standard MCP Protocol**: Seamless integration with Claude Desktop, Cline, and other MCP clients
- **GLM-4.5V Powered**: Excellent Chinese understanding, cost-effective API
- **URL Support**: Handles both local files and remote image URLs
- **Retry Mechanism**: Built-in exponential backoff retry for reliability
- **Thinking Mode**: Enabled by default for deeper analysis

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Zhipu AI API Key ([Get it here](https://open.bigmodel.cn/))

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

**Windows config location**: `%APPDATA%\Claude\claude_desktop_config.json`

**macOS config location**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Using npx (Recommended)**:

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

**Local Development**:

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

Restart Claude Desktop after configuration.

#### Cline (VSCode)

**Using npx (Recommended)**:

Create `mcp.json` in project root or `.vscode/` directory:

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

**Local Development**:

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

#### Claude Code (CLI)

```bash
claude mcp add -s user luma-mcp --env ZHIPU_API_KEY=your-api-key -- npx -y luma-mcp
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
1. Explicitly mention the tool: `Use Luma to analyze this image`
2. Provide image path: `Analyze the code error in ./screenshot.png`
3. Use tool name: `Use analyze_image tool to view this image`

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

```bash
# Set API Key
export ZHIPU_API_KEY="your-api-key"  # macOS/Linux
$env:ZHIPU_API_KEY="your-api-key"    # Windows PowerShell

# Test local image
npm run test:local ./test.png

# Test with question
npm run test:local ./code-error.png "What's wrong with this code?"

# Test remote URL
npm run test:local https://example.com/image.jpg
```

## Tool Reference

### analyze_image

Universal tool for analyzing image content.

**Parameters**:

- `image_source` (required): Image path or URL
  - Supported formats: JPG, PNG, WebP, GIF
  - Local files: Absolute or relative path
  - Remote images: URL starting with https://
- `question` (optional): Question or analysis instruction about the image

**Examples**:

```typescript
// General analysis
analyze_image({
  image_source: "./screenshot.png"
})

// Code analysis
analyze_image({
  image_source: "./code-error.png",
  question: "Why is this code throwing an error? Provide fix suggestions"
})

// UI analysis
analyze_image({
  image_source: "https://example.com/ui.png",
  question: "Analyze the layout and usability issues of this interface"
})
```

## Environment Variables

| Variable                | Required | Default    | Description                |
|-------------------------|----------|------------|----------------------------|
| `ZHIPU_API_KEY`         | Yes      | -          | Zhipu AI API key           |
| `ZHIPU_MODEL`           | No       | `glm-4.5v` | Model to use               |
| `ZHIPU_MAX_TOKENS`      | No       | `4096`     | Maximum tokens to generate |
| `ZHIPU_TEMPERATURE`     | No       | `0.7`      | Temperature (0-1)          |
| `ZHIPU_TOP_P`           | No       | `0.7`      | Top-p parameter (0-1)      |
| `ZHIPU_ENABLE_THINKING` | No       | `false`    | Force enable thinking mode |

Note: Thinking mode is enabled by default, no extra configuration needed.

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
│   ├── config.ts             # Configuration management
│   ├── zhipu-client.ts       # GLM-4.5V API client
│   ├── image-processor.ts    # Image processing
│   ├── prompts.ts            # Prompt templates
│   └── utils/
│       ├── logger.ts         # Logging utilities
│       └── helpers.ts        # Helper functions
├── test/
│   └── test-local.ts         # Local testing script
├── docs/
│   ├── design.md             # Design documentation
│   ├── installation.md       # Installation guide
│   └── README_EN.md          # English documentation
├── build/                    # Build output
└── package.json
```

## FAQ

### How to get API Key?

1. Visit [Zhipu Open Platform](https://open.bigmodel.cn/)
2. Register/Login
3. Go to console and create API Key
4. Copy API Key to configuration file

### What image formats are supported?

Supports JPG, PNG, WebP, GIF. JPG format is recommended for better compression.

### Image size limits?

- Maximum file size: 10MB
- Images over 2MB will be automatically compressed
- Recommended resolution: 800-2048 pixels

### How to view logs?

Log file location: `~/.luma-mcp/luma-mcp-YYYY-MM-DD.log`

### What if API call fails?

1. Check if API Key is correct
2. Confirm sufficient balance in Zhipu account
3. Check network connection
4. View log file for detailed error information

### What's the cost?

For GLM-4.5V pricing, refer to [Zhipu Official Pricing](https://open.bigmodel.cn/pricing).

Typical scenario estimates:
- Simple image understanding: 500-1000 tokens
- Code screenshot analysis: 1500-2500 tokens
- Detailed UI analysis: 2000-3000 tokens

Enabling thinking mode increases tokens by approximately 20-30%.

## Contributing

Issues and Pull Requests are welcome!

## License

MIT License

## Related Links

- [Zhipu AI Open Platform](https://open.bigmodel.cn/)
- [GLM-4.5V Documentation](https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.5v)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [Design Documentation](./design.md)
- [Installation Guide](./installation.md)

## Author

Jochen

---

**Note**: Do not commit configuration files containing real API Keys to public repositories.
