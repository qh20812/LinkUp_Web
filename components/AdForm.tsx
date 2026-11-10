'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from '../contexts/ToastContext'
import { createAd } from '../api/partner'
import type { FeedAd } from '../api/partner'
import { getMySubscription } from '../api/package'
import { getWallet } from '../api/wallet'
import { ApiError } from '../api/api'
import { invalidate } from '../api/swr'
import { toDateTimeLocal } from '../lib/ad-datetime'
import { estimateAdReach, formatVnd } from '../lib/ads-estimate'
import {
  AD_MEDIA_LIMITS,
  checkAdMediaFiles,
  formatFileSize,
  isCompatibleMedia,
  mediaIssueKey,
  mediaKindOf,
  probeVideoDuration,
  type AdMediaCheck,
} from '../lib/ad-media'
import { buildAdPreflight } from '../lib/ad-preflight'
import { clearAdDraft, loadAdDraft, saveAdDraft, type AdDraft, type AdDraftData } from '../lib/ad-draft'
import type { SubscriptionResponse, WalletResponse } from '../types'
import AdCard from './ads/AdCard'
import AdTemplatePicker from './ads/AdTemplatePicker'
import FieldHelp from './ads/FieldHelp'
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
  /**
   * Partner phải có gói đang hoạt động mới tạo được ad. Admin tạo hộ thì
   * server bỏ qua kiểm tra gói (`platformAdmin`), nên trang admin truyền `false`
   * để không hiện chặn mua gói.
   */
  requireSubscription?: boolean
  /**
   * Chia form thành 4 bước cho người mới (`/partner/ads/new`). Trang edit và
   * trang admin giữ một trang để không phân kỳ logic.
   */
  wizard?: boolean
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

/** Field đầu tiên của mỗi bước wizard — dùng để đưa focus khi chuyển bước. */
const FOCUS_FIELD_BY_STEP = ['ad-title', 'ad-budget', 'ad-age-min', 'ad-review-title']

/** Lỗi gói/định dạng cần hiện tại chỗ trong form thay vì toast rồi biến mất. */
function isPackageError(code: string): boolean {
  return (
    code === 'ad.NO_SUBSCRIPTION' ||
    code === 'ad.SLOTS_EXHAUSTED' ||
    code.startsWith('ad.FORMAT_NOT_SUPPORTED')
  )
}

/** Lỗi ví: hiện tại chỗ kèm link nạp tiền thay vì toast. */
function isWalletError(code: string): boolean {
  return code === 'wallet.INSUFFICIENT_BALANCE' || code === 'wallet.NOT_CONFIGURED'
}

/**
 * Form tạo quảng cáo dùng chung cho cả `/partner/ads/new` và `/admin/ads/new`.
 * Chia 4 section + helper text để người lần đầu vẫn hiểu và điền được; các
 * trường kỹ thuật (CPM/CPC/ngân sách ngày/max impressions) nằm trong "Tùy chọn
 * nâng cao" với giá trị mặc định an toàn. Có preview card + ước tính lượt hiển
 * thị, và chặn form khi partner chưa có gói/đã hết slot.
 */
