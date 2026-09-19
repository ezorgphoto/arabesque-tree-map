import { createServerFn } from "@tanstack/react-start";

type ChatTurn = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM = `أنت مساعد تنفيذي عربي لنظام إدارة أسرية/مؤسسية.
أجب بالعربية الفصحى الواضحة، باختصار منظم (نقاط عند الحاجة).
ساعد في التخطيط، الأولويات، المشاريع، والمهام. لا تختلق بيانات غير موجودة في السؤال.`;

function toGeminiContents(messages: ChatTurn[]) {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-16)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

export const askAssistant = createServerFn({ method: "POST" }).handler(
  async (ctx: { data?: { messages?: ChatTurn[] } }) => {
    const messages = ctx.data?.messages;
    if (!messages?.length) throw new Error("الرسالة فارغة");

    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) {
      throw new Error(
        "لم يُضبط مفتاح GEMINI_API_KEY المجاني. أنشئه من Google AI Studio وأضفه في Vercel ثم أعد النشر.",
      );
    }

    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: toGeminiContents(messages),
        generationConfig: { temperature: 0.4 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`تعذّر الرد من النموذج: ${res.status} ${errText.slice(0, 220)}`);
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const content = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!content) throw new Error("رد فارغ من النموذج");
    return { content };
  },
);
