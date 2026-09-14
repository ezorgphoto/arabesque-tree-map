/**
 * يولّد مفاتيح VAPID محلياً ويحفظها في vapid-keys.local.txt (غير مُتتبَّع).
 * التشغيل: node scripts/generate-vapid.mjs
 */
import { generateKeyPairSync } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
  publicKeyEncoding: { type: "spki", format: "der" },
  privateKeyEncoding: { type: "pkcs8", format: "der" },
});

// آخر 65 بايت من SPKI = المفتاح العام غير المضغوط (0x04 || x || y)
const publicRaw = publicKey.subarray(-65);
const publicB64 = b64url(publicRaw);
const privateB64 = b64url(privateKey);

const out = resolve(process.cwd(), "vapid-keys.local.txt");
const body = [
  "# مفاتيح VAPID — لا ترفع هذا الملف إلى Git",
  "",
  "# أضفه في Vercel Environment Variables:",
  `VITE_VAPID_PUBLIC_KEY=${publicB64}`,
  "",
  "# أسراره في Supabase (secrets) — لا تضعه في الواجهة:",
  `VAPID_PUBLIC_KEY=${publicB64}`,
  `VAPID_PRIVATE_KEY=${privateB64}`,
  "VAPID_SUBJECT=mailto:you@example.com",
  "",
].join("\n");

writeFileSync(out, body, "utf8");
console.log("تم إنشاء الملف: vapid-keys.local.txt");
console.log("انسخ VITE_VAPID_PUBLIC_KEY إلى .env وإلى Vercel.");
console.log("انسخ VAPID_* إلى أسرار Supabase Functions.");
