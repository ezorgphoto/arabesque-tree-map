import type { Employee, Project, Task } from "@/lib/api";

export type OverlapAlert = {
  id: string;
  personName: string;
  employeeId: string | null;
  detail: string;
  items: string[];
};

function day(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

function rangesOverlap(
  aStart: number | null,
  aEnd: number | null,
  bStart: number | null,
  bEnd: number | null,
): boolean {
  const as = aStart ?? 0;
  const ae = aEnd ?? Number.MAX_SAFE_INTEGER;
  const bs = bStart ?? 0;
  const be = bEnd ?? Number.MAX_SAFE_INTEGER;
  return as <= be && bs <= ae;
}

/**
 * Detect same person overloaded with open tasks and/or active projects overlapping in time.
 */
export function detectWorkloadOverlaps(
  tasks: Task[],
  projects: Project[],
  employees: Employee[],
): OverlapAlert[] {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const byName = new Map(employees.map((e) => [e.full_name.trim(), e]));

  type Item = {
    kind: "task" | "project";
    label: string;
    start: number | null;
    end: number | null;
  };

  const buckets = new Map<string, { name: string; employeeId: string | null; items: Item[] }>();

  const keyFor = (employeeId: string | null | undefined, name: string) => {
    if (employeeId) return `id:${employeeId}`;
    const n = name.trim();
    if (!n) return null;
    const emp = byName.get(n);
    return emp ? `id:${emp.id}` : `name:${n}`;
  };

  for (const t of tasks) {
    if (t.status === "done") continue;
    const name = t.assignee?.trim() || byId.get(t.assignee_id ?? "")?.full_name || "";
    const key = keyFor(t.assignee_id, name);
    if (!key) continue;
    const emp = t.assignee_id ? byId.get(t.assignee_id) : byName.get(name);
    if (!buckets.has(key)) {
      buckets.set(key, { name: emp?.full_name || name, employeeId: emp?.id ?? t.assignee_id ?? null, items: [] });
    }
    const due = day(t.due_date);
    buckets.get(key)!.items.push({
      kind: "task",
      label: `مهمة: ${t.title}`,
      start: due ? due - 7 * 86400000 : null,
      end: due,
    });
  }

  for (const p of projects) {
    if (p.status === "done" || p.status === "paused") continue;
    const emp = p.manager_id ? byId.get(p.manager_id) : null;
    const name = emp?.full_name || "";
    const key = keyFor(p.manager_id, name);
    if (!key) continue;
    if (!buckets.has(key)) {
      buckets.set(key, { name: emp?.full_name || "غير معروف", employeeId: p.manager_id, items: [] });
    }
    buckets.get(key)!.items.push({
      kind: "project",
      label: `مشروع: ${p.title}`,
      start: day(p.start_date),
      end: day(p.end_date),
    });
  }

  const alerts: OverlapAlert[] = [];

  for (const [key, bucket] of buckets) {
    const items = bucket.items;
    if (items.length < 2) continue;

    const overlappingPairs: string[] = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (rangesOverlap(items[i].start, items[i].end, items[j].start, items[j].end)) {
          overlappingPairs.push(`${items[i].label} ↔ ${items[j].label}`);
        }
      }
    }

    const openCount = items.length;
    if (overlappingPairs.length || openCount >= 3) {
      alerts.push({
        id: key,
        personName: bucket.name,
        employeeId: bucket.employeeId,
        detail: overlappingPairs.length
          ? `${overlappingPairs.length} تداخل زمني`
          : `${openCount} أعمال مفتوحة متزامنة`,
        items: overlappingPairs.length ? overlappingPairs.slice(0, 4) : items.map((i) => i.label).slice(0, 4),
      });
    }
  }

  return alerts.sort((a, b) => a.personName.localeCompare(b.personName, "ar"));
}
