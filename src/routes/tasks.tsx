import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarDays, Lightbulb, Plus, Trash2, User } from "lucide-react";
import { api, PRIORITIES, type Task } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { buildTaskSuggestions } from "@/lib/task-suggestions";
import { detectWorkloadOverlaps } from "@/lib/task-overlap";
import { KANBAN_PRIORITIES, priorityBadgeClass, TASK_BOARD_COLUMNS } from "@/features/tasks/constants";
import { sanitizePlainText, validateTaskPayload } from "@/lib/validation";
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

type ScopeFilter = "mine" | "dept" | "all";

function TasksPage() {
  const { isLeadership, isSupervisor, profile, canManageTasks } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Task>>(empty);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [scope, setScope] = useState<ScopeFilter>(canManageTasks ? (isLeadership ? "all" : "dept") : "mine");
  const [personFilter, setPersonFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");

  const tasks = useQuery({ queryKey: ["tasks"], queryFn: api.tasks.list });
  const employees = useQuery({
    queryKey: ["employees"],
    queryFn: api.employees.list,
    enabled: canManageTasks,
  });
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
    enabled: canManageTasks,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const empById = useMemo(() => new Map((employees.data ?? []).map((e) => [e.id, e])), [employees.data]);
  const empByName = useMemo(
    () => new Map((employees.data ?? []).map((e) => [e.full_name.trim(), e])),
    [employees.data],
  );

  const myUnit = (profile?.org_unit || profile?.department || "").trim();

  const orgUnits = useMemo(() => {
    const set = new Set<string>();
    for (const e of employees.data ?? []) {
      const u = (e.org_unit || e.department || "").trim();
      if (u) set.add(u);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ar"));
  }, [employees.data]);

  const resolveUnit = (t: Task) => {
    const emp = (t.assignee_id && empById.get(t.assignee_id)) || empByName.get((t.assignee || "").trim());
    return (emp?.org_unit || emp?.department || "").trim();
  };

  const all = useMemo(() => {
    let list = tasks.data ?? [];
    if (scope === "mine") {
      list = list.filter(
        (t) =>
          t.assignee_id === profile?.id ||
          (t.assignee && profile?.full_name && t.assignee === profile.full_name),
      );
    } else if (scope === "dept" && myUnit) {
      list = list.filter((t) => resolveUnit(t) === myUnit);
    }
    if (personFilter !== "all") {
      list = list.filter((t) => t.assignee_id === personFilter || t.assignee === personFilter);
    }
    if (unitFilter !== "all") {
      list = list.filter((t) => resolveUnit(t) === unitFilter);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolveUnit depends on emp maps
  }, [tasks.data, scope, personFilter, unitFilter, profile, myUnit, empById, empByName]);

  const suggestions = useMemo(() => {
    if (!canManageTasks) return [];
    const pool =
      isLeadership || !myUnit
        ? employees.data ?? []
        : (employees.data ?? []).filter((e) => (e.org_unit || e.department || "").trim() === myUnit);
    return buildTaskSuggestions(pool, tasks.data ?? []);
  }, [canManageTasks, isLeadership, myUnit, employees.data, tasks.data]);

  const overlaps = useMemo(() => {
    if (!canManageTasks) return [];
    return detectWorkloadOverlaps(tasks.data ?? [], projects.data ?? [], employees.data ?? []);
  }, [canManageTasks, tasks.data, projects.data, employees.data]);

  const save = useMutation({
    mutationFn: async (payload: Partial<Task>) => {
      const { id, created_at, ...rest } = payload;
      if (!rest.due_date) rest.due_date = null;
      if (rest.title) rest.title = sanitizePlainText(rest.title, 200);
      if (rest.description) rest.description = sanitizePlainText(rest.description, 5000);
      const check = validateTaskPayload(rest);
      if (!check.ok) throw new Error(check.error);
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

  const acceptSuggestion = (s: (typeof suggestions)[number]) => {
    const emp = empById.get(s.employeeId);
    save.mutate({
      title: s.title,
      description: `${s.description}\n\n(مقترح تلقائي: ${s.reason})`,
      status: "todo",
      priority: s.priority,
      assignee: emp?.full_name ?? s.employeeName,
      assignee_id: s.employeeId,
      due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">لوحة المهام</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canManageTasks
              ? isLeadership
                ? "اطّلع على مهام الأقسام، الاقتراحات، وتنبيهات التداخل."
                : "أسند المهام لأعضاء قسمك مع اقتراحات وتنبيهات التحميل."
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

      {canManageTasks && (
        <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-3">
          <Select value={scope} onValueChange={(v) => setScope(v as ScopeFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="mine">مهامي</SelectItem>
              {(isLeadership || isSupervisor) && <SelectItem value="dept">مهام قسمي</SelectItem>}
              {isLeadership && <SelectItem value="all">كل الأقسام</SelectItem>}
            </SelectContent>
          </Select>
          {isLeadership && (
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="القسم" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">كل الأقسام</SelectItem>
                {orgUnits.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={personFilter} onValueChange={setPersonFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="الشخص" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">كل الأشخاص</SelectItem>
              {(employees.data ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="self-center">
            {all.length} مهمة ظاهرة
          </Badge>
        </div>
      )}

      {canManageTasks && suggestions.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="size-4 text-amber-700" />
            <h2 className="text-sm font-extrabold">مهام مقترحة حسب تحليل الملفات</h2>
          </div>
          <ul className="space-y-2">
            {suggestions.slice(0, 6).map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border bg-background p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-snug">{s.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.reason} · {s.employeeName}</p>
                </div>
                <Button size="sm" variant="outline" disabled={save.isPending} onClick={() => acceptSuggestion(s)}>
                  اعتماد كمهمة
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canManageTasks && overlaps.length > 0 && (
        <section className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            <h2 className="text-sm font-extrabold">تنبيهات تداخل المهام والمشاريع</h2>
          </div>
          <ul className="space-y-2">
            {overlaps.slice(0, 8).map((o) => (
              <li key={o.id} className="rounded-lg border bg-background p-3 text-sm">
                <p className="font-bold">
                  {o.personName}{" "}
                  <span className="text-xs font-normal text-muted-foreground">({o.detail})</span>
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {o.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TASK_BOARD_COLUMNS.map((col) => {
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

              {items.map((t) => {
                const unit = resolveUnit(t);
                return (
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
                      {canManageTasks && (
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
                      )}
                    </div>
                    {t.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-md px-2 py-0.5 font-semibold ${priorityBadgeClass(t.priority)}`}>
                        {PRIORITIES[t.priority] ?? KANBAN_PRIORITIES[t.priority as keyof typeof KANBAN_PRIORITIES] ?? t.priority}
                      </span>
                      {t.assignee && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <User className="size-3" />
                          {t.assignee}
                        </span>
                      )}
                      {unit && (
                        <Badge variant="outline" className="text-[10px]">
                          {unit}
                        </Badge>
                      )}
                      {t.due_date && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <CalendarDays className="size-3" />
                          {t.due_date}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}

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
                    {TASK_BOARD_COLUMNS.map((c) => (
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
