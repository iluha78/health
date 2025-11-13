const CACHE_VERSION = 'v4';
const CACHE_NAME = `health-tracker-cache-${CACHE_VERSION}`;
const APP_SHELL = [
    '/',
    '/index.html',
    '/manifest.webmanifest',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/maskable-icon-512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});


self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') {
        return;
    }

    const requestUrl = new URL(request.url);

    // Always go to the network for API calls to avoid serving stale data.
    if (requestUrl.origin === self.location.origin && requestUrl.pathname.startsWith('/api/')) {
        return;
    }

    // Only cache same-origin navigation and static asset requests.
    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    const isNavigationRequest = request.mode === 'navigate';
    const shouldCache = isNavigationRequest || APP_SHELL.includes(requestUrl.pathname);

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request)
                .then((response) => {
                    if (shouldCache && response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => (isNavigationRequest ? caches.match('/index.html') : undefined));
        })
    );
});
