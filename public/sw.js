const CACHE = 'nanimemo-shell-v1';
const SHELL_PATHS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
].map((p) => new URL(p, self.location).pathname);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_PATHS.map((p) => new URL(p, self.location)))),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Ne sert que l'app shell en cache (hors ligne) — jamais Supabase ni Pixabay,
// qui doivent toujours toucher le réseau (données live).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isShellRequest = url.origin === self.location.origin && SHELL_PATHS.includes(url.pathname);
  if (!isShellRequest) return;

  event.respondWith(
    // cache:'no-store' force un vrai aller-retour réseau — sans ça, le cache HTTP
    // du navigateur peut servir un shell périmé même si ce handler semble "network-first".
    fetch(event.request, { cache: 'no-store' })
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request)),
  );
});
