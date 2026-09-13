// تذكيرات المتصفح المحلية لمواعيد المخطط الأسبوعي.
// تعمل ما دام التطبيق مفتوحاً (تبويب نشط أو خلفي). الإشعارات وأنت خارج
// التطبيق كلياً تتطلب Web Push + نشراً على HTTPS (مرحلة لاحقة).

import { DAYS, hhmm, type ScheduleBlock } from "@/lib/extras";

export const notificationsSupported = (): boolean =>
  typeof window !== "undefined" && "Notification" in window;

export const notificationPermission = (): NotificationPermission =>
  notificationsSupported() ? Notification.permission : "denied";

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function showLocalNotification(title: string, body: string): boolean {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  try {
    new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      dir: "rtl",
      lang: "ar",
    });
    return true;
  } catch {
    return false;
  }
}

let timers: ReturnType<typeof setTimeout>[] = [];

export function clearScheduledReminders(): void {
  timers.forEach((t) => clearTimeout(t));
  timers = [];
}

// يجدول تذكيرات مواعيد اليوم المتبقية قبل موعدها بـ leadMinutes دقيقة.
export function scheduleTodayReminders(blocks: ScheduleBlock[], leadMinutes = 10): number {
  clearScheduledReminders();
  if (!notificationsSupported() || Notification.permission !== "granted") return 0;
  const now = new Date();
  const today = now.getDay();
  let scheduled = 0;
  for (const b of blocks) {
    if (b.day_of_week !== today) continue;
    const [h, m] = hhmm(b.start_time).split(":").map(Number);
    const when = new Date();
    when.setHours(h ?? 0, m ?? 0, 0, 0);
    const delay = when.getTime() - leadMinutes * 60000 - now.getTime();
    if (delay <= 0 || delay > 24 * 60 * 60 * 1000) continue;
    const label = DAYS[b.day_of_week]?.label ?? "";
    timers.push(
      setTimeout(() => {
        showLocalNotification("تذكير بموعد قادم", `${b.title} — ${label} ${hhmm(b.start_time)}`);
      }, delay),
    );
    scheduled++;
  }
  return scheduled;
}
