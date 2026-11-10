'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { swrFetcher } from '../../../api/swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { createAdminPackage, updateAdminPackage } from '../../../api/admin'
import Modal from '../../../components/Modal'
import MoneyInput from '../../../components/forms/MoneyInput'
import { formatVnd } from '../../../lib/ads-estimate'
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

function formatPrice(value: number): string {
  return formatVnd(value)
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
  const [priceText, setPriceText] = useState('0')
  const [serverError, setServerError] = useState('')

  const errors = {
    name: !form.name.trim()
      ? t('packagesAdmin.errName')
      : form.name.trim().length > 100
        ? t('packagesAdmin.errNameLong')
        : '',
    description:
      form.description.length > 500 ? t('packagesAdmin.errDescLong') : '',
    price:
      priceText === '' || !Number.isFinite(Number(priceText)) || Number(priceText) < 0
        ? t('packagesAdmin.errPrice')
        : '',
    slots:
      !Number.isFinite(form.max_slots) || form.max_slots < 1 || form.max_slots > 50
        ? t('packagesAdmin.errSlots')
        : '',
    duration:
      !Number.isFinite(form.max_duration_days) ||
      form.max_duration_days < 1 ||
      form.max_duration_days > 365
        ? t('packagesAdmin.errDuration')
        : '',
    sort:
      !Number.isFinite(form.sort_order) || form.sort_order < 0
        ? t('packagesAdmin.errSort')
        : '',
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setPriceText('0')
    setServerError('')
    setOpen(true)
  }

  const openEdit = (pkg: AdPackage) => {
    setEditing(pkg)
    setForm(toInput(pkg))
    setPriceText(String(pkg.price_monthly))
    setServerError('')
    setOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setOpen(false)
    setServerError('')
  }

  const setField = <K extends keyof PackageInput>(key: K, value: PackageInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setServerError('')
  }

  const handleSave = async () => {
    if (hasErrors || saving) return
    setSaving(true)
    setServerError('')
    const payload: PackageInput = { ...form, price_monthly: Number(priceText) || 0 }
    try {
      if (editing) {
        await updateAdminPackage(editing.id, payload)
        toast({ title: t('packagesAdmin.updated'), type: 'success' })
      } else {
        await createAdminPackage(payload)
        toast({ title: t('packagesAdmin.created'), type: 'success' })
      }
      setOpen(false)
      await mutate()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t('packagesAdmin.errServer'))
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('packagesAdmin.title')}</h1>
          <p className={styles.subtitle}>{t('packagesAdmin.subtitle')}</p>
        </div>
        <button type="button" className={styles.primaryBtn} onClick={openCreate}>
          <i className="bx bx-plus" aria-hidden="true" />
          {t('packagesAdmin.create')}
        </button>
      </div>

      {isLoading ? (
        <div className={styles.tableWrap} aria-hidden="true">
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('packagesAdmin.name')}</th>
                <th scope="col" className={styles.num}>{t('packagesAdmin.price')}</th>
                <th scope="col" className={styles.num}>{t('packagesAdmin.slots')}</th>
                <th scope="col" className={styles.num}>{t('packagesAdmin.duration')}</th>
                <th scope="col">{t('packagesAdmin.features')}</th>
                <th scope="col" className={styles.center}>{t('packagesAdmin.status')}</th>
                <th scope="col" className={styles.center}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    {t('packagesAdmin.noPackages')}
                  </td>
                </tr>
              ) : (
                data?.map((pkg) => (
                  <tr key={pkg.id}>
                    <td className={styles.nameCell}>{pkg.name}</td>
                    <td className={styles.num}>{formatPrice(pkg.price_monthly)}</td>
                    <td className={styles.num}>{pkg.max_slots}</td>
                    <td className={styles.num}>
                      {t('packagesAdmin.days', { n: String(pkg.max_duration_days) })}
                    </td>
                    <td className={styles.featuresCell}>
                      <div className={styles.featureTags}>
                        {pkg.supports_video && <span className={styles.tag}>Video</span>}
                        {pkg.supports_carousel && <span className={styles.tag}>Carousel</span>}
                        {pkg.has_advanced_analytics && (
                          <span className={styles.tag}>Analytics+</span>
                        )}
                        {!pkg.supports_video &&
                          !pkg.supports_carousel &&
                          !pkg.has_advanced_analytics && <span className={styles.none}>—</span>}
                      </div>
                    </td>
                    <td className={styles.center}>
                      <button
                        type="button"
                        className={`${styles.badge} ${pkg.is_active ? styles.badgeOn : styles.badgeOff}`}
                        onClick={() => toggleActive(pkg)}
                      >
                        {pkg.is_active ? t('packagesAdmin.active') : t('packagesAdmin.inactive')}
                      </button>
                    </td>
                    <td className={styles.center}>
                      <button type="button" className={styles.linkBtn} onClick={() => openEdit(pkg)}>
                        {t('common.edit')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={closeModal}
        title={editing ? t('packagesAdmin.edit') : t('packagesAdmin.create')}
        size="lg"
        footer={
          <>
            <button type="button" className={styles.cancelBtn} onClick={closeModal} disabled={saving}>
              {t('packagesAdmin.cancel')}
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleSave}
              disabled={saving || hasErrors}
            >
              {saving ? t('packagesAdmin.saving') : t('packagesAdmin.save')}
            </button>
          </>
        }
      >
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            void handleSave()
          }}
        >
          {serverError && (
            <p className={styles.formAlert} role="alert">
              {serverError}
            </p>
          )}

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>{t('packagesAdmin.sectionBasic')}</legend>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="pkg-name">
                {t('packagesAdmin.name')} <span className={styles.required}>*</span>
              </label>
              <input
                id="pkg-name"
                className={styles.input}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                maxLength={100}
                autoFocus
                aria-invalid={!!errors.name}
                aria-describedby="pkg-name-hint"
              />
              <div className={styles.hintRow}>
                <span id="pkg-name-hint" className={styles.hint}>
                  {t('packagesAdmin.hintName')}
                </span>
                <span className={styles.counter}>
                  {t('packagesAdmin.charCount', { n: String(form.name.length), max: '100' })}
                </span>
              </div>
              {errors.name && <p className={styles.error} role="alert">{errors.name}</p>}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="pkg-description">
                {t('packagesAdmin.description')}
              </label>
              <textarea
                id="pkg-description"
                className={styles.textarea}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                maxLength={500}
                rows={4}
                aria-describedby="pkg-description-hint"
              />
              <div className={styles.hintRow}>
                <span id="pkg-description-hint" className={styles.hint}>
                  {t('packagesAdmin.hintDescription')}
                </span>
                <span className={styles.counter}>
                  {t('packagesAdmin.charCount', { n: String(form.description.length), max: '500' })}
                </span>
              </div>
              {errors.description && (
                <p className={styles.error} role="alert">{errors.description}</p>
              )}
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>{t('packagesAdmin.sectionLimits')}</legend>

            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="pkg-price">
                  {t('packagesAdmin.price')}
                </label>
                <MoneyInput
                  id="pkg-price"
                  className={styles.input}
                  value={priceText}
                  onValueChange={setPriceText}
                  suffix="VND"
                  describedBy="pkg-price-hint"
                  error={errors.price}
                />
                <span id="pkg-price-hint" className={styles.hint}>
                  {t('packagesAdmin.hintPrice')}
                </span>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="pkg-duration">
                  {t('packagesAdmin.duration')}
                </label>
                <div className={styles.inputWithUnit}>
                  <input
                    id="pkg-duration"
                    className={styles.input}
                    type="number"
                    min={1}
                    max={365}
                    value={form.max_duration_days}
                    onChange={(e) => setField('max_duration_days', Number(e.target.value))}
                    aria-invalid={!!errors.duration}
                    aria-describedby="pkg-duration-hint"
                  />
                  <span className={styles.unit}>{t('packagesAdmin.dayUnit')}</span>
                </div>
                <span id="pkg-duration-hint" className={styles.hint}>
                  {t('packagesAdmin.hintDuration')}
                </span>
                {errors.duration && (
                  <p className={styles.error} role="alert">{errors.duration}</p>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="pkg-slots">
                  {t('packagesAdmin.slots')}
                </label>
                <input
                  id="pkg-slots"
                  className={styles.input}
                  type="number"
                  min={1}
                  max={50}
                  value={form.max_slots}
                  onChange={(e) => setField('max_slots', Number(e.target.value))}
                  aria-invalid={!!errors.slots}
                  aria-describedby="pkg-slots-hint"
                />
                <span id="pkg-slots-hint" className={styles.hint}>
                  {t('packagesAdmin.hintSlots')}
                </span>
                {errors.slots && <p className={styles.error} role="alert">{errors.slots}</p>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="pkg-sort">
                  {t('packagesAdmin.sortOrder')}
                </label>
                <input
                  id="pkg-sort"
                  className={styles.input}
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) => setField('sort_order', Number(e.target.value))}
                  aria-invalid={!!errors.sort}
                  aria-describedby="pkg-sort-hint"
                />
                <span id="pkg-sort-hint" className={styles.hint}>
                  {t('packagesAdmin.hintSort')}
                </span>
                {errors.sort && <p className={styles.error} role="alert">{errors.sort}</p>}
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>{t('packagesAdmin.sectionFeatures')}</legend>

            <div className={styles.featureCards}>
              <label className={styles.featureCard}>
                <input
                  type="checkbox"
                  checked={form.supports_video}
                  onChange={(e) => setField('supports_video', e.target.checked)}
                />
                <span className={styles.featureText}>
                  <strong>Video</strong>
                  <small>{t('packagesAdmin.featureVideoHint')}</small>
                </span>
              </label>

              <label className={styles.featureCard}>
                <input
                  type="checkbox"
                  checked={form.supports_carousel}
                  onChange={(e) => setField('supports_carousel', e.target.checked)}
                />
                <span className={styles.featureText}>
                  <strong>Carousel</strong>
                  <small>{t('packagesAdmin.featureCarouselHint')}</small>
                </span>
              </label>

              <label className={styles.featureCard}>
                <input
                  type="checkbox"
                  checked={form.has_advanced_analytics}
                  onChange={(e) => setField('has_advanced_analytics', e.target.checked)}
                />
                <span className={styles.featureText}>
                  <strong>Analytics+</strong>
                  <small>{t('packagesAdmin.featureAnalyticsHint')}</small>
                </span>
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>{t('packagesAdmin.sectionStatus')}</legend>
            <label className={styles.featureCard}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setField('is_active', e.target.checked)}
              />
              <span className={styles.featureText}>
                <strong>{t('packagesAdmin.active')}</strong>
                <small>
                  {form.is_active ? t('packagesAdmin.active') : t('packagesAdmin.inactive')}
                </small>
              </span>
            </label>
          </fieldset>
        </form>
      </Modal>
    </div>
  )
}
