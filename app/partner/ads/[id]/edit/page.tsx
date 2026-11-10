'use client'

import React, { useMemo, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import useSWR from 'swr'
import { useTranslation } from '../../../../../hooks/useTranslation'
import { useToast } from '../../../../../contexts/ToastContext'
import { getMyAds, replaceAdMedia, submitAdForReview, updateAd } from '../../../../../api/partner'
import { getWallet } from '../../../../../api/wallet'
import { formatVnd } from '../../../../../lib/ads-estimate'
import ProvinceMultiSelect from '../../../../../components/ads/ProvinceMultiSelect'
import AdCard from '../../../../../components/ads/AdCard'
import { toDateTimeLocal } from '../../../../../lib/ad-datetime'
import {
  AD_MEDIA_LIMITS,
  checkAdMediaFiles,
  formatFileSize,
  isCompatibleMedia,
  mediaIssueKey,
  mediaKindOf,
  probeVideoDuration,
  type AdMediaCheck,
} from '../../../../../lib/ad-media'
import type { PartnerAdListItem, PartnerAdListResponse, WalletResponse } from '../../../../../types'
import styles from '../../../../../components/AdForm.module.css'

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
  const [targetProvinces, setTargetProvinces] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  interface EditMediaItem {
    id: number
    file: File
    preview: string
    durationSeconds: number | null
    probing: boolean
  }
  const [existingMedia, setExistingMedia] = useState<{ url: string; media_type?: string }[]>([])
  const [newMedia, setNewMedia] = useState<EditMediaItem[]>([])
  const mediaIdRef = useRef(0)
  const newMediaRef = useRef<EditMediaItem[]>([])

  const { data: wallet } = useSWR<WalletResponse>('/wallet', () => getWallet(), {
    shouldRetryOnError: false,
  })

  const maxNewMedia = ad?.format === 'carousel' ? AD_MEDIA_LIMITS.carouselMaxFiles : 1
  const canAddMedia = newMedia.length < maxNewMedia
  const mediaCheck: AdMediaCheck = useMemo(
    () =>
      checkAdMediaFiles(
        newMedia.map((item) => ({
          name: item.file.name,
          size: item.file.size,
          type: item.file.type,
          durationSeconds: item.durationSeconds,
        })),
        ad?.format ?? 'image',
      ),
    [newMedia, ad?.format],
  )

  useEffect(() => {
    newMediaRef.current = newMedia
  }, [newMedia])

  useEffect(() => {
    return () => {
      newMediaRef.current.forEach((item) => URL.revokeObjectURL(item.preview))
    }
  }, [])

  useEffect(() => {
    const loadAd = async () => {
      try {
        const res: PartnerAdListResponse = await getMyAds({ page: 1, page_size: 100 })
        const found = res.data.find((a) => a.id === adId)
        if (found) {
          setAd(found)
          setTitle(found.title)
          setContent(found.content ?? '')
          setTargetUrl(found.target_url ?? '')
          setBudget(String(found.budget))
          setDailyBudget(found.daily_budget ? String(found.daily_budget) : '')
          setCpmPrice(found.cpm_price ? String(found.cpm_price) : '')
          setCpcPrice(found.cpc_price ? String(found.cpc_price) : '')
          setMaxImpressions(found.max_impressions ? String(found.max_impressions) : '')
          setStartedAt(toDateTimeLocal(found.started_at))
          setExpiresAt(toDateTimeLocal(found.expires_at))
          setTargetGender(found.target_gender || 'all')
          setTargetAgeMin(String(found.target_age_min ?? 0))
          setTargetAgeMax(String(found.target_age_max ?? 100))
          // Dữ liệu cũ có thể lưu tên tỉnh thay vì ID — chỉ giữ ID hợp lệ,
          // phần tên được xử lý bằng script backfill (server chỉ nhận ID).
          setTargetProvinces((found.target_locations ?? []).filter((loc) => /^\d+$/.test(loc)))
          setExistingMedia(
            found.media_list && found.media_list.length > 0
              ? found.media_list
              : found.media_uri
                ? [{ url: found.media_uri, media_type: 'image' }]
                : [],
          )
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

  if (ad.status !== 'active' && ad.status !== 'paused' && ad.status !== 'pending' && ad.status !== 'rejected') {
    return (
      <div className={styles.page}>
        <p style={{ color: 'var(--color-danger)' }}>
          {t('partner.ads.suspendedReason')}: {ad.suspended_reason || ad.rejection_reason || ad.status}
        </p>
      </div>
    )
  }

  const probeVideoItems = (items: EditMediaItem[]) => {
    for (const item of items) {
      if (!item.probing) continue
      void probeVideoDuration(item.file).then((duration) => {
        setNewMedia((prev) =>
          prev.map((current) =>
            current.id === item.id
              ? { ...current, durationSeconds: duration, probing: false }
              : current,
          ),
        )
      })
    }
  }

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? [])
    e.target.value = ''
    const compatible = incoming.filter((file) => isCompatibleMedia(file, ad.format))
    if (compatible.length === 0) return

    // Chọn media mới = thay thế toàn bộ; ảnh/video chỉ giữ 1, carousel tối đa 6.
    const base = ad.format === 'carousel' ? [...newMedia] : []
    if (ad.format !== 'carousel') {
      newMedia.forEach((item) => URL.revokeObjectURL(item.preview))
    }
    const next = [...base]
    for (const file of compatible) {
      if (next.length >= maxNewMedia) break
      next.push({
        id: ++mediaIdRef.current,
        file,
        preview: URL.createObjectURL(file),
        durationSeconds: null,
        probing: mediaKindOf(file) === 'video',
      })
    }
    setNewMedia(next)
    probeVideoItems(next)
  }

  const removeNewMedia = (id: number) => {
    setNewMedia((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.preview)
      return prev.filter((item) => item.id !== id)
    })
  }

  const moveNewMedia = (id: number, direction: -1 | 1) => {
    setNewMedia((prev) => {
      const index = prev.findIndex((item) => item.id === id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  const clearNewMedia = () => {
    newMedia.forEach((item) => URL.revokeObjectURL(item.preview))
    setNewMedia([])
  }

  const saveAd = async (resubmit: boolean) => {
    if (!title || !budget) {
      toast({ title: t('common.error'), type: 'error' })
      return
    }
    if (mediaCheck.errors.length > 0) {
      toast({ title: t('partner.form.preflightBlocked'), type: 'error' })
      return
    }
    setSubmitting(true)
    try {
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
        target_locations: targetProvinces,
      })
      if (newMedia.length > 0) {
        await replaceAdMedia(adId, newMedia.map((item) => item.file))
      }
      if (resubmit) {
        await submitAdForReview(adId)
        toast({ title: t('partner.ads.submitSuccess'), type: 'success' })
      } else {
        toast({ title: t('partner.form.updateSuccess'), type: 'success' })
      }
      router.push('/partner/ads')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveAd(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('partner.ads.edit')}: {ad.title}</h1>
      </div>

      {ad.status === 'pending' && (
        <p style={{ marginBottom: 'var(--space-md)', color: 'var(--color-warning)' }}>
          {t('partner.ads.pendingHint')}
        </p>
      )}
      {ad.status === 'rejected' && (
        <p style={{ marginBottom: 'var(--space-md)', color: 'var(--color-danger)' }}>
          {t('partner.ads.rejectionReason')}: {ad.rejection_reason || '—'}.{' '}
          {t('partner.ads.rejectedHint')}
        </p>
      )}

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
            {wallet && (
              <p className={styles.hint}>
                {t('partner.form.walletAvailable', { amount: formatVnd(wallet.available) })}
                {wallet.reserved > 0 && (
                  <> · {t('partner.form.walletReserved', { amount: formatVnd(wallet.reserved) })}</>
                )}
                {' · '}
                <Link href="/wallet">{t('partner.form.walletTopupCta')}</Link>
              </p>
            )}
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
          <ProvinceMultiSelect value={targetProvinces} onChange={setTargetProvinces} />
        </div>

        <div className={styles.section}>
          <label className={styles.label}>{t('partner.form.mediaSectionTitle')}</label>

          {newMedia.length === 0 && existingMedia.length > 0 && (
            <>
              <div className={styles.mediaGrid}>
                {existingMedia.map((media, index) => (
                  <div key={`${media.url}-${index}`} className={styles.mediaItem}>
                    {media.media_type === 'video' ? (
                      <video src={media.url} className={styles.mediaThumb} controls />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={media.url} alt="" className={styles.mediaThumb} />
                    )}
                  </div>
                ))}
              </div>
              <p className={styles.hint}>{t('partner.form.mediaExistingHint')}</p>
            </>
          )}

          {newMedia.length === 0 && existingMedia.length === 0 && (
            <p className={styles.hint}>{t('partner.form.mediaNone')}</p>
          )}

          {newMedia.length > 0 && (
            <>
              <div className={styles.mediaGrid}>
                {newMedia.map((item, index) => (
                  <div key={item.id} className={styles.mediaItem}>
                    {mediaKindOf(item.file) === 'video' ? (
                      <video src={item.preview} className={styles.mediaThumb} controls />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.preview} alt={item.file.name} className={styles.mediaThumb} />
                    )}
                    {index === 0 && ad.format === 'carousel' && (
                      <span className={styles.coverBadge}>{t('partner.form.mediaCover')}</span>
                    )}
                    <div className={styles.mediaActions}>
                      <button
                        type="button"
                        className={styles.mediaBtn}
                        aria-label={t('partner.form.mediaMoveLeft')}
                        disabled={index === 0}
                        onClick={() => moveNewMedia(item.id, -1)}
                      >
                        <i className="bx bx-left-arrow-alt" />
                      </button>
                      <button
                        type="button"
                        className={styles.mediaBtn}
                        aria-label={t('partner.form.mediaMoveRight')}
                        disabled={index === newMedia.length - 1}
                        onClick={() => moveNewMedia(item.id, 1)}
                      >
                        <i className="bx bx-right-arrow-alt" />
                      </button>
                      <button
                        type="button"
                        className={styles.mediaBtnDanger}
                        aria-label={t('partner.form.mediaRemove')}
                        onClick={() => removeNewMedia(item.id)}
                      >
                        <i className="bx bx-x" />
                      </button>
                    </div>
                    <span className={styles.mediaSize}>
                      {item.probing ? t('partner.form.mediaProbing') : formatFileSize(item.file.size)}
                    </span>
                  </div>
                ))}
              </div>
              <button type="button" className={styles.mediaClearAll} onClick={clearNewMedia}>
                {t('partner.form.mediaClearAll')}
              </button>
            </>
          )}

          <div className={styles.uploadArea}>
            {canAddMedia && (
              <label className={styles.uploadLabel}>
                <i className="bx bx-cloud-upload" />
                <span>{t('partner.form.mediaChooseNew')}</span>
                <input
                  type="file"
                  accept={
                    ad.format === 'video'
                      ? 'video/*'
                      : ad.format === 'carousel'
                        ? 'image/*'
                        : 'image/*,video/*'
                  }
                  multiple={ad.format === 'carousel'}
                  className={styles.fileInput}
                  onChange={handleMediaChange}
                />
              </label>
            )}
          </div>

          <p className={styles.hint}>{t('partner.form.mediaReplaceHint')}</p>
          {mediaCheck.errors.map((issue, index) => (
            <p key={`media-error-${index}`} className={styles.mediaError}>
              <i className="bx bx-error-circle" aria-hidden="true" />{' '}
              {t(mediaIssueKey(issue.code), issue.params)}
            </p>
          ))}
          {mediaCheck.warnings.map((issue, index) => (
            <p key={`media-warning-${index}`} className={styles.softWarn}>
              <i className="bx bx-info-circle" aria-hidden="true" />{' '}
              {t(mediaIssueKey(issue.code), issue.params)}
            </p>
          ))}

          {newMedia.length > 0 && (
            <div className={styles.mediaPreviewCard}>
              <AdCard
                preview
                ad={{
                  id: 'preview',
                  title: title || t('partner.form.previewTitlePlaceholder'),
                  content: content || t('partner.form.previewContentPlaceholder'),
                  target_url: targetUrl || 'https://linkup.vn',
                  format: ad.format,
                  media_list: newMedia.map((item) => ({
                    url: item.preview,
                    media_type: mediaKindOf(item.file) === 'video' ? 'video' : 'image',
                  })),
                }}
              />
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btnCancel} onClick={() => router.back()}>
            {t('partner.form.cancel')}
          </button>
          <button type="submit" className={styles.btnSubmit} disabled={submitting}>
            {submitting ? t('common.loading') : t('partner.form.save')}
          </button>
          {ad.status === 'rejected' && (
            <button
              type="button"
              className={styles.btnSubmit}
              disabled={submitting}
              onClick={() => { void saveAd(true) }}
            >
              {t('partner.ads.saveAndSubmit')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
