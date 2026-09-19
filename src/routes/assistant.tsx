import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BrainCircuit, Send, Trash2, User2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSISTANT_INTRO,
  ASSISTANT_SUGGESTIONS,
  type ChatMessage,
} from "@/lib/assistant";
import { askAssistant } from "@/lib/assistant-api";
import { useAuth } from "@/lib/auth";

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

const CHAT_STORAGE_KEY = "exec_assistant_chat_v1";

const introMessage = (): ChatMessage => ({
  id: uid(),
  role: "assistant",
  content: ASSISTANT_INTRO,
  at: Date.now(),
});

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-bold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function renderLine(line: string, key: number) {
  if (line.startsWith("- ")) {
    return (
      <div key={key} className="flex gap-2 leading-relaxed">
        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
        <span>{renderInline(line.slice(2))}</span>
      </div>
    );
  }
  if (line.startsWith("> ")) {
    return (
      <blockquote
        key={key}
        className="border-s-2 border-primary/50 bg-muted/50 px-3 py-2 text-sm italic"
      >
        {renderInline(line.slice(2))}
      </blockquote>
    );
  }
  if (!line.trim()) return <div key={key} className="h-2" />;
  return (
    <p key={key} className="leading-relaxed">
      {renderInline(line)}
    </p>
  );
}

function AssistantPage() {
  const { isLeadership } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([introMessage()]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // استعادة المحادثة المحفوظة بعد التركيب (لتفادي اختلاف الترطيب مع SSR)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      }
    } catch {
      // تجاهل بيانات تالفة
    }
    setLoaded(true);
  }, []);

  // حفظ المحادثة تلقائياً عند كل تغيير
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // تجاهل أخطاء التخزين
    }
  }, [messages, loaded]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const clearChat = () => {
    if (messages.length > 1 && !confirm("حذف هذه المحادثة نهائياً؟")) return;
    setMessages([introMessage()]);
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // تجاهل
    }
    toast.success("تم حذف المحادثة");
    inputRef.current?.focus();
  };

  const send = async (text: string) => {
    const value = text.trim();
    if (!value || thinking) return;
    const userMsg: ChatMessage = { id: uid(), role: "user", content: value, at: Date.now() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setThinking(true);
    try {
      const history = nextMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-16)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await askAssistant({ data: { messages: history } });
      setMessages((m) => [
        ...m,
        { id: uid(), role: "assistant", content: res.content, at: Date.now() },
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الاتصال بالمساعد");
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  };

  if (!isLeadership) return <Navigate to="/" />;

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-4xl flex-col gap-4">
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BrainCircuit className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold">المساعد الذكي</h1>
          <p className="text-xs text-muted-foreground">
            متصل بنموذج حقيقي عبر السيرفر · للمسؤول والنائب
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={clearChat}
          disabled={thinking || messages.length <= 1}
          className="shrink-0 gap-1 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" /> حذف المحادثة
        </Button>
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
