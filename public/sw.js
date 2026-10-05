/* Minimal LinkUp service worker — installability only.
 *
 * A registered SW with a fetch handler is required for the browser install
 * prompt. Intentionally NO caching here: this app serves authenticated,
 * real-time content (JWT in localStorage, E2E chat), so precaching or
 * runtime caching would risk stale/private content. Network passthrough
 * keeps behavior identical to having no SW.
 */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
