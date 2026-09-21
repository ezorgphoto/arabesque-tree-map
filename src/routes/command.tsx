import { createFileRoute, ClientOnly, Navigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Compass,
  Map as MapIcon,
  Radio,
  Save,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import {
  ART_OF_WAR,
  emptyCommandRoom,
  loadCommandRoom,
  saveCommandRoom,
  uid,
  type CommandRoomState,
  type TopoMark,
} from "@/lib/command-room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TopoMap = lazy(() => import("@/components/TopoMap"));

export const Route = createFileRoute("/command")({
  component: CommandRoomPage,
  head: () => ({
    meta: [
      { title: "غرفة التخطيط | نظام الإدارة التنفيذية" },
      {
        name: "description",
        content: "قسم خاص بمسؤول الأسرة: خرائط طبوغرافية، فن الحرب، وبيئة التخطيط.",
      },
    ],
  }),
});

type Tab = "brief" | "topo" | "war" | "env";

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

  const clock = now.toLocaleString("ar-SY", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const tabs: { key: Tab; label: string; icon: typeof Radio }[] = [
    { key: "brief", label: "نشرة ميدانية", icon: Radio },
    { key: "topo", label: "خرائط طبوغرافية", icon: MapIcon },
    { key: "war", label: "فن الحرب", icon: BookOpen },
    { key: "env", label: "بيئة التخطيط", icon: Compass },
  ];

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
          <p className="animate-[marquee_28s_linear_infinite] whitespace-nowrap text-xs text-amber-200/90">
            عاجل · التخطيط قبل الحركة · راجع الأرض قبل القرار · وحدة الأمر مسار واحد · الإمداد قبل الإطلاق · معرفة النفس والآخر ·&nbsp;
            عاجل · التخطيط قبل الحركة · راجع الأرض قبل القرار · وحدة الأمر مسار واحد · الإمداد قبل الإطلاق · معرفة النفس والآخر
          </p>
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

      {tab === "topo" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="panel h-[420px] overflow-hidden p-0 md:h-[520px]">
            <ClientOnly fallback={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">تحميل الخريطة…</div>}>
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
        <div className="grid gap-3 md:grid-cols-2">
          {ART_OF_WAR.map((card) => (
            <div key={card.id} className="panel space-y-2 p-5">
              <h2 className="text-base font-extrabold">{card.title}</h2>
              <p className="text-sm text-muted-foreground">{card.text}</p>
              <Label>ملاحظتك الخاصة</Label>
              <Textarea
                rows={3}
                value={state.warNotes[card.id] ?? ""}
                onChange={(e) =>
                  patch({ warNotes: { ...state.warNotes, [card.id]: e.target.value } })
                }
                placeholder="كيف يطبَّق هذا المبدأ على وضعك الحالي؟"
              />
            </div>
          ))}
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
        @keyframes marquee {
          0% { transform: translateX(-20%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
