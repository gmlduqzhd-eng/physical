const CACHE_PREFIX = 'physical-';
const CACHE_NAME = 'physical-v3';
const SHELL_URL = '/';

const assetDependencies = (source, parentUrl) => {
  const references = [
    ...[...source.matchAll(/["']((?:\.{1,2}\/|\/?assets\/|\/fonts\/)[^"'<>]+?\.(?:js|css|woff2?|ttf|otf))["']/g)].map(match => match[1]),
    ...[...source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map(match => match[1].trim()),
  ];
  return references.map(reference => new URL(reference.startsWith('assets/') ? `/${reference}` : reference, parentUrl))
    .filter(url => url.origin === self.location.origin && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/fonts/')));
};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const shell = await fetch(SHELL_URL, { cache: 'no-cache' });
    if (!shell.ok) throw new Error('Unable to cache the application shell.');
    await cache.put(SHELL_URL, shell.clone());
    // First-load assets and lazy routes are requested before this worker controls
    // the page, so follow their build dependencies as well as the HTML entry.
    const html = await shell.text();
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map(match => new URL(match[1], self.location.origin))
      .filter(url => url.origin === self.location.origin && (url.pathname.startsWith('/assets/') || /\.(?:svg|png|webmanifest|json)$/.test(url.pathname)));
    const visited = new Set();
    const cacheAsset = async (url) => {
      if (visited.has(url.href)) return;
      visited.add(url.href);
      const response = await fetch(url.href);
      if (!response.ok || response.headers.get('Content-Type')?.includes('text/html')) return;
      await cache.put(url.href, response.clone());
      if (/\.(?:js|css)$/.test(url.pathname)) {
        const dependencies = assetDependencies(await response.text(), url.href);
        await Promise.all(dependencies.map(cacheAsset));
      }
    };
    await Promise.all(assets.map(cacheAsset));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Live classroom data and third-party responses must never enter this cache.
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME).catch(() => null);
      try {
        const response = await fetch(event.request);
        if (response.ok && response.headers.get('Content-Type')?.includes('text/html')) {
          if (cache) await cache.put(SHELL_URL, response.clone()).catch(() => {});
        }
        if (response.status < 500) return response;
      } catch { /* Use the most recently successful app shell while offline. */ }
      return (await cache?.match(SHELL_URL).catch(() => undefined)) ?? new Response('인터넷 연결을 확인한 후 다시 열어 주세요.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    })());
    return;
  }

  const isStaticAsset = url.pathname.startsWith('/assets/') || ['script', 'style', 'font', 'image'].includes(event.request.destination)
    || url.pathname === '/manifest.json';
  if (!isStaticAsset) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME).catch(() => null);
    // Hashed Vite assets are immutable; other assets are refreshed online.
    if (url.pathname.startsWith('/assets/')) {
      // Precache requests lack the Origin header attached to module imports.
      // These public same-origin files have identical bytes for both requests.
      const cached = await cache?.match(event.request, { ignoreVary: true }).catch(() => undefined);
      if (cached) return cached;
    }
    try {
      const response = await fetch(event.request);
      if (response.ok && cache) await cache.put(event.request, response.clone()).catch(() => {});
      if (response.status < 500) return response;
    } catch { /* Fall back to assets from this deployment only. */ }
    return (await cache?.match(event.request, { ignoreVary: true }).catch(() => undefined)) ?? new Response('', { status: 503 });
  })());
});
