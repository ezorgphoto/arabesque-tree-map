import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
import {
  canManageEvaluations,
  EVAL_CRITERIA,
  evaluationScore,
  evaluationsApi,
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
        content: "تقييم أقسام العمل وفق الإنجاز والتقارير والمهام.",
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
};

const emptyForm = (): EvalForm => ({
  org_unit: "",
  period_label: "",
  completed_all_tasks: false,
  timely_completion: false,
  uploaded_report: false,
  added_app_tasks: false,
  notes: "",
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

  const rows = useMemo(() => {
    const all = list.data ?? [];
    if (unitFilter === "all") return all;
    return all.filter((e) => e.org_unit === unitFilter);
  }, [list.data, unitFilter]);

  const units = useMemo(() => {
    const set = new Set((list.data ?? []).map((e) => e.org_unit).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "ar"));
  }, [list.data]);

  const save = useMutation({
    mutationFn: async (payload: EvalForm) => {
      const body = {
        org_unit: payload.org_unit.trim(),
        period_label: payload.period_label.trim(),
        completed_all_tasks: payload.completed_all_tasks,
        timely_completion: payload.timely_completion,
        uploaded_report: payload.uploaded_report,
        added_app_tasks: payload.added_app_tasks,
        notes: payload.notes.trim(),
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

  const openNew = () => {
    setForm(emptyForm());
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
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold">
            <ClipboardCheck className="size-7 text-primary" /> التقييمات
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            مشاهدة تقييمات كل الأقسام. الإضافة والتعديل والحذف لقسم التحديث والتطوير (رامي موسى).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
          >
            <option value="all">كل الأقسام</option>
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          {canEdit && (
            <Button onClick={openNew}>
              <Plus className="size-4" /> تقييم جديد
            </Button>
          )}
        </div>
      </header>

      {list.isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          تعذّر تحميل التقييمات: {(list.error as Error).message}
          <p className="mt-1 text-xs text-muted-foreground">
            إن لم يُنشأ الجدول بعد، نفّذ ملف supabase/dept-evaluations.sql في Supabase.
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((e) => {
          const score = evaluationScore(e);
          return (
            <article key={e.id} className="panel space-y-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-extrabold">{e.org_unit || "قسم غير مسمّى"}</h2>
                  <p className="text-xs text-muted-foreground">
                    {e.period_label || "بدون فترة"} · بواسطة {e.evaluator_name || "—"}
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
                    <span className={e[c.key] ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>
                      {e[c.key] ? "نعم" : "لا"}
                    </span>
                  </li>
                ))}
              </ul>
              {e.notes ? <p className="text-xs text-muted-foreground">{e.notes}</p> : null}
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${score.pct}%` }} />
              </div>
            </article>
          );
        })}
        {!list.isLoading && !rows.length && (
          <p className="text-sm text-muted-foreground">لا تقييمات بعد{canEdit ? " — أضف أول تقييم." : "."}</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "تعديل التقييم" : "تقييم قسم جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>القسم</Label>
              <Input
                value={form.org_unit}
                onChange={(e) => setForm({ ...form, org_unit: e.target.value })}
                placeholder="مثال: الإعلام / التقني / التحديث والتطوير"
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
            <div className="space-y-2 rounded-lg border p-3">
              {EVAL_CRITERIA.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                  <span>{c.label}</span>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={form[c.key]}
                    onChange={(e) => setForm({ ...form, [c.key]: e.target.checked })}
                  />
                </label>
              ))}
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
