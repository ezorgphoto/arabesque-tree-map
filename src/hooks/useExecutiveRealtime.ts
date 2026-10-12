import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { rememberAccessToken, supabase } from "@/integrations/supabase/client";
import type {
  ExecutiveDecision,
  ExecutiveTask,
  ExecTaskStatus,
  RealtimeConnectionStatus,
} from "@/lib/executive-types";

type Options = {
  /** عند false يعمل الوضع التجريبي بدون اشتراك Realtime */
  enabled?: boolean;
  initialTasks?: ExecutiveTask[];
  initialDecisions?: ExecutiveDecision[];
};

function upsertById<T extends { id: string }>(list: T[], row: T): T[] {
  const i = list.findIndex((x) => x.id === row.id);
  if (i === -1) return [row, ...list];
  const next = list.slice();
  next[i] = { ...next[i], ...row };
  return next;
}

function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((x) => x.id !== id);
}

/**
 * Realtime sync for executive_tasks + executive_decisions with optimistic approve/reject.
 */
export function useExecutiveRealtime(options: Options = {}) {
  const { enabled = true, initialTasks = [], initialDecisions = [] } = options;
  const [tasks, setTasks] = useState<ExecutiveTask[]>(() => initialTasks);
  const [decisions, setDecisions] = useState<ExecutiveDecision[]>(() => initialDecisions);
  const [status, setStatus] = useState<RealtimeConnectionStatus>(
    enabled ? "connecting" : "disconnected",
  );
  const channelRef = useRef<RealtimeChannel | null>(null);
  const rollbackRef = useRef<Map<string, ExecutiveTask>>(new Map());

  useEffect(() => {
    if (!enabled) {
      setStatus("disconnected");
      return;
    }

    let cancelled = false;

    const boot = async () => {
      setStatus("connecting");
      const { data } = await supabase.auth.getSession();
      rememberAccessToken(data.session?.access_token ?? null);
      if (cancelled) return;

      const channel = supabase
        .channel("executive-workspace")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "executive_tasks" },
          (payload) => {
            if (payload.eventType === "INSERT" && payload.new) {
              setTasks((prev) => upsertById(prev, payload.new as ExecutiveTask));
            } else if (payload.eventType === "UPDATE" && payload.new) {
              setTasks((prev) => upsertById(prev, payload.new as ExecutiveTask));
            } else if (payload.eventType === "DELETE" && payload.old) {
              const id = (payload.old as { id?: string }).id;
              if (id) setTasks((prev) => removeById(prev, id));
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "executive_decisions" },
          (payload) => {
            if (payload.eventType === "INSERT" && payload.new) {
              setDecisions((prev) => upsertById(prev, payload.new as ExecutiveDecision));
            } else if (payload.eventType === "UPDATE" && payload.new) {
              setDecisions((prev) => upsertById(prev, payload.new as ExecutiveDecision));
            } else if (payload.eventType === "DELETE" && payload.old) {
              const id = (payload.old as { id?: string }).id;
              if (id) setDecisions((prev) => removeById(prev, id));
            }
          },
        )
        .subscribe((s) => {
          if (s === "SUBSCRIBED") setStatus("connected");
          else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
            setStatus("disconnected");
          } else setStatus("connecting");
        });

      channelRef.current = channel;
    };

    void boot();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled]);

  const setTaskStatusOptimistic = useCallback(
    async (taskId: string, nextStatus: ExecTaskStatus, rejectReason = "") => {
      let snapshot: ExecutiveTask | undefined;
      setTasks((prev) => {
        const cur = prev.find((t) => t.id === taskId);
        if (!cur) return prev;
        snapshot = cur;
        rollbackRef.current.set(taskId, cur);
        return prev.map((t) =>
          t.id === taskId
            ? { ...t, status: nextStatus, reject_reason: rejectReason, updated_at: new Date().toISOString() }
            : t,
        );
      });

      try {
        const { error } = await supabase
          .from("executive_tasks")
          .update({ status: nextStatus, reject_reason: rejectReason } as never)
          .eq("id", taskId);
        if (error) throw error;
        rollbackRef.current.delete(taskId);
      } catch (e) {
        const prev = snapshot ?? rollbackRef.current.get(taskId);
        if (prev) {
          setTasks((list) => list.map((t) => (t.id === taskId ? prev : t)));
        }
        rollbackRef.current.delete(taskId);
        throw e instanceof Error ? e : new Error("تعذّر تحديث المهمة");
      }
    },
    [],
  );

  const approveTask = useCallback(
    (taskId: string) => setTaskStatusOptimistic(taskId, "approved"),
    [setTaskStatusOptimistic],
  );

  const rejectTask = useCallback(
    (taskId: string, reason: string) => setTaskStatusOptimistic(taskId, "rejected", reason),
    [setTaskStatusOptimistic],
  );

  return {
    tasks,
    decisions,
    setTasks,
    setDecisions,
    status,
    approveTask,
    rejectTask,
    setTaskStatusOptimistic,
  };
}
