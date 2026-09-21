import { ART_OF_WAR } from "@/lib/art-of-war";

export { ART_OF_WAR };
export type { WarChapter } from "@/lib/art-of-war";
export { ART_OF_WAR_CHAPTERS } from "@/lib/art-of-war";

export type TopoMark = {
  id: string;
  title: string;
  note: string;
  lat: number;
  lng: number;
};

export type NewsKind = "troops" | "vehicles" | "gear" | "movement" | "other";

export type NewsFlash = {
  id: string;
  kind: NewsKind;
  title: string;
  detail: string;
  qty: number;
  at: number;
};

export type CommandRoomState = {
  headline: string;
  lead: string;
  field: string;
  analysis: string;
  environment: string;
  marks: TopoMark[];
  warNotes: Record<string, string>;
  flashes: NewsFlash[];
  updatedAt: number;
};

export const NEWS_KIND_LABEL: Record<NewsKind, string> = {
  troops: "جنود / أفراد",
  vehicles: "آليات",
  gear: "عتاد",
  movement: "تحرك",
  other: "أخرى",
};

export const ENV_PROMPTS = [
  "ما حالة الميدان اليوم؟ (هادئ / متوتر / فرصة)",
  "ما القيد الأهم هذا الأسبوع؟ (وقت، أشخاص، معلومة)",
  "أين نقطة الضعف في الخطة الحالية؟",
  "ما المسار الذي يجب تأجيله صراحة؟",
  "ما المعلومة الناقصة قبل أي خطوة كبيرة؟",
] as const;

const KEY = "exec_command_room_v2";

export function emptyCommandRoom(): CommandRoomState {
  return {
    headline: "نشرة التخطيط الميداني — مسؤول الأسرة",
    lead: "ملخص موجز للوضع الحالي والقرار المطلوب خلال الساعات القادمة.",
    field: "تقرير ميداني: …",
    analysis: "تحليل: …",
    environment: ENV_PROMPTS.map((q) => `• ${q}\n`).join("\n"),
    marks: [],
    warNotes: {},
    flashes: [],
    updatedAt: Date.now(),
  };
}

export function loadCommandRoom(): CommandRoomState {
  if (typeof window === "undefined") return emptyCommandRoom();
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem("exec_command_room_v1");
    if (!raw) return emptyCommandRoom();
    return { ...emptyCommandRoom(), ...(JSON.parse(raw) as Partial<CommandRoomState>) };
  } catch {
    return emptyCommandRoom();
  }
}

export function saveCommandRoom(state: CommandRoomState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify({ ...state, updatedAt: Date.now() }));
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function flashTickerText(flashes: NewsFlash[]) {
  if (!flashes.length) {
    return "عاجل · لا تحديثات آليات/جنود بعد · أضف من تبويب غرفة الأخبار · التخطيط قبل الحركة ·";
  }
  return flashes
    .slice(0, 12)
    .map((f) => {
      const label = NEWS_KIND_LABEL[f.kind];
      const q = f.qty > 0 ? ` ×${f.qty}` : "";
      return `عاجل · ${label}${q}: ${f.title}`;
    })
    .join(" · ")
    .concat(" · ");
}
