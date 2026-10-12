/**
 * @deprecated Prefer `@/types` for new code.
 * Compatibility facade: snake_case row shapes + Arabic labels.
 */
export type {
  ExecRole,
  ExecTaskStatus,
  Priority as ExecTaskPriority,
  ConfidentialityLevel,
  DecisionStatus,
  RealtimeConnectionStatus,
} from "@/types/enums";

export {
  EXEC_TASK_STATUS_LABEL,
  PRIORITY_LABEL as EXEC_PRIORITY_LABEL,
  CONFIDENTIALITY_LABEL,
} from "@/types/enums";

export type {
  ProfileRow as Profile,
  ExecutiveTaskRow as ExecutiveTask,
  ExecutiveDecisionRow as ExecutiveDecision,
  AuditLogRow as AuditLog,
} from "@/types/mappers";

export type { ExecutiveFeedItem } from "@/types/models";
