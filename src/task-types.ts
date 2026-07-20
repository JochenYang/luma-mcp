/**
 * Optional task_type for image_understand (single tool, backward compatible).
 * When omitted, behavior matches pre-1.6: prompt heuristic + default base vision prompt.
 */

import { TEXT_HEAVY_PROMPT_PATTERN } from "./constants.js";

export const TASK_TYPES = [
  "auto",
  "general",
  "ocr",
  "ui",
  "debug",
  "describe",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

const TASK_PROMPT_SUFFIX: Record<
  Exclude<TaskType, "auto" | "general">,
  string
> = {
  ocr: [
    "Task focus: OCR / text extraction.",
    "Transcribe visible text accurately; preserve structure (lines, tables, code indentation) when possible.",
    "If text is unreadable, mark it as [illegible]. Do not invent missing characters.",
  ].join("\n"),
  ui: [
    "Task focus: UI / layout structure.",
    "Describe hierarchy (regions, components), spatial relationships, interactive elements, and notable visual states.",
    "Prefer relative layout terms over pixel coordinates.",
  ].join("\n"),
  debug: [
    "Task focus: debugging from a screenshot (errors, stack traces, logs, broken UI).",
    "Extract error messages and stack traces verbatim when present.",
    "Summarize likely failure point and actionable next checks without inventing stack frames.",
  ].join("\n"),
  describe: [
    "Task focus: concise visual description.",
    "State image type, main subject, and key visible facts. Stay brief unless the user asks for depth.",
  ].join("\n"),
};

/**
 * Resolve effective task for preprocessing and prompt shaping.
 */
export function resolveTaskType(
  taskType: TaskType | undefined,
  userPrompt: string
): Exclude<TaskType, "auto"> {
  if (!taskType || taskType === "auto") {
    if (TEXT_HEAVY_PROMPT_PATTERN.test(userPrompt)) {
      // Keep coarse auto-routing for text-heavy prompts
      if (/ocr|extract|文字|文本/i.test(userPrompt)) return "ocr";
      if (/error|stack|报错|日志|debug/i.test(userPrompt)) return "debug";
      if (/ui|layout|界面|布局|组件/i.test(userPrompt)) return "ui";
      return "general";
    }
    return "general";
  }
  return taskType;
}

/**
 * Whether preprocessing should prefer text fidelity.
 */
export function shouldPreferTextForTask(
  effective: Exclude<TaskType, "auto">,
  userPrompt: string
): boolean {
  if (
    effective === "ocr" ||
    effective === "ui" ||
    effective === "debug"
  ) {
    return true;
  }
  if (effective === "describe") {
    return false;
  }
  return TEXT_HEAVY_PROMPT_PATTERN.test(userPrompt);
}

/**
 * OCR-like tasks: prefer single high-fidelity image over multi-crop by default.
 */
export function shouldDisableMultiCropForTask(
  effective: Exclude<TaskType, "auto">
): boolean {
  return effective === "ocr";
}

/**
 * Append task-specific guidance after base prompt + user task.
 */
export function buildTaskPromptAddon(
  effective: Exclude<TaskType, "auto">
): string | undefined {
  if (effective === "general") {
    return undefined;
  }
  return TASK_PROMPT_SUFFIX[effective];
}
