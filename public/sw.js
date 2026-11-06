// 티칭플로 오프라인 지원 서비스 워커
// - 앱 화면(HTML): 온라인이면 항상 최신 배포본을 받고, 그 사본을 저장한다. 오프라인이면 저장해 둔 사본으로 연다.
// - 글꼴: 한 번 받은 글꼴 파일을 저장해 두고 오프라인에서도 같은 글꼴로 보이게 한다.
// - 기록 데이터는 서비스 워커와 무관하게 브라우저 저장소(localStorage)에 그대로 있다.
// - Google 로그인·Drive 요청은 건드리지 않는다(인터넷이 있어야 동작).
const APP_CACHE = 'teachingflow-app-v1'
const FONT_CACHE = 'teachingflow-fonts-v1'
const APP_FILES = ['./', './index.html', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png']
const FONT_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(APP_CACHE).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('teachingflow-') && key !== APP_CACHE && key !== FONT_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

async function networkFirst(request) {
  const cache = await caches.open(APP_CACHE)
  try {
    const response = await fetch(request, { cache: 'no-store' })
    if (response.ok) await cache.put('./index.html', response.clone())
    return response
  } catch {
    return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error()
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok || response.type === 'opaque') await cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(networkFirst(request))
    return
  }
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, APP_CACHE).catch(() => Response.error()))
    return
  }
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request, FONT_CACHE).catch(() => Response.error()))
  }
})
