'use client'

import { useMemo, useState, useEffect } from 'react'
import styles from './WebsitePreview.module.css'
import ExternalImage from '../ExternalImage'

type ProbeState = 'idle' | 'checking' | 'online' | 'offline'

interface WebsitePreviewProps {
  url: string
  labels: {
    checking: string
    online: string
    offline: string
    openLink: string
  }
}

export default function WebsitePreview({ url, labels }: WebsitePreviewProps) {
  const parsed = useMemo(() => {
    const raw = url.trim()
    if (!raw) return { full: '', hostname: '' }
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`
    try {
      const hostname = new URL(withScheme).hostname
      if (!hostname.includes('.')) return { full: '', hostname: '' }
      return { full: withScheme, hostname }
    } catch {
      return { full: '', hostname: '' }
    }
  }, [url])

  const target = parsed.hostname

  const [probe, setProbe] = useState<{ target: string; state: 'online' | 'offline' } | null>(null)

  const probeState: ProbeState = !target ? 'idle' : (probe?.target === target ? probe.state : 'checking')

  useEffect(() => {
    if (!target) return
    let cancelled = false
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 6000)
    const debounce = setTimeout(() => {
      fetch(`https://${target}`, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal })
        .then(() => {
          if (!cancelled) setProbe({ target, state: 'online' })
        })
        .catch(() => {
          if (!cancelled) setProbe({ target, state: 'offline' })
        })
        .finally(() => clearTimeout(timeout))
    }, 600)
    return () => {
      cancelled = true
      ctrl.abort()
      clearTimeout(debounce)
      clearTimeout(timeout)
    }
  }, [target])

  if (!parsed.hostname) return null

  return (
    <div className={styles.card}>
      <ExternalImage
        src={`https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`}
        alt=""
        className={styles.favicon}
      />
      <div className={styles.info}>
        <span className={styles.domain}>{parsed.hostname}</span>
        <span
          className={[
            styles.status,
            probeState === 'online' ? styles.statusOnline : '',
            probeState === 'offline' ? styles.statusOffline : '',
          ].join(' ')}
        >
          {probeState === 'checking' && labels.checking}
          {probeState === 'online' && labels.online}
          {probeState === 'offline' && labels.offline}
        </span>
      </div>
      <a href={parsed.full} target="_blank" rel="noopener noreferrer" className={styles.openLink}>
        {labels.openLink}
        <i className="bx bx-link-external" />
      </a>
    </div>
  )
}