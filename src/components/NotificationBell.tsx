import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, BellRing, CheckCheck, Dot } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notificationsApi, relativeTime, scheduleApi } from "@/lib/extras";
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
  scheduleTodayReminders,
  showLocalNotification,
} from "@/lib/reminders";

export function NotificationBell() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
    refetchInterval: 60_000,
  });

  const schedule = useQuery({ queryKey: ["weekly_schedule"], queryFn: scheduleApi.list });
  const [perm, setPerm] = useState<NotificationPermission>("default");

  useEffect(() => {
    setPerm(notificationPermission());
  }, []);

  // إعادة جدولة تذكيرات اليوم عند منح الإذن أو تغيّر المواعيد.
  useEffect(() => {
    if (perm === "granted" && schedule.data) {
      scheduleTodayReminders(schedule.data);
    }
  }, [perm, schedule.data]);

  const enableReminders = async () => {
    const result = await requestNotificationPermission();
    setPerm(result);
    if (result === "granted") {
      const count = scheduleTodayReminders(schedule.data ?? []);
      toast.success(
        count > 0 ? `تم تفعيل التذكيرات — ${count} موعد اليوم` : "تم تفعيل التذكيرات",
      );
    } else {
      toast.error("لم يُمنح إذن الإشعارات. فعّله من إعدادات المتصفح.");
    }
  };

  const testReminder = () => {
    const ok = showLocalNotification("تذكير تجريبي", "هكذا ستصلك تذكيرات المهام والمواعيد.");
    if (!ok) toast.error("تعذّر عرض الإشعار. تحقّق من إذن الإشعارات.");
  };

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

        <div className="border-t p-3">
          {!notificationsSupported() ? (
            <p className="text-center text-[11px] text-muted-foreground">
              المتصفح لا يدعم الإشعارات
            </p>
          ) : perm === "granted" ? (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                <BellRing className="size-3.5" /> تذكيرات المخطط مفعّلة
              </span>
              <button
                type="button"
                onClick={testReminder}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                تجربة إشعار
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={enableReminders}
              className="flex w-full items-center justify-center gap-1 rounded-md bg-primary/10 px-2 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              <BellRing className="size-3.5" /> تفعيل تذكيرات المتصفح
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
