/**
 * task_type / meta helpers unit tests
 * 运行: npx tsx test/test-task-types.ts
 */

import {
  resolveTaskType,
  shouldPreferTextForTask,
  shouldDisableMultiCropForTask,
  buildTaskPromptAddon,
} from "../src/task-types.js";
import {
  formatResultWithMeta,
  sanitizeErrorMessage,
} from "../src/utils/helpers.js";

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// resolveTaskType
assert("auto + empty → general", resolveTaskType("auto", "hello") === "general");
assert(
  "auto + ocr 中文 → ocr",
  resolveTaskType(undefined, "请提取文字 OCR") === "ocr"
);
assert(
  "auto + 报错 → debug",
  resolveTaskType("auto", "看这个报错 stack") === "debug"
);
assert("explicit ui", resolveTaskType("ui", "anything") === "ui");
assert(
  "ocr forces single crop",
  shouldDisableMultiCropForTask("ocr") === true
);
assert(
  "ui prefers text",
  shouldPreferTextForTask("ui", "x") === true
);
assert(
  "describe no text prefer",
  shouldPreferTextForTask("describe", "x") === false
);
assert(
  "task addon for ocr",
  (buildTaskPromptAddon("ocr") || "").includes("OCR")
);
assert(
  "no addon for general",
  buildTaskPromptAddon("general") === undefined
);

// meta formatting
const metaText = formatResultWithMeta(
  "analysis body",
  {
    provider: "zhipu",
    model: "GLM (glm-4.6v)",
    taskType: "ocr",
    tileCount: 1,
    multiCrop: false,
    preferText: true,
    preprocessMs: 10,
    apiMs: 20,
    totalMs: 30,
  },
  true
);
assert("meta appended", metaText.includes("luma_meta:") && metaText.includes("analysis body"));
assert(
  "meta off by default",
  formatResultWithMeta("only", undefined, false) === "only"
);

assert(
  "sanitize bearer",
  sanitizeErrorMessage("GLM error Bearer sk-abc123xyz").includes("Bearer ***")
);
assert(
  "sanitize query key",
  sanitizeErrorMessage("https://x.com?api_key=secret&a=1").includes("api_key=***")
);

console.log(`\n通过: ${passed}, 失败: ${failed}`);
if (failed > 0) process.exit(1);
