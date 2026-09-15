// إشعارات فقط. لا نعترض تصفح الصفحات حتى لا تُعاد الصفحة عند الرجوع من تطبيق آخر.
self.addEventListener("install", () => {
  // لا skipWaiting حتى لا تُعاد الصفحة عند العودة للنافذة
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "نظام الإدارة التنفيذية", body: "لديك تذكير جديد" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      dir: "rtl",
      lang: "ar",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    }),
  );
});
