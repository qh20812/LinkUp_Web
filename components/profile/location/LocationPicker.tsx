'use client'

import { useState, useEffect } from 'react'
import { getProvinces, getWards, type Place } from '../../../api/locations'
import { useTranslation } from '../../../hooks/useTranslation'
import SearchSelect from '../../SearchSelect'
import styles from './LocationPicker.module.css'

interface LocationPickerProps {
  /** Province-only mode (used for quê quán). Hides the ward selector. */
  provinceOnly?: boolean
  provinceId: string
  wardId?: string
  onProvinceChange: (id: string) => void
  onWardChange?: (id: string) => void
}

function toSearchSelectOptions(items: Place[]) {
  return items.map((item) => ({
    value: item.id,
    label: item.name.vi,
    keywords: `${item.name.vi} ${item.name.en}`,
  }))
}

export default function LocationPicker({
  provinceOnly = false,
  provinceId,
  wardId = '',
  onProvinceChange,
  onWardChange,
}: LocationPickerProps) {
  const { t } = useTranslation()
  const [provinces, setProvinces] = useState<{ status: 'loading' | 'loaded'; items: Place[] }>({
    status: 'loading',
    items: [],
  })
  const [wards, setWards] = useState<{ provinceId: string; status: 'idle' | 'loading' | 'loaded'; items: Place[] }>({
    provinceId: '',
    status: 'idle',
    items: [],
  })

  useEffect(() => {
    let cancelled = false
    getProvinces()
      .then((res) => { if (!cancelled) setProvinces({ status: 'loaded', items: res.data ?? [] }) })
      .catch(() => { if (!cancelled) setProvinces({ status: 'loaded', items: [] }) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!provinceId || provinceOnly) return
    let cancelled = false
    getWards(provinceId)
      .then((res) => { if (!cancelled) setWards({ provinceId, status: 'loaded', items: res.data ?? [] }) })
      .catch(() => { if (!cancelled) setWards({ provinceId, status: 'loaded', items: [] }) })
    return () => { cancelled = true }
  }, [provinceId, provinceOnly])

  const wardItems = wards.provinceId === provinceId ? wards.items : []
  const wardLoading = Boolean(provinceId) && !provinceOnly && wards.provinceId !== provinceId

  return (
    <div className={styles.root}>
      <SearchSelect
        options={toSearchSelectOptions(provinces.items)}
        value={provinceId}
        onChange={(id) => {
          onProvinceChange(id)
          if (onWardChange) onWardChange('')
        }}
        placeholder={t('profile.location.provincePlaceholder')}
        searchPlaceholder={t('profile.location.provinceSearchPlaceholder')}
        emptyText={t('profile.noResults')}
        loading={provinces.status === 'loading'}
      />

      {!provinceOnly && provinceId && (
        <SearchSelect
          options={toSearchSelectOptions(wardItems)}
          value={wardId}
          onChange={(id) => onWardChange?.(id)}
          placeholder={t('profile.location.wardPlaceholder')}
          searchPlaceholder={t('profile.location.wardSearchPlaceholder')}
          emptyText={t('profile.noResults')}
          loading={wardLoading}
        />
      )}
    </div>
  )
}