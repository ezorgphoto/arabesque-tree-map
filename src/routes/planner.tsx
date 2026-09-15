import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DAYS,
  HOURS,
  hhmm,
  pad,
  scheduleApi,
  type ScheduleBlock,
} from "@/lib/extras";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/planner")({
  component: PlannerPage,
  head: () => ({
    meta: [
      { title: "المخطط الزمني | نظام الإدارة التنفيذية" },
      {
        name: "description",
        content: "مخطط زمني بعروض أسبوعية وشهرية وسنوية لإدارة المواعيد والمهام.",
      },
      { property: "og:title", content: "المخطط الزمني | نظام الإدارة التنفيذية" },
      {
        property: "og:description",
        content: "مخطط زمني بعروض أسبوعية وشهرية وسنوية لإدارة المواعيد والمهام.",
      },
    ],
  }),
});

type PlannerView = "week" | "month" | "year";

const VIEW_LABELS: { key: PlannerView; label: string }[] = [
  { key: "week", label: "أسبوع" },
  { key: "month", label: "شهر" },
  { key: "year", label: "سنة" },
];

const emptyBlock = (day: number, hour: number): Partial<ScheduleBlock> => ({
  title: "",
  description: "",
  day_of_week: day,
  start_time: `${pad(hour)}:00`,
  end_time: `${pad(Math.min(hour + 1, 23))}:00`,
});

const palette = [
  "bg-primary/12 border-primary/40 text-primary",
  "bg-emerald-500/12 border-emerald-500/40 text-emerald-700",
  "bg-amber-500/15 border-amber-500/40 text-amber-700",
  "bg-sky-500/12 border-sky-500/40 text-sky-700",
  "bg-violet-500/12 border-violet-500/40 text-violet-700",
];

const colorFor = (title: string) => palette[title.length % palette.length];

