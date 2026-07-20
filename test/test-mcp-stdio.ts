/**
 * MCP stdio integration test for image_understand (1.6 path).
 * Spawns build/index.js as a real MCP server and calls the tool.
 *
 * 运行:
 *   MODEL_PROVIDER=qwen INCLUDE_META=true npx tsx test/test-mcp-stdio.ts
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "path";

const IMAGE_URL =
  process.argv[2] ||
  "https://static.geluman.cn/static/images/recipes/XO%E9%85%B1%E8%90%9D%E5%8D%9C%E7%B3%95.png";

const PROMPT = process.argv[3] || "请简要描述这张图片的内容和主要物体";

async function main() {
  const serverPath = resolve("build/index.js");
  const env: Record<string, string> = { ...process.env } as Record<
    string,
    string
  >;

  // Ensure provider + meta for this verification run
  env.MODEL_PROVIDER = env.MODEL_PROVIDER || "qwen";
  env.INCLUDE_META = env.INCLUDE_META || "true";

  console.log("=== MCP stdio smoke test ===");
  console.log(`server: ${serverPath}`);
  console.log(`provider: ${env.MODEL_PROVIDER}`);
  console.log(`INCLUDE_META: ${env.INCLUDE_META}`);
  console.log(`image: ${IMAGE_URL}`);
  console.log(`prompt: ${PROMPT}`);

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env,
    stderr: "pipe",
  });

  // Surface server logs
  transport.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(`[server] ${chunk.toString()}`);
  });

  const client = new Client(
    { name: "luma-mcp-stdio-test", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("\nConnected to MCP server");

  const tools = await client.listTools();
  const names = tools.tools.map((t) => t.name);
  console.log("tools:", names.join(", ") || "(none)");

  const tool = tools.tools.find((t) => t.name === "image_understand");
  if (!tool) {
    throw new Error("image_understand not registered");
  }

  const schema = tool.inputSchema as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  const props = Object.keys(schema.properties || {});
  console.log("image_understand props:", props.join(", "));
  console.log("required:", (schema.required || []).join(", "));

  if (!props.includes("task_type")) {
    throw new Error("task_type missing from tool schema (1.6 regression)");
  }
  if (!props.includes("image_source") || !props.includes("prompt")) {
    throw new Error("legacy required fields missing from tool schema");
  }

  // 1) Optional task_type omitted — legacy-compatible call
  console.log("\n--- Call A: no task_type (compat) ---");
  const resA = await client.callTool({
    name: "image_understand",
    arguments: {
      image_source: IMAGE_URL,
      prompt: PROMPT,
    },
  });
  printToolResult("A", resA);

  // 2) Explicit describe + meta should still be present via INCLUDE_META
  console.log("\n--- Call B: task_type=describe ---");
  const resB = await client.callTool({
    name: "image_understand",
    arguments: {
      image_source: IMAGE_URL,
      prompt: PROMPT,
      task_type: "describe",
    },
  });
  printToolResult("B", resB);

  await client.close();
  console.log("\n=== MCP stdio smoke test completed ===");
}

function printToolResult(label: string, res: unknown) {
  const r = res as {
    isError?: boolean;
    content?: Array<{ type: string; text?: string }>;
  };
  const text = (r.content || [])
    .map((c) => c.text || "")
    .join("\n")
    .trim();
  console.log(`[${label}] isError=${!!r.isError}`);
  console.log(`[${label}] text length=${text.length}`);
  // Show head + meta tail if present
  const head = text.slice(0, 400);
  console.log(`[${label}] head:\n${head}${text.length > 400 ? "\n…" : ""}`);
  if (text.includes("luma_meta:")) {
    const metaStart = text.indexOf("luma_meta:");
    console.log(`[${label}] meta block:\n${text.slice(metaStart)}`);
  } else {
    console.log(`[${label}] WARNING: luma_meta not found (INCLUDE_META may be off)`);
  }
  if (r.isError) {
    throw new Error(`Call ${label} failed: ${text}`);
  }
  if (!text || text.startsWith("错误:")) {
    throw new Error(`Call ${label} empty or error text: ${text}`);
  }
}

main().catch((err) => {
  console.error("MCP stdio test failed:", err);
  process.exit(1);
});
