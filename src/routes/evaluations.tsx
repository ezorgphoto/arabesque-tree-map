import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { listReports } from "@/lib/reports-hub";
import {
  autoEvidenceLine,
  canManageEvaluations,
  collectOrgUnits,
  computeDeptAutoMetrics,
  EVAL_CRITERIA,
  evaluationScore,
  evaluationsApi,
  type AutoMetrics,
  type DeptEvaluation,
} from "@/lib/evaluations";
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

export const Route = createFileRoute("/evaluations")({
  component: EvaluationsPage,
  head: () => ({
    meta: [
      { title: "التقييمات | نظام الإدارة التنفيذية" },
      {
        name: "description",
        content: "تقييم أقسام العمل تلقائياً من المهام والتقارير مع إمكانية التدخل اليدوي.",
      },
    ],
  }),
});

type EvalForm = {
  id?: string;
  org_unit: string;
  period_label: string;
  completed_all_tasks: boolean;
  timely_completion: boolean;
  uploaded_report: boolean;
  added_app_tasks: boolean;
  notes: string;
  /** أي معيار عُدّل يدوياً */
  manual: Partial<Record<(typeof EVAL_CRITERIA)[number]["key"], boolean>>;
};

const emptyForm = (): EvalForm => ({
  org_unit: "",
  period_label: "",
  completed_all_tasks: false,
  timely_completion: false,
  uploaded_report: false,
  added_app_tasks: false,
  notes: "",
  manual: {},
});

