import { createFileRoute, ClientOnly, Navigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Compass,
  Hand,
  Map as MapIcon,
  MessageSquareText,
  Radio,
  Save,
  Send,
  Trash2,
  Users,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { askAssistant } from "@/lib/assistant-api";
import { ART_OF_WAR_CHAPTERS } from "@/lib/art-of-war";
import {
  ARROW_COLORS,
  ART_OF_WAR,
  emptyCommandRoom,
  flashTickerText,
  loadCommandRoom,
  saveCommandRoom,
  uid,
  UNIT_KIND_LABEL,
  type AnalystArrow,
  type AnalystCallout,
  type AnalystUnit,
  type CommandRoomState,
  type TopoMark,
  type UnitKind,
} from "@/lib/command-room";
import type { AnalystTool } from "@/components/AnalystMap";
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
const AnalystMap = lazy(() => import("@/components/AnalystMap"));

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
  const [analystTool, setAnalystTool] = useState<AnalystTool>("unit");
  const [pendingArrow, setPendingArrow] = useState<[number, number] | null>(null);
  const [unitDraft, setUnitDraft] = useState({
    kind: "troops" as UnitKind,
    label: "",
    note: "",
    qty: 0,
  });
  const [arrowDraft, setArrowDraft] = useState({
    label: "تقدم",
    note: "",
    color: ARROW_COLORS[0].key,
  });
  const [calloutDraft, setCalloutDraft] = useState("شرح التقدم…");
  const [mapCenter, setMapCenter] = useState<[number, number]>([33.5, 36.3]);
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

  const onAnalystPick = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    if (analystTool === "unit") {
      if (!unitDraft.label.trim()) {
        toast.error("اكتب اسم الوحدة أولاً ثم انقر على الخريطة");
        return;
      }
      const unit: AnalystUnit = {
        id: uid(),
        kind: unitDraft.kind,
        label: unitDraft.label.trim(),
        note: unitDraft.note.trim(),
        qty: Number(unitDraft.qty) || 0,
        lat,
        lng,
      };
      patch({ units: [...state.units, unit] });
      toast.success("وُضعت الوحدة على الخريطة");
      return;
    }
    if (analystTool === "arrow") {
      if (!pendingArrow) {
        setPendingArrow([lat, lng]);
        toast.message("نقطة البداية جاهزة — انقر نهاية السهم");
        return;
      }
      const arrow: AnalystArrow = {
        id: uid(),
        label: arrowDraft.label.trim() || "تقدم",
        note: arrowDraft.note.trim(),
        color: arrowDraft.color,
        fromLat: pendingArrow[0],
        fromLng: pendingArrow[1],
        toLat: lat,
        toLng: lng,
      };
      patch({ arrows: [...state.arrows, arrow] });
      setPendingArrow(null);
      toast.success("أُضيف سهم التقدم");
      return;
    }
    if (analystTool === "callout") {
      if (!calloutDraft.trim()) {
        toast.error("اكتب نص الشرح أولاً");
        return;
      }
      const callout: AnalystCallout = {
        id: uid(),
        text: calloutDraft.trim(),
        lat,
        lng,
      };
      patch({ callouts: [...state.callouts, callout] });
      toast.success("أُضيف شرح على الخريطة");
    }
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
    { key: "news", label: "تغطية تحليلية", icon: Users },
    { key: "topo", label: "خرائط طبوغرافية", icon: MapIcon },
    { key: "war", label: "فصول فن الحرب", icon: BookOpen },
    { key: "warAi", label: "مساعد فن الحرب", icon: Bot },
    { key: "env", label: "بيئة التخطيط", icon: Compass },
  ];

  const analystTicker =
    [
      ...state.units.slice(0, 4).map((u) => `وحدة · ${u.label}${u.qty ? ` ×${u.qty}` : ""}`),
      ...state.arrows.slice(0, 3).map((a) => `سهم · ${a.label || "تقدم"}`),
      ...state.callouts.slice(0, 2).map((c) => `شرح · ${c.text.slice(0, 28)}`),
    ].join(" · ") || flashTickerText(state.flashes);
  const ticker = analystTicker.endsWith(" · ") ? analystTicker : `${analystTicker} · `;

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
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
              {(
                [
                  { key: "unit" as const, label: "وضع وحدة", icon: Users },
                  { key: "arrow" as const, label: "رسم سهم", icon: ArrowUpRight },
                  { key: "callout" as const, label: "شرح تقدّم", icon: MessageSquareText },
                  { key: "pan" as const, label: "تحريك فقط", icon: Hand },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setAnalystTool(t.key);
                    setPendingArrow(null);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                    analystTool === t.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <t.icon className="size-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="panel h-[440px] overflow-hidden p-0 md:h-[560px]">
              <ClientOnly
                fallback={
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    تحميل لوحة التحليل…
                  </div>
                }
              >
                <Suspense fallback={<div className="flex h-full items-center justify-center text-sm">…</div>}>
                  <AnalystMap
                    units={state.units}
                    arrows={state.arrows}
                    callouts={state.callouts}
                    center={mapCenter}
                    tool={analystTool}
                    pendingArrowStart={pendingArrow}
                    onPick={onAnalystPick}
                    onSelectUnit={() => {}}
                    onSelectArrow={() => {}}
                    onSelectCallout={() => {}}
                  />
                </Suspense>
              </ClientOnly>
            </div>
            <p className="text-xs text-muted-foreground">
              اختر الأداة ثم انقر على الخريطة — مثل محلل يضع الجنود والأسهم ويشرح التقدم مباشرة على الشاشة.
            </p>
          </div>

          <div className="panel space-y-4 p-4">
            {analystTool === "unit" && (
              <div className="space-y-3">
                <h2 className="font-extrabold">وحدة على الخريطة</h2>
                <div>
                  <Label>النوع</Label>
                  <Select
                    value={unitDraft.kind}
                    onValueChange={(v) => setUnitDraft((d) => ({ ...d, kind: v as UnitKind }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {(Object.keys(UNIT_KIND_LABEL) as UnitKind[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {UNIT_KIND_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الاسم / التسمية</Label>
                  <Input
                    value={unitDraft.label}
                    onChange={(e) => setUnitDraft((d) => ({ ...d, label: e.target.value }))}
                    placeholder="مثال: سرية أولى"
                  />
                </div>
                <div>
                  <Label>العدد</Label>
                  <Input
                    type="number"
                    value={String(unitDraft.qty)}
                    onChange={(e) => setUnitDraft((d) => ({ ...d, qty: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label>ملاحظة</Label>
                  <Textarea
                    rows={2}
                    value={unitDraft.note}
                    onChange={(e) => setUnitDraft((d) => ({ ...d, note: e.target.value }))}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">بعد تعبئة الحقول انقر موقع الوحدة على الخريطة.</p>
              </div>
            )}

            {analystTool === "arrow" && (
              <div className="space-y-3">
                <h2 className="font-extrabold">سهم تقدّم</h2>
                <div>
                  <Label>عنوان السهم</Label>
                  <Input
                    value={arrowDraft.label}
                    onChange={(e) => setArrowDraft((d) => ({ ...d, label: e.target.value }))}
                    placeholder="تقدم / انسحاب / دعم"
                  />
                </div>
                <div>
                  <Label>اللون</Label>
                  <Select
                    value={arrowDraft.color}
                    onValueChange={(v) => setArrowDraft((d) => ({ ...d, color: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {ARROW_COLORS.map((c) => (
                        <SelectItem key={c.key} value={c.key}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>شرح الحركة</Label>
                  <Textarea
                    rows={2}
                    value={arrowDraft.note}
                    onChange={(e) => setArrowDraft((d) => ({ ...d, note: e.target.value }))}
                    placeholder="من أين وإلى أين ولماذا…"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {pendingArrow
                    ? "انقر الآن نقطة النهاية على الخريطة."
                    : "انقر نقطة البداية ثم نقطة النهاية."}
                </p>
                {pendingArrow && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setPendingArrow(null)}>
                    إلغاء البداية
                  </Button>
                )}
              </div>
            )}

            {analystTool === "callout" && (
              <div className="space-y-3">
                <h2 className="font-extrabold">شرح على الشاشة</h2>
                <Textarea
                  rows={4}
                  value={calloutDraft}
                  onChange={(e) => setCalloutDraft(e.target.value)}
                  placeholder="مثال: الضغط يتصاعد من الجهة الشرقية…"
                />
                <p className="text-[11px] text-muted-foreground">انقر مكان الظهور على الخريطة.</p>
              </div>
            )}

            {analystTool === "pan" && (
              <p className="text-sm text-muted-foreground">حرّك الخريطة بحرية دون إضافة عناصر.</p>
            )}

            <div className="border-t pt-3">
              <h3 className="mb-2 text-xs font-extrabold">العناصر على اللوحة</h3>
              <ul className="max-h-52 space-y-2 overflow-y-auto text-xs">
                {state.units.map((u) => (
                  <li key={u.id} className="flex items-start justify-between gap-2 border-b pb-2">
                    <span>
                      <strong>{u.label}</strong>
                      <span className="block text-muted-foreground">
                        {UNIT_KIND_LABEL[u.kind]}
                        {u.qty ? ` · ${u.qty}` : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label="حذف"
                      onClick={() => patch({ units: state.units.filter((x) => x.id !== u.id) })}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </button>
                  </li>
                ))}
                {state.arrows.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-2 border-b pb-2">
                    <span>
                      <strong>→ {a.label || "سهم"}</strong>
                      <span className="block text-muted-foreground">{a.note || "حركة"}</span>
                    </span>
                    <button
                      type="button"
                      aria-label="حذف"
                      onClick={() => patch({ arrows: state.arrows.filter((x) => x.id !== a.id) })}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </button>
                  </li>
                ))}
                {state.callouts.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-2 border-b pb-2">
                    <span className="line-clamp-2">{c.text}</span>
                    <button
                      type="button"
                      aria-label="حذف"
                      onClick={() => patch({ callouts: state.callouts.filter((x) => x.id !== c.id) })}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </button>
                  </li>
                ))}
                {!state.units.length && !state.arrows.length && !state.callouts.length && (
                  <p className="text-muted-foreground">لا عناصر بعد — ابدأ بوضع وحدة أو سهم.</p>
                )}
              </ul>
            </div>
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
