import { useCallback, useEffect, useRef, useState, startTransition } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { rememberAccessToken, supabase } from "@/integrations/supabase/client";
import type {
  ExecutiveDecision,
  ExecutiveTask,
  ExecTaskStatus,
  RealtimeConnectionStatus,
} from "@/lib/executive-types";
import { isExecTaskStatus } from "@/types/enums";
import { sanitizePlainText } from "@/lib/validation";

type Options = {
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
 * Realtime sync for executive_tasks + executive_decisions.
 * Uses startTransition for non-urgent list patches to avoid full-tree jank.
 */
export function useExecutiveRealtime(options: Options = {}) {
  const { enabled = true, initialTasks = [], initialDecisions = [] } = options;
  const [tasks, setTasks] = useState<ExecutiveTask[]>(() => (enabled ? [] : initialTasks));
  const [decisions, setDecisions] = useState<ExecutiveDecision[]>(() =>
    enabled ? [] : initialDecisions,
  );
  const [status, setStatus] = useState<RealtimeConnectionStatus>(
    enabled ? "connecting" : "disconnected",
  );
  const [loading, setLoading] = useState(enabled);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const rollbackRef = useRef<Map<string, ExecutiveTask>>(new Map());

  useEffect(() => {
    if (enabled) return;
    setTasks(initialTasks);
    setDecisions(initialDecisions);
    setStatus("disconnected");
    setLoading(false);
  }, [enabled, initialTasks, initialDecisions]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const boot = async () => {
      setStatus("connecting");
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      rememberAccessToken(sessionData.session?.access_token ?? null);
      if (cancelled) return;

      const [tasksRes, decisionsRes] = await Promise.all([
        supabase
          .from("executive_tasks")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("executive_decisions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (!cancelled) {
        if (!tasksRes.error && tasksRes.data) {
          setTasks(tasksRes.data as ExecutiveTask[]);
        }
        if (!decisionsRes.error && decisionsRes.data) {
          setDecisions(decisionsRes.data as ExecutiveDecision[]);
        }
        setLoading(false);
      }

      const channel = supabase
        .channel(`executive-workspace:${sessionData.session?.user.id ?? "anon"}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "executive_tasks" },
          (payload) => {
            startTransition(() => {
              if (payload.eventType === "INSERT" && payload.new) {
                setTasks((prev) => upsertById(prev, payload.new as ExecutiveTask));
              } else if (payload.eventType === "UPDATE" && payload.new) {
                setTasks((prev) => upsertById(prev, payload.new as ExecutiveTask));
              } else if (payload.eventType === "DELETE" && payload.old) {
                const id = (payload.old as { id?: string }).id;
                if (id) setTasks((prev) => removeById(prev, id));
              }
            });
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "executive_decisions" },
          (payload) => {
            startTransition(() => {
              if (payload.eventType === "INSERT" && payload.new) {
                setDecisions((prev) => upsertById(prev, payload.new as ExecutiveDecision));
              } else if (payload.eventType === "UPDATE" && payload.new) {
                setDecisions((prev) => upsertById(prev, payload.new as ExecutiveDecision));
              } else if (payload.eventType === "DELETE" && payload.old) {
                const id = (payload.old as { id?: string }).id;
                if (id) setDecisions((prev) => removeById(prev, id));
              }
            });
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
      if (!isExecTaskStatus(nextStatus)) throw new Error("حالة غير صالحة");
      const safeReason = sanitizePlainText(rejectReason, 2000);
      let snapshot: ExecutiveTask | undefined;
      setTasks((prev) => {
        const cur = prev.find((t) => t.id === taskId);
        if (!cur) return prev;
        snapshot = cur;
        rollbackRef.current.set(taskId, cur);
        return prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: nextStatus,
                reject_reason: safeReason,
                updated_at: new Date().toISOString(),
              }
            : t,
        );
      });

      try {
        const { error } = await supabase
          .from("executive_tasks")
          .update({ status: nextStatus, reject_reason: safeReason } as never)
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
    loading,
    approveTask,
    rejectTask,
    setTaskStatusOptimistic,
  };
}