function EvaluationsPage() {
  const { profile, canManageTasks } = useAuth();
  const canEdit = canManageEvaluations(profile);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EvalForm>(emptyForm());
  const [unitFilter, setUnitFilter] = useState("all");

  const list = useQuery({
    queryKey: ["dept_evaluations"],
    queryFn: evaluationsApi.list,
    enabled: !!profile && canManageTasks,
  });
  const employees = useQuery({
    queryKey: ["employees"],
    queryFn: api.employees.list,
    enabled: !!profile && canManageTasks,
  });
  const tasks = useQuery({
    queryKey: ["tasks"],
    queryFn: api.tasks.list,
    enabled: !!profile && canManageTasks,
  });
  const reports = useQuery({
    queryKey: ["reports"],
    queryFn: listReports,
    enabled: !!profile && canManageTasks,
  });
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
    enabled: !!profile && canManageTasks,
  });

  const orgUnits = useMemo(
    () => collectOrgUnits(employees.data ?? [], projects.data ?? []),
    [employees.data, projects.data],
  );

  const autoByUnit = useMemo(() => {
    const map = new Map<string, AutoMetrics>();
    for (const u of orgUnits) {
      map.set(
        u,
        computeDeptAutoMetrics(
          u,
          employees.data ?? [],
          tasks.data ?? [],
          reports.data ?? [],
          projects.data ?? [],
        ),
      );
    }
    return map;
  }, [orgUnits, employees.data, tasks.data, reports.data, projects.data]);

  const liveAuto = useMemo(() => {
    if (!form.org_unit.trim()) return null;
    return computeDeptAutoMetrics(
      form.org_unit,
      employees.data ?? [],
      tasks.data ?? [],
      reports.data ?? [],
      projects.data ?? [],
    );
  }, [form.org_unit, employees.data, tasks.data, reports.data, projects.data]);

  // عند تغيير القسم أو تغيّر البيانات: املأ الحقول غير المعدّلة يدوياً من التلقائي
  useEffect(() => {
    if (!liveAuto || !open) return;
    setForm((prev) => ({
      ...prev,
      completed_all_tasks: prev.manual.completed_all_tasks
        ? prev.completed_all_tasks
        : liveAuto.completed_all_tasks,
      timely_completion: prev.manual.timely_completion
        ? prev.timely_completion
        : liveAuto.timely_completion,
      uploaded_report: prev.manual.uploaded_report ? prev.uploaded_report : liveAuto.uploaded_report,
      added_app_tasks: prev.manual.added_app_tasks ? prev.added_app_tasks : liveAuto.added_app_tasks,
    }));
  }, [liveAuto, open]);

  const rows = useMemo(() => {
    const all = list.data ?? [];
    if (unitFilter === "all") return all;
    return all.filter((e) => e.org_unit === unitFilter);
  }, [list.data, unitFilter]);

  const save = useMutation({
    mutationFn: async (payload: EvalForm) => {
      const autoNote =
        liveAuto && payload.org_unit.trim() === liveAuto.org_unit
          ? `قياس تلقائي: ${autoEvidenceLine(liveAuto)}`
          : "";
      const body = {
        org_unit: payload.org_unit.trim(),
        period_label: payload.period_label.trim(),
        completed_all_tasks: payload.completed_all_tasks,
        timely_completion: payload.timely_completion,
        uploaded_report: payload.uploaded_report,
        added_app_tasks: payload.added_app_tasks,
        notes: [payload.notes.trim(), autoNote].filter(Boolean).join("\n"),
        evaluator_id: profile?.id ?? null,
        evaluator_name: profile?.full_name ?? "",
      };
      if (payload.id) return evaluationsApi.update(payload.id, body);
      return evaluationsApi.create(body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["dept_evaluations"] });
      setOpen(false);
      toast.success("حُفظ التقييم");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: evaluationsApi.remove,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["dept_evaluations"] });
      toast.success("حُذف التقييم");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyAutoToForm = () => {
    if (!liveAuto) {
      toast.error("اختر قسماً أولاً");
      return;
    }
    setForm((prev) => ({
      ...prev,
      completed_all_tasks: liveAuto.completed_all_tasks,
      timely_completion: liveAuto.timely_completion,
      uploaded_report: liveAuto.uploaded_report,
      added_app_tasks: liveAuto.added_app_tasks,
      manual: {},
    }));
    toast.success("أُعيد الحساب التلقائي");
  };

  const openNew = (unit?: string) => {
    const u = unit ?? "";
    const auto = u
      ? computeDeptAutoMetrics(
          u,
          employees.data ?? [],
          tasks.data ?? [],
          reports.data ?? [],
          projects.data ?? [],
        )
      : null;
    setForm({
      ...emptyForm(),
      org_unit: u,
      period_label: new Intl.DateTimeFormat("ar", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
      completed_all_tasks: auto?.completed_all_tasks ?? false,
      timely_completion: auto?.timely_completion ?? false,
      uploaded_report: auto?.uploaded_report ?? false,
      added_app_tasks: auto?.added_app_tasks ?? false,
      manual: {},
    });
    setOpen(true);
  };

  const openEdit = (e: DeptEvaluation) => {
    setForm({
      id: e.id,
      org_unit: e.org_unit,
      period_label: e.period_label,
      completed_all_tasks: e.completed_all_tasks,
      timely_completion: e.timely_completion,
      uploaded_report: e.uploaded_report,
      added_app_tasks: e.added_app_tasks,
      notes: e.notes,
      // عند التعديل نعتبر القيم الحالية يدوية حتى لا تُستبدل فوراً قبل مراجعة المشرف
      manual: {
        completed_all_tasks: true,
        timely_completion: true,
        uploaded_report: true,
        added_app_tasks: true,
      },
    });
    setOpen(true);
  };

  const toggleCriterion = (key: (typeof EVAL_CRITERIA)[number]["key"], value: boolean) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      manual: { ...prev.manual, [key]: true },
    }));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold">
            <ClipboardCheck className="size-7 text-primary" /> التقييمات
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            قياس تلقائي من المهام والتقارير والمشاريع، مع تدخل المشرف عند الحاجة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
          >
            <option value="all">كل الأقسام</option>
            {orgUnits.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          {canEdit && (
            <Button onClick={() => openNew()}>
              <Plus className="size-4" /> حفظ تقييم
            </Button>
          )}
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">لوحة القياس التلقائي</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {orgUnits
            .filter((u) => unitFilter === "all" || u === unitFilter)
            .map((u) => {
              const m = autoByUnit.get(u)!;
              const score = evaluationScore(m);
              return (
                <article key={u} className="panel space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold">{u}</h3>
                      <p className="text-[11px] text-muted-foreground">{autoEvidenceLine(m)}</p>
                    </div>
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-extrabold text-primary">
                      {score.done}/{score.total}
                    </span>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {EVAL_CRITERIA.map((c) => (
                      <li key={c.key} className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">{c.label}</span>
                        <span className={m[c.key] ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>
                          {m[c.key] ? "نعم" : "لا"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${score.pct}%` }}
                    />
                  </div>
                  {canEdit && (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => openNew(u)}>
                      حفظ كتقييم رسمي / تدخل يدوي
                    </Button>
                  )}
                </article>
              );
            })}
          {!orgUnits.length && (
            <p className="text-sm text-muted-foreground">لا أقسام ظاهرة بعد من بطاقات الموظفين أو المشاريع.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">التقييمات المحفوظة</h2>
        {list.isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
            تعذّر تحميل التقييمات: {(list.error as Error).message}
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((e) => {
            const score = evaluationScore(e);
            const live = autoByUnit.get(e.org_unit);
            return (
              <article key={e.id} className="panel space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-extrabold">{e.org_unit || "قسم غير مسمّى"}</h3>
                    <p className="text-xs text-muted-foreground">
                      {e.period_label || "بدون فترة"} · {e.evaluator_name || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-extrabold text-primary">
                      {score.done}/{score.total}
                    </span>
                    {canEdit && (
                      <>
                        <Button size="icon" variant="ghost" aria-label="تعديل" onClick={() => openEdit(e)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="حذف"
                          onClick={() => {
                            if (confirm("حذف هذا التقييم؟")) remove.mutate(e.id);
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {EVAL_CRITERIA.map((c) => (
                    <li key={c.key} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{c.label}</span>
                      <span className="flex items-center gap-2">
                        {live && live[c.key] !== e[c.key] ? (
                          <span className="text-[10px] text-amber-700">تعديل يدوي</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">محفوظ</span>
                        )}
                        <span className={e[c.key] ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>
                          {e[c.key] ? "نعم" : "لا"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                {e.notes ? <p className="whitespace-pre-wrap text-xs text-muted-foreground">{e.notes}</p> : null}
              </article>
            );
          })}
          {!list.isLoading && !rows.length && (
            <p className="text-sm text-muted-foreground">لا تقييمات محفوظة بعد.</p>
          )}
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "تعديل التقييم" : "حفظ تقييم رسمي"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>القسم</Label>
              <select
                className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.org_unit}
                onChange={(e) => setForm({ ...form, org_unit: e.target.value, manual: {} })}
              >
                <option value="">اختر قسماً…</option>
                {orgUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <Input
                className="mt-2"
                value={form.org_unit}
                onChange={(e) => setForm({ ...form, org_unit: e.target.value, manual: {} })}
                placeholder="أو اكتب اسم القسم يدوياً"
              />
            </div>
            <div>
              <Label>الفترة</Label>
              <Input
                value={form.period_label}
                onChange={(e) => setForm({ ...form, period_label: e.target.value })}
                placeholder="مثال: أسبوع 12 أكتوبر 2026"
              />
            </div>

            {liveAuto && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-extrabold text-primary">القياس التلقائي الحالي</p>
                  <Button type="button" size="sm" variant="outline" onClick={applyAutoToForm}>
                    <RefreshCw className="size-3.5" /> إعادة تعبئة تلقائية
                  </Button>
                </div>
                <p className="text-muted-foreground">{autoEvidenceLine(liveAuto)}</p>
              </div>
            )}

            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-[11px] text-muted-foreground">
                القيم أدناه من القياس التلقائي. غيّرها يدوياً عند الحاجة — سيُوسَم التعديل كـ«يدوي».
              </p>
              {EVAL_CRITERIA.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                  <span className="flex flex-col">
                    <span>{c.label}</span>
                    {form.manual[c.key] ? (
                      <span className="text-[10px] text-amber-700">معدّل يدوياً</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">تلقائي</span>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={form[c.key]}
                    onChange={(e) => toggleCriterion(c.key, e.target.checked)}
                  />
                </label>
              ))}
            </div>
            <div>
              <Label>ملاحظات المشرف</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="سبب التدخل اليدوي إن وُجد…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              disabled={!form.org_unit.trim() || save.isPending}
              onClick={() => save.mutate(form)}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
