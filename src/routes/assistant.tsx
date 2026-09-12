import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BrainCircuit, Send, User2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSISTANT_INTRO,
  ASSISTANT_SUGGESTIONS,
  generateAssistantReply,
  type ChatMessage,
} from "@/lib/assistant";

export const Route = createFileRoute("/assistant")({
  component: AssistantPage,
  head: () => ({
    meta: [
      { title: "المساعد الذكي الشخصي | نظام الإدارة التنفيذية" },
      {
        name: "description",
        content: "مساعد تحليلي هادئ يحوّل الرؤى الواسعة إلى خطوات منطقية منظّمة.",
      },
      { property: "og:title", content: "المساعد الذكي الشخصي" },
      {
        property: "og:description",
        content: "مساعد تحليلي هادئ يحوّل الرؤى الواسعة إلى خطوات منطقية منظّمة.",
      },
    ],
  }),
});

const uid = () => Math.random().toString(36).slice(2);

function renderLine(line: string, key: number) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  const content = parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-bold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );

  if (line.startsWith("- ")) {
    return (
      <li key={key} className="ms-4 list-disc leading-relaxed">
        {content.slice(0)}
      </li>
    );
  }
  if (line.startsWith("> ")) {
    return (
      <blockquote
        key={key}
        className="border-s-2 border-primary/50 bg-muted/50 px-3 py-2 text-sm italic"
      >
        {line.slice(2)}
      </blockquote>
    );
  }
  if (!line.trim()) return <div key={key} className="h-2" />;
  return (
    <p key={key} className="leading-relaxed">
      {content}
    </p>
  );
}

function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: uid(), role: "assistant", content: ASSISTANT_INTRO, at: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = (text: string) => {
    const value = text.trim();
    if (!value || thinking) return;
    setMessages((m) => [...m, { id: uid(), role: "user", content: value, at: Date.now() }]);
    setInput("");
    setThinking(true);
    const delay = 550 + Math.min(value.length * 8, 900);
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { id: uid(), role: "assistant", content: generateAssistantReply(value), at: Date.now() },
      ]);
      setThinking(false);
      inputRef.current?.focus();
    }, delay);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-4xl flex-col gap-4">
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BrainCircuit className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">المساعد الذكي الشخصي</h1>
          <p className="text-xs text-muted-foreground">
            نبرة تحليلية استراتيجية هادئة · يحترم استقلاليتك وخصوصيتك · يحوّل الرؤية إلى بنية
          </p>
        </div>
      </header>

      <div className="panel flex min-h-0 flex-1 flex-col p-0">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  m.role === "user"
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {m.role === "user" ? <User2 className="size-4" /> : <BrainCircuit className="size-4" />}
              </div>
              <div
                className={`max-w-[85%] space-y-1 rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border bg-background"
                }`}
              >
                {m.content.split("\n").map((line, i) => renderLine(line, i))}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BrainCircuit className="size-4" />
              </div>
              <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
                يحلّل الطلب ويبني الهيكل…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 border-t p-3">
            {ASSISTANT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 border-t p-3"
        >
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            placeholder="اكتب رؤيتك أو سؤالك… (Enter للإرسال، Shift+Enter لسطر جديد)"
            className="min-h-[3rem] resize-none"
            aria-label="رسالتك للمساعد"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || thinking} aria-label="إرسال">
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
