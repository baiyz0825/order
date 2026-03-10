const CACHE_NAME = 'order-app-v1'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // 跳过非 GET 请求和 API 请求
  if (request.method !== 'GET') return
  if (request.url.includes('/api/')) return
  if (request.url.includes('/ws')) return

  event.respondWith(
    caches.match(request).then((cached) => {
      // 网络优先，缓存回退
      return fetch(request)
        .then((response) => {
          // 缓存成功的响应
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          return cached || new Response('Offline', { status: 503 })
        })
    })
  )
})
