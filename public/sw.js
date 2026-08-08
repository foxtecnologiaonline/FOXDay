// Service worker do FOXDay — casca offline simples (Fase 1).
// Navegação: rede primeiro, cache como fallback. Assets: cache primeiro.
const CACHE = 'foxday-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (evento) => {
  const req = evento.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    evento.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone()
          caches.open(CACHE).then((c) => c.put('/index.html', copia))
          return resp
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  evento.respondWith(
    caches.match(req).then(
      (emCache) =>
        emCache ||
        fetch(req).then((resp) => {
          if (resp.ok) {
            const copia = resp.clone()
            caches.open(CACHE).then((c) => c.put(req, copia))
          }
          return resp
        })
    )
  )
})
