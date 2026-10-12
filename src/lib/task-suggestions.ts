import type { Employee, Task } from "@/lib/api";
import { parseTagList } from "@/lib/profile-tags";

export type SuggestedTask = {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  reason: string;
};

function hasProblem(e: Employee, needle: string) {
  return parseTagList(e.problems).some((p) => p.includes(needle));
}

function hasNote(e: Employee, needle: string) {
  return parseTagList(e.profile_notes).some((p) => p.includes(needle));
}

/**
 * Rule-based task suggestions from employee profile data.
 */
export function buildTaskSuggestions(
  employees: Employee[],
  existingTasks: Task[] = [],
): SuggestedTask[] {
  const openTitles = new Set(
    existingTasks
      .filter((t) => t.status !== "done")
      .map((t) => `${t.assignee_id ?? ""}|${t.title}`),
  );

  const out: SuggestedTask[] = [];

  for (const e of employees) {
    const push = (partial: Omit<SuggestedTask, "id" | "employeeId" | "employeeName">) => {
      const key = `${e.id}|${partial.title}`;
      if (openTitles.has(key)) return;
      out.push({
        id: `sug-${e.id}-${out.length}`,
        employeeId: e.id,
        employeeName: e.full_name,
        ...partial,
      });
    };

    if (hasProblem(e, "عائلية") || hasProblem(e, "مشكلة عائلية")) {
      push({
        title: `زيارة ميدانية — متابعة حالة ${e.full_name}`,
        description: "زيارة بسبب وجود مشكلة عائلية مسجّلة في الملف، مع توثيق المتابعة.",
        priority: "high",
        reason: "مشكلة عائلية في الملف",
      });
    }

    if (hasProblem(e, "انقطاع") || hasNote(e, "زيارة")) {
      push({
        title: `متابعة انقطاع / زيارة — ${e.full_name}`,
        description: "تواصل ميداني أو هاتفي لإعادة الارتباط بالبرنامج.",
        priority: "high",
        reason: "انقطاع أو حاجة لزيارة",
      });
    }

    if (e.status === "vacation") {
      push({
        title: `تجهيز عودة من الإجازة — ${e.full_name}`,
        description: "ترتيب تسليم المهام والتواصل قبل العودة.",
        priority: "medium",
        reason: "العضو في إجازة",
      });
    }

    if (e.status === "suspended") {
      push({
        title: `مراجعة وضع الموقوف — ${e.full_name}`,
        description: "جلسة تقييم لحالة الإيقاف وخطة العودة أو الإغلاق.",
        priority: "high",
        reason: "حالة موقوف",
      });
    }

    if (hasProblem(e, "مواعيد") || hasProblem(e, "التزام")) {
      push({
        title: `خطة التزام بالمواعيد — ${e.full_name}`,
        description: "اتفاق مكتوب على مواعيد التسليم ومتابعة أسبوعية قصيرة.",
        priority: "medium",
        reason: "ضعف الالتزام بالمواعيد",
      });
    }

    if (hasNote(e, "تدريب") || e.training_level === "مبتدئ") {
      push({
        title: `جلسة تدريبية قصيرة — ${e.full_name}`,
        description: "تحديد مهارة واحدة للتدريب هذا الأسبوع مع متابعة تطبيق.",
        priority: "low",
        reason: "حاجة تدريبية / مستوى مبتدئ",
      });
    }

    if (e.religious_level === "مبتدئ" && e.sharia_program) {
      push({
        title: `متابعة البرنامج الشرعي — ${e.full_name}`,
        description: `التحقق من التقدم في: ${e.sharia_program}`,
        priority: "medium",
        reason: "برنامج شرعي + مستوى مبتدئ",
      });
    }

    if (hasProblem(e, "مالية") || hasProblem(e, "إرهاق")) {
      push({
        title: `جلسة دعم ومتابعة شخصية — ${e.full_name}`,
        description: "استماع منظم للمشكلة ووضع خطوات دعم عملية.",
        priority: "high",
        reason: "تحدي مالي أو إرهاق",
      });
    }
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.priority] - rank[b.priority]).slice(0, 24);
}
