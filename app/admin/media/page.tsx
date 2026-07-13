'use client'

import React from 'react'
import { useTranslation } from '../../../hooks/useTranslation'

export default function MediaPage() {
  const { t } = useTranslation()

  return (
    <div>
      <h1 style={{ font: 'var(--text-h1)', color: 'var(--color-text)', marginBottom: 'var(--space-lg)' }}>
        {t('media.title')}
      </h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Coming soon...
      </p>
    </div>
  )
}
