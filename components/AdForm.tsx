'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from '../contexts/ToastContext'
import { createAd } from '../api/partner'
import { invalidate } from '../api/swr'
import { toDateTimeLocal } from '../lib/ad-datetime'
import ProvinceMultiSelect from './ads/ProvinceMultiSelect'
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

/** Ngày mặc định: bắt đầu hôm nay, kết thúc sau 30 ngày (người mới không cần tự tính). */
function defaultStartedAt(): string {
  return toDateTimeLocal(new Date().toISOString())
}

function defaultExpiresAt(): string {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return toDateTimeLocal(date.toISOString())
}

/**
 * Form tạo quảng cáo dùng chung cho cả `/partner/ads/new` và `/admin/ads/new`.
 * Chia 4 section + helper text để người lần đầu vẫn hiểu và điền được; các
 * trường kỹ thuật (CPM/CPC/ngân sách ngày/max impressions) nằm trong "Tùy chọn
 * nâng cao" với giá trị mặc định an toàn.
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
  const [dailyBudget, setDailyBudget] = useState('0')
  const [cpmPrice, setCpmPrice] = useState('25000')
  const [cpcPrice, setCpcPrice] = useState('1000')
  const [maxImpressions, setMaxImpressions] = useState('0')
  const [startedAt, setStartedAt] = useState(defaultStartedAt)
  const [expiresAt, setExpiresAt] = useState(defaultExpiresAt)
  const [targetGender, setTargetGender] = useState('all')
  const [targetAgeMin, setTargetAgeMin] = useState('0')
  const [targetAgeMax, setTargetAgeMax] = useState('100')
  const [targetProvinces, setTargetProvinces] = useState<string[]>([])
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
        target_locations: targetProvinces.length > 0 ? targetProvinces : undefined,
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
        {/* Người mới: nói ngay cần chuẩn bị gì và lấy ở đâu. */}
        <section className={styles.prepCard} aria-labelledby="ad-prep-title">
          <h2 id="ad-prep-title" className={styles.prepTitle}>
            {t('partner.form.prepTitle')}
          </h2>
          <ul className={styles.prepList}>
            <li>
              <i className="bx bx-image" aria-hidden="true" /> {t('partner.form.prepMedia')}
            </li>
            <li>
              <i className="bx bx-link" aria-hidden="true" /> {t('partner.form.prepLink')}
            </li>
            <li>
              <i className="bx bx-wallet" aria-hidden="true" /> {t('partner.form.prepBudget')}
            </li>
          </ul>
        </section>

        <section className={styles.formSection} aria-labelledby="ad-section-content">
          <h2 id="ad-section-content" className={styles.sectionTitle}>
            {t('partner.form.sectionContent')}
          </h2>

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
            <p className={styles.hint}>{t('partner.form.mediaHint')}</p>
          </div>

          <div className={styles.section}>
            <label className={styles.label} htmlFor="ad-format">{t('partner.form.format')}</label>
            <select
              id="ad-format"
              className={styles.select}
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              aria-describedby="ad-hint-format"
            >
              <option value="image">{t('partner.form.formatImage')}</option>
              <option value="video">{t('partner.form.formatVideo')}</option>
              <option value="carousel">{t('partner.form.formatCarousel')}</option>
            </select>
            <p id="ad-hint-format" className={styles.hint}>{t('partner.form.formatHint')}</p>
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
            <input
              id="ad-target-url"
              className={styles.input}
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://"
              aria-describedby="ad-hint-target-url"
            />
            <p id="ad-hint-target-url" className={styles.hint}>{t('partner.form.targetUrlHint')}</p>
          </div>
        </section>

        <section className={styles.formSection} aria-labelledby="ad-section-budget">
          <h2 id="ad-section-budget" className={styles.sectionTitle}>
            {t('partner.form.sectionBudget')}
          </h2>

          <div className={styles.section}>
            <label className={styles.label} htmlFor="ad-budget">{t('partner.form.budget')} <span className={styles.required}>*</span></label>
            <div className={styles.inputWithUnit}>
              <input
                id="ad-budget"
                className={styles.input}
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                min="0"
                aria-describedby="ad-hint-budget"
              />
              <span className={styles.unit}>VND</span>
            </div>
            <p id="ad-hint-budget" className={styles.hint}>{t('partner.form.budgetHint')}</p>
          </div>

          <details className={styles.advanced}>
            <summary className={styles.advancedSummary}>{t('partner.form.advanced')}</summary>
            <div className={styles.advancedBody}>
              <div className={styles.row}>
                <div className={styles.section}>
                  <label className={styles.label} htmlFor="ad-daily-budget">{t('partner.form.dailyBudget')}</label>
                  <div className={styles.inputWithUnit}>
                    <input
                      id="ad-daily-budget"
                      className={styles.input}
                      type="number"
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(e.target.value)}
                      min="0"
                      aria-describedby="ad-hint-daily-budget"
                    />
                    <span className={styles.unit}>VND</span>
                  </div>
                  <p id="ad-hint-daily-budget" className={styles.hint}>{t('partner.form.dailyBudgetHint')}</p>
                </div>
                <div className={styles.section}>
                  <label className={styles.label} htmlFor="ad-max-impressions">{t('partner.form.maxImpressions')}</label>
                  <input
                    id="ad-max-impressions"
                    className={styles.input}
                    type="number"
                    value={maxImpressions}
                    onChange={(e) => setMaxImpressions(e.target.value)}
                    min="0"
                    aria-describedby="ad-hint-max-impressions"
                  />
                  <p id="ad-hint-max-impressions" className={styles.hint}>{t('partner.form.maxImpressionsHint')}</p>
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.section}>
                  <label className={styles.label} htmlFor="ad-cpm-price">{t('partner.form.cpmPrice')}</label>
                  <div className={styles.inputWithUnit}>
                    <input
                      id="ad-cpm-price"
                      className={styles.input}
                      type="number"
                      value={cpmPrice}
                      onChange={(e) => setCpmPrice(e.target.value)}
                      min="0"
                      aria-describedby="ad-hint-cpm-price"
                    />
                    <span className={styles.unit}>VND</span>
                  </div>
                  <p id="ad-hint-cpm-price" className={styles.hint}>{t('partner.form.cpmHint')}</p>
                </div>
                <div className={styles.section}>
                  <label className={styles.label} htmlFor="ad-cpc-price">{t('partner.form.cpcPrice')}</label>
                  <div className={styles.inputWithUnit}>
                    <input
                      id="ad-cpc-price"
                      className={styles.input}
                      type="number"
                      value={cpcPrice}
                      onChange={(e) => setCpcPrice(e.target.value)}
                      min="0"
                      aria-describedby="ad-hint-cpc-price"
                    />
                    <span className={styles.unit}>VND</span>
                  </div>
                  <p id="ad-hint-cpc-price" className={styles.hint}>{t('partner.form.cpcHint')}</p>
                </div>
              </div>

              <p className={styles.hint}>{t('partner.form.freeHint')}</p>
            </div>
          </details>
        </section>

        <section className={styles.formSection} aria-labelledby="ad-section-schedule">
          <h2 id="ad-section-schedule" className={styles.sectionTitle}>
            {t('partner.form.sectionSchedule')}
          </h2>
          <div className={styles.row}>
            <div className={styles.section}>
              <label className={styles.label} htmlFor="ad-started-at">{t('partner.form.startDate')}</label>
              <input
                id="ad-started-at"
                className={styles.input}
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                aria-describedby="ad-hint-started-at"
              />
              <p id="ad-hint-started-at" className={styles.hint}>{t('partner.form.startedAtHint')}</p>
            </div>
            <div className={styles.section}>
              <label className={styles.label} htmlFor="ad-expires-at">{t('partner.form.endDate')}</label>
              <input
                id="ad-expires-at"
                className={styles.input}
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                aria-describedby="ad-hint-expires-at"
              />
              <p id="ad-hint-expires-at" className={styles.hint}>{t('partner.form.expiresAtHint')}</p>
            </div>
          </div>
        </section>

        <section className={styles.formSection} aria-labelledby="ad-section-targeting">
          <h2 id="ad-section-targeting" className={styles.sectionTitle}>
            {t('partner.form.sectionTargeting')}
          </h2>

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
              <input
                id="ad-age-min"
                className={styles.input}
                type="number"
                value={targetAgeMin}
                onChange={(e) => setTargetAgeMin(e.target.value)}
                min="0"
                max="100"
                aria-describedby="ad-hint-age"
              />
            </div>
            <div className={styles.section}>
              <label className={styles.label} htmlFor="ad-age-max">{t('partner.form.ageMax')}</label>
              <input
                id="ad-age-max"
                className={styles.input}
                type="number"
                value={targetAgeMax}
                onChange={(e) => setTargetAgeMax(e.target.value)}
                min="0"
                max="100"
                aria-describedby="ad-hint-age"
              />
            </div>
          </div>
          <p id="ad-hint-age" className={styles.hint}>{t('partner.form.ageHint')}</p>

          <div className={styles.section}>
            <label className={styles.label}>{t('partner.form.targetLocations')}</label>
            <ProvinceMultiSelect value={targetProvinces} onChange={setTargetProvinces} />
          </div>
        </section>

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
