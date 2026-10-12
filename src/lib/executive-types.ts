/** Executive workspace domain types (profiles / workflow tasks / decisions) */

export type ExecRole = "executive" | "secretary" | "team_member";

export type ExecTaskStatus = "pending" | "in_review" | "approved" | "rejected";
export type ExecTaskPriority = "urgent" | "high" | "medium" | "low";
export type ConfidentialityLevel = "public" | "internal" | "top_secret";
export type DecisionStatus = "draft" | "published" | "archived";
export type RealtimeConnectionStatus = "connecting" | "connected" | "disconnected";

export type Profile = {
  id: string;
  role: ExecRole;
  full_name: string;
  avatar_url: string | null;
  department: string;
  created_at: string;
  updated_at: string;
};

export type ExecutiveTask = {
  id: string;
  title: string;
  description: string;
  status: ExecTaskStatus;
  priority: ExecTaskPriority;
  created_by: string;
  assigned_to: string | null;
  delegated_by: string | null;
  due_date: string | null;
  reject_reason: string;
  created_at: string;
  updated_at?: string;
  /** Joined display fields (optional) */
  assignee_name?: string;
  assignee_avatar?: string | null;
};

export type ExecutiveDecision = {
  id: string;
  title: string;
  content: string;
  confidentiality_level: ConfidentialityLevel;
  status: DecisionStatus;
  created_by: string;
  created_at: string;
  updated_at?: string;
};

export type AuditLog = {
  id: string;
  table_name: string;
  record_id: string | null;
  user_id: string | null;
  action: "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

export type ExecutiveFeedItem = {
  id: string;
  kind: "task" | "decision" | "system";
  title: string;
  detail: string;
  actor: string;
  at: string;
  icon: "check" | "x" | "file" | "user" | "bell";
};

export const EXEC_TASK_STATUS_LABEL: Record<ExecTaskStatus, string> = {
  pending: "قيد الانتظار",
  in_review: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

export const EXEC_PRIORITY_LABEL: Record<ExecTaskPriority, string> = {
  urgent: "عاجل",
  high: "مرتفع",
  medium: "متوسط",
  low: "منخفض",
};

export const CONFIDENTIALITY_LABEL: Record<ConfidentialityLevel, string> = {
  public: "عام",
  internal: "داخلي",
  top_secret: "سري للغاية",
};
