import { KANBAN_STATUS_LABEL, KanbanStatus, PRIORITY_LABEL, type Priority } from "@/types/enums";

export const TASK_BOARD_COLUMNS = [
  { key: KanbanStatus.Todo, label: KANBAN_STATUS_LABEL.todo },
  { key: KanbanStatus.InProgress, label: KANBAN_STATUS_LABEL.in_progress },
  { key: KanbanStatus.Review, label: KANBAN_STATUS_LABEL.review },
  { key: KanbanStatus.Done, label: KANBAN_STATUS_LABEL.done },
] as const;

/** Kanban priorities (urgent optional in filters) */
export const KANBAN_PRIORITIES: Record<"low" | "medium" | "high", string> = {
  low: PRIORITY_LABEL.low,
  medium: PRIORITY_LABEL.medium,
  high: PRIORITY_LABEL.high,
};

export function priorityBadgeClass(priority: string): string {
  if (priority === "high" || priority === "urgent") return "bg-destructive/10 text-destructive";
  if (priority === "medium") return "bg-warning/15 text-accent-foreground";
  return "bg-primary/10 text-primary";
}

export type { Priority };
