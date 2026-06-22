self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : { title: 'Galeri Saya', body: 'Ada foto baru masuk!' };
    
    const options = {
        body: data.body,
        vibrate: [200, 100, 200],
        badge: '/favicon.ico',
        data: {
            dateOfArrival: Date.now()
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/dashboard.html')
    );
});
