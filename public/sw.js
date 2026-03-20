const CACHE = 'fup-v5'
const PRECACHE = ['./', './index.html', './assets/Duck_run.png', './assets/object_coin.png', './assets/bg_repeat_340x640.jpeg']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (url.hostname.includes('coingecko') || url.hostname.includes('dexscreener') || url.hostname.includes('worldtimeapi') || url.hostname.includes('cloudflare')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })))
    return
  }
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
    if (resp.ok && e.request.method === 'GET') {
      caches.open(CACHE).then(c => c.put(e.request, resp.clone()))
    }
    return resp
  })))
})
