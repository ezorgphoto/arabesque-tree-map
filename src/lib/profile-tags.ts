/** Profile tags, levels, and parse helpers for employee follow-up fields */

export type ProfileTagCategory = "strength" | "problem" | "note";

export type ProfileTagOption = {
  id: string;
  category: ProfileTagCategory;
  label: string;
  created_at?: string;
};

export const LEVELS = ["مبتدئ", "متوسط", "متقدم", "متميز"] as const;
export type LevelValue = (typeof LEVELS)[number];

export const LEVEL_DEFINITIONS: Record<LevelValue, string> = {
  مبتدئ: "بداية المسار — يحتاج توجيهاً ومتابعة لصيقة.",
  متوسط: "يملك أساساً واضحاً — يحتاج تطبيقاً منتظماً وتوسيع أفق.",
  متقدم: "قدرة مستقلة جيدة — يُستفاد منه في تدريب الآخرين.",
  متميز: "مرجعية في المجال — يقود ويضع معايير الجودة.",
};

export const TAG_CATEGORY_LABEL: Record<ProfileTagCategory, string> = {
  strength: "نقاط القوة",
  problem: "المشاكل والتحديات",
  note: "ملاحظات عامة",
};

/** Defaults used when profile_tag_options table is empty / not migrated yet */
export const DEFAULT_TAG_LABELS: Record<ProfileTagCategory, string[]> = {
  strength: [
    "التزام وانضباط",
    "قدرة تحليلية",
    "تواصل فعّال",
    "قيادة ميدانية",
    "إبداع ومبادرة",
    "عمل جماعي",
    "دقة في التنفيذ",
    "تحمل المسؤولية",
  ],
  problem: [
    "مشكلة عائلية",
    "ضغط دراسي",
    "ضعف الالتزام بالمواعيد",
    "تحديات مالية",
    "خلاف داخل الفريق",
    "انقطاع عن البرنامج",
    "حاجة لمتابعة شخصية",
    "إرهاق أو احتراق وظيفي",
  ],
  note: [
    "يحتاج زيارة ميدانية",
    "مرشح لترقية",
    "تحت التجربة",
    "يحتاج تدريب إضافي",
    "متابعة أسبوعية",
    "أولوية عالية للمتابعة",
  ],
};

/** Parse stored multi-value field (newline / comma / | separated, or legacy free text). */
export function parseTagList(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  const parts = raw
    .split(/\n|,|\|/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(parts)];
}

export function joinTagList(tags: string[]): string {
  return tags.map((t) => t.trim()).filter(Boolean).join("\n");
}

export function toggleTag(list: string[], label: string): string[] {
  const t = label.trim();
  if (!t) return list;
  return list.includes(t) ? list.filter((x) => x !== t) : [...list, t];
}
