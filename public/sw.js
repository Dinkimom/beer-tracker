/* eslint-env serviceworker */

const CACHE_NAME = 'beer-tracker-pwa-v2';
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/favicon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
];

function shouldBypass(pathname) {
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/webpack') ||
    pathname === '/site.webmanifest'
  );
}

function isCacheableStatic(pathname) {
  if (pathname.startsWith('/_next/static/') || pathname.startsWith('/assets/')) {
    return true;
  }
  return PRECACHE_URLS.includes(pathname) || pathname.startsWith('/favicon-');
}

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(PRECACHE_URLS);
}

async function dropOldCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
}

async function networkFirstNavigate(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(OFFLINE_URL);
    return cached ?? Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        void cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached ?? networkPromise;
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(dropOldCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || shouldBypass(url.pathname)) {
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigate(event.request));
    return;
  }
  if (isCacheableStatic(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
