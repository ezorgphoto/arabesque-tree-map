import { useState } from "react";
import { Check, X } from "lucide-react";
import {
  EXEC_PRIORITY_LABEL,
  EXEC_TASK_STATUS_LABEL,
  type ExecutiveTask,
} from "@/lib/executive-types";

type Props = {
  items: ExecutiveTask[];
  onApprove: (id: string) => Promise<void> | void;
  onReject: (id: string, reason: string) => Promise<void> | void;
};

function initials(name?: string) {
  if (!name) return "?";
  return name.trim().slice(0, 1);
}

function dueLabel(iso: string | null) {
  if (!iso) return "بدون موعد";
  return new Intl.DateTimeFormat("ar", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export function PendingQueue({ items, onApprove, onReject }: Props) {
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<Record<string, boolean>>({});

  const pending = items.filter((t) => t.status === "pending" || t.status === "in_review");

  const run = async (id: string, fn: () => Promise<void> | void) => {
    setBusy(id);
    setLeaving((s) => ({ ...s, [id]: true }));
    try {
      await fn();
    } finally {
      setBusy(null);
      window.setTimeout(() => setLeaving((s) => ({ ...s, [id]: false })), 280);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold">شريط المهام والقرارات المعلقة</h2>
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">
          {pending.length} بانتظارك
        </span>
      </header>

      <ul className="space-y-2">
        {pending.map((t) => (
          <li
            key={t.id}
            className={`rounded-lg border border-white/10 bg-[#0b1220]/80 p-3 transition-all duration-300 ${
              leaving[t.id] && (t.status === "approved" || t.status === "rejected")
                ? "translate-x-2 opacity-0"
                : "opacity-100"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sm font-extrabold text-sky-200">
                {initials(t.assignee_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-bold leading-snug">{t.title}</p>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      t.priority === "urgent"
                        ? "bg-amber-400/20 text-amber-200"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {EXEC_PRIORITY_LABEL[t.priority]}
                  </span>
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-violet-500/20 text-violet-200">
                    {EXEC_TASK_STATUS_LABEL[t.status]}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-white/50">{t.description}</p>
                <p className="mt-2 text-[11px] text-white/40">
                  {t.assignee_name || "غير مسند"} · {dueLabel(t.due_date)}
                </p>

                {rejecting === t.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      dir="rtl"
                      className="min-h-16 w-full rounded-md border border-white/15 bg-[#090d16] px-2 py-1.5 text-xs text-white"
                      placeholder="سبب الرفض…"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!reason.trim() || busy === t.id}
                        className="rounded-md bg-red-500/90 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
                        onClick={() =>
                          void run(t.id, async () => {
                            await onReject(t.id, reason.trim());
                            setRejecting(null);
                            setReason("");
                          })
                        }
                      >
                        تأكيد الرفض
                      </button>
                      <button
                        type="button"
                        className="rounded-md bg-white/10 px-3 py-1.5 text-[11px] font-bold"
                        onClick={() => {
                          setRejecting(null);
                          setReason("");
                        }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy === t.id}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-500/90 px-3 py-1.5 text-[11px] font-extrabold text-[#04140c] hover:bg-emerald-400 disabled:opacity-40"
                      onClick={() => void run(t.id, () => onApprove(t.id))}
                    >
                      <Check className="size-3.5" /> اعتماد
                    </button>
                    <button
                      type="button"
                      disabled={busy === t.id}
                      className="inline-flex items-center gap-1 rounded-md bg-white/10 px-3 py-1.5 text-[11px] font-extrabold ring-1 ring-white/15 hover:bg-white/15"
                      onClick={() => setRejecting(t.id)}
                    >
                      <X className="size-3.5" /> رفض مع تعليل
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
        {!pending.length && (
          <p className="py-8 text-center text-sm text-white/45">لا عناصر معلّقة حالياً.</p>
        )}
      </ul>
    </section>
  );
}
