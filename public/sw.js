// Locora Service Worker for Browser Travel Reminders & Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push notification
self.addEventListener('push', (event) => {
  let data = { title: 'Locora Travel Reminder', body: 'Your upcoming trip starts soon!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'Don\'t forget your scheduled experience!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: {
      url: data.url || '/my-trips'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Locora Reminder', options)
  );
});

// Handle notification click navigation
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/my-trips';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