const monthLabel = (year: number, month: number) =>
  new Intl.DateTimeFormat("ar", { month: "long", year: "numeric" }).format(new Date(year, month, 1));

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// شبكة أيام الشهر: تبدأ من الأحد (يطابق day_of_week حيث 0 = الأحد)
function monthMatrix(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function PlannerPage() {
  const { isLeadership } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<ScheduleBlock>>(emptyBlock(0, 8));
  const [view, setView] = useState<PlannerView>("week");
  const [cursor, setCursor] = useState<Date>(() => new Date());

  const blocks = useQuery({ queryKey: ["weekly_schedule"], queryFn: scheduleApi.list });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["weekly_schedule"] });

  const save = useMutation({
    mutationFn: async (payload: Partial<ScheduleBlock>) => {
      const { id, created_at, ...rest } = payload;
      return id ? scheduleApi.update(id, rest) : scheduleApi.create(rest);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success("تم حفظ الموعد في المخطط");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: scheduleApi.remove,
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success("تم حذف الموعد");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = blocks.data ?? [];

  const openSlot = (day: number, hour: number) => {
    if (!isLeadership) return;
    setForm(emptyBlock(day, hour));
    setOpen(true);
  };

  const openEdit = (b: ScheduleBlock) => {
    setForm({ ...b, start_time: hhmm(b.start_time), end_time: hhmm(b.end_time) });
    setOpen(true);
  };

  const blocksByWeekday = useMemo(() => {
    const map: Record<number, ScheduleBlock[]> = {};
    for (const d of DAYS) map[d.key] = [];
    for (const b of all) (map[b.day_of_week] ??= []).push(b);
    for (const k of Object.keys(map)) {
      map[Number(k)]!.sort((a, b) => hhmm(a.start_time).localeCompare(hhmm(b.start_time)));
    }
    return map;
  }, [all]);

  const blockAt = (day: number, hour: number) =>
    all.find((b) => {
      if (b.day_of_week !== day) return false;
      const start = Number(hhmm(b.start_time).slice(0, 2));
      const end = Number(hhmm(b.end_time).slice(0, 2));
      return hour >= start && hour < Math.max(end, start + 1);
    });

  const isStart = (b: ScheduleBlock, hour: number) =>
    Number(hhmm(b.start_time).slice(0, 2)) === hour;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">المخطط الزمني</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            نظّم مواعيدك ومهامك المتكررة، واعرضها أسبوعياً أو شهرياً أو سنوياً حسب اختيارك.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border bg-muted/40 p-0.5">
            {VIEW_LABELS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  view === v.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {isLeadership && (
            <Button onClick={() => openSlot(0, 9)}>
              <Plus className="size-4" /> موعد جديد
            </Button>
          )}
        </div>
      </header>

      {view === "week" && (
        <>
          <div className="panel overflow-x-auto p-2">
            <div className="min-w-[52rem]">
              <div className="grid grid-cols-[5rem_repeat(7,minmax(0,1fr))] gap-1">
                <div className="sticky top-0 z-10 rounded-md bg-muted/60 p-2 text-center text-xs font-bold">
                  الساعة
                </div>
                {DAYS.map((d) => (
                  <div
                    key={d.key}
                    className="rounded-md bg-muted/60 p-2 text-center text-xs font-bold"
                  >
                    {d.label}
                  </div>
                ))}

                {HOURS.map((hour) => (
                  <div key={hour} className="contents">
                    <div className="flex items-center justify-center rounded-md bg-muted/30 p-2 text-[11px] font-semibold text-muted-foreground">
                      {pad(hour)}:00
                    </div>
                    {DAYS.map((d) => {
                      const b = blockAt(d.key, hour);
                      if (b && !isStart(b, hour)) {
                        return (
                          <div
                            key={`${d.key}-${hour}`}
                            className="rounded-md border border-dashed border-border/60 bg-accent/20"
                          />
                        );
                      }
                      if (b) {
                        return (
                          <button
                            key={`${d.key}-${hour}`}
                            type="button"
                            onClick={() => openEdit(b)}
                            className={`min-h-14 rounded-md border p-2 text-right text-xs font-semibold transition-shadow hover:shadow-md ${colorFor(
                              b.title,
                            )}`}
                          >
                            <span className="block leading-snug">{b.title}</span>
                            <span className="mt-1 block text-[10px] font-medium opacity-75">
                              {hhmm(b.start_time)} — {hhmm(b.end_time)}
                            </span>
                          </button>
                        );
                      }
                      return (
                        <button
                          key={`${d.key}-${hour}`}
                          type="button"
                          onClick={() => openSlot(d.key, hour)}
                          aria-label={`إضافة موعد يوم ${DAYS[d.key]?.label} الساعة ${pad(hour)}:00`}
                          className="group min-h-14 rounded-md border border-transparent bg-background transition-colors hover:border-primary/40 hover:bg-primary/5"
                        >
                          <Plus className="mx-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section className="panel p-4">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <CalendarClock className="size-4 text-primary" /> مواعيد الأسبوع ({all.length})
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {all.map((b) => (
                <article key={b.id} className="rounded-xl border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-snug">{b.title}</p>
                    {isLeadership && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("حذف هذا الموعد؟")) remove.mutate(b.id);
                      }}
                      aria-label="حذف"
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {DAYS[b.day_of_week]?.label} · {hhmm(b.start_time)} — {hhmm(b.end_time)}
                  </p>
                  {b.description && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {b.description}
                    </p>
                  )}
                </article>
              ))}
              {!all.length && (
                <p className="text-sm text-muted-foreground">لا توجد مواعيد محفوظة بعد.</p>
              )}
            </div>
          </section>
        </>
      )}

      {view === "month" && (
        <MonthView
          cursor={cursor}
          setCursor={setCursor}
          blocksByWeekday={blocksByWeekday}
          onEdit={openEdit}
          onNew={(weekday) => openSlot(weekday, 9)}
        />
      )}

      {view === "year" && (
        <YearView
          year={cursor.getFullYear()}
          blocksByWeekday={blocksByWeekday}
          setYear={(y) => setCursor(new Date(y, cursor.getMonth(), 1))}
          openMonth={(m) => {
            setCursor(new Date(cursor.getFullYear(), m, 1));
            setView("month");
          }}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{form.id ? "تعديل الموعد" : "موعد جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="block-title">العنوان</Label>
              <Input
                id="block-title"
                value={form.title ?? ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: اجتماع مراجعة الحملة"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>اليوم</Label>
                <Select
                  value={String(form.day_of_week ?? 0)}
                  onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {DAYS.map((d) => (
                      <SelectItem key={d.key} value={String(d.key)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="block-start">من</Label>
                <Input
                  id="block-start"
                  type="time"
                  value={hhmm(form.start_time ?? "08:00")}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="block-end">إلى</Label>
                <Input
                  id="block-end"
                  type="time"
                  value={hhmm(form.end_time ?? "09:00")}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="block-desc">الوصف</Label>
              <Textarea
                id="block-desc"
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="تفاصيل الموعد أو المخرجات المتوقعة"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {form.id && (
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => {
                  if (form.id && confirm("حذف هذا الموعد؟")) remove.mutate(form.id);
                }}
              >
                حذف
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              disabled={!form.title?.trim() || save.isPending}
              onClick={() => {
                if (!form.title?.trim()) {
                  toast.error("العنوان مطلوب");
                  return;
                }
                save.mutate(form);
              }}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MonthView({
  cursor,
  setCursor,
  blocksByWeekday,
  onEdit,
  onNew,
}: {
  cursor: Date;
  setCursor: (d: Date) => void;
  blocksByWeekday: Record<number, ScheduleBlock[]>;
  onEdit: (b: ScheduleBlock) => void;
  onNew: (weekday: number) => void;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = monthMatrix(year, month);
  const today = new Date();
  const monthCount = cells.reduce(
    (acc, d) => acc + (d ? (blocksByWeekday[d.getDay()]?.length ?? 0) : 0),
    0,
  );

  return (
    <div className="panel p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label="الشهر السابق"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label="الشهر التالي"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold">{monthLabel(year, month)}</h2>
          <p className="text-[11px] text-muted-foreground">{monthCount} موعد خلال الشهر</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
          اليوم
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d) => (
          <div key={d.key} className="p-2 text-center text-xs font-bold text-muted-foreground">
            {d.label}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="min-h-24 rounded-md bg-muted/20" />;
          const dayBlocks = blocksByWeekday[date.getDay()] ?? [];
          const isToday = sameDay(date, today);
          return (
            <div
              key={i}
              className={`flex min-h-24 flex-col rounded-md border p-1 ${
                isToday ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold ${
                    isToday ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {date.getDate()}
                </span>
                <button
                  type="button"
                  onClick={() => onNew(date.getDay())}
                  aria-label="إضافة موعد"
                  className="text-muted-foreground/50 transition-colors hover:text-primary"
                >
                  <Plus className="size-3" />
                </button>
              </div>
              <div className="mt-1 space-y-0.5">
                {dayBlocks.slice(0, 3).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onEdit(b)}
                    title={`${b.title} · ${hhmm(b.start_time)}—${hhmm(b.end_time)}`}
                    className={`block w-full truncate rounded border px-1 py-0.5 text-right text-[10px] font-semibold ${colorFor(
                      b.title,
                    )}`}
                  >
                    {hhmm(b.start_time)} {b.title}
                  </button>
                ))}
                {dayBlocks.length > 3 && (
                  <span className="block px-1 text-[10px] text-muted-foreground">
                    + {dayBlocks.length - 3} أخرى
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearView({
  year,
  blocksByWeekday,
  setYear,
  openMonth,
}: {
  year: number;
  blocksByWeekday: Record<number, ScheduleBlock[]>;
  setYear: (y: number) => void;
  openMonth: (month: number) => void;
}) {
  const hasWeekday = (wd: number) => (blocksByWeekday[wd]?.length ?? 0) > 0;

  return (
    <div className="panel p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label="السنة السابقة"
            onClick={() => setYear(year - 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label="السنة التالية"
            onClick={() => setYear(year + 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>
        <h2 className="text-lg font-bold">{year}</h2>
        <span className="w-16" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, m) => {
          const cells = monthMatrix(year, m);
          const count = cells.reduce(
            (acc, d) => acc + (d ? (blocksByWeekday[d.getDay()]?.length ?? 0) : 0),
            0,
          );
          return (
            <button
              key={m}
              type="button"
              onClick={() => openMonth(m)}
              className="rounded-xl border bg-background p-3 text-right transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold">
                  {new Intl.DateTimeFormat("ar", { month: "long" }).format(new Date(year, m, 1))}
                </p>
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {count}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {DAYS.map((d) => (
                  <span
                    key={d.key}
                    className="text-center text-[8px] text-muted-foreground/70"
                  >
                    {d.label.slice(0, 1)}
                  </span>
                ))}
                {cells.map((date, i) =>
                  date ? (
                    <span
                      key={i}
                      className={`flex aspect-square items-center justify-center rounded text-[9px] ${
                        hasWeekday(date.getDay())
                          ? "bg-primary/15 font-bold text-primary"
                          : "text-muted-foreground/60"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  ) : (
                    <span key={i} />
                  ),
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
