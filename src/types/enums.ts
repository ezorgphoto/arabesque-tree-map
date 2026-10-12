/**
 * Central domain enums.
 * IMPORTANT: Kanban board statuses stay DB-compatible (`todo`…`done`).
 * Executive workflow uses a separate enum on `executive_tasks`.
 * Priorities are unified app-wide (kanban may omit `urgent` in UI filters).
 */

export const AppRole = {
  Manager: "manager",
  Deputy: "deputy",
  Supervisor: "supervisor",
  Member: "member",
} as const;
export type AppRole = (typeof AppRole)[keyof typeof AppRole];

/** Maps employees.app_role → profiles.exec_role */
export const ExecRole = {
  Executive: "executive",
  Secretary: "secretary",
  TeamMember: "team_member",
} as const;
export type ExecRole = (typeof ExecRole)[keyof typeof ExecRole];

export const PRIORITY = {
  Low: "low",
  Medium: "medium",
  High: "high",
  Urgent: "urgent",
} as const;
export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "مرتفع",
  urgent: "عاجل",
};

/** Kanban / public.tasks — do not rename without DB migration */
export const KanbanStatus = {
  Todo: "todo",
  InProgress: "in_progress",
  Review: "review",
  Done: "done",
} as const;
export type KanbanStatus = (typeof KanbanStatus)[keyof typeof KanbanStatus];

export const KANBAN_STATUS_LABEL: Record<KanbanStatus, string> = {
  todo: "قيد الانتظار",
  in_progress: "قيد التنفيذ",
  review: "قيد المراجعة",
  done: "مكتملة",
};

/** Executive approval workflow — public.executive_tasks */
export const ExecTaskStatus = {
  Pending: "pending",
  InReview: "in_review",
  Approved: "approved",
  Rejected: "rejected",
} as const;
export type ExecTaskStatus = (typeof ExecTaskStatus)[keyof typeof ExecTaskStatus];

export const EXEC_TASK_STATUS_LABEL: Record<ExecTaskStatus, string> = {
  pending: "قيد الانتظار",
  in_review: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

/** Conceptual unified labels (UI analytics only — not stored as-is on kanban) */
export const UnifiedWorkflowStatus = {
  Draft: "draft",
  PendingApproval: "pending_approval",
  Approved: "approved",
  Rejected: "rejected",
  InProgress: "in_progress",
  Completed: "completed",
} as const;
export type UnifiedWorkflowStatus =
  (typeof UnifiedWorkflowStatus)[keyof typeof UnifiedWorkflowStatus];

export function kanbanToUnified(status: KanbanStatus): UnifiedWorkflowStatus {
  switch (status) {
    case "todo":
      return "pending_approval";
    case "in_progress":
      return "in_progress";
    case "review":
      return "pending_approval";
    case "done":
      return "completed";
  }
}

export function execToUnified(status: ExecTaskStatus): UnifiedWorkflowStatus {
  switch (status) {
    case "pending":
    case "in_review":
      return "pending_approval";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
  }
}

export const DecisionStatus = {
  Draft: "draft",
  Published: "published",
  Archived: "archived",
} as const;
export type DecisionStatus = (typeof DecisionStatus)[keyof typeof DecisionStatus];

export const ConfidentialityLevel = {
  Public: "public",
  Internal: "internal",
  TopSecret: "top_secret",
} as const;
export type ConfidentialityLevel =
  (typeof ConfidentialityLevel)[keyof typeof ConfidentialityLevel];

export const CONFIDENTIALITY_LABEL: Record<ConfidentialityLevel, string> = {
  public: "عام",
  internal: "داخلي",
  top_secret: "سري للغاية",
};

export const EmployeeWorkStatus = {
  Active: "active",
  Vacation: "vacation",
  Suspended: "suspended",
} as const;
export type EmployeeWorkStatus =
  (typeof EmployeeWorkStatus)[keyof typeof EmployeeWorkStatus];

export const RealtimeConnectionStatus = {
  Connecting: "connecting",
  Connected: "connected",
  Disconnected: "disconnected",
} as const;
export type RealtimeConnectionStatus =
  (typeof RealtimeConnectionStatus)[keyof typeof RealtimeConnectionStatus];

export function isPriority(v: unknown): v is Priority {
  return v === "low" || v === "medium" || v === "high" || v === "urgent";
}

export function isKanbanStatus(v: unknown): v is KanbanStatus {
  return v === "todo" || v === "in_progress" || v === "review" || v === "done";
}

export function isExecTaskStatus(v: unknown): v is ExecTaskStatus {
  return v === "pending" || v === "in_review" || v === "approved" || v === "rejected";
}

export function appRoleToExecRole(role: AppRole | null | undefined): ExecRole {
  if (role === "manager") return "executive";
  if (role === "deputy") return "secretary";
  return "team_member";
}
