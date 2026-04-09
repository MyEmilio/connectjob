/* eslint-disable no-restricted-globals */

// ConnectJob Service Worker for Push Notifications

const CACHE_NAME = 'connectjob-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(self.clients.claim());
});

// Push event - receive push notification
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');

  let data = {
    title: 'ConnectJob',
    body: 'Ai o notificare nouă',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'connectjob-notification',
    data: { url: '/' }
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    console.error('[ServiceWorker] Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo192.png',
    badge: data.badge || '/logo192.png',
    tag: data.tag,
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click:', event.action);
  
  event.notification.close();

  const url = event.notification.data?.url || '/';
  
  // Handle specific actions
  if (event.action === 'open_chat') {
    event.waitUntil(clients.openWindow('/chat'));
    return;
  }
  if (event.action === 'view_job') {
    event.waitUntil(clients.openWindow('/jobs'));
    return;
  }
  if (event.action === 'view_applications') {
    event.waitUntil(clients.openWindow('/jobs'));
    return;
  }

  // Default: open the URL from notification data
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[ServiceWorker] Notification closed');
});
