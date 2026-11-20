'use strict';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = { title: 'Mokslus', body: event.data.text() };
    }

    event.waitUntil(self.registration.showNotification(data.title || 'Mokslus', {
        body: data.body || 'Naujas pranešimas',
        icon: '/static/images/apple-touch-icon.png',
        badge: '/static/images/apple-touch-icon.png',
        data: { url: data.url || '/' },
        vibrate: [200, 100, 200],
        tag: data.tag || 'mokslus',
        requireInteraction: false,
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = event.notification.data?.url || '/';

    event.waitUntil((async () => {
        const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientsList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
                await client.navigate(target);
                return client.focus();
            }
        }
        return self.clients.openWindow(target);
    })());
});