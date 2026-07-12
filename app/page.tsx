'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface HealthStatus {
  status: string
}

export default function LandingPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/health')
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data = await res.json()
        setHealth(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed')
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
  }, [])

  return (
    <div style={{ padding: 'var(--space-xl)', maxWidth: '480px' }}>
      <h1
        style={{
          font: 'var(--text-h1)',
          color: 'var(--color-text)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        LinkUp Admin
      </h1>

      <div
        style={{
          background: 'var(--color-card)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-lg)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        <h2
          style={{
            font: 'var(--text-h2)',
            color: 'var(--color-text)',
            marginBottom: 'var(--space-md)',
          }}
        >
          Backend Status
        </h2>
        {loading && (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            <i className="bx bx-loader-circle" /> Connecting to server...
          </p>
        )}
        {error && (
          <p style={{ color: 'var(--color-danger)' }}>
            <i className="bx bx-x-circle" /> Error: {error}
          </p>
        )}
        {health && (
          <p style={{ color: 'var(--color-success)' }}>
            <i className="bx bx-check-circle" /> Server status:{' '}
            <strong>{health.status}</strong>
          </p>
        )}
      </div>

      <Link
        href="/login"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          background: 'var(--color-primary)',
          color: 'var(--color-secondary)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-sm) var(--space-md)',
          fontWeight: 600,
          transition: 'background 0.2s ease',
        }}
      >
        <i className="bx bx-log-in-circle" />
        Go to Login
      </Link>
    </div>
  )
}
