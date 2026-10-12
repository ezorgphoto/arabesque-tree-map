import { FilePlus2, ListChecks, ShieldCheck } from "lucide-react";

type Props = {
  onIssueDecision: () => void;
  onDelegateTask: () => void;
  onToggleWorkflow: () => void;
};

export function QuickActionBar({ onIssueDecision, onDelegateTask, onToggleWorkflow }: Props) {
  const actions = [
    {
      label: "أصدر قراراً تنفيذياً",
      icon: FilePlus2,
      onClick: onIssueDecision,
      className: "bg-amber-500/90 text-[#1a1200] hover:bg-amber-400",
    },
    {
      label: "فوّض مهمة سريعة",
      icon: ListChecks,
      onClick: onDelegateTask,
      className: "bg-sky-500/90 text-[#041018] hover:bg-sky-400",
    },
    {
      label: "تغيير حالة الاعتماد",
      icon: ShieldCheck,
      onClick: onToggleWorkflow,
      className: "bg-white/10 text-white hover:bg-white/15 ring-1 ring-white/15",
    },
  ] as const;

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="w-full text-[10px] font-bold tracking-[0.18em] text-amber-200/80">COMMAND CENTER</p>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold transition ${a.className}`}
        >
          <a.icon className="size-4" />
          {a.label}
        </button>
      ))}
    </div>
  );
}
