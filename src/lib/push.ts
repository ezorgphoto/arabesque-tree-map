// اشتراك Web Push — يسجّل الجهاز في push_subscriptions لإشعارات وأنت خارج التطبيق.
// يتطلب: HTTPS + VITE_VAPID_PUBLIC_KEY + تشغيل ترحيل push_subscriptions.

import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export const pushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

export function getVapidPublicKey(): string {
  return (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() ?? "";
}

/** يسجّل اشتراك Push في المتصفح ويحفظه في Supabase. */
export async function registerPushSubscription(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  if (!pushSupported()) return { ok: false, reason: "المتصفح لا يدعم Web Push" };

  const vapid = getVapidPublicKey();
  if (!vapid) {
    return {
      ok: false,
      reason: "مفتاح VAPID غير مضبوط (VITE_VAPID_PUBLIC_KEY)",
    };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      });
    }

    const json = sub.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      return { ok: false, reason: "تعذّر قراءة مفاتيح الاشتراك" };
    }

    // الجدول غير موجود بعد في الأنواع المولَّدة — نستخدم استدعاءاً مرناً.
    const { error } = await (supabase as unknown as {
      from: (t: string) => {
        upsert: (
          row: Record<string, string>,
          opts: { onConflict: string },
        ) => Promise<{ error: { message: string } | null }>;
      };
    })
      .from("push_subscriptions")
      .upsert(
        {
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent.slice(0, 300),
        },
        { onConflict: "endpoint" },
      );

    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "فشل تسجيل الاشتراك",
    };
  }
}
