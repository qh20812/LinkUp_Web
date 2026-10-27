'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from '../contexts/ToastContext'
import { createAd } from '../api/partner'
import { invalidate } from '../api/swr'
import styles from './AdForm.module.css'

export interface AdFormProps {
  /** Tiêu đề trang (đã dịch). */
  heading: string
  /** Nhãn nút submit (đã dịch). */
  submitLabel: string
  /** Đích điều hướng sau khi tạo thành công. */
  redirectTo: string
  /** Thông báo thành công; mặc định dùng key partner.form.createSuccess. */
  successMessage?: string
}

/**
 * Form tạo quảng cáo dùng chung cho cả `/partner/ads/new` và `/admin/ads/new`.
 * Toàn bộ state nằm trong component để hai route chỉ còn phần tiêu đề/điều
 * hướng khác nhau.
 */
export default function AdForm({ heading, submitLabel, redirectTo, successMessage }: AdFormProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [format, setFormat] = useState('image')
  const [budget, setBudget] = useState('')
  const [dailyBudget, setDailyBudget] = useState('')
  const [cpmPrice, setCpmPrice] = useState('')
  const [cpcPrice, setCpcPrice] = useState('')
  const [maxImpressions, setMaxImpressions] = useState('')
  const [startedAt, setStartedAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [targetGender, setTargetGender] = useState('all')
  const [targetAgeMin, setTargetAgeMin] = useState('18')
  const [targetAgeMax, setTargetAgeMax] = useState('65')
  const [targetLocations, setTargetLocations] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
  }

  const clearMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(null)
    setMediaPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !content || !targetUrl || !budget) {
      toast({ title: t('common.error'), type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const locations = targetLocations.split(',').map((s) => s.trim()).filter(Boolean)
      await createAd({
        title,
        content,
        format,
        target_url: targetUrl,
        budget: Number(budget),
        daily_budget: Number(dailyBudget) || 0,
        cpm_price: Number(cpmPrice) || 0,
        cpc_price: Number(cpcPrice) || 0,
        max_impressions: Number(maxImpressions) || 0,
        started_at: startedAt || undefined,
        expires_at: expiresAt || undefined,
        target_gender: targetGender,
        target_age_min: Number(targetAgeMin) || 0,
        target_age_max: Number(targetAgeMax) || 100,
        target_locations: locations.length > 0 ? locations : undefined,
      }, mediaFile ?? undefined)
      toast({ title: successMessage ?? t('partner.form.createSuccess'), type: 'success' })
      invalidate('/ads-management')
      invalidate('/admin/ads')
      router.push(redirectTo)
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{heading}</h1>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.section}>
          <label className={styles.label}>{t('partner.form.uploadMedia')}</label>
          <div className={styles.uploadArea}>
            {mediaPreview ? (
              <div className={styles.preview}>
                {mediaFile?.type.startsWith('video') ? (
                  <video src={mediaPreview} controls className={styles.previewVideo} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaPreview} alt="Preview" className={styles.previewImg} />
                )}
                <button type="button" className={styles.removeBtn} onClick={clearMedia}>
                  <i className="bx bx-x" />
                </button>
              </div>
            ) : (
              <label className={styles.uploadLabel}>
                <i className="bx bx-cloud-upload" />
                <span>{t('partner.form.uploadMedia')}</span>
                <input type="file" accept="image/*,video/*" className={styles.fileInput} onChange={handleFileChange} />
              </label>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label} htmlFor="ad-format">{t('partner.form.format')}</label>
          <select id="ad-format" className={styles.select} value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="image">{t('partner.form.formatImage')}</option>
            <option value="video">{t('partner.form.formatVideo')}</option>
            <option value="carousel">{t('partner.form.formatCarousel')}</option>
          </select>
        </div>

        <div className={styles.section}>
          <label className={styles.label} htmlFor="ad-title">{t('partner.form.title')} <span className={styles.required}>*</span></label>
          <input id="ad-title" className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        </div>

        <div className={styles.section}>
          <label className={styles.label} htmlFor="ad-content">{t('partner.form.content')} <span className={styles.required}>*</span></label>
          <textarea id="ad-content" className={styles.textarea} value={content} onChange={(e) => setContent(e.target.value)} maxLength={2000} rows={4} />
        </div>

        <div className={styles.section}>
          <label className={styles.label} htmlFor="ad-target-url">{t('partner.form.targetUrl')} <span className={styles.required}>*</span></label>
          <input id="ad-target-url" className={styles.input} type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://" />
        </div>

        <div className={styles.row}>
          <div className={styles.section}>
            <label className={styles.label} htmlFor="ad-budget">{t('partner.form.budget')} <span className={styles.required}>*</span></label>
            <input id="ad-budget" className={styles.input} type="number" value={budget} onChange={(e) => setBudget(e.target.value)} min="0" />
          </div>
          <div className={styles.section}>
            <label className={styles.label} htmlFor="ad-daily-budget">{t('partner.form.dailyBudget')}</label>
            <input id="ad-daily-budget" className={styles.input} type="number" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} min="0" />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.section}>
            <label className={styles.label} htmlFor="ad-max-impressions">{t('partner.form.maxImpressions')}</label>
            <input id="ad-max-impressions" className={styles.input} type="number" value={maxImpressions} onChange={(e) => setMaxImpressions(e.target.value)} min="0" />
          </div>
          <div className={styles.section}>
            <label className={styles.label} htmlFor="ad-cpm-price">{t('partner.form.cpmPrice')}</label>
            <input id="ad-cpm-price" className={styles.input} type="number" value={cpmPrice} onChange={(e) => setCpmPrice(e.target.value)} min="0" />
          </div>
          <div className={styles.section}>
            <label className={styles.label} htmlFor="ad-cpc-price">{t('partner.form.cpcPrice')}</label>
            <input id="ad-cpc-price" className={styles.input} type="number" value={cpcPrice} onChange={(e) => setCpcPrice(e.target.value)} min="0" />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.section}>
            <label className={styles.label} htmlFor="ad-started-at">{t('partner.form.startDate')}</label>
            <input id="ad-started-at" className={styles.input} type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
          </div>
          <div className={styles.section}>
            <label className={styles.label} htmlFor="ad-expires-at">{t('partner.form.endDate')}</label>
            <input id="ad-expires-at" className={styles.input} type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>{t('partner.form.targetGender')}</label>
          <div className={styles.radioGroup}>
            {['all', 'male', 'female'].map((g) => (
              <label key={g} className={styles.radioLabel}>
                <input type="radio" name="gender" value={g} checked={targetGender === g} onChange={() => setTargetGender(g)} />
                <span>
                  {g === 'all'
                    ? t('partner.form.genderAll')
                    : g === 'male'
                      ? t('partner.form.genderMale')
                      : t('partner.form.genderFemale')}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.section}>
            <label className={styles.label} htmlFor="ad-age-min">{t('partner.form.ageMin')}</label>
            <input id="ad-age-min" className={styles.input} type="number" value={targetAgeMin} onChange={(e) => setTargetAgeMin(e.target.value)} min="0" max="100" />
          </div>
          <div className={styles.section}>
            <label className={styles.label} htmlFor="ad-age-max">{t('partner.form.ageMax')}</label>
            <input id="ad-age-max" className={styles.input} type="number" value={targetAgeMax} onChange={(e) => setTargetAgeMax(e.target.value)} min="0" max="100" />
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label} htmlFor="ad-target-locations">{t('partner.form.targetLocations')}</label>
          <input id="ad-target-locations" className={styles.input} value={targetLocations} onChange={(e) => setTargetLocations(e.target.value)} placeholder="Hà Nội, TP.HCM, Đà Nẵng" />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btnCancel} onClick={() => router.back()}>
            {t('partner.form.cancel')}
          </button>
          <button type="submit" className={styles.btnSubmit} disabled={submitting}>
            {submitting ? t('common.loading') : submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
