'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslation } from '../../../../../hooks/useTranslation'
import { useToast } from '../../../../../contexts/ToastContext'
import { getMyAds, updateAd } from '../../../../../api/partner'
import type { PartnerAdListItem, PartnerAdListResponse } from '../../../../../types'
import styles from '../../AdForm.module.css'

export default function EditAdPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const adId = params.id as string

  const [ad, setAd] = useState<PartnerAdListItem | null>(null)
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
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
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadAd = async () => {
      try {
        const res: PartnerAdListResponse = await getMyAds({ page: 1, page_size: 100 })
        const found = res.ads.find((a) => a.id === adId)
        if (found) {
          setAd(found)
          setTitle(found.title)
          setBudget(String(found.budget))
        }
      } catch {
        toast({ title: t('common.error'), type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    loadAd()
  }, [adId, t, toast])

  if (loading) {
    return <div className={styles.page}><p>{t('common.loading')}</p></div>
  }

  if (!ad) {
    return <div className={styles.page}><p>{t('common.error')}</p></div>
  }

  if (ad.status !== 'active' && ad.status !== 'paused') {
    return (
      <div className={styles.page}>
        <p style={{ color: 'var(--color-danger)' }}>{t('partner.ads.rejectionReason')}: {ad.rejection_reason || ad.status}</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !budget) {
      toast({ title: t('common.error'), type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const locations = targetLocations.split(',').map((s) => s.trim()).filter(Boolean)
      await updateAd(adId, {
        title,
        content,
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
      })
      toast({ title: t('partner.form.updateSuccess'), type: 'success' })
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
        <h1 className={styles.title}>{t('partner.ads.edit')}: {ad.title}</h1>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.section}>
          <label className={styles.label}>{t('partner.form.title')} <span className={styles.required}>*</span></label>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        </div>

        <div className={styles.section}>
          <label className={styles.label}>{t('partner.form.content')}</label>
          <textarea className={styles.textarea} value={content} onChange={(e) => setContent(e.target.value)} maxLength={2000} rows={4} />
        </div>

        <div className={styles.section}>
          <label className={styles.label}>{t('partner.form.targetUrl')}</label>
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
            {submitting ? t('common.loading') : t('partner.form.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
