// Supabase Edge Function (سقالة): إرسال تذكيرات Web Push للمواعيد والمهام.
//
// ⚠️ غير مُفعّلة بعد — تتطلب خطوات نشر:
//   1) توليد مفاتيح VAPID:  npx web-push generate-vapid-keys
//   2) ضبط الأسرار:
//        supabase secrets set VAPID_PUBLIC_KEY=...  VAPID_PRIVATE_KEY=...  VAPID_SUBJECT=mailto:you@example.com
//   3) النشر:  supabase functions deploy send-reminders
//   4) الجدولة (كل 5 دقائق مثلاً) عبر pg_cron / Supabase Schedules لاستدعاء الدالة.
//
// تعتمد على جدولي public.weekly_schedule و public.push_subscriptions،
// وتستخدم SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY المتوفّرين تلقائياً في بيئة الدوال.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const LEAD_MINUTES = 10;

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

  if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
    return new Response(
      JSON.stringify({ error: "missing SUPABASE_* or VAPID_* environment variables" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const supabase = createClient(supabaseUrl, serviceKey);

  // مواعيد اليوم القريبة (خلال نافذة LEAD_MINUTES القادمة).
  const now = new Date();
  const today = now.getDay();
  const { data: blocks } = await supabase
    .from("weekly_schedule")
    .select("title, day_of_week, start_time")
    .eq("day_of_week", today);

  const due = (blocks ?? []).filter((b: { start_time: string }) => {
    const [h, m] = String(b.start_time).slice(0, 5).split(":").map(Number);
    const when = new Date();
    when.setHours(h ?? 0, m ?? 0, 0, 0);
    const diffMin = (when.getTime() - now.getTime()) / 60000;
    return diffMin > 0 && diffMin <= LEAD_MINUTES;
  });

  if (due.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no due appointments" }), {
      headers: { "content-type": "application/json" },
    });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  let sent = 0;
  for (const b of due) {
    const payload = JSON.stringify({
      title: "تذكير بموعد قادم",
      body: `${b.title} — ${String(b.start_time).slice(0, 5)}`,
    });
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        // اشتراك منتهي/غير صالح: احذفه لتجنّب المحاولات المتكررة.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }
  }

  return new Response(JSON.stringify({ sent, dueCount: due.length }), {
    headers: { "content-type": "application/json" },
  });
});
