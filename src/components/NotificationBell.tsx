import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Dot } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notificationsApi, relativeTime } from "@/lib/extras";

export function NotificationBell() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
    refetchInterval: 60_000,
  });

  const items = list.data ?? [];
  const unread = items.filter((n) => !n.is_read);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications"] });

  const markOne = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      invalidate();
      toast.success("تم تعليم جميع الإشعارات كمقروءة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`الإشعارات، ${unread.length} غير مقروءة`}
        >
          <Bell className="size-5" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -left-0.5 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-5 text-destructive-foreground">
              {unread.length > 9 ? "٩+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" dir="rtl" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-bold">الإشعارات</p>
          <button
            type="button"
            disabled={!unread.length || markAll.isPending}
            onClick={() => markAll.mutate()}
            className="flex items-center gap-1 text-xs font-semibold text-primary disabled:opacity-40"
          >
            <CheckCheck className="size-3.5" /> تعليم الكل كمقروء
          </button>
        </div>

        <ScrollArea className="max-h-80">
          {list.isLoading && (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">جارٍ التحميل…</p>
          )}
          {!list.isLoading && !items.length && (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">لا توجد إشعارات بعد</p>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.is_read && markOne.mutate(n.id)}
              className={`block w-full border-b px-4 py-3 text-right transition-colors last:border-0 hover:bg-accent/60 ${
                n.is_read ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-1">
                {!n.is_read && <Dot className="-mt-1 size-5 shrink-0 text-primary" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">{n.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    {relativeTime(n.created_at)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
