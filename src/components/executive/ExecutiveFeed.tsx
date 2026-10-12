import { Bell, Check, FileText, UserRound, X } from "lucide-react";
import type { ExecutiveFeedItem } from "@/lib/executive-types";

function relativeAr(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} د`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${Math.round(h / 24)} ي`;
}

const ICONS = {
  check: Check,
  x: X,
  file: FileText,
  user: UserRound,
  bell: Bell,
} as const;

export function ExecutiveFeed({ items }: { items: ExecutiveFeedItem[] }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-sm font-extrabold">سجل النشاط التنفيذي المباشر</h2>
      <ul className="space-y-3">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <li key={item.id} className="flex gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-amber-200">
                <Icon className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug">{item.title}</p>
                <p className="mt-0.5 text-xs text-white/50">{item.detail}</p>
                <p className="mt-1 text-[10px] text-white/35">
                  {item.actor} · {relativeAr(item.at)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
