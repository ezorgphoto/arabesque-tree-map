// تذكيرات Web Push — تعمل على Deno (بدون مكتبة Node).
// timezone: Asia/Damascus ليتوافق مع المخطط في التطبيق.

import { createClient } from "npm:@supabase/supabase-js@2";

const LEAD_MINUTES = 12;
const TZ = "Asia/Damascus";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")?.trim();
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")?.trim();
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

  if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
    return json({ error: "missing SUPABASE_* or VAPID_* secrets" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const url = new URL(req.url);
  let forceTest = url.searchParams.get("test") === "1";
  try {
    if (req.method === "POST") {
      const body = await req.clone().json().catch(() => null);
      if (body && typeof body === "object" && (body as { test?: boolean }).test) {
        forceTest = true;
      }
    }
  } catch {
    /* ignore */
  }

  const { data: subs, error: subErr } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (subErr) return json({ error: subErr.message }, 500);

  const devices = subs ?? [];
  const nowLocal = localNow(TZ);

  let due: { title: string; start_time: string }[] = [];
  if (!forceTest) {
    const { data: blocks, error: blkErr } = await supabase
      .from("weekly_schedule")
      .select("title, day_of_week, start_time")
      .eq("day_of_week", nowLocal.weekday);

    if (blkErr) return json({ error: blkErr.message }, 500);

    due = (blocks ?? []).filter((b: { start_time: string }) => {
      const [h, m] = String(b.start_time).slice(0, 5).split(":").map(Number);
      const diffMin = (h ?? 0) * 60 + (m ?? 0) - (nowLocal.hour * 60 + nowLocal.minute);
      return diffMin > 0 && diffMin <= LEAD_MINUTES;
    });
  }

  if (!forceTest && due.length === 0) {
    return json({
      sent: 0,
      reason: "no due appointments",
      devices: devices.length,
      localTime: `${nowLocal.hour}:${String(nowLocal.minute).padStart(2, "0")}`,
      weekday: nowLocal.weekday,
    });
  }

  const payloads = forceTest
    ? [{ title: "تذكير تجريبي", body: "إشعار خلفي من الخادم — الجهاز مسجّل بنجاح" }]
    : due.map((b) => ({
      title: "تذكير بموعد قادم",
      body: `${b.title} — ${String(b.start_time).slice(0, 5)}`,
    }));

  if (devices.length === 0) {
    return json({
      sent: 0,
      reason: "no registered devices in push_subscriptions",
      dueCount: due.length,
      test: forceTest,
    });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const payload of payloads) {
    const body = JSON.stringify(payload);
    for (const s of devices) {
      try {
        const res = await sendWebPush(
          { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
          body,
          vapidPublic,
          vapidPrivate,
          vapidSubject,
        );
        if (res.ok || res.status === 201) {
          sent++;
        } else if (res.status === 404 || res.status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
          errors.push(`${res.status} expired ${s.endpoint.slice(0, 48)}`);
        } else {
          const text = await res.text().catch(() => "");
          errors.push(`${res.status} ${text.slice(0, 160)}`);
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  return json({
    sent,
    dueCount: due.length,
    devices: devices.length,
    test: forceTest,
    errors: errors.slice(0, 8),
  });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function localNow(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    weekday: map[get("weekday")] ?? 0,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function b64ToBytes(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64Url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...chunks: Uint8Array[]): Uint8Array {
  const n = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, len: number) {
  const t = await hmac(prk, concat(info, new Uint8Array([1])));
  return t.slice(0, len);
}

async function importVapidPrivate(privateB64: string, publicB64: string): Promise<CryptoKey> {
  const pub = b64ToBytes(publicB64);
  if (pub.length !== 65 || pub[0] !== 4) {
    throw new Error("VAPID_PUBLIC_KEY must be uncompressed P-256 (65 bytes)");
  }
  let d = b64ToBytes(privateB64);
  if (d.length > 32) d = d.slice(-32);
  if (d.length !== 32) throw new Error("VAPID_PRIVATE_KEY length invalid");
  return await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: bytesToB64Url(d),
      x: bytesToB64Url(pub.slice(1, 33)),
      y: bytesToB64Url(pub.slice(33, 65)),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function vapidJwt(
  endpoint: string,
  privateKey: CryptoKey,
  publicB64: string,
  subject: string,
): Promise<string> {
  const enc = new TextEncoder();
  const header = bytesToB64Url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64Url(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  })));
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      enc.encode(`${header}.${payload}`),
    ),
  );
  return `${header}.${payload}.${bytesToB64Url(sig)}`;
}

async function encryptPayload(
  p256dh: string,
  authSecret: string,
  plaintext: string,
): Promise<Uint8Array> {
  const userPubRaw = b64ToBytes(p256dh);
  const userAuth = b64ToBytes(authSecret);
  const userKey = await crypto.subtle.importKey(
    "raw",
    userPubRaw,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const ecdh = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: userKey }, local.privateKey, 256),
  );

  const encoder = new TextEncoder();
  const keyInfo = concat(
    encoder.encode("WebPush: info"),
    new Uint8Array([0]),
    userPubRaw,
    asPub,
  );
  const prk = await hmac(userAuth, ecdh);
  const ikm = await hkdfExpand(prk, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk2 = await hmac(salt, ikm);
  const cek = await hkdfExpand(prk2, concat(encoder.encode("Content-Encoding: aes128gcm"), new Uint8Array([0])), 16);
  const nonce = await hkdfExpand(prk2, concat(encoder.encode("Content-Encoding: nonce"), new Uint8Array([0])), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const body = concat(encoder.encode(plaintext), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, body),
  );

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPub.length]), asPub, ciphertext);
}

async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublic: string,
  vapidPrivate: string,
  subject: string,
): Promise<Response> {
  const priv = await importVapidPrivate(vapidPrivate, vapidPublic);
  const jwt = await vapidJwt(sub.endpoint, priv, vapidPublic, subject);
  const body = await encryptPayload(sub.p256dh, sub.auth, payload);
  return await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidPublic}`,
      TTL: "86400",
      Urgency: "high",
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
    },
    body,
  });
}
