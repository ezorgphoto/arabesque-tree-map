import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Plus, Trash2, User } from "lucide-react";
import { api, PRIORITIES, TASK_COLUMNS, type Task } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
  head: () => ({
    meta: [
      { title: "المهام | نظام الإدارة التنفيذية" },
      { name: "description", content: "لوحة كانبان لإدارة المهام بالسحب والإفلات." },
      { property: "og:title", content: "المهام | نظام الإدارة التنفيذية" },
      { property: "og:description", content: "لوحة كانبان لإدارة المهام بالسحب والإفلات." },
    ],
  }),
});

const empty: Partial<Task> = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  assignee: "",
  due_date: null,
};

const priorityStyle: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/15 text-accent-foreground",
  low: "bg-primary/10 text-primary",
};

function TasksPage() {
  const { isLeadership, profile, canManageTasks } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Task>>(empty);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const tasks = useQuery({ queryKey: ["tasks"], queryFn: api.tasks.list });
  const employees = useQuery({
    queryKey: ["employees"],
    queryFn: api.employees.list,
    enabled: canManageTasks,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const save = useMutation({
    mutationFn: async (payload: Partial<Task>) => {
      const { id, created_at, ...rest } = payload;
      if (!rest.due_date) rest.due_date = null;
      return id ? api.tasks.update(id, rest) : api.tasks.create(rest);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success("تم حفظ المهمة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.tasks.update(id, { status }),
    onSuccess: () => {
      invalidate();
      toast.success("تم تحديث حالة المهمة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: api.tasks.remove,
    onSuccess: () => {
      invalidate();
      toast.success("تم حذف المهمة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = tasks.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">لوحة المهام</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canManageTasks
              ? isLeadership
                ? "أسند المهام لأي عضو. المشرف يرى مهام قسمه فقط."
                : "أسند المهام لأعضاء قسمك أو لجنتك فقط."
              : "مهامك فقط. لا تظهر مهام الزملاء."}
          </p>
        </div>
        {canManageTasks && (
          <Button
            onClick={() => {
              setForm(empty);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> مهمة جديدة
          </Button>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TASK_COLUMNS.map((col) => {
          const items = all.filter((t) => t.status === col.key);
          return (
            <section
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.key);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
              onDrop={() => {
                if (dragId) {
                  const task = all.find((t) => t.id === dragId);
                  if (task && task.status !== col.key) move.mutate({ id: dragId, status: col.key });
                }
                setDragId(null);
                setOverCol(null);
              }}
              className={`panel flex min-h-[24rem] flex-col gap-3 p-4 transition-colors ${
                overCol === col.key ? "border-primary bg-primary/5" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold">{col.label}</h2>
                <Badge variant="secondary">{items.length}</Badge>
              </div>

              {items.map((t) => (
                <article
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => {
                    setForm(t);
                    setOpen(true);
                  }}
                  className="cursor-grab rounded-xl border bg-background p-3 text-right shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-snug">{t.title}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("حذف هذه المهمة؟")) remove.mutate(t.id);
                      }}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="حذف"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {t.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-md px-2 py-0.5 font-semibold ${priorityStyle[t.priority] ?? ""}`}>
                      {PRIORITIES[t.priority] ?? t.priority}
                    </span>
                    {t.assignee && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <User className="size-3" />
                        {t.assignee}
                      </span>
                    )}
                    {t.due_date && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <CalendarDays className="size-3" />
                        {t.due_date}
                      </span>
                    )}
                  </div>
                </article>
              ))}

              {!items.length && (
                <p className="mt-6 text-center text-xs text-muted-foreground">أفلت المهام هنا</p>
              )}
            </section>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{form.id ? "تعديل المهمة" : "مهمة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>عنوان المهمة</Label>
              <Input
                value={form.title ?? ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: إعداد التقرير الشهري"
              />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="تفاصيل إضافية عن المهمة"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>الحالة</Label>
                <Select
                  value={form.status ?? "todo"}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {TASK_COLUMNS.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الأولوية</Label>
                <Select
                  value={form.priority ?? "medium"}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {Object.entries(PRIORITIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المسؤول</Label>
                {canManageTasks ? (
                  <Select
                    value={form.assignee_id ?? "none"}
                    onValueChange={(v) => {
                      const emp = (employees.data ?? []).find((e) => e.id === v);
                      setForm({
                        ...form,
                        assignee_id: v === "none" ? null : v,
                        assignee: emp?.full_name ?? "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر عضواً" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="none">غير محدد</SelectItem>
                      {(employees.data ?? []).map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.assignee || profile?.full_name || ""} readOnly />
                )}
              </div>
              <div>
                <Label>تاريخ الاستحقاق</Label>
                <Input
                  type="date"
                  value={form.due_date ?? ""}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button disabled={!form.title?.trim() || save.isPending} onClick={() => save.mutate(form)}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
