self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("push", (event) => {
  const data = event.data
    ? event.data.json()
    : { title: "CUT SmartFix", body: "You have a new maintenance update." };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.png",
      data: data.actionUrl,
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.notification.data)
    event.waitUntil(clients.openWindow(event.notification.data));
});
