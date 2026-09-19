import { useMemo } from "react";
import type { Project } from "@/lib/api";
import type { ProjectDep } from "@/lib/project-deps";

const DAY_MS = 86_400_000;
const COL_W = 28;

function parseDay(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function daysBetween(a: number, b: number) {
  return Math.round((b - a) / DAY_MS);
}

export function ProjectGantt({
  projects,
  deps,
}: {
  projects: Project[];
  deps: ProjectDep[];
}) {
  const rows = useMemo(() => {
    const withDates = projects.filter((p) => p.start_date || p.end_date);
    if (!withDates.length) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const p of withDates) {
      const s = parseDay(p.start_date) ?? parseDay(p.end_date)!;
      const e = parseDay(p.end_date) ?? parseDay(p.start_date)!;
      min = Math.min(min, s);
      max = Math.max(max, e);
    }
    // هامش أسبوع
    min -= 3 * DAY_MS;
    max += 3 * DAY_MS;
    const span = Math.max(daysBetween(min, max), 7);
    return { items: withDates, min, span };
  }, [projects]);

  if (!rows) {
    return (
      <p className="text-sm text-muted-foreground">
        أضف تاريخ بداية/نهاية للمشاريع لعرض مخطط غانت.
      </p>
    );
  }

  const { items, min, span } = rows;
  const width = span * COL_W;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full" style={{ minWidth: width + 180 }}>
        <div className="mb-2 flex text-[10px] text-muted-foreground">
          <div className="w-44 shrink-0" />
          <div className="relative h-5 flex-1" style={{ width }}>
            {Array.from({ length: span + 1 }).map((_, i) =>
              i % 7 === 0 ? (
                <span
                  key={i}
                  className="absolute top-0"
                  style={{ left: i * COL_W }}
                >
                  {new Date(min + i * DAY_MS).toLocaleDateString("ar-SA", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              ) : null,
            )}
          </div>
        </div>
        <ul className="space-y-1">
          {items.map((p) => {
            const s = parseDay(p.start_date) ?? parseDay(p.end_date)!;
            const e = parseDay(p.end_date) ?? parseDay(p.start_date)!;
            const left = daysBetween(min, s) * COL_W;
            const w = Math.max((daysBetween(s, e) + 1) * COL_W, COL_W);
            const blockers = deps.filter((d) => d.project_id === p.id);
            return (
              <li key={p.id} className="flex items-center gap-2">
                <div className="w-44 shrink-0 truncate text-xs font-semibold" title={p.title}>
                  {p.title}
                  {blockers.length ? (
                    <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                      يعتمد على {blockers.length} · {blockers.map((b) => b.dep_type).join(",")}
                    </span>
                  ) : null}
                </div>
                <div className="relative h-8 flex-1 rounded bg-muted/60" style={{ width }}>
                  <div
                    className="absolute top-1 h-6 rounded-md bg-primary/80"
                    style={{ left, width: w }}
                    title={`${p.start_date ?? "؟"} → ${p.end_date ?? "؟"}`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
