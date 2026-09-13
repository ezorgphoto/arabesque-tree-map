// Service worker خفيف لتفعيل التثبيت (PWA) وتوفير عمل أساسي دون اتصال.
// شبكة أولاً مع رجوع إلى الذاكرة المؤقتة لصفحات التنقّل عند انقطاع الشبكة.
const CACHE = "exec-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/"])));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // للتنقّل: شبكة أولاً ثم رجوع للصفحة المخزّنة عند انقطاع الاتصال.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || Response.error())),
    );
  }
});

// نقطة ربط مستقبلية لإشعارات Push (تتطلب مفاتيح VAPID ونشراً على HTTPS).
self.addEventListener("push", (event) => {
  let data = { title: "نظام الإدارة التنفيذية", body: "لديك تذكير جديد" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // نص عادي
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/app-icon.svg",
      badge: "/app-icon.svg",
      dir: "rtl",
      lang: "ar",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
