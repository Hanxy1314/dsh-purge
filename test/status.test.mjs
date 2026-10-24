// printStatus 回归测试：
// 宿主未定位 / 部分状态缺失 / 全量已打，三种情况都不许出现 undefined。
// 运行：node test/status.test.mjs（或 npm test）
import assert from "node:assert/strict";
import * as core from "../lib/core.js";
import { printStatus } from "../bin/dsh-purge.js";

const base = {
  surface: "desktop",
  dsh_home: "C:\\Users\\Admin\\.dsh",
  desktop_install: "E:\\app.exe",
  shim_dir: null,
  files: {},
  has_backup: false,
  override_path: "C:\\Users\\Admin\\.dsh\\prompt-inject.md",
  override_status: "default",
  shim_cmd: "original",
  shim_ps1: "missing",
  shim_bin: "missing",
};

// 1) 宿主未定位：patchStatus() 返回空对象
const unlocated = printStatus({
  ...base,
  ai_base: null,
  patch_status: {},
  patches_applied: 0,
  patches_pending: 0,
  patches_total: 0,
});
assert.ok(!unlocated.includes("undefined"), "未定位输出不应含 undefined");
assert.match(unlocated, /补丁 未知/, "未定位应显式说明未知");
assert.ok(unlocated.includes(String(core.ALL_PATCHES.length)), "未定位应给出总条数");
assert.ok(!unlocated.includes("已清洗, 0 待清洗"), "未定位不应伪造 0/N 已清洗");

// 2) 已定位但部分状态缺失：缺的必须是 unknown，不是 undefined
const partial = printStatus({
  ...base,
  ai_base: "E:\\fake\\@deepseek-ai",
  patches_total: 5,
  patches_applied: 3,
  patches_pending: 1,
  patch_status: { 1: "applied", 2: "pending", 3: "na" },
});
assert.ok(!partial.includes("undefined"), "部分缺失不应含 undefined");
assert.ok(!partial.includes("[object Object]"), "状态不应被对象化");
assert.match(partial, /补丁 3\/5 已清洗, 1 待清洗/, "分母应取 patches_total 而非全部补丁数");
assert.match(partial, /✓ \[#1 \]/, "#1 应为已清洗");
assert.match(partial, /✗ \[#2 \]/, "#2 应为待清洗");
assert.match(partial, /· \[#3 \]/, "#3 na 应为不适用");
const missingRow = partial.split("\n").find((l) => l.includes("[#4 ]"));
assert.ok(
  missingRow && missingRow.includes("? ") && missingRow.includes("unknown"),
  "缺失状态应落到 ? unknown，实际：" + missingRow,
);

// 3) 全量状态齐备：不应出现 unknown 行
const full = printStatus({
  ...base,
  ai_base: "E:\\fake\\@deepseek-ai",
  patches_total: core.ALL_PATCHES.length,
  patches_applied: core.ALL_PATCHES.length,
  patches_pending: 0,
  patch_status: Object.fromEntries(core.ALL_PATCHES.map((p) => [p.id, "applied"])),
});
assert.ok(!full.includes("undefined"), "全量输出不应含 undefined");
assert.ok(!full.includes("unknown"), "全量输出不应含 unknown");

console.log("ok: 3 组断言通过（未定位 / 部分缺失 / 全量）");
