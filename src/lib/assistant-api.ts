import { createServerFn } from "@tanstack/react-start";

type ChatTurn = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM = `أنت مساعد تنفيذي عربي لنظام إدارة أسرية/مؤسسية.
أجب بالعربية الفصحى الواضحة، باختصار منظم (نقاط عند الحاجة).
ساعد في التخطيط، الأولويات، المشاريع، والمهام. لا تختلق بيانات غير موجودة في السؤال.`;

export const askAssistant = createServerFn({ method: "POST" }).handler(
  async (ctx: { data?: { messages?: ChatTurn[] } }) => {
    const messages = ctx.data?.messages;
    if (!messages?.length) throw new Error("الرسالة فارغة");

    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      throw new Error(
        "لم يُضبط مفتاح OPENAI_API_KEY على السيرفر. أضفه في Vercel (Environment Variables) ثم أعد النشر.",
      );
    }
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [{ role: "system", content: SYSTEM }, ...messages.slice(-16)],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`تعذّر الرد من النموذج: ${res.status} ${errText.slice(0, 180)}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("رد فارغ من النموذج");
    return { content };
  },
);
