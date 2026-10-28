const CACHE = 'memory-depo-offline-v1'
const OFFLINE = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith('memory-depo-offline-') && key !== CACHE).map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return
  event.respondWith(fetch(event.request).catch(async () => {
    const cache = await caches.open(CACHE)
    return (await cache.match(OFFLINE)) || new Response('Sem conexão. Tente novamente.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }))
})
