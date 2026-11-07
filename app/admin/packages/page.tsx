'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { swrFetcher } from '../../../api/swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { createAdminPackage, updateAdminPackage } from '../../../api/admin'
import type { AdPackage, PackageInput } from '../../../types'
import styles from './Packages.module.css'

const EMPTY: PackageInput = {
  name: '',
  description: '',
  price_monthly: 0,
  max_slots: 1,
  max_duration_days: 30,
  supports_video: false,
  supports_carousel: false,
  has_advanced_analytics: false,
  sort_order: 0,
  is_active: true,
}

function toInput(pkg: AdPackage): PackageInput {
  return {
    name: pkg.name,
    description: pkg.description,
    price_monthly: pkg.price_monthly,
    max_slots: pkg.max_slots,
    max_duration_days: pkg.max_duration_days,
    supports_video: pkg.supports_video,
    supports_carousel: pkg.supports_carousel,
    has_advanced_analytics: pkg.has_advanced_analytics,
    sort_order: pkg.sort_order,
    is_active: pkg.is_active,
  }
}

export default function AdminPackagesPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data, isLoading, mutate } = useSWR<AdPackage[]>('/admin/packages', () =>
    swrFetcher<{ data: AdPackage[] }>('/admin/packages').then((res) => res.data ?? []),
  )

  const [editing, setEditing] = useState<AdPackage | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<PackageInput>(EMPTY)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setOpen(true)
  }

  const openEdit = (pkg: AdPackage) => {
    setEditing(pkg)
    setForm(toInput(pkg))
    setOpen(true)
  }

  const setField = <K extends keyof PackageInput>(key: K, value: PackageInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        await updateAdminPackage(editing.id, form)
        toast({ title: t('packagesAdmin.updated'), type: 'success' })
      } else {
        await createAdminPackage(form)
        toast({ title: t('packagesAdmin.created'), type: 'success' })
      }
      setOpen(false)
      await mutate()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (pkg: AdPackage) => {
    try {
      await updateAdminPackage(pkg.id, { ...toInput(pkg), is_active: !pkg.is_active })
      await mutate()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    }
  }

  const formatPrice = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('packagesAdmin.title')}</h1>
        <button className={styles.primaryBtn} onClick={openCreate}>
          <i className="bx bx-plus" /> {t('packagesAdmin.create')}
        </button>
      </div>

      {isLoading ? (
        <p className={styles.empty}>{t('common.loading')}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('packagesAdmin.name')}</th>
                <th>{t('packagesAdmin.price')}</th>
                <th>{t('packagesAdmin.slots')}</th>
                <th>{t('packagesAdmin.duration')}</th>
                <th>{t('packagesAdmin.features')}</th>
                <th>{t('packagesAdmin.status')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((pkg) => (
                <tr key={pkg.id}>
                  <td>{pkg.name}</td>
                  <td>{formatPrice(pkg.price_monthly)}</td>
                  <td>{pkg.max_slots}</td>
                  <td>{t('packagesAdmin.days', { n: String(pkg.max_duration_days) })}</td>
                  <td className={styles.features}>
                    {pkg.supports_video && <span>Video</span>}
                    {pkg.supports_carousel && <span>Carousel</span>}
                    {pkg.has_advanced_analytics && <span>Analytics+</span>}
                  </td>
                  <td>
                    <button
                      className={`${styles.badge} ${pkg.is_active ? styles.badgeOn : styles.badgeOff}`}
                      onClick={() => toggleActive(pkg)}
                    >
                      {pkg.is_active ? t('packagesAdmin.active') : t('packagesAdmin.inactive')}
                    </button>
                  </td>
                  <td>
                    <button className={styles.linkBtn} onClick={() => openEdit(pkg)}>
                      {t('common.edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {editing ? t('packagesAdmin.edit') : t('packagesAdmin.create')}
            </h2>

            <div className={styles.form}>
              <label>{t('packagesAdmin.name')}
                <input value={form.name} onChange={(e) => setField('name', e.target.value)} maxLength={100} />
              </label>
              <label>{t('packagesAdmin.description')}
                <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={3} />
              </label>
              <div className={styles.row}>
                <label>{t('packagesAdmin.price')}
                  <input type="number" min={0} value={form.price_monthly} onChange={(e) => setField('price_monthly', Number(e.target.value))} />
                </label>
                <label>{t('packagesAdmin.slots')}
                  <input type="number" min={1} value={form.max_slots} onChange={(e) => setField('max_slots', Number(e.target.value))} />
                </label>
                <label>{t('packagesAdmin.duration')}
                  <input type="number" min={1} value={form.max_duration_days} onChange={(e) => setField('max_duration_days', Number(e.target.value))} />
                </label>
              </div>
              <div className={styles.checks}>
                <label><input type="checkbox" checked={form.supports_video} onChange={(e) => setField('supports_video', e.target.checked)} /> Video</label>
                <label><input type="checkbox" checked={form.supports_carousel} onChange={(e) => setField('supports_carousel', e.target.checked)} /> Carousel</label>
                <label><input type="checkbox" checked={form.has_advanced_analytics} onChange={(e) => setField('has_advanced_analytics', e.target.checked)} /> Analytics+</label>
                <label><input type="checkbox" checked={form.is_active} onChange={(e) => setField('is_active', e.target.checked)} /> {t('packagesAdmin.active')}</label>
              </div>
              <label>{t('packagesAdmin.sortOrder')}
                <input type="number" value={form.sort_order} onChange={(e) => setField('sort_order', Number(e.target.value))} />
              </label>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setOpen(false)}>{t('common.cancel')}</button>
              <button className={styles.primaryBtn} disabled={saving || !form.name.trim()} onClick={handleSave}>
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
