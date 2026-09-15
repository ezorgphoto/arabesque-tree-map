import { rememberAccessToken, supabase } from "@/integrations/supabase/client";

export type ScheduleBlock = {
  id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  description: string;
  created_at: string;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const DAYS = [
  { key: 0, label: "الأحد" },
  { key: 1, label: "الإثنين" },
  { key: 2, label: "الثلاثاء" },
  { key: 3, label: "الأربعاء" },
  { key: 4, label: "الخميس" },
  { key: 5, label: "الجمعة" },
  { key: 6, label: "السبت" },
] as const;

export const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 → 21:00

export const hhmm = (value: string) => (value ?? "").slice(0, 5);

export const pad = (n: number) => `${n}`.padStart(2, "0");

export const scheduleApi = {
  list: async () => {
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      rememberAccessToken(data.session?.access_token ?? null);
    }
    return unwrap<ScheduleBlock[]>(
      (await supabase
        .from("weekly_schedule")
        .select("*")
        .order("day_of_week")
        .order("start_time")) as never,
    );
  },
  create: async (row: Partial<ScheduleBlock>) =>
    unwrap((await supabase.from("weekly_schedule").insert(row as never).select().single()) as never),
  update: async (id: string, row: Partial<ScheduleBlock>) =>
    unwrap(
      (await supabase
        .from("weekly_schedule")
        .update(row as never)
        .eq("id", id)
        .select()
        .single()) as never,
    ),
  remove: async (id: string) => {
    const { error } = await supabase.from("weekly_schedule").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};

export const notificationsApi = {
  list: async () => {
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      rememberAccessToken(data.session?.access_token ?? null);
    }
    return unwrap<AppNotification[]>(
      (await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30)) as never,
    );
  },
  markRead: async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true } as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
  markAllRead: async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true } as never)
      .eq("is_read", false);
    if (error) throw new Error(error.message);
  },
  create: async (row: { title: string; message: string }) => {
    const { error } = await supabase.from("notifications").insert(row as never);
    if (error) throw new Error(error.message);
  },
};

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.round(hours / 24);
  return `قبل ${days} يوم`;
}
