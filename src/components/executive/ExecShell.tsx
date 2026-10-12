import type { ReactNode } from "react";
import type { RealtimeConnectionStatus } from "@/lib/executive-types";

export function ExecShell({ children }: { children: ReactNode }) {
  return (
    <div
      dir="rtl"
      className="min-h-[calc(100vh-5rem)] rounded-2xl text-[#e8eef7]"
      style={{
        background:
          "radial-gradient(1200px 500px at 100% -10%, rgba(30,58,95,.45), transparent), linear-gradient(165deg, #090d16 0%, #0c1220 55%, #0a1018 100%)",
      }}
    >
      <div className="space-y-5 p-4 md:p-6">{children}</div>
    </div>
  );
}

export function ConnectionBadge({ status }: { status: RealtimeConnectionStatus }) {
  const map = {
    connecting: { label: "يتصل…", className: "bg-amber-500/20 text-amber-200 ring-amber-500/30" },
    connected: { label: "مباشر", className: "bg-emerald-500/20 text-emerald-200 ring-emerald-500/30" },
    disconnected: { label: "غير متصل", className: "bg-white/10 text-white/60 ring-white/15" },
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${map.className}`}
    >
      <span
        className={`size-1.5 rounded-full ${
          status === "connected" ? "animate-pulse bg-emerald-400" : status === "connecting" ? "bg-amber-400" : "bg-white/40"
        }`}
      />
      {map.label}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  progress,
  accent = "navy",
}: {
  label: string;
  value: string;
  hint?: string;
  progress?: number;
  accent?: "navy" | "gold" | "emerald";
}) {
  const bar =
    accent === "gold" ? "bg-amber-400" : accent === "emerald" ? "bg-emerald-400" : "bg-sky-400";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] transition hover:border-white/20 hover:bg-white/[0.05]">
      <p className="text-[11px] font-semibold text-white/55">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-white/45">{hint}</p> : null}
      {typeof progress === "number" ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full ${bar} transition-all duration-500`} style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export function ExecSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="h-80 rounded-xl bg-white/5" />
        <div className="h-80 rounded-xl bg-white/5" />
      </div>
    </div>
  );
}
