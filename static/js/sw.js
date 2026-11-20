self.addEventListener('push', (event) => {
    if (!event.data) return;
    let data = {};
    try { data = event.data.json(); } catch (e) { data = { title: 'Mokslus', body: event.data.text() }; }

    const options = {
        body: data.body || 'Naujas pranešimas',
        icon: '/static/images/apple-touch-icon.png',
        badge: '/static/images/apple-touch-icon.png',
        data: { url: data.url || '/' },
        vibrate: [200, 100, 200],
        tag: data.tag || 'mokslus',
        requireInteraction: false
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Mokslus', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const client of list) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});