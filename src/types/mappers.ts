/**
 * snake_case (Supabase row) ↔ camelCase (app model) mappers.
 */

import type {
  AuditLog,
  ExecutiveDecision,
  ExecutiveTask,
  Profile,
} from "@/types/models";
import type {
  ConfidentialityLevel,
  DecisionStatus,
  ExecRole,
  ExecTaskStatus,
  Priority,
} from "@/types/enums";

export type ProfileRow = {
  id: string;
  role: ExecRole;
  full_name: string;
  avatar_url: string | null;
  department: string;
  created_at: string;
  updated_at: string;
};

export type ExecutiveTaskRow = {
  id: string;
  title: string;
  description: string;
  status: ExecTaskStatus;
  priority: Priority;
  created_by: string;
  assigned_to: string | null;
  delegated_by: string | null;
  due_date: string | null;
  reject_reason: string;
  created_at: string;
  updated_at?: string;
  assignee_name?: string;
  assignee_avatar?: string | null;
};

export type ExecutiveDecisionRow = {
  id: string;
  title: string;
  content: string;
  confidentiality_level: ConfidentialityLevel;
  status: DecisionStatus;
  created_by: string;
  created_at: string;
  updated_at?: string;
};

export type AuditLogRow = {
  id: string;
  table_name: string;
  record_id: string | null;
  user_id: string | null;
  action: "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    department: row.department,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapExecutiveTask(row: ExecutiveTaskRow): ExecutiveTask {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    delegatedBy: row.delegated_by,
    dueDate: row.due_date,
    rejectReason: row.reject_reason ?? "",
    createdAt: row.created_at,
    ...(row.updated_at !== undefined ? { updatedAt: row.updated_at } : {}),
    ...(row.assignee_name !== undefined ? { assigneeName: row.assignee_name } : {}),
    ...(row.assignee_avatar !== undefined ? { assigneeAvatar: row.assignee_avatar } : {}),
  };
}

export function mapExecutiveDecision(row: ExecutiveDecisionRow): ExecutiveDecision {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    confidentialityLevel: row.confidentiality_level,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    ...(row.updated_at !== undefined ? { updatedAt: row.updated_at } : {}),
  };
}

export function mapAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    tableName: row.table_name,
    recordId: row.record_id,
    userId: row.user_id,
    action: row.action,
    oldData: row.old_data,
    newData: row.new_data,
    createdAt: row.created_at,
  };
}

export function toExecutiveTaskRow(
  task: Partial<ExecutiveTask> & { title?: string },
): Partial<ExecutiveTaskRow> {
  const row: Partial<ExecutiveTaskRow> = {};
  if (task.title !== undefined) row.title = task.title;
  if (task.description !== undefined) row.description = task.description;
  if (task.status !== undefined) row.status = task.status;
  if (task.priority !== undefined) row.priority = task.priority;
  if (task.createdBy !== undefined) row.created_by = task.createdBy;
  if (task.assignedTo !== undefined) row.assigned_to = task.assignedTo;
  if (task.delegatedBy !== undefined) row.delegated_by = task.delegatedBy;
  if (task.dueDate !== undefined) row.due_date = task.dueDate;
  if (task.rejectReason !== undefined) row.reject_reason = task.rejectReason;
  return row;
}

export function toExecutiveDecisionRow(
  d: Partial<ExecutiveDecision>,
): Partial<ExecutiveDecisionRow> {
  const row: Partial<ExecutiveDecisionRow> = {};
  if (d.title !== undefined) row.title = d.title;
  if (d.content !== undefined) row.content = d.content;
  if (d.confidentialityLevel !== undefined) row.confidentiality_level = d.confidentialityLevel;
  if (d.status !== undefined) row.status = d.status;
  if (d.createdBy !== undefined) row.created_by = d.createdBy;
  return row;
}
