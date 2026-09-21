import { createFileRoute, ClientOnly, Navigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Bot,
  Compass,
  Map as MapIcon,
  Radio,
  Save,
  Send,
  Trash2,
  Tv,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { askAssistant } from "@/lib/assistant-api";
import { ART_OF_WAR_CHAPTERS } from "@/lib/art-of-war";
import {
  ART_OF_WAR,
  emptyCommandRoom,
  flashTickerText,
  loadCommandRoom,
  NEWS_KIND_LABEL,
  saveCommandRoom,
  uid,
  type CommandRoomState,
  type NewsFlash,
  type NewsKind,
  type TopoMark,
} from "@/lib/command-room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TopoMap = lazy(() => import("@/components/TopoMap"));

export const Route = createFileRoute("/command")({
  component: CommandRoomPage,
  head: () => ({
    meta: [
      { title: "غرفة التخطيط | نظام الإدارة التنفيذية" },
      {
        name: "description",
        content: "قسم خاص بمسؤول الأسرة: خرائط طبوغرافية، فن الحرب، نشرة الأخبار، ومساعد فن الحرب.",
      },
    ],
  }),
});

type Tab = "brief" | "news" | "topo" | "war" | "warAi" | "env";

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

function CommandRoomPage() {
  const { isManager } = useAuth();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("brief");
  const [state, setState] = useState<CommandRoomState>(emptyCommandRoom());
  const [draftMark, setDraftMark] = useState<Partial<TopoMark>>({
    title: "",
    note: "",
    lat: 33.5,
    lng: 36.3,
  });
  const [selected, setSelected] = useState<TopoMark | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [flashForm, setFlashForm] = useState<{
    kind: NewsKind;
    title: string;
    detail: string;
    qty: number;
  }>({ kind: "troops", title: "", detail: "", qty: 0 });
  const [warChat, setWarChat] = useState<ChatMsg[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "أنا مساعد فن الحرب. اسأل عن تقييم موقف، نصيحة، أو خطة عمل وسأجيب وفق فصول سون تزو الـ١٣.",
    },
  ]);
  const [warInput, setWarInput] = useState("");
  const [warThinking, setWarThinking] = useState(false);

  useEffect(() => {
    setState(loadCommandRoom());
    setReady(true);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  if (!isManager) return <Navigate to="/" />;

  const patch = (partial: Partial<CommandRoomState>) =>
    setState((s) => ({ ...s, ...partial }));

  const persist = () => {
    saveCommandRoom(state);
    toast.success("حُفظت غرفة التخطيط على هذا الجهاز");
  };

  const addMark = () => {
    if (!draftMark.title?.trim() || draftMark.lat == null || draftMark.lng == null) {
      toast.error("أدخل عنواناً وإحداثيات للنقطة");
      return;
    }
    const mark: TopoMark = {
      id: uid(),
      title: draftMark.title.trim(),
      note: draftMark.note?.trim() ?? "",
      lat: Number(draftMark.lat),
      lng: Number(draftMark.lng),
    };
    patch({ marks: [...state.marks, mark] });
    setDraftMark({ title: "", note: "", lat: mark.lat, lng: mark.lng });
    toast.success("أُضيفت نقطة على الخريطة الطبوغرافية");
  };

  const addFlash = () => {
    if (!flashForm.title.trim()) {
      toast.error("أدخل عنوان التحديث");
      return;
    }
    const flash: NewsFlash = {
      id: uid(),
      kind: flashForm.kind,
      title: flashForm.title.trim(),
      detail: flashForm.detail.trim(),
      qty: Number(flashForm.qty) || 0,
      at: Date.now(),
    };
    patch({ flashes: [flash, ...state.flashes].slice(0, 80) });
    setFlashForm({ kind: flashForm.kind, title: "", detail: "", qty: 0 });
    toast.success("نُشر التحديث على شريط الأخبار");
  };

  const askWar = async () => {
    const value = warInput.trim();
    if (!value || warThinking) return;
    const userMsg: ChatMsg = { id: uid(), role: "user", content: value };
    const next = [...warChat, userMsg];
    setWarChat(next);
    setWarInput("");
    setWarThinking(true);
    try {
      const history = next
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-14)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await askAssistant({ data: { messages: history, mode: "art-of-war" } });
      setWarChat((m) => [...m, { id: uid(), role: "assistant", content: res.content }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الاتصال بمساعد فن الحرب");
    } finally {
      setWarThinking(false);
    }
  };

  const clock = now.toLocaleString("ar-SY", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const tabs: { key: Tab; label: string; icon: typeof Radio }[] = [
    { key: "brief", label: "نشرة ميدانية", icon: Radio },
    { key: "news", label: "غرفة الأخبار", icon: Tv },
    { key: "topo", label: "خرائط طبوغرافية", icon: MapIcon },
    { key: "war", label: "فصول فن الحرب", icon: BookOpen },
    { key: "warAi", label: "مساعد فن الحرب", icon: Bot },
    { key: "env", label: "بيئة التخطيط", icon: Compass },
  ];

  const ticker = flashTickerText(state.flashes);

  return (
    <div className="space-y-4">
      <header className="overflow-hidden rounded-xl border bg-[#0b1220] text-[#e8eef7]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2 text-xs">
          <div className="flex items-center gap-2 font-extrabold tracking-wide">
            <span className="inline-flex size-2 animate-pulse rounded-full bg-red-500" />
            بث مباشر — غرفة مسؤول الأسرة
          </div>
          <span className="text-white/60">{clock}</span>
        </div>
        <div className="px-4 py-5 md:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-300/90">
            EXECUTIVE BRIEFING DESK
          </p>
          <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">{state.headline}</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/75">{state.lead}</p>
        </div>
        <div className="overflow-hidden border-t border-white/10 bg-black/40 py-2">
          <p className="cmd-marquee whitespace-nowrap text-xs text-amber-200/90">{ticker}{ticker}</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>
        <Button onClick={persist} disabled={!ready}>
          <Save className="size-4" /> حفظ الغرفة
        </Button>
      </div>

      {tab === "brief" && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="panel space-y-3 p-5">
            <Label>عنوان النشرة</Label>
            <Input value={state.headline} onChange={(e) => patch({ headline: e.target.value })} />
            <Label>المقدمة (مثل مقدمة تقرير إخباري)</Label>
            <Textarea value={state.lead} onChange={(e) => patch({ lead: e.target.value })} rows={3} />
            <Label>تقرير ميداني</Label>
            <Textarea value={state.field} onChange={(e) => patch({ field: e.target.value })} rows={6} />
            <Label>تحليل واستنتاج</Label>
            <Textarea value={state.analysis} onChange={(e) => patch({ analysis: e.target.value })} rows={5} />
          </div>
          <div className="overflow-hidden rounded-xl border bg-[#0b1220] text-[#e8eef7]">
            <div className="border-b border-white/10 px-4 py-2 text-xs font-bold text-teal-300">
              معاينة القناة
            </div>
            <div className="space-y-3 p-4 text-sm">
              <p className="text-[10px] font-bold text-red-400">مباشر الآن</p>
              <h2 className="text-lg font-extrabold leading-snug">{state.headline}</h2>
              <p className="text-white/80">{state.lead}</p>
              <div className="rounded-lg bg-white/5 p-3">
                <p className="mb-1 text-[11px] font-bold text-amber-300">من الميدان</p>
                <p className="whitespace-pre-wrap text-white/75">{state.field}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <p className="mb-1 text-[11px] font-bold text-sky-300">تحليل</p>
                <p className="whitespace-pre-wrap text-white/75">{state.analysis}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "news" && (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="panel space-y-3 p-5">
            <h2 className="font-extrabold">إضافة تحديث (مثل قنوات الأخبار)</h2>
            <p className="text-xs text-muted-foreground">
              سجّل دخول جنود أو آليات أو عتاد أو تحرك — يظهر فوراً على شريط العاجل أعلاه.
            </p>
            <div>
              <Label>النوع</Label>
              <Select
                value={flashForm.kind}
                onValueChange={(v) => setFlashForm((f) => ({ ...f, kind: v as NewsKind }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {(Object.keys(NEWS_KIND_LABEL) as NewsKind[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {NEWS_KIND_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>العنوان العاجل</Label>
              <Input
                value={flashForm.title}
                onChange={(e) => setFlashForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="مثال: وصول دفعة آليات خفيفة"
              />
            </div>
            <div>
              <Label>العدد (اختياري)</Label>
              <Input
                type="number"
                value={String(flashForm.qty)}
                onChange={(e) => setFlashForm((f) => ({ ...f, qty: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>التفاصيل</Label>
              <Textarea
                rows={4}
                value={flashForm.detail}
                onChange={(e) => setFlashForm((f) => ({ ...f, detail: e.target.value }))}
                placeholder="المصدر، الاتجاه، الملاحظات…"
              />
            </div>
            <Button className="w-full" onClick={addFlash}>
              بث التحديث
            </Button>
          </div>
          <div className="panel space-y-3 p-5">
            <h2 className="font-extrabold">سجل البث</h2>
            <ul className="max-h-[28rem] space-y-3 overflow-y-auto">
              {state.flashes.map((f) => (
                <li key={f.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-red-600">
                        عاجل · {NEWS_KIND_LABEL[f.kind]}
                        {f.qty ? ` · ${f.qty}` : ""}
                      </p>
                      <p className="font-extrabold">{f.title}</p>
                      {f.detail ? <p className="mt-1 text-sm text-muted-foreground">{f.detail}</p> : null}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(f.at).toLocaleString("ar-SY")}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="حذف"
                      onClick={() => patch({ flashes: state.flashes.filter((x) => x.id !== f.id) })}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </button>
                  </div>
                </li>
              ))}
              {!state.flashes.length && (
                <p className="text-sm text-muted-foreground">لا تحديثات بعد. أضف أول بث من اليسار.</p>
              )}
            </ul>
          </div>
        </div>
      )}

      {tab === "topo" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="panel h-[420px] overflow-hidden p-0 md:h-[520px]">
            <ClientOnly
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  تحميل الخريطة…
                </div>
              }
            >
              <Suspense fallback={<div className="flex h-full items-center justify-center text-sm">…</div>}>
                <TopoMap
                  marks={state.marks}
                  center={[Number(draftMark.lat) || 33.5, Number(draftMark.lng) || 36.3]}
                  onPick={(lat, lng) => setDraftMark((d) => ({ ...d, lat, lng }))}
                  onSelect={setSelected}
                />
              </Suspense>
            </ClientOnly>
          </div>
          <div className="panel space-y-3 p-4">
            <p className="text-sm font-extrabold">نقطة طبوغرافية</p>
            <p className="text-xs text-muted-foreground">انقر على الخريطة لالتقاط الإحداثيات، ثم احفظ النقطة.</p>
            <div>
              <Label>العنوان</Label>
              <Input
                value={draftMark.title ?? ""}
                onChange={(e) => setDraftMark((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>ملاحظة</Label>
              <Textarea
                value={draftMark.note ?? ""}
                onChange={(e) => setDraftMark((d) => ({ ...d, note: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>خط العرض</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={String(draftMark.lat ?? "")}
                  onChange={(e) => setDraftMark((d) => ({ ...d, lat: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>خط الطول</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={String(draftMark.lng ?? "")}
                  onChange={(e) => setDraftMark((d) => ({ ...d, lng: Number(e.target.value) }))}
                />
              </div>
            </div>
            <Button className="w-full" onClick={addMark}>
              إضافة نقطة
            </Button>
            <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
              {state.marks.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-2 border-b pb-2">
                  <button type="button" className="text-start font-semibold" onClick={() => setSelected(m)}>
                    {m.title}
                    <span className="mt-0.5 block font-normal text-muted-foreground">
                      {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="حذف"
                    onClick={() => patch({ marks: state.marks.filter((x) => x.id !== m.id) })}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </button>
                </li>
              ))}
            </ul>
            {selected && (
              <p className="rounded-md bg-muted p-2 text-xs">
                المحدد: <strong>{selected.title}</strong> — {selected.note || "بدون ملاحظة"}
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "war" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            الفصول الـ١٣ كاملة مع المبادئ والتطبيق. اكتب ملاحظاتك تحت كل فصل لتغذية تقييماتك لاحقاً.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {ART_OF_WAR_CHAPTERS.map((card) => (
              <div key={card.id} className="panel space-y-2 p-5">
                <p className="text-[11px] font-bold text-primary">الفصل {card.chapter}</p>
                <h2 className="text-base font-extrabold">{card.title}</h2>
                <p className="text-sm text-muted-foreground">{card.summary}</p>
                <ul className="space-y-1 text-xs">
                  {card.maxims.map((m) => (
                    <li key={m} className="flex gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/70" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] font-bold text-muted-foreground">تطبيق عملي</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {card.apply.map((a) => (
                    <li key={a}>• {a}</li>
                  ))}
                </ul>
                <Label>ملاحظتك الخاصة</Label>
                <Textarea
                  rows={3}
                  value={state.warNotes[card.id] ?? ""}
                  onChange={(e) =>
                    patch({ warNotes: { ...state.warNotes, [card.id]: e.target.value } })
                  }
                  placeholder="كيف يطبَّق هذا الفصل على وضعك الحالي؟"
                />
              </div>
            ))}
          </div>
          <div className="panel p-4 text-xs text-muted-foreground">
            بطاقات مختصرة للمرجع السريع: {ART_OF_WAR.map((c) => c.title).join(" · ")}
          </div>
        </div>
      )}

      {tab === "warAi" && (
        <div className="panel flex h-[min(70vh,640px)] flex-col p-0">
          <div className="border-b px-4 py-3">
            <h2 className="font-extrabold">مساعد فن الحرب</h2>
            <p className="text-xs text-muted-foreground">
              يرد وفق فصول سون تزو فقط — للتقييم والنصيحة وخطة العمل.
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {warChat.map((m) => (
              <div
                key={m.id}
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "ms-auto bg-primary text-primary-foreground"
                    : "border bg-background"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {warThinking && (
              <p className="text-sm text-muted-foreground">يراجع الفصول ويصوغ الرد…</p>
            )}
          </div>
          <div className="flex gap-2 border-t p-3">
            <Textarea
              rows={2}
              value={warInput}
              onChange={(e) => setWarInput(e.target.value)}
              placeholder="مثال: قيّم موقفي إن تأخر الإمداد أسبوعاً…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void askWar();
                }
              }}
            />
            <Button disabled={warThinking || !warInput.trim()} onClick={() => void askWar()}>
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {tab === "env" && (
        <div className="panel space-y-3 p-5">
          <h2 className="text-lg font-extrabold">بيئة التخطيط والعمل</h2>
          <p className="text-sm text-muted-foreground">
            مساحة خاصة بك لوصف ضغط الميدان، القيود، والمسارات النشطة — بأسلوب تقرير داخلي لا يراه غيرك.
          </p>
          <Textarea
            rows={14}
            value={state.environment}
            onChange={(e) => patch({ environment: e.target.value })}
          />
        </div>
      )}

      <style>{`
        .cmd-marquee {
          display: inline-block;
          min-width: 100%;
          animation: cmd-marquee 36s linear infinite;
        }
        @keyframes cmd-marquee {
          0% { transform: translateX(-30%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
