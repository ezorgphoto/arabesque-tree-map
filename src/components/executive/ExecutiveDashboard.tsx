import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useExecutiveRealtime } from "@/hooks/useExecutiveRealtime";
import {
  MOCK_DECISIONS,
  MOCK_EXEC_TASKS,
  MOCK_FEED,
  MOCK_NEXT_MEETING_AT,
} from "@/lib/executive-mock";
import type { ExecutiveDecision, ExecutiveTask } from "@/lib/executive-types";
import {
  ConnectionBadge,
  ExecShell,
  ExecSkeleton,
  MetricCard,
} from "@/components/executive/ExecShell";
import { QuickActionBar } from "@/components/executive/QuickActionBar";
import { PendingQueue } from "@/components/executive/PendingQueue";
import { ExecutiveFeed } from "@/components/executive/ExecutiveFeed";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  /** false = معاينة ببيانات وهمية بدون Realtime */
  live?: boolean;
};

function meetingCountdown(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "الآن";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)} ي ${h % 24} س`;
  return `${h} س ${m} د`;
}

function upsertLocal<T extends { id: string }>(list: T[], row: T): T[] {
  const i = list.findIndex((x) => x.id === row.id);
  if (i === -1) return [row, ...list];
  const next = list.slice();
  next[i] = { ...next[i], ...row };
  return next;
}

export function ExecutiveDashboard({ live = false }: Props) {
  const { user } = useAuth();
  const { tasks, decisions, setTasks, setDecisions, status, loading, approveTask, rejectTask } =
    useExecutiveRealtime({
      enabled: live,
      initialTasks: MOCK_EXEC_TASKS,
      initialDecisions: MOCK_DECISIONS,
    });

  const [decisionOpen, setDecisionOpen] = useState(false);
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [decisionForm, setDecisionForm] = useState({
    title: "",
    content: "",
    confidentiality_level: "internal" as ExecutiveDecision["confidentiality_level"],
  });
  const [delegateForm, setDelegateForm] = useState({
    title: "",
    description: "",
    assignee_name: "",
    priority: "high" as ExecutiveTask["priority"],
  });

  const kpis = useMemo(() => {
    const urgentPending = tasks.filter(
      (t) => (t.status === "pending" || t.status === "in_review") && t.priority === "urgent",
    ).length;
    const weekStart = Date.now() - 7 * 86400000;
    const delegated = tasks.filter((t) => t.delegated_by && new Date(t.created_at).getTime() >= weekStart);
    const completed = delegated.filter((t) => t.status === "approved" || t.status === "rejected");
    const highProjects = tasks.filter((t) => t.priority === "high" || t.priority === "urgent").length;
    const inReview = tasks.filter((t) => t.status === "in_review").length;
    return {
      urgentPending,
      urgentProgress: Math.min(100, urgentPending * 25),
      delegatedDone: completed.length,
      delegatedTotal: Math.max(delegated.length, 1),
      highProjects,
      inReview,
      meeting: meetingCountdown(MOCK_NEXT_MEETING_AT),
    };
  }, [tasks]);

  const handleApprove = async (id: string) => {
    try {
      if (live) await approveTask(id);
      else {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "approved" } : t)));
      }
      toast.success("تم الاعتماد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الاعتماد");
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      if (live) await rejectTask(id, reason);
      else {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "rejected", reject_reason: reason } : t)),
        );
      }
      toast.success("تم الرفض مع التعليل");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفض");
    }
  };

  if (live && loading) {
    return (
      <ExecShell>
        <ExecSkeleton />
      </ExecShell>
    );
  }

  return (
    <ExecShell>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-amber-200/80">EXECUTIVE OPS</p>
          <h1 className="text-2xl font-extrabold md:text-3xl">لوحة القيادة التنفيذية</h1>
          <p className="mt-1 text-sm text-white/55">قرارات، تفويض، واعتماد فوري — واجهة المسؤول.</p>
        </div>
        <ConnectionBadge status={live ? status : "disconnected"} />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="قرارات/مهام عاجلة بانتظار الاعتماد"
          value={String(kpis.urgentPending)}
          hint={`${kpis.inReview} قيد المراجعة`}
          progress={kpis.urgentProgress}
          accent="gold"
        />
        <MetricCard
          label="مهام مفوّضة هذا الأسبوع"
          value={`${kpis.delegatedDone}/${kpis.delegatedTotal}`}
          hint="مكتمل مقابل مفوّض"
          progress={Math.round((kpis.delegatedDone / kpis.delegatedTotal) * 100)}
          accent="emerald"
        />
        <MetricCard
          label="أولويات عالية نشطة"
          value={String(kpis.highProjects)}
          hint="عاجل + مرتفع"
          accent="navy"
        />
        <MetricCard label="الاجتماع التنفيذي التالي" value={kpis.meeting} hint="عدّ تنازلي" accent="gold" />
      </div>

      <QuickActionBar
        onIssueDecision={() => setDecisionOpen(true)}
        onDelegateTask={() => setDelegateOpen(true)}
        onToggleWorkflow={() => toast.message("اختر عنصراً من قائمة الاعتماد للاعتماد أو الرفض")}
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <PendingQueue items={tasks} onApprove={handleApprove} onReject={handleReject} />
        <ExecutiveFeed items={MOCK_FEED} />
      </div>

      {live && !tasks.length && (
        <p className="text-[11px] text-white/45">
          لا مهام بعد — استخدم «فوّض مهمة سريعة» أو «أصدر قراراً» للبدء.
        </p>
      )}

      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent dir="rtl" className="border-white/10 bg-[#0b1220] text-white">
          <DialogHeader>
            <DialogTitle>إصدار قرار تنفيذي</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>العنوان</Label>
              <Input
                className="border-white/15 bg-[#090d16]"
                value={decisionForm.title}
                onChange={(e) => setDecisionForm({ ...decisionForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label>المحتوى</Label>
              <Textarea
                className="border-white/15 bg-[#090d16]"
                rows={4}
                value={decisionForm.content}
                onChange={(e) => setDecisionForm({ ...decisionForm, content: e.target.value })}
              />
            </div>
            <div>
              <Label>مستوى السرية</Label>
              <Select
                value={decisionForm.confidentiality_level}
                onValueChange={(v) =>
                  setDecisionForm({
                    ...decisionForm,
                    confidentiality_level: v as ExecutiveDecision["confidentiality_level"],
                  })
                }
              >
                <SelectTrigger className="border-white/15 bg-[#090d16]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="public">عام</SelectItem>
                  <SelectItem value="internal">داخلي</SelectItem>
                  <SelectItem value="top_secret">سري للغاية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionOpen(false)}>
              إلغاء
            </Button>
            <Button
              className="bg-amber-500 text-[#1a1200] hover:bg-amber-400"
              disabled={!decisionForm.title.trim() || saving}
              onClick={() => {
                void (async () => {
                  setSaving(true);
                  try {
                    if (live) {
                      if (!user?.id) throw new Error("يجب تسجيل الدخول");
                      const { data, error } = await supabase
                        .from("executive_decisions")
                        .insert({
                          title: decisionForm.title.trim(),
                          content: decisionForm.content.trim(),
                          confidentiality_level: decisionForm.confidentiality_level,
                          status: "draft",
                          created_by: user.id,
                        } as never)
                        .select("*")
                        .single();
                      if (error) throw error;
                      if (data) setDecisions((d) => upsertLocal(d, data as ExecutiveDecision));
                      toast.success("أُضيفت مسودة القرار");
                    } else {
                      const row: ExecutiveDecision = {
                        id: crypto.randomUUID(),
                        title: decisionForm.title.trim(),
                        content: decisionForm.content.trim(),
                        confidentiality_level: decisionForm.confidentiality_level,
                        status: "draft",
                        created_by: "u-exec",
                        created_at: new Date().toISOString(),
                      };
                      setDecisions((d) => [row, ...d]);
                      toast.success("أُضيفت مسودة القرار (معاينة محلية)");
                    }
                    setDecisionOpen(false);
                    setDecisionForm({ title: "", content: "", confidentiality_level: "internal" });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "فشل حفظ القرار");
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
            >
              حفظ المسودة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={delegateOpen} onOpenChange={setDelegateOpen}>
        <DialogContent dir="rtl" className="border-white/10 bg-[#0b1220] text-white">
          <DialogHeader>
            <DialogTitle>تفويض مهمة سريعة</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>العنوان</Label>
              <Input
                className="border-white/15 bg-[#090d16]"
                value={delegateForm.title}
                onChange={(e) => setDelegateForm({ ...delegateForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea
                className="border-white/15 bg-[#090d16]"
                value={delegateForm.description}
                onChange={(e) => setDelegateForm({ ...delegateForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>المسند إليه</Label>
              <Input
                className="border-white/15 bg-[#090d16]"
                value={delegateForm.assignee_name}
                onChange={(e) => setDelegateForm({ ...delegateForm, assignee_name: e.target.value })}
              />
            </div>
            <div>
              <Label>الأولوية</Label>
              <Select
                value={delegateForm.priority}
                onValueChange={(v) =>
                  setDelegateForm({ ...delegateForm, priority: v as ExecutiveTask["priority"] })
                }
              >
                <SelectTrigger className="border-white/15 bg-[#090d16]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="urgent">عاجل</SelectItem>
                  <SelectItem value="high">مرتفع</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="low">منخفض</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelegateOpen(false)}>
              إلغاء
            </Button>
            <Button
              className="bg-sky-500 text-[#041018] hover:bg-sky-400"
              disabled={!delegateForm.title.trim() || saving}
              onClick={() => {
                void (async () => {
                  setSaving(true);
                  try {
                    if (live) {
                      if (!user?.id) throw new Error("يجب تسجيل الدخول");
                      const { data, error } = await supabase
                        .from("executive_tasks")
                        .insert({
                          title: delegateForm.title.trim(),
                          description: delegateForm.description.trim(),
                          status: "pending",
                          priority: delegateForm.priority,
                          created_by: user.id,
                          delegated_by: user.id,
                          assigned_to: null,
                          due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
                        } as never)
                        .select("*")
                        .single();
                      if (error) throw error;
                      if (data) {
                        setTasks((t) =>
                          upsertLocal(t, {
                            ...(data as ExecutiveTask),
                            assignee_name: delegateForm.assignee_name || "غير مسند",
                          }),
                        );
                      }
                      toast.success("فُوّضت المهمة");
                    } else {
                      const row: ExecutiveTask = {
                        id: crypto.randomUUID(),
                        title: delegateForm.title.trim(),
                        description: delegateForm.description.trim(),
                        status: "pending",
                        priority: delegateForm.priority,
                        created_by: "u-exec",
                        assigned_to: null,
                        delegated_by: "u-exec",
                        due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
                        reject_reason: "",
                        created_at: new Date().toISOString(),
                        assignee_name: delegateForm.assignee_name || "غير مسند",
                      };
                      setTasks((t) => [row, ...t]);
                      toast.success("فُوّضت المهمة (معاينة محلية)");
                    }
                    setDelegateOpen(false);
                    setDelegateForm({ title: "", description: "", assignee_name: "", priority: "high" });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "فشل التفويض");
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
            >
              تفويض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {decisions.length > 0 && (
        <p className="sr-only">مسودات قرارات: {decisions.length}</p>
      )}
    </ExecShell>
  );
}
