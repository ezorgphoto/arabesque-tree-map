export type TopoMark = {
  id: string;
  title: string;
  note: string;
  lat: number;
  lng: number;
};

export type CommandRoomState = {
  headline: string;
  lead: string;
  field: string;
  analysis: string;
  environment: string;
  marks: TopoMark[];
  warNotes: Record<string, string>;
  updatedAt: number;
};

export const ART_OF_WAR = [
  {
    id: "know",
    title: "معرفة النفس والآخر",
    text: "من عرف نفسه وعرف خصمه قلّ أن يُهزَم. التخطيط يبدأ بتقييم صادق للقوة والضعف قبل أي حركة.",
  },
  {
    id: "terrain",
    title: "الأرض والموقع",
    text: "الموقع يغيّر الحسابات. قبل القرار: ما طبيعة الأرض؟ أين الممرات؟ أين المخارج؟ أين التجمع الآمن؟",
  },
  {
    id: "timing",
    title: "التوقيت",
    text: "النصر ليس سرعة عشوائية. انتظر اللحظة التي يقلّ فيها الغموض وتظهر فيها فرصة قابلة للاستغلال.",
  },
  {
    id: "deception",
    title: "الإظهار والإخفاء",
    text: "أظهر ما يُراد أن يُرى، واحفظ ما يجب ألا يُكشف. في العمل التنظيمي: لا تنشر كل الخطة لكل المستويات.",
  },
  {
    id: "unity",
    title: "وحدة الأمر",
    text: "تعدد الأوامر يشتت الجهد. لكل مسار مسؤول واحد ونتيجة واحدة قابلة للقياس.",
  },
  {
    id: "logistics",
    title: "الإمداد والاستمرارية",
    text: "الحملة بلا إمداد تنهار. راجع الموارد، التواصل، والبدائل قبل الإطلاق لا بعده.",
  },
] as const;

export const ENV_PROMPTS = [
  "ما حالة الميدان اليوم؟ (هادئ / متوتر / فرصة)",
  "ما القيد الأهم هذا الأسبوع؟ (وقت، أشخاص، معلومة)",
  "أين نقطة الضعف في الخطة الحالية؟",
  "ما المسار الذي يجب تأجيله صراحة؟",
  "ما المعلومة الناقصة قبل أي خطوة كبيرة؟",
] as const;

const KEY = "exec_command_room_v1";

export function emptyCommandRoom(): CommandRoomState {
  return {
    headline: "نشرة التخطيط الميداني — مسؤول الأسرة",
    lead: "ملخص موجز للوضع الحالي والقرار المطلوب خلال الساعات القادمة.",
    field: "تقرير ميداني: …",
    analysis: "تحليل: …",
    environment: ENV_PROMPTS.map((q) => `• ${q}\n`).join("\n"),
    marks: [],
    warNotes: {},
    updatedAt: Date.now(),
  };
}

export function loadCommandRoom(): CommandRoomState {
  if (typeof window === "undefined") return emptyCommandRoom();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyCommandRoom();
    return { ...emptyCommandRoom(), ...(JSON.parse(raw) as CommandRoomState) };
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