export default function AdForm({
  heading,
  submitLabel,
  redirectTo,
  successMessage,
  requireSubscription = true,
  wizard = false,
}: AdFormProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  /** Bước wizard: 0 Nội dung · 1 Ngân sách & lịch chạy · 2 Nhắm mục tiêu · 3 Xem lại. */
  const [step, setStep] = useState(0)
  /** Id ad vừa tạo — wizard hiện màn hình "đã gửi duyệt" thay vì redirect ngay. */
  const [submittedAdId, setSubmittedAdId] = useState<string | null>(null)
  const stepTouched = useRef(false)

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
  interface MediaItem {
    id: number
    file: File
    preview: string
    /** null = chưa đọc được duration (video đang kiểm tra hoặc lỗi). */
    durationSeconds: number | null
    probing: boolean
  }
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const mediaItemsRef = useRef<MediaItem[]>([])
  const mediaIdRef = useRef(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  /** Link đi kèm submitError: nâng cấp gói hay nạp ví. */
  const [submitErrorAction, setSubmitErrorAction] = useState<'packages' | 'wallet'>('packages')
  const [templateOpen, setTemplateOpen] = useState(false)
  /** Bản nháp tìm thấy khi mở form; chưa chọn Tiếp tục/Bắt đầu mới thì chưa render form. */
  const [draftPrompt, setDraftPrompt] = useState<AdDraft | null>(null)
  const [draftReady, setDraftReady] = useState(false)
  /** Đã tạo ad xong → không autosave lại thành nháp mới. */
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    const draft = loadAdDraft()
    /* eslint-disable react-hooks/set-state-in-effect */
    if (draft) {
      setDraftPrompt(draft)
    } else {
      setDraftReady(true)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // Cùng key với trang /partner/packages để dùng chung cache SWR.
  const {
    data: subscription,
    error: subscriptionError,
    isLoading: subscriptionLoading,
  } = useSWR<SubscriptionResponse>(
    requireSubscription ? '/ads-management/subscription' : null,
    () => getMySubscription(),
    { shouldRetryOnError: false },
  )

  const notSubscribed =
    subscriptionError instanceof ApiError &&
    (subscriptionError.code === 'package.NOT_SUBSCRIBED' || subscriptionError.status === 404)
  const subscriptionLoadFailed = !!subscriptionError && !notSubscribed
  const noSlotsLeft = !!subscription && subscription.slots_left <= 0

  // Ví trả trước: partner phải đủ số dư khả dụng cho ngân sách trước khi gửi.
  // Admin tạo hộ không bị trừ ví nên không cần gọi API này.
  const { data: wallet } = useSWR<WalletResponse>(
    requireSubscription ? '/wallet' : null,
    () => getWallet(),
    { shouldRetryOnError: false },
  )
  const walletAvailable = wallet?.available ?? null
  const budgetValue = Number(budget) || 0
  const budgetExceedsWallet = walletAvailable !== null && budgetValue > walletAvailable

  const estimate = estimateAdReach({
    budget: Number(budget) || 0,
    cpm: Number(cpmPrice) || 0,
  })

  const previewAd: FeedAd = useMemo(
    () => ({
      id: 'preview',
      title: title.trim() || t('partner.form.previewTitlePlaceholder'),
      content: content.trim() || t('partner.form.previewContentPlaceholder'),
      target_url: targetUrl || 'https://linkup.vn',
      format,
      media_list: mediaItems.map((item) => ({
        url: item.preview,
        media_type: mediaKindOf(item.file) === 'video' ? 'video' : 'image',
      })),
    }),
    [title, content, targetUrl, format, mediaItems, t],
  )

  const draftData: AdDraftData = useMemo(
    () => ({
      title,
      content,
      targetUrl,
      format,
      budget,
      dailyBudget,
      cpmPrice,
      cpcPrice,
      maxImpressions,
      startedAt,
      expiresAt,
      targetGender,
      targetAgeMin,
      targetAgeMax,
      targetProvinces,
    }),
    [
      title,
      content,
      targetUrl,
      format,
      budget,
      dailyBudget,
      cpmPrice,
      cpcPrice,
      maxImpressions,
      startedAt,
      expiresAt,
      targetGender,
      targetAgeMin,
      targetAgeMax,
      targetProvinces,
    ],
  )

  // Autosave nháp sau 500ms; chỉ lưu khi có nội dung để không tạo nháp rỗng.
  useEffect(() => {
    if (!draftReady || finished) return
    const hasContent =
      !!draftData.title.trim() ||
      !!draftData.content.trim() ||
      !!draftData.targetUrl.trim() ||
      !!draftData.budget.trim()
    const timer = setTimeout(() => {
      if (hasContent) {
        saveAdDraft(draftData)
      } else {
        clearAdDraft()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [draftReady, finished, draftData])

  const resumeDraft = () => {
    if (!draftPrompt) return
    const data = draftPrompt.data
    setTitle(data.title)
    setContent(data.content)
    setTargetUrl(data.targetUrl)
    setFormat(data.format)
    setBudget(data.budget)
    setDailyBudget(data.dailyBudget)
    setCpmPrice(data.cpmPrice)
    setCpcPrice(data.cpcPrice)
    setMaxImpressions(data.maxImpressions)
    setStartedAt(data.startedAt)
    setExpiresAt(data.expiresAt)
    setTargetGender(data.targetGender)
    setTargetAgeMin(data.targetAgeMin)
    setTargetAgeMax(data.targetAgeMax)
    setTargetProvinces(data.targetProvinces)
    setDraftPrompt(null)
    setDraftReady(true)
  }

  const discardDraft = () => {
    clearAdDraft()
    setDraftPrompt(null)
    setDraftReady(true)
  }

  // Wizard chỉ bật ở /partner/ads/new; mặc định render một trang như trước.
  const showContent = !wizard || step === 0
  const showBudget = !wizard || step === 1
  const showTargeting = !wizard || step === 2
  const showReview = wizard && step === 3
  const stepNames = [
    'partner.form.sectionContent',
    'partner.form.stepBudget',
    'partner.form.sectionTargeting',
    'partner.form.reviewTitle',
  ]

  const formatLabel = (value: string) =>
    value === 'video'
      ? t('partner.form.formatVideo')
      : value === 'carousel'
        ? t('partner.form.formatCarousel')
        : t('partner.form.formatImage')

  const genderLabel = (value: string) =>
    value === 'male'
      ? t('partner.form.genderMale')
      : value === 'female'
        ? t('partner.form.genderFemale')
        : t('partner.form.genderAll')

  const dateLabel = (value: string) => value.replace('T', ' ')

  const maxMediaFiles = format === 'carousel' ? AD_MEDIA_LIMITS.carouselMaxFiles : 1
  const canAddMedia = mediaItems.length < maxMediaFiles

  const mediaCheck: AdMediaCheck = useMemo(
    () =>
      checkAdMediaFiles(
        mediaItems.map((item) => ({
          name: item.file.name,
          size: item.file.size,
          type: item.file.type,
          durationSeconds: item.durationSeconds,
        })),
        format,
      ),
    [mediaItems, format],
  )

  const preflight = useMemo(
    () =>
      buildAdPreflight({
        title,
        content,
        targetUrl,
        budget: Number(budget) || 0,
        dailyBudget: Number(dailyBudget) || 0,
        cpm: Number(cpmPrice) || 0,
        cpc: Number(cpcPrice) || 0,
        startedAt,
        expiresAt,
        ageMin: Number(targetAgeMin) || 0,
        ageMax: Number(targetAgeMax) || 100,
        format,
        mediaCount: mediaItems.length,
        mediaCheck,
        estimate,
      }),
    [
      title,
      content,
      targetUrl,
      budget,
      dailyBudget,
      cpmPrice,
      cpcPrice,
      startedAt,
      expiresAt,
      targetAgeMin,
      targetAgeMax,
      format,
      mediaItems.length,
      mediaCheck,
      estimate,
    ],
  )
  const preflightErrors = preflight.filter((issue) => issue.level === 'error')

  const pendingFocusRef = useRef<string | null>(null)
  const FIELD_STEP: Record<string, number> = {
    'ad-title': 0,
    'ad-content': 0,
    'ad-target-url': 0,
    'ad-media-input': 0,
    'ad-format': 0,
    'ad-budget': 1,
    'ad-daily-budget': 1,
    'ad-cpm-price': 1,
    'ad-cpc-price': 1,
    'ad-max-impressions': 1,
    'ad-started-at': 1,
    'ad-expires-at': 1,
    'ad-age-min': 2,
    'ad-age-max': 2,
  }

  const jumpToField = (fieldId: string) => {
    pendingFocusRef.current = fieldId
    goToStep(FIELD_STEP[fieldId] ?? 0)
  }

  // Đọc duration video sau khi chọn file để checkAdMediaFiles chặn được video dài.
  const probeVideoItems = (items: MediaItem[]) => {
    for (const item of items) {
      if (!item.probing) continue
      void probeVideoDuration(item.file).then((duration) => {
        setMediaItems((prev) =>
          prev.map((current) =>
            current.id === item.id
              ? { ...current, durationSeconds: duration, probing: false }
              : current,
          ),
        )
      })
    }
  }

  // Dọn object URL của preview khi rời form.
  useEffect(() => {
    mediaItemsRef.current = mediaItems
  }, [mediaItems])

  useEffect(() => {
    return () => {
      mediaItemsRef.current.forEach((item) => URL.revokeObjectURL(item.preview))
    }
  }, [])

  // Chuyển bước bằng bàn phím/chuột đều đưa focus về field đầu của bước mới;
  // lần render đầu tiên thì không cướp focus của trang. Khi bấm vào một gợi ý
  // preflight thì ưu tiên focus đúng field của gợi ý đó.
  useEffect(() => {
    if (!wizard || !stepTouched.current) return
    const id = pendingFocusRef.current ?? FOCUS_FIELD_BY_STEP[step]
    pendingFocusRef.current = null
    if (id) document.getElementById(id)?.focus()
  }, [wizard, step])

  const goToStep = (next: number) => {
    stepTouched.current = true
    setStep(next)
  }

  /**
   * Wizard: chặn Enter submit sớm ở các bước 1–3. Textarea vẫn nhận Enter để
   * xuống dòng, còn nút bấm thì để mặc định.
   */
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (!wizard || step === stepNames.length - 1 || e.key !== 'Enter') return
    const target = e.target as HTMLElement
    if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return
    e.preventDefault()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? [])
    e.target.value = ''
    const compatibleIncoming = incoming.filter((file) => isCompatibleMedia(file, format))
    if (compatibleIncoming.length === 0) return

    // image/video: thay file cũ; carousel: nối thêm, tối đa 6.
    const base = format === 'carousel' ? [...mediaItems] : []
    if (format !== 'carousel') {
      mediaItems.forEach((item) => URL.revokeObjectURL(item.preview))
    }

    const next = [...base]
    for (const file of compatibleIncoming) {
      if (next.length >= maxMediaFiles) break
      next.push({
        id: ++mediaIdRef.current,
        file,
        preview: URL.createObjectURL(file),
        durationSeconds: null,
        probing: mediaKindOf(file) === 'video',
      })
    }

    setMediaItems(next)
    probeVideoItems(next)
  }

  const removeMedia = (id: number) => {
    setMediaItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.preview)
      return prev.filter((item) => item.id !== id)
    })
  }

  const moveMedia = (id: number, direction: -1 | 1) => {
    setMediaItems((prev) => {
      const index = prev.findIndex((item) => item.id === id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  const clearMedia = () => {
    mediaItems.forEach((item) => URL.revokeObjectURL(item.preview))
    setMediaItems([])
  }

  // Đổi định dạng: bỏ media không còn tương thích (vd đang là ảnh mà chọn video).
  const handleFormatChange = (nextFormat: string) => {
    setFormat(nextFormat)
    setMediaItems((prev) => {
      const compatible = prev.filter((item) => isCompatibleMedia(item.file, nextFormat))
      const max = nextFormat === 'carousel' ? AD_MEDIA_LIMITS.carouselMaxFiles : 1
      const kept = compatible.slice(0, max)
      prev
        .filter((item) => !kept.includes(item))
        .forEach((item) => URL.revokeObjectURL(item.preview))
      return kept
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!title || !content || !targetUrl || !budget) {
      toast({ title: t('common.error'), type: 'error' })
      return
    }
    if (mediaCheck.errors.length > 0 || (wizard && preflightErrors.length > 0)) {
      toast({ title: t('partner.form.preflightBlocked'), type: 'error' })
      return
    }
    if (budgetExceedsWallet) {
      setSubmitError(t('partner.form.walletInsufficient'))
      setSubmitErrorAction('wallet')
      return
    }
    setSubmitting(true)
    try {
      const created = await createAd({
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
      }, mediaItems.length > 0 ? mediaItems.map((item) => item.file) : undefined)
      toast({ title: successMessage ?? t('partner.form.createSuccess'), type: 'success' })
      clearAdDraft()
      setFinished(true)
      invalidate('/ads-management')
      invalidate('/admin/ads')
      if (wizard) {
        // Partner: giữ người dùng ở lại để đọc "chưa chạy, chưa trừ tiền".
        setSubmittedAdId(created?.data?.id ?? '')
      } else {
        router.push(redirectTo)
      }
    } catch (err) {
      const code = err instanceof ApiError ? err.code : ''
      if (isPackageError(code)) {
        // Gói/slot/định dạng: hiện ngay trong form kèm link nâng cấp và làm mới
        // trạng thái gói để banner chặn form cập nhật theo.
        setSubmitError(err instanceof Error ? err.message : t('common.error'))
        setSubmitErrorAction('packages')
        void mutate('/ads-management/subscription')
      } else if (isWalletError(code)) {
        // Ví không đủ hoặc chưa cấu hình: hiện tại chỗ kèm link nạp tiền và làm
        // mới số dư để banner cập nhật ngay.
        setSubmitError(err instanceof Error ? err.message : t('partner.form.walletInsufficient'))
        setSubmitErrorAction('wallet')
        void mutate('/wallet')
      } else {
        toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const gate = requireSubscription ? (
    subscriptionLoading ? (
      <p className={styles.gateLoading} role="status">
        {t('partner.form.checkingPackage')}
      </p>
    ) : notSubscribed || noSlotsLeft ? (
      <section className={styles.gateCard} aria-labelledby="ad-gate-title">
        <i className={`bx ${noSlotsLeft ? 'bx-error-circle' : 'bx-package'}`} aria-hidden="true" />
        <div>
          <h2 id="ad-gate-title" className={styles.gateTitle}>
            {noSlotsLeft ? t('partner.form.noSlotsTitle') : t('partner.form.noPackageTitle')}
          </h2>
          <p className={styles.gateText}>
            {noSlotsLeft ? t('partner.form.noSlotsDesc') : t('partner.form.noPackageDesc')}
          </p>
          <Link className={styles.gateCta} href="/packages">
            {t('partner.form.noPackageCta')}
          </Link>
        </div>
      </section>
    ) : null
  ) : null

  const formDisabled = !!gate

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{heading}</h1>
      </div>

      {draftPrompt ? (
        <section className={styles.draftCard} aria-labelledby="ad-draft-title">
          <i className="bx bx-save" aria-hidden="true" />
          <div>
            <h2 id="ad-draft-title" className={styles.draftTitle}>
              {t('partner.form.draftTitle')}
            </h2>
            <p className={styles.draftText}>
              {t('partner.form.draftDesc', {
                time: new Date(draftPrompt.savedAt).toLocaleString('vi-VN'),
              })}
            </p>
            <div className={styles.draftActions}>
              <button type="button" className={styles.btnSubmit} onClick={resumeDraft}>
                {t('partner.form.draftResume')}
              </button>
              <button type="button" className={styles.btnCancel} onClick={discardDraft}>
                {t('partner.form.draftDiscard')}
              </button>
            </div>
          </div>
        </section>
      ) : submittedAdId !== null ? (
        <section className={styles.successCard} aria-labelledby="ad-success-title">
          <i className="bx bx-check-circle" aria-hidden="true" />
          <div>
            <h2 id="ad-success-title" className={styles.successTitle}>
              {t('partner.form.submittedTitle')}
            </h2>
            <p className={styles.successText}>{t('partner.form.submittedNote')}</p>
            <p className={styles.successHint}>
              <i className="bx bx-time-five" aria-hidden="true" /> {t('partner.form.submittedApproval')}
            </p>
            <div className={styles.successActions}>
              {submittedAdId && (
                <Link href={`/partner/ads/${submittedAdId}/edit`} className={styles.btnSubmit}>
                  {t('partner.form.submittedEdit')}
                </Link>
              )}
              <Link href="/partner/ads" className={styles.btnCancel}>
                {t('partner.form.submittedList')}
              </Link>
              <Link href="/partner/help/ads" className={styles.helpLink}>
                {t('partner.form.helpLink')}
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
      {gate}

      {subscriptionLoadFailed && !gate && (
        <p className={styles.gateWarn} role="status">
          {t('partner.form.subscriptionError')}
        </p>
      )}

      {requireSubscription && subscription && !formDisabled && (
        <p className={styles.packageLine}>
          <i className="bx bx-package" aria-hidden="true" />
          {t('partner.form.packageLine', {
            name: subscription.package_name,
            left: subscription.slots_left,
            max: subscription.max_slots,
          })}
        </p>
      )}

      {!formDisabled && (
        <div className={styles.body}>
          <form className={styles.form} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
            {wizard && (
              <div className={styles.steps}>
                <p className={styles.stepProgress} role="status">
                  {t('partner.form.stepLabel', { n: step + 1, total: stepNames.length })}
                </p>
                <ol className={styles.stepList}>
                  {stepNames.map((name, index) => (
                    <li
                      key={name}
                      className={`${styles.stepItem} ${
                        index === step ? styles.stepActive : index < step ? styles.stepDone : ''
                      }`}
                      aria-current={index === step ? 'step' : undefined}
                    >
                      {t(name)}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {showContent && (
              <>
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
              <Link className={styles.helpLink} href="/partner/help/ads">
                <i className="bx bx-book-open" aria-hidden="true" /> {t('partner.form.helpLink')}
              </Link>
            </section>

            <fieldset className={styles.formSection}>
              <legend id="ad-section-content" className={styles.sectionTitle}>
                {t('partner.form.sectionContent')}
              </legend>

              <div className={styles.templateRow}>
                <button
                  type="button"
                  className={styles.templateBtn}
                  onClick={() => setTemplateOpen(true)}
                >
                  <i className="bx bx-magic-wand" aria-hidden="true" />
                  {t('partner.form.templateButton')}
                </button>
              </div>

              <div className={styles.section}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="ad-media-input">{t('partner.form.uploadMedia')}</label>
                  {format === 'carousel' && (
                    <span className={styles.mediaCount}>
                      {t('partner.form.mediaCount', { count: mediaItems.length, max: maxMediaFiles })}
                    </span>
                  )}
                </div>

                <div className={styles.uploadArea}>
                  {mediaItems.length > 0 && (
                    <div className={styles.mediaGrid}>
                      {mediaItems.map((item, index) => (
                        <div key={item.id} className={styles.mediaItem}>
                          {mediaKindOf(item.file) === 'video' ? (
                            <video src={item.preview} controls className={styles.mediaThumb} />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.preview} alt={item.file.name} className={styles.mediaThumb} />
                          )}
                          {index === 0 && format === 'carousel' && (
                            <span className={styles.coverBadge}>{t('partner.form.mediaCover')}</span>
                          )}
                          <div className={styles.mediaActions}>
                            <button
                              type="button"
                              className={styles.mediaBtn}
                              aria-label={t('partner.form.mediaMoveLeft')}
                              disabled={index === 0}
                              onClick={() => moveMedia(item.id, -1)}
                            >
                              <i className="bx bx-left-arrow-alt" />
                            </button>
                            <button
                              type="button"
                              className={styles.mediaBtn}
                              aria-label={t('partner.form.mediaMoveRight')}
                              disabled={index === mediaItems.length - 1}
                              onClick={() => moveMedia(item.id, 1)}
                            >
                              <i className="bx bx-right-arrow-alt" />
                            </button>
                            <button
                              type="button"
                              className={styles.mediaBtnDanger}
                              aria-label={t('partner.form.mediaRemove')}
                              onClick={() => removeMedia(item.id)}
                            >
                              <i className="bx bx-x" />
                            </button>
                          </div>
                          <span className={styles.mediaSize}>
                            {item.probing
                              ? t('partner.form.mediaProbing')
                              : formatFileSize(item.file.size)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {mediaItems.length > 1 && (
                    <button type="button" className={styles.mediaClearAll} onClick={clearMedia}>
                      {t('partner.form.mediaClearAll')}
                    </button>
                  )}

                  {canAddMedia && (
                    <label className={styles.uploadLabel}>
                      <i className="bx bx-cloud-upload" />
                      <span>{t('partner.form.uploadMedia')}</span>
                      <input
                        id="ad-media-input"
                        type="file"
                        accept={format === 'video' ? 'video/*' : format === 'carousel' ? 'image/*' : 'image/*,video/*'}
                        multiple={format === 'carousel'}
                        className={styles.fileInput}
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>

                <p className={styles.hint}>{t('partner.form.mediaHint')}</p>
                {mediaItems.length === 0 && format !== 'carousel' && (
                  <p className={styles.softWarn}>
                    <i className="bx bx-info-circle" aria-hidden="true" /> {t('partner.form.mediaWarn')}
                  </p>
                )}
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
              </div>

              <div className={styles.section}>
                <label className={styles.label} htmlFor="ad-format">{t('partner.form.format')}</label>
                <select
                  id="ad-format"
                  className={styles.select}
                  value={format}
                  onChange={(e) => handleFormatChange(e.target.value)}
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
            </fieldset>
              </>
            )}

            {showBudget && (
              <>
            <fieldset className={styles.formSection}>
              <legend id="ad-section-budget" className={styles.sectionTitle}>
                {t('partner.form.sectionBudget')}
              </legend>

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

                {walletAvailable !== null && (
                  <p className={styles.hint}>
                    <i className="bx bx-wallet" aria-hidden="true" />{' '}
                    {t('partner.form.walletAvailable', { amount: formatVnd(walletAvailable) })}
                    {wallet && wallet.reserved > 0 && (
                      <> · {t('partner.form.walletReserved', { amount: formatVnd(wallet.reserved) })}</>
                    )}
                    {' · '}
                    <Link href="/wallet">{t('partner.form.walletTopupCta')}</Link>
                  </p>
                )}

                {budgetExceedsWallet && (
                  <p className={styles.submitError} role="alert">
                    {t('partner.form.walletInsufficient')}{' '}
                    <Link href="/wallet">{t('partner.form.walletTopupCta')}</Link>
                  </p>
                )}

                {estimate !== null && (
                  <p className={styles.estimate} aria-live="polite">
                    <i className="bx bx-bar-chart" aria-hidden="true" />{' '}
                    {t('partner.form.estimate', {
                      budget: formatVnd(Number(budget)),
                      cpm: formatVnd(Number(cpmPrice)),
                      impressions: estimate.toLocaleString('vi-VN'),
                    })}
                  </p>
                )}
              </div>

              <details className={styles.advanced}>
                <summary className={styles.advancedSummary}>{t('partner.form.advanced')}</summary>
                <div className={styles.advancedBody}>
                  <div className={styles.row}>
                    <div className={styles.section}>
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="ad-daily-budget">{t('partner.form.dailyBudget')}</label>
                        <FieldHelp
                          label={t('partner.form.helpAbout', { name: t('partner.form.dailyBudget') })}
                          text={t('partner.form.dailyBudgetHelp')}
                        />
                      </div>
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
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="ad-max-impressions">{t('partner.form.maxImpressions')}</label>
                        <FieldHelp
                          label={t('partner.form.helpAbout', { name: t('partner.form.maxImpressions') })}
                          text={t('partner.form.maxImpressionsHelp')}
                        />
                      </div>
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
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="ad-cpm-price">{t('partner.form.cpmPrice')}</label>
                        <FieldHelp
                          label={t('partner.form.helpAbout', { name: t('partner.form.cpmPrice') })}
                          text={t('partner.form.cpmHelp')}
                        />
                      </div>
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
                      <div className={styles.labelRow}>
                        <label className={styles.label} htmlFor="ad-cpc-price">{t('partner.form.cpcPrice')}</label>
                        <FieldHelp
                          label={t('partner.form.helpAbout', { name: t('partner.form.cpcPrice') })}
                          text={t('partner.form.cpcHelp')}
                        />
                      </div>
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
            </fieldset>

            <fieldset className={styles.formSection}>
              <legend id="ad-section-schedule" className={styles.sectionTitle}>
                {t('partner.form.sectionSchedule')}
              </legend>
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
            </fieldset>
              </>
            )}

            {showTargeting && (
            <fieldset className={styles.formSection}>
              <legend id="ad-section-targeting" className={styles.sectionTitle}>
                {t('partner.form.sectionTargeting')}
              </legend>

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
            </fieldset>
            )}

            {showReview && (
              <section className={styles.formSection} aria-labelledby="ad-review-title">
                <h2 id="ad-review-title" className={styles.sectionTitle} tabIndex={-1}>
                  {t('partner.form.reviewTitle')}
                </h2>
                <p className={styles.hint}>{t('partner.form.reviewNote')}</p>

                <dl className={styles.summary}>
                  <div className={styles.summaryRow}>
                    <dt>{t('partner.form.title')}</dt>
                    <dd>{title || '—'}</dd>
                  </div>
                  <div className={styles.summaryRow}>
                    <dt>{t('partner.form.content')}</dt>
                    <dd>{content || '—'}</dd>
                  </div>
                  <div className={styles.summaryRow}>
                    <dt>{t('partner.form.targetUrl')}</dt>
                    <dd>{targetUrl || '—'}</dd>
                  </div>
                  <div className={styles.summaryRow}>
                    <dt>{t('partner.form.format')}</dt>
                    <dd>{formatLabel(format)}</dd>
                  </div>
                  <div className={styles.summaryRow}>
                    <dt>{t('partner.form.budget')}</dt>
                    <dd>{formatVnd(Number(budget) || 0)}</dd>
                  </div>
                  <div className={styles.summaryRow}>
                    <dt>{t('partner.form.dailyBudget')}</dt>
                    <dd>
                      {Number(dailyBudget) > 0
                        ? formatVnd(Number(dailyBudget))
                        : t('partner.form.unlimited')}
                    </dd>
                  </div>
                  <div className={styles.summaryRow}>
                    <dt>{t('partner.form.cpmPrice')}</dt>
                    <dd>{formatVnd(Number(cpmPrice) || 0)}</dd>
                  </div>
                  <div className={styles.summaryRow}>
                    <dt>{t('partner.form.cpcPrice')}</dt>
                    <dd>{formatVnd(Number(cpcPrice) || 0)}</dd>
                  </div>
                  <div className={styles.summaryRow}>
                    <dt>{t('partner.form.maxImpressions')}</dt>
                    <dd>
                      {Number(maxImpressions) > 0
                        ? Number(maxImpressions).toLocaleString('vi-VN')
                        : t('partner.form.unlimited')}
                    </dd>
                  </div>
                  <div className={styles.summaryRow}>
                    <dt>{t('partner.form.startDate')}</dt>
                    <dd>{startedAt ? dateLabel(startedAt) : t('partner.form.startOnApproval')}</dd>
                  </div>
                  <div className={styles.summaryRow}>
                    <dt>{t('partner.form.endDate')}</dt>
                    <dd>{expiresAt ? dateLabel(expiresAt) : t('partner.form.unlimited')}</dd>
                  </div>
                  <div className={styles.summaryRow}>
                    <dt>{t('partner.form.targetGender')}</dt>
                    <dd>{genderLabel(targetGender)}</dd>
                  </div>
                  <div className={styles.summaryRow}>
                    <dt>{t('partner.form.ageMin')} – {t('partner.form.ageMax')}</dt>
                    <dd>{targetAgeMin} – {targetAgeMax}</dd>
                  </div>
                  <div className={styles.summaryRow}>
                    <dt>{t('partner.form.targetLocations')}</dt>
                    <dd>
                      {targetProvinces.length > 0
                        ? t('partner.form.summaryLocationsCount', { n: targetProvinces.length })
                        : t('partner.form.summaryLocationsAll')}
                    </dd>
                  </div>
                </dl>

                {estimate !== null && (
                  <p className={styles.estimate} aria-live="polite">
                    <i className="bx bx-bar-chart" aria-hidden="true" />{' '}
                    {t('partner.form.estimate', {
                      budget: formatVnd(Number(budget)),
                      cpm: formatVnd(Number(cpmPrice)),
                      impressions: estimate.toLocaleString('vi-VN'),
                    })}
                  </p>
                )}

                <div className={styles.preflight} aria-labelledby="ad-preflight-title">
                  <h3 id="ad-preflight-title" className={styles.preflightTitle}>
                    {t('partner.form.preflightHeading')}
                  </h3>
                  {preflight.length === 0 ? (
                    <p className={styles.preflightOk}>
                      <i className="bx bx-check-circle" aria-hidden="true" /> {t('partner.form.preflightOk')}
                    </p>
                  ) : (
                    <ul className={styles.preflightList}>
                      {[...preflightErrors, ...preflight.filter((issue) => issue.level === 'warning')].map(
                        (issue, index) => (
                          <li
                            key={`${issue.key}-${index}`}
                            className={issue.level === 'error' ? styles.preflightError : styles.preflightWarning}
                          >
                            <i
                              className={`bx ${issue.level === 'error' ? 'bx-error-circle' : 'bx-info-circle'}`}
                              aria-hidden="true"
                            />
                            {issue.fieldId ? (
                              <button
                                type="button"
                                className={styles.preflightLink}
                                onClick={() => jumpToField(issue.fieldId as string)}
                              >
                                {t(issue.key, issue.params)}
                              </button>
                            ) : (
                              <span>{t(issue.key, issue.params)}</span>
                            )}
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                </div>

                <p className={styles.pendingNote}>
                  <i className="bx bx-time-five" aria-hidden="true" /> {t('partner.form.pendingNote')}
                </p>
              </section>
            )}

            {submitError && (
              <p className={styles.submitError} role="alert">
                {submitError}{' '}
                <Link href={submitErrorAction === 'wallet' ? '/wallet' : '/packages'}>
                  {submitErrorAction === 'wallet'
                    ? t('partner.form.walletTopupCta')
                    : t('partner.form.viewPackages')}
                </Link>
              </p>
            )}

            <div className={styles.actions}>
              {wizard ? (
                <>
                  {step === 0 ? (
                    <button type="button" className={styles.btnCancel} onClick={() => router.back()}>
                      {t('partner.form.cancel')}
                    </button>
                  ) : (
                    <button type="button" className={styles.btnCancel} onClick={() => goToStep(step - 1)}>
                      <i className="bx bx-left-arrow-alt" aria-hidden="true" /> {t('partner.form.back')}
                    </button>
                  )}
                  {step < stepNames.length - 1 ? (
                    <button type="button" className={styles.btnSubmit} onClick={() => goToStep(step + 1)}>
                      {t('partner.form.next')} <i className="bx bx-right-arrow-alt" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className={styles.btnSubmit}
                      disabled={submitting || preflightErrors.length > 0 || budgetExceedsWallet}
                    >
                      {submitting ? t('common.loading') : submitLabel}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button type="button" className={styles.btnCancel} onClick={() => router.back()}>
                    {t('partner.form.cancel')}
                  </button>
                  <button type="submit" className={styles.btnSubmit} disabled={submitting || budgetExceedsWallet}>
                    {submitting ? t('common.loading') : submitLabel}
                  </button>
                </>
              )}
            </div>
          </form>

          <aside className={styles.previewCol} aria-labelledby="ad-preview-title">
            <h2 id="ad-preview-title" className={styles.previewHeading}>
              {t('partner.form.previewHeading')}
            </h2>
            <AdCard ad={previewAd} preview />
            <p className={styles.previewNote}>{t('partner.form.previewNote')}</p>
          </aside>
        </div>
      )}
        </>
      )}

      <AdTemplatePicker
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        hasExistingContent={!!(title.trim() || content.trim())}
        onApply={(template) => {
          setTitle(template.title)
          setContent(template.content)
        }}
      />
    </div>
  )
}
