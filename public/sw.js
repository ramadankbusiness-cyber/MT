self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("mt-club-offline-v1").then((cache) => cache.addAll([
    "/offline",
    "/robot-error.png",
  ])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open("mt-club-offline-v1");
    const offline = await cache.match("/offline");
    return offline ?? Response.error();
  }));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  event.waitUntil(self.registration.showNotification(payload.title || "MT Club", {
    body: payload.body || "You have a new update.",
    icon: "/mt-logo.png",
    badge: "/mt-logo.png",
    tag: payload.tag,
    data: { url: payload.url || "/notifications" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => client.url === url);
    if (existing) return existing.focus();
    return self.clients.openWindow(url);
  }));
});
