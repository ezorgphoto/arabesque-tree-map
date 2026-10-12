import type {
  AppRole,
  ConfidentialityLevel,
  DecisionStatus,
  EmployeeWorkStatus,
  ExecRole,
  ExecTaskStatus,
  Priority,
  RealtimeConnectionStatus,
} from "@/types/enums";

/** camelCase domain models (UI / hooks). DB rows stay snake_case. */

export type Profile = {
  id: string;
  role: ExecRole;
  fullName: string;
  avatarUrl: string | null;
  department: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthEmployee = {
  id: string;
  fullName: string;
  jobTitle: string;
  department: string;
  email: string;
  phone: string;
  status: EmployeeWorkStatus | string;
  appRole: AppRole;
  orgUnit: string;
  userId: string | null;
  personalityType?: string;
  strengths?: string;
  problems?: string;
  profileNotes?: string;
  intellectualLevel?: string;
  religiousLevel?: string;
  trainingLevel?: string;
  studies?: string;
  isEmployed?: boolean;
  workTitle?: string;
  shariaProgram?: string;
  levelNotes?: string;
};

export type KanbanTask = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: Priority | string;
  assignee: string;
  assigneeId: string | null;
  dueDate: string | null;
  position: number;
  projectId: string | null;
  createdAt: string;
};

export type ExecutiveTask = {
  id: string;
  title: string;
  description: string;
  status: ExecTaskStatus;
  priority: Priority;
  createdBy: string;
  assignedTo: string | null;
  delegatedBy: string | null;
  dueDate: string | null;
  rejectReason: string;
  createdAt: string;
  updatedAt?: string;
  assigneeName?: string;
  assigneeAvatar?: string | null;
};

export type ExecutiveDecision = {
  id: string;
  title: string;
  content: string;
  confidentialityLevel: ConfidentialityLevel;
  status: DecisionStatus;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
};

export type AuditLog = {
  id: string;
  tableName: string;
  recordId: string | null;
  userId: string | null;
  action: "UPDATE" | "DELETE";
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
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

export type { RealtimeConnectionStatus };
