import { createServerFn } from "@tanstack/react-start";
import { ART_OF_WAR_CHAPTERS, buildArtOfWarSystemPrompt } from "@/lib/art-of-war";

type ChatTurn = { role: "user" | "assistant" | "system"; content: string };
type AssistantMode = "exec" | "art-of-war";

const EXEC_SYSTEM = `أنت مساعد تنفيذي عربي لنظام إدارة أسرية/مؤسسية.
أجب بالعربية الفصحى الواضحة، باختصار منظم (نقاط عند الحاجة).
ساعد في التخطيط، الأولويات، المشاريع، والمهام. لا تختلق بيانات غير موجودة في السؤال.`;

/** نماذج سريعة ومستقرة على الطبقة المجانية */
const FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest"] as const;

const PER_CALL_MS = 12_000;
const MAX_MODELS = 2;

function toGeminiContents(messages: ChatTurn[]) {
  const turns = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-10)
    .map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: m.content }],
    }));

  while (turns.length && turns[0].role === "model") turns.shift();

  const merged: typeof turns = [];
  for (const t of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === t.role) {
      last.parts[0].text += `\n${t.parts[0].text}`;
    } else {
      merged.push({ role: t.role, parts: [{ text: t.parts[0].text }] });
    }
  }
  return merged;
}

function modelCandidates() {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const list = preferred ? [preferred, ...FALLBACK_MODELS] : [...FALLBACK_MODELS];
  return [...new Set(list)].slice(0, MAX_MODELS);
}

function isBusyStatus(status: number) {
  return status === 503 || status === 429 || status === 502;
}

function localArtOfWarReply(question: string): string {
  const q = question.toLowerCase();
  const scored = ART_OF_WAR_CHAPTERS.map((c) => {
    const hay = `${c.title} ${c.summary} ${c.maxims.join(" ")} ${c.apply.join(" ")}`.toLowerCase();
    let score = 0;
    for (const word of q.split(/\s+/).filter((w) => w.length > 2)) {
      if (hay.includes(word)) score += 1;
    }
    if (/إمداد|امداد|تأخير|تأخر|موارد|وقت/.test(q) && /حرب|إمداد|موارد|وقت|إطالة/.test(hay)) score += 3;
    if (/هجوم|تقدم|ضغط/.test(q) && /هجوم|استراتيج|زخم/.test(hay)) score += 2;
    if (/دفاع|تأمين|ضعف/.test(q) && /دفاع|تشكيل|ضعف/.test(hay)) score += 2;
    return { c, score };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.c);

  const picks = scored.length ? scored : ART_OF_WAR_CHAPTERS.slice(0, 3);

  const lines = [
    "تقييم سريع وفق فن الحرب (وضع محلي — النموذج السحابي غير متاح حالياً):",
    "",
    `السؤال: ${question}`,
    "",
    "الفصول الأنسب:",
    ...picks.map(
      (c) =>
        `• الفصل ${c.chapter} — ${c.title}: ${c.maxims[0]}\n  تطبيق: ${c.apply[0]}`,
    ),
    "",
    "خطة عمل مقترحة:",
    "1) أمّن خط الإمداد/البديل قبل أي تصعيد (الفصل 2 و4).",
    "2) قلّص النطاق واضرب في نقطة حاسمة بدل الاستنزاف الطويل (الفصل 3 و6).",
    "3) حدّد مهلة قرار واضحة؛ الإطالة تُنهك حتى المنتصر (الفصل 2).",
    "",
    "أعد المحاولة لاحقاً للحصول على رد أعمق من النموذج عند توفره.",
  ];
  return lines.join("\n");
}

function localExecReply(question: string): string {
  return [
    "تعذّر الاتصال بالنموذج الآن. هذا رد تشغيلي مختصر:",
    "",
    `طلبك: ${question}`,
    "",
    "• حدّد أولوية واحدة قابلة للتنفيذ خلال 24 ساعة.",
    "• اكتب القيد الأهم (وقت / أشخاص / معلومة).",
    "• اختر مساراً واحداً وأجّل الباقي صراحة.",
    "",
    "أعد المحاولة بعد دقائق لرد أعمق من المساعد.",
  ].join("\n");
}

async function generateOnce(key: string, model: string, system: string, messages: ChatTurn[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const contents = toGeminiContents(messages);
  if (!contents.length) throw new Error("لا توجد رسالة مستخدم صالحة للنموذج");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
    }),
    signal: AbortSignal.timeout(PER_CALL_MS),
  });

  const errText = res.ok ? "" : await res.text();
  return { res, errText };
}

async function callGemini(system: string, messages: ChatTurn[], mode: AssistantMode) {
  const key = process.env.GEMINI_API_KEY?.trim();
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  if (!key) {
    return {
      content:
        mode === "art-of-war"
          ? localArtOfWarReply(lastUser)
          : "لم يُضبط مفتاح GEMINI_API_KEY. أضفه في Vercel ثم أعد النشر.",
    };
  }

  let lastErr = "";

  for (const model of modelCandidates()) {
    try {
      const { res, errText } = await generateOnce(key, model, system, messages);

      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const content = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
        if (content) return { content };
        lastErr = "رد فارغ";
        continue;
      }

      lastErr = `${res.status}`;
      if (res.status === 404) continue;
      if (isBusyStatus(res.status)) continue;
      if (res.status === 400 || res.status === 401 || res.status === 403) break;
    } catch (e) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        lastErr = "timeout";
        continue;
      }
      lastErr = e instanceof Error ? e.message : "error";
    }
  }

  // لا نترك المستخدم معلقاً: رد محلي فوري من الكتاب
  if (mode === "art-of-war") {
    return { content: localArtOfWarReply(lastUser) };
  }
  return { content: localExecReply(lastUser || lastErr) };
}

export const askAssistant = createServerFn({ method: "POST" })
  .validator((data: { messages: ChatTurn[]; mode?: AssistantMode }) => {
    if (!data?.messages?.length) throw new Error("الرسالة فارغة");
    return {
      messages: data.messages,
      mode: data.mode ?? ("exec" as AssistantMode),
    };
  })
  .handler(async ({ data }) => {
    const mode = data.mode;
    const system = mode === "art-of-war" ? buildArtOfWarSystemPrompt() : EXEC_SYSTEM;
    return callGemini(system, data.messages, mode);
  });
