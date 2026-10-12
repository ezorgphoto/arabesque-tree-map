import { rememberAccessToken, supabase } from "@/integrations/supabase/client";
import type { Employee, Project, Task } from "@/lib/api";
import type { HubReport } from "@/lib/reports-hub";

export type DeptEvaluation = {
  id: string;
  org_unit: string;
  period_label: string;
  completed_all_tasks: boolean;
  timely_completion: boolean;
  uploaded_report: boolean;
  added_app_tasks: boolean;
  notes: string;
  evaluator_id: string | null;
  evaluator_name: string;
  created_at: string;
  updated_at: string;
};

export type AutoMetrics = {
  org_unit: string;
  completed_all_tasks: boolean;
  timely_completion: boolean;
  uploaded_report: boolean;
  added_app_tasks: boolean;
  detail: {
    memberCount: number;
    taskTotal: number;
    taskDone: number;
    taskOpen: number;
    overdueOpen: number;
    reportsCount: number;
    projectsCount: number;
  };
};

type EvalProfile = {
  full_name?: string | null;
  org_unit?: string | null;
  department?: string | null;
  app_role?: string | null;
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

async function withSession<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof window !== "undefined") {
    const { data } = await supabase.auth.getSession();
    rememberAccessToken(data.session?.access_token ?? null);
  }
  return fn();
}

/** محرر التقييمات: رامي موسى أو مسؤول أو مشرف (للتدخل عند الحاجة) */
export function canManageEvaluations(profile: EvalProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.app_role === "manager" || profile.app_role === "deputy" || profile.app_role === "supervisor") {
    return true;
  }
  const name = (profile.full_name ?? "").replace(/\s+/g, " ").trim();
  return /رامي/.test(name) && /موسى/.test(name);
}

export function evaluationScore(
  e: Pick<
    DeptEvaluation | AutoMetrics,
    "completed_all_tasks" | "timely_completion" | "uploaded_report" | "added_app_tasks"
  >,
) {
  const n =
    Number(e.completed_all_tasks) +
    Number(e.timely_completion) +
    Number(e.uploaded_report) +
    Number(e.added_app_tasks);
  return { done: n, total: 4, pct: Math.round((n / 4) * 100) };
}

export const EVAL_CRITERIA = [
  { key: "completed_all_tasks" as const, label: "هل أنجز القسم كل مهامه؟" },
  { key: "timely_completion" as const, label: "هل وقت الإنجاز كان مناسباً؟" },
  { key: "uploaded_report" as const, label: "هل رفع تقريراً بعمله؟" },
  { key: "added_app_tasks" as const, label: "هل أضاف مهاماً على التطبيق؟" },
];

function unitOf(e: Employee) {
  return (e.org_unit || e.department || "").trim();
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDay(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value.slice(0, 10) + "T00:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

/** يجمع أقسام الموظفين + المشاريع */
export function collectOrgUnits(employees: Employee[], projects: Project[]) {
  const set = new Set<string>();
  for (const e of employees) {
    const u = unitOf(e);
    if (u) set.add(u);
  }
  for (const p of projects) {
    const u = (p.org_unit || "").trim();
    if (u) set.add(u);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ar"));
}

/**
 * قياس تلقائي لقسم:
 * - إنجاز المهام: كل مهام أعضاء القسم مكتملة (ووجود مهام أصلاً)
 * - الوقت المناسب: لا مهام متأخرة غير مكتملة
 * - تقرير: يوجد تقرير مرتبط بأعضاء القسم أو باسم القسم خلال آخر 30 يوماً
 * - إضافة مهام: يوجد مهام مسندة لأعضاء القسم أو مشاريع للقسم
 */
export function computeDeptAutoMetrics(
  orgUnit: string,
  employees: Employee[],
  tasks: Task[],
  reports: HubReport[],
  projects: Project[],
  opts?: { reportDays?: number },
): AutoMetrics {
  const unit = orgUnit.trim();
  const members = employees.filter((e) => unitOf(e) === unit);
  const memberIds = new Set(members.map((m) => m.id));
  const memberNames = new Set(members.map((m) => m.full_name.trim()).filter(Boolean));

  const unitTasks = tasks.filter((t) => {
    if (t.assignee_id && memberIds.has(t.assignee_id)) return true;
    if (t.assignee && memberNames.has(t.assignee.trim())) return true;
    return false;
  });

  const taskTotal = unitTasks.length;
  const taskDone = unitTasks.filter((t) => t.status === "done").length;
  const taskOpen = taskTotal - taskDone;
  const today = startOfToday();
  const overdueOpen = unitTasks.filter((t) => {
    if (t.status === "done") return false;
    const due = parseDay(t.due_date);
    return !!due && due < today;
  }).length;

  const completed_all_tasks = taskTotal > 0 && taskOpen === 0;
  const timely_completion = taskTotal > 0 && overdueOpen === 0;

  const days = opts?.reportDays ?? 30;
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const unitReports = reports.filter((r) => {
    const at = new Date(r.created_at).getTime();
    if (Number.isFinite(at) && at < since) return false;
    if (r.employee_id && memberIds.has(r.employee_id)) return true;
    const dep = `${r.department_type ?? ""} ${r.submitter_name ?? ""}`;
    if (unit && dep.includes(unit)) return true;
    if ([...memberNames].some((n) => (r.submitter_name || "").includes(n))) return true;
    return false;
  });
  const uploaded_report = unitReports.length > 0;

  const unitProjects = projects.filter((p) => (p.org_unit || "").trim() === unit);
  const added_app_tasks = taskTotal > 0 || unitProjects.length > 0;

  return {
    org_unit: unit,
    completed_all_tasks,
    timely_completion,
    uploaded_report,
    added_app_tasks,
    detail: {
      memberCount: members.length,
      taskTotal,
      taskDone,
      taskOpen,
      overdueOpen,
      reportsCount: unitReports.length,
      projectsCount: unitProjects.length,
    },
  };
}

export function autoEvidenceLine(m: AutoMetrics) {
  const d = m.detail;
  return `أعضاء ${d.memberCount} · مهام ${d.taskDone}/${d.taskTotal} · متأخر ${d.overdueOpen} · تقارير ${d.reportsCount} · مشاريع ${d.projectsCount}`;
}

export const evaluationsApi = {
  list: () =>
    withSession(async () =>
      unwrap<DeptEvaluation[]>(
        (await supabase
          .from("dept_evaluations")
          .select("*")
          .order("created_at", { ascending: false })) as never,
      ),
    ),
  create: (row: Partial<DeptEvaluation>) =>
    withSession(async () =>
      unwrap<DeptEvaluation>(
        (await supabase.from("dept_evaluations").insert(row as never).select().single()) as never,
      ),
    ),
  update: (id: string, row: Partial<DeptEvaluation>) =>
    withSession(async () =>
      unwrap<DeptEvaluation>(
        (await supabase
          .from("dept_evaluations")
          .update(row as never)
          .eq("id", id)
          .select()
          .single()) as never,
      ),
    ),
  remove: (id: string) =>
    withSession(async () => {
      const { error } = await supabase.from("dept_evaluations").delete().eq("id", id);
      if (error) throw new Error(error.message);
    }),
};
