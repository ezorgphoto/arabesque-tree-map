import { rememberAccessToken, supabase } from "@/integrations/supabase/client";

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

/** محرر التقييمات: رامي موسى أو مسؤول العمل */
export function canManageEvaluations(profile: EvalProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.app_role === "manager") return true;
  const name = (profile.full_name ?? "").replace(/\s+/g, " ").trim();
  return /رامي/.test(name) && /موسى/.test(name);
}

export function evaluationScore(
  e: Pick<
    DeptEvaluation,
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
