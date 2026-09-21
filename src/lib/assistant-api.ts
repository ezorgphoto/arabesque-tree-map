import { createServerFn } from "@tanstack/react-start";
import { buildArtOfWarSystemPrompt } from "@/lib/art-of-war";

type ChatTurn = { role: "user" | "assistant" | "system"; content: string };
type AssistantMode = "exec" | "art-of-war";

const EXEC_SYSTEM = `أنت مساعد تنفيذي عربي لنظام إدارة أسرية/مؤسسية.
أجب بالعربية الفصحى الواضحة، باختصار منظم (نقاط عند الحاجة).
ساعد في التخطيط، الأولويات، المشاريع، والمهام. لا تختلق بيانات غير موجودة في السؤال.`;

const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
] as const;

function toGeminiContents(messages: ChatTurn[]) {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-16)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

function modelCandidates() {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const list = preferred ? [preferred, ...FALLBACK_MODELS] : [...FALLBACK_MODELS];
  return [...new Set(list)];
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isBusyStatus(status: number) {
  return status === 503 || status === 429 || status === 502;
}

async function generateOnce(key: string, model: string, system: string, messages: ChatTurn[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: toGeminiContents(messages),
      generationConfig: { temperature: 0.35 },
    }),
  });

  const errText = res.ok ? "" : await res.text();
  return { res, errText };
}

async function callGemini(system: string, messages: ChatTurn[]) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "لم يُضبط مفتاح GEMINI_API_KEY المجاني. أنشئه من Google AI Studio وأضفه في Vercel ثم أعد النشر.",
    );
  }

  let lastBusy = false;
  let lastErr = "";

  for (const model of modelCandidates()) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await sleep(700 * attempt);

      const { res, errText } = await generateOnce(key, model, system, messages);

      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const content = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
        if (!content) throw new Error("رد فارغ من النموذج");
        return { content };
      }

      lastErr = `${res.status} ${errText.slice(0, 180)}`;
      if (isBusyStatus(res.status)) {
        lastBusy = true;
        continue;
      }
      // 404 = نموذج غير متاح لهذا المفتاح → جرّب التالي
      if (res.status === 404) break;
      // أخطاء أخرى غير الضغط: لا نفع من إعادة المحاولة على نفس النموذج
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(`تعذّر الرد من النموذج: ${lastErr}`);
      }
      break;
    }
  }

  if (lastBusy) {
    throw new Error(
      "النموذج مشغول الآن بسبب ضغط عالٍ على الخدمة المجانية. انتظر قليلاً ثم أعد المحاولة.",
    );
  }
  throw new Error(`تعذّر الرد من النموذج: ${lastErr || "خطأ غير معروف"}`);
}

export const askAssistant = createServerFn({ method: "POST" }).handler(
  async (ctx: { data?: { messages?: ChatTurn[]; mode?: AssistantMode } }) => {
    const messages = ctx.data?.messages;
    if (!messages?.length) throw new Error("الرسالة فارغة");
    const mode = ctx.data?.mode ?? "exec";
    const system = mode === "art-of-war" ? buildArtOfWarSystemPrompt() : EXEC_SYSTEM;
    return callGemini(system, messages);
  },
);
