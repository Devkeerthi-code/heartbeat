// Heartbeat service worker: shows down/recovery alerts and opens the monitor on click.
self.addEventListener("push", (event) => {
  let data = { title: "Heartbeat", body: "A monitor changed state.", url: "/dashboard" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // Non-JSON payloads fall back to the generic message.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url },
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.url,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((w) => w.url === url);
      return existing ? existing.focus() : self.clients.openWindow(url);
    }),
  );
});
