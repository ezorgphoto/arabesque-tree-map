/**
 * Lightweight runtime validation for form / API payloads (no external deps).
 */

import { isExecTaskStatus, isKanbanStatus, isPriority } from "@/types/enums";

export type ValidationResult = { ok: true } | { ok: false; error: string };

function nonEmpty(label: string, value: unknown, max = 500): ValidationResult {
  if (typeof value !== "string") return { ok: false, error: `${label} غير صالح` };
  const t = value.trim();
  if (!t) return { ok: false, error: `${label} مطلوب` };
  if (t.length > max) return { ok: false, error: `${label} طويل جداً` };
  // Block obvious script injection in plain text fields
  if (/<\s*script/i.test(t)) return { ok: false, error: `${label} يحتوي محتوى غير مسموح` };
  return { ok: true };
}

export function validateTaskPayload(input: {
  title?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;
}): ValidationResult {
  const title = nonEmpty("عنوان المهمة", input.title, 200);
  if (!title.ok) return title;
  if (input.description != null && typeof input.description === "string") {
    if (input.description.length > 5000) return { ok: false, error: "الوصف طويل جداً" };
    if (/<\s*script/i.test(input.description)) return { ok: false, error: "الوصف غير مسموح" };
  }
  if (input.status != null && !isKanbanStatus(input.status) && !isExecTaskStatus(input.status)) {
    return { ok: false, error: "حالة غير معروفة" };
  }
  if (input.priority != null && !isPriority(input.priority) && input.priority !== "high") {
    // allow legacy without urgent
    if (!["low", "medium", "high", "urgent"].includes(String(input.priority))) {
      return { ok: false, error: "أولوية غير معروفة" };
    }
  }
  return { ok: true };
}

export function validateDecisionPayload(input: {
  title?: unknown;
  content?: unknown;
  confidentialityLevel?: unknown;
}): ValidationResult {
  const title = nonEmpty("عنوان القرار", input.title, 200);
  if (!title.ok) return title;
  if (input.content != null && typeof input.content === "string" && input.content.length > 20000) {
    return { ok: false, error: "محتوى القرار طويل جداً" };
  }
  if (
    input.confidentialityLevel != null &&
    !["public", "internal", "top_secret"].includes(String(input.confidentialityLevel))
  ) {
    return { ok: false, error: "مستوى سرية غير صالح" };
  }
  return { ok: true };
}

export function sanitizePlainText(value: string, max = 2000): string {
  return value.replace(/[<>]/g, "").trim().slice(0, max);
}
