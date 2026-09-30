'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '../../../../hooks/useTranslation'
import { useToast } from '../../../../contexts/ToastContext'
import { createAd } from '../../../../api/partner'
import styles from '../AdForm.module.css'

export default function NewAdPage() {
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
    setMediaFile(file)
    const url = URL.createObjectURL(file)
    setMediaPreview(url)
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
      toast({ title: t('partner.form.createSuccess'), type: 'success' })
      router.push('/partner/ads')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('partner.ads.create')}</h1>
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
                <button type="button" className={styles.removeBtn} onClick={() => { setMediaFile(null); setMediaPreview(null) }}>
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
          <label className={styles.label}>{t('partner.form.format')}</label>
          <select className={styles.select} value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="carousel">Carousel</option>
          </select>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>{t('partner.form.title')} <span className={styles.required}>*</span></label>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        </div>

        <div className={styles.section}>
          <label className={styles.label}>{t('partner.form.content')} <span className={styles.required}>*</span></label>
          <textarea className={styles.textarea} value={content} onChange={(e) => setContent(e.target.value)} maxLength={2000} rows={4} />
        </div>

        <div className={styles.section}>
          <label className={styles.label}>{t('partner.form.targetUrl')} <span className={styles.required}>*</span></label>
          <input className={styles.input} type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://" />
        </div>

        <div className={styles.row}>
          <div className={styles.section}>
            <label className={styles.label}>{t('partner.form.budget')} <span className={styles.required}>*</span></label>
            <input className={styles.input} type="number" value={budget} onChange={(e) => setBudget(e.target.value)} min="0" />
          </div>
          <div className={styles.section}>
            <label className={styles.label}>{t('partner.form.dailyBudget')}</label>
            <input className={styles.input} type="number" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} min="0" />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.section}>
            <label className={styles.label}>{t('partner.form.maxImpressions')}</label>
            <input className={styles.input} type="number" value={maxImpressions} onChange={(e) => setMaxImpressions(e.target.value)} min="0" />
          </div>
          <div className={styles.section}>
            <label className={styles.label}>{t('partner.form.cpmPrice')}</label>
            <input className={styles.input} type="number" value={cpmPrice} onChange={(e) => setCpmPrice(e.target.value)} min="0" />
          </div>
          <div className={styles.section}>
            <label className={styles.label}>{t('partner.form.cpcPrice')}</label>
            <input className={styles.input} type="number" value={cpcPrice} onChange={(e) => setCpcPrice(e.target.value)} min="0" />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.section}>
            <label className={styles.label}>{t('partner.form.startDate')}</label>
            <input className={styles.input} type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
          </div>
          <div className={styles.section}>
            <label className={styles.label}>{t('partner.form.endDate')}</label>
            <input className={styles.input} type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>{t('partner.form.targetGender')}</label>
          <div className={styles.radioGroup}>
            {['all', 'male', 'female'].map((g) => (
              <label key={g} className={styles.radioLabel}>
                <input type="radio" name="gender" value={g} checked={targetGender === g} onChange={() => setTargetGender(g)} />
                <span>{g === 'all' ? 'Tất cả' : g === 'male' ? 'Nam' : 'Nữ'}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.section}>
            <label className={styles.label}>{t('partner.form.ageMin')}</label>
            <input className={styles.input} type="number" value={targetAgeMin} onChange={(e) => setTargetAgeMin(e.target.value)} min="0" max="100" />
          </div>
          <div className={styles.section}>
            <label className={styles.label}>{t('partner.form.ageMax')}</label>
            <input className={styles.input} type="number" value={targetAgeMax} onChange={(e) => setTargetAgeMax(e.target.value)} min="0" max="100" />
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>{t('partner.form.targetLocations')}</label>
          <input className={styles.input} value={targetLocations} onChange={(e) => setTargetLocations(e.target.value)} placeholder="Hà Nội, TP.HCM, Đà Nẵng" />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btnCancel} onClick={() => router.back()}>
            {t('partner.form.cancel')}
          </button>
          <button type="submit" className={styles.btnSubmit} disabled={submitting}>
            {submitting ? t('common.loading') : t('partner.ads.create')}
          </button>
        </div>
      </form>
    </div>
  )
}
