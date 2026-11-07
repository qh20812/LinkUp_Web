'use client'

import useSWR from 'swr'
import { getProvinces } from '../../api/locations'
import type { Place } from '../../api/locations'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './ProvinceMultiSelect.module.css'

interface ProvinceMultiSelectProps {
  value: string[]
  onChange: (ids: string[]) => void
}

/**
 * Chọn nhiều tỉnh/thành cho targeting quảng cáo. Giá trị lưu là province ID
 * (khớp profiles.current_province), không phải tên — trước đây partner gõ tay
 * tên tỉnh nên gần như không bao giờ khớp khi phân phối.
 */
export default function ProvinceMultiSelect({ value, onChange }: ProvinceMultiSelectProps) {
  const { t } = useTranslation()
  const { data: provinces, isLoading } = useSWR<Place[]>('/locations/provinces', () =>
    getProvinces().then((res) => res.data ?? []),
  )

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  return (
    <div className={styles.wrap}>
      {isLoading ? (
        <p className={styles.hint}>{t('common.loading')}</p>
      ) : (
        <div className={styles.grid}>
          {(provinces ?? []).map((province) => (
            <label key={province.id} className={styles.option}>
              <input
                type="checkbox"
                checked={value.includes(province.id)}
                onChange={() => toggle(province.id)}
              />
              <span>{province.name.vi}</span>
            </label>
          ))}
        </div>
      )}
      <p className={styles.hint}>
        {value.length === 0
          ? t('partner.form.targetLocationsAll')
          : t('partner.form.targetLocationsCount', { n: String(value.length) })}
      </p>
    </div>
  )
}
