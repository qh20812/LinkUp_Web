'use client'

import { useEffect } from 'react'

// Registers /sw.js in production only, so local development never serves
// stale cached responses while coding. Failures are silent on purpose:
// an unregistered SW only means "not installable", never a broken page.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Intentionally ignored — see above.
    })
  }, [])

  return null
}
