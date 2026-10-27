'use client'

import React from 'react'
import { useTranslation } from '../../../../hooks/useTranslation'
import AdForm from '../../../../components/AdForm'

export default function AdminNewAdPage() {
  const { t } = useTranslation()

  return (
    <AdForm
      heading={t('ads.create')}
      submitLabel={t('ads.create')}
      successMessage={t('ads.createSuccess')}
      redirectTo="/admin/ads"
    />
  )
}
