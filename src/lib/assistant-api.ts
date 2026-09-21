import { createServerFn } from "@tanstack/react-start";
import { buildArtOfWarSystemPrompt } from "@/lib/art-of-war";

type ChatTurn = { role: "user" | "assistant" | "system"; content: string };
type AssistantMode = "exec" | "art-of-war";

const EXEC_SYSTEM = `أنت مساعد تنفيذي عربي لنظام إدارة أسرية/مؤسسية.
أجب بالعربية الفصحى الواضحة، باختصار منظم (نقاط عند الحاجة).
حلّل السؤال قبل الإجابة: الوضع، القيود، الخيارات، ثم التوصية.
ساعد في التخطيط، الأولويات، المشاريع، والمهام. لا تختلق بيانات غير موجودة في السؤال.`;

const FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest"] as const;

const PER_CALL_MS = 20_000;
const MAX_MODELS = 3;
const MAX_ATTEMPTS = 2;

function toGeminiContents(messages: ChatTurn[]) {
  const turns = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-12)
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isBusyStatus(status: number) {
  return status === 503 || status === 429 || status === 502;
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
      generationConfig: { temperature: 0.35, maxOutputTokens: 1600 },
    }),
    signal: AbortSignal.timeout(PER_CALL_MS),
  });

  const errText = res.ok ? "" : await res.text();
  return { res, errText };
}

async function callGemini(system: string, messages: ChatTurn[]) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "لم يُضبط مفتاح GEMINI_API_KEY. أضفه في Vercel ثم أعد النشر — لن يُعرض أي رد بديل غير تحليلي.",
    );
  }

  let lastBusy = false;
  let lastErr = "";

  for (const model of modelCandidates()) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) await sleep(800 * attempt);
      try {
        const { res, errText } = await generateOnce(key, model, system, messages);

        if (res.ok) {
          const json = (await res.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const content = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
          if (content) return { content };
          lastErr = "رد فارغ من النموذج";
          continue;
        }

        lastErr = `${res.status} ${errText.slice(0, 140)}`;
        if (isBusyStatus(res.status)) {
          lastBusy = true;
          continue;
        }
        if (res.status === 404) break;
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          throw new Error(`تعذّر التحليل من النموذج: ${lastErr}`);
        }
        break;
      } catch (e) {
        if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
          lastErr = "انتهت مهلة الاتصال بالنموذج";
          lastBusy = true;
          continue;
        }
        throw e;
      }
    }
  }

  if (lastBusy) {
    throw new Error(
      "تعذّر إكمال التحليل الآن لأن النموذج مشغول أو بطيء. أعد المحاولة بعد دقيقة — لن نعرض رداً جاهزاً غير تحليلي.",
    );
  }
  throw new Error(`تعذّر التحليل من النموذج: ${lastErr || "خطأ غير معروف"}`);
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
    return callGemini(system, data.messages);
  });
