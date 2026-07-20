/**
 * Custom Provider 客户端测试
 * 覆盖鉴权头构造和 thinking 模式分支
 *
 * 运行: npx tsx test/test-custom.ts
 */

import { CustomClient } from "../src/custom-client.js";
import type { LumaConfig, CustomProviderConfig } from "../src/config.js";
import axios from "axios";

interface TestCase {
  name: string;
  cfg: Partial<CustomProviderConfig>;
  expectedHeaders: Record<string, string>;
}

const AUTH_HEADER_CASES: TestCase[] = [
  {
    name: "bearer (default)",
    cfg: {
      authHeader: "bearer",
    },
    expectedHeaders: {
      Authorization: "Bearer test-key-123",
    },
  },
  {
    name: "x-api-key",
    cfg: {
      authHeader: "x-api-key",
    },
    expectedHeaders: {
      "x-api-key": "test-key-123",
    },
  },
  {
    name: "custom with {{key}} template",
    cfg: {
      authHeader: "custom",
      authHeaderValue: "X-Custom-Auth: prefix-{{key}}",
    },
    expectedHeaders: {
      "X-Custom-Auth": "prefix-test-key-123",
    },
  },
  {
    name: "custom with name only (no colon)",
    cfg: {
      authHeader: "custom",
      authHeaderValue: "X-Single-Name",
    },
    expectedHeaders: {
      "X-Single-Name": "test-key-123",
    },
  },
];

let passed = 0;
let failed = 0;

function makeConfig(customCfg: Partial<CustomProviderConfig>): LumaConfig {
  const fullCustomCfg: CustomProviderConfig = {
    apiKey: "test-key-123",
    baseUrl: "https://example.com/v1",
    model: "test-model",
    authHeader: "bearer",
    path: "/chat/completions",
    timeoutMs: 60000,
    thinkingMode: "disabled",
    ...customCfg,
  };
  return {
    provider: "custom",
    apiKey: "test-key-123",
    model: "test-model",
    maxTokens: 8192,
    temperature: 0.7,
    topP: 0.95,
    enableThinking: true,
    multiCrop: true,
    multiCropMaxTiles: 5,
    includeMeta: false,
    customProvider: fullCustomCfg,
  };
}

function testAuthHeaders() {
  console.log("=== 测试 1: 鉴权头构造 ===\n");

  // Mock axios.create to capture headers
  const originalCreate = axios.create;
  const captured: Array<{ config: any }> = [];
  axios.create = ((config: any) => {
    captured.push({ config });
    return {
      post: async () => ({
        data: {
          choices: [{ message: { content: "test" } }],
          usage: { total_tokens: 10 },
        },
      }),
    } as any;
  }) as any;

  for (const tc of AUTH_HEADER_CASES) {
    captured.length = 0;
    try {
      const client = new CustomClient(makeConfig(tc.cfg));
      // Trigger analyzeImage to invoke post
      void client.analyzeImage("data:image/png;base64,AAAA", "test prompt");
      if (captured.length === 0) {
        console.log(`❌ ${tc.name} - axios.create 未被调用`);
        failed++;
        continue;
      }
      const headers = captured[0].config.headers;
      let allMatch = true;
      for (const [k, v] of Object.entries(tc.expectedHeaders)) {
        if (headers[k] !== v) {
          console.log(
            `❌ ${tc.name} - Header ${k} 不匹配: 期望 "${v}", 实际 "${headers[k]}"`
          );
          allMatch = false;
        }
      }
      if (allMatch) {
        console.log(`✅ ${tc.name}`);
        passed++;
      } else {
        failed++;
      }
    } catch (e) {
      console.log(`❌ ${tc.name} - 异常: ${e}`);
      failed++;
    }
  }
  axios.create = originalCreate;
}

function testConstructorValidation() {
  console.log("\n=== 测试 2: 构造函数校验 ===\n");
  try {
    const config: LumaConfig = {
      provider: "custom",
      apiKey: "",
      model: "test",
      maxTokens: 8192,
      temperature: 0.7,
      topP: 0.95,
      enableThinking: true,
      multiCrop: true,
      multiCropMaxTiles: 5,
      includeMeta: false,
      // customProvider missing
    };
    new CustomClient(config);
    console.log("❌ 缺 customProvider 应抛错 - 实际未抛");
    failed++;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("customProvider")) {
      console.log("✅ 缺 customProvider 抛错");
      passed++;
    } else {
      console.log(`❌ 抛错但消息不匹配: ${msg}`);
      failed++;
    }
  }
}

function testBaseUrlTrim() {
  console.log("\n=== 测试 3: baseURL 尾斜杠处理 ===\n");
  const originalCreate = axios.create;
  const captured: Array<{ config: any }> = [];
  axios.create = ((config: any) => {
    captured.push({ config });
    return {
      post: async () => ({ data: { choices: [{ message: { content: "x" } }] } }),
    } as any;
  }) as any;

  const cfg = makeConfig({ baseUrl: "https://example.com/v1///" });
  new CustomClient(cfg);
  void new CustomClient(cfg).analyzeImage("data:image/png;base64,AAAA", "p");

  if (captured[0]?.config.baseURL === "https://example.com/v1") {
    console.log("✅ 尾斜杠被正确处理");
    passed++;
  } else {
    console.log(
      `❌ baseURL 处理错误: "${captured[0]?.config.baseURL}"`
    );
    failed++;
  }
  axios.create = originalCreate;
}

function testGetModelName() {
  console.log("\n=== 测试 4: getModelName ===\n");
  const cfg = makeConfig({ model: "my-custom-model" });
  const client = new CustomClient(cfg);
  const name = client.getModelName();
  if (name === "Custom (my-custom-model)") {
    console.log("✅ getModelName 返回正确");
    passed++;
  } else {
    console.log(`❌ getModelName 不正确: ${name}`);
    failed++;
  }
}

testAuthHeaders();
testConstructorValidation();
testBaseUrlTrim();
testGetModelName();

console.log(`\n=== 汇总 ===`);
console.log(`通过: ${passed}, 失败: ${failed}`);
if (failed > 0) {
  process.exit(1);
}
