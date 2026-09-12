import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Plus, Trash2 } from "lucide-react";

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

export const Route = createFileRoute("/planner")({
  component: PlannerPage,
  head: () => ({
    meta: [
      { title: "المخطط الأسبوعي | نظام الإدارة التنفيذية" },
      {
        name: "description",
        content: "جدول أسبوعي مقسّم بالساعات لإضافة المواعيد والمهام بنقرة واحدة.",
      },
      { property: "og:title", content: "المخطط الأسبوعي | نظام الإدارة التنفيذية" },
      {
        property: "og:description",
        content: "جدول أسبوعي مقسّم بالساعات لإضافة المواعيد والمهام بنقرة واحدة.",
      },
    ],
  }),
});

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

function PlannerPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<ScheduleBlock>>(emptyBlock(0, 8));

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
    setForm(emptyBlock(day, hour));
    setOpen(true);
  };

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
          <h1 className="text-3xl font-extrabold">المخطط الأسبوعي</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            انقر على أي خانة زمنية لإضافة موعد أو مهمة، وانقر على موعد قائم لتعديله.
          </p>
        </div>
        <Button onClick={() => openSlot(0, 9)}>
          <Plus className="size-4" /> موعد جديد
        </Button>
      </header>

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
                    const color = palette[b.title.length % palette.length];
                    return (
                      <button
                        key={`${d.key}-${hour}`}
                        type="button"
                        onClick={() => {
                          setForm({
                            ...b,
                            start_time: hhmm(b.start_time),
                            end_time: hhmm(b.end_time),
                          });
                          setOpen(true);
                        }}
                        className={`min-h-14 rounded-md border p-2 text-right text-xs font-semibold transition-shadow hover:shadow-md ${color}`}
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
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {DAYS[b.day_of_week]?.label} · {hhmm(b.start_time)} — {hhmm(b.end_time)}
              </p>
              {b.description && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{b.description}</p>
              )}
            </article>
          ))}
          {!all.length && (
            <p className="text-sm text-muted-foreground">لا توجد مواعيد محفوظة بعد.</p>
          )}
        </div>
      </section>

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
