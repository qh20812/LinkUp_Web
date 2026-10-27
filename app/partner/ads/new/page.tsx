'use client'

import React from 'react'
import { useTranslation } from '../../../../hooks/useTranslation'
import AdForm from '../../../../components/AdForm'

export default function NewAdPage() {
  const { t } = useTranslation()

  return (
    <AdForm
      heading={t('partner.ads.create')}
      submitLabel={t('partner.ads.create')}
      redirectTo="/partner/ads"
    />
  )
}
