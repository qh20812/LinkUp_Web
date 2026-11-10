'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { useAuth } from '../../../hooks/useAuth'
import { getPackages, getMySubscription, createMoMoPayment, createVNPayPayment, createWalletPayment, getPaymentMethods, newPaymentRequestId } from '../../../api/package'
import { getWallet } from '../../../api/wallet'
import { clearSWRCache } from '../../../api/swr'
import { ApiError, refreshSession, storeTokens } from '../../../api/api'
import { redirectToExternal } from '../../../lib/navigate'
import { formatVnd } from '../../../lib/ads-estimate'
import PaymentMethodPicker from '../../../components/checkout/PaymentMethodPicker'
import WalletPurchaseModal from '../../../components/checkout/WalletPurchaseModal'
import type { AdPackage, PaymentMethodsResponse, SubscriptionResponse, WalletResponse } from '../../../types'
import styles from './Packages.module.css'

function daysLeftFrom(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000))
}

export default function PackagesPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { isAuthenticated, isPartner, initializing } = useAuth()

  const { data: packages, isLoading: loadingPkgs } = useSWR<AdPackage[]>('/ads/packages', () => getPackages())
  const { data: sub, isLoading: loadingSub, mutate: mutateSub } = useSWR<SubscriptionResponse>(
    isAuthenticated && !initializing ? '/ads-management/subscription' : null,
    () => getMySubscription(),
    { shouldRetryOnError: false },
  )
  const { data: methodData, isLoading: loadingMethods } = useSWR<PaymentMethodsResponse>(
    isAuthenticated && !initializing ? '/ads-management/payment-methods' : null,
    () => getPaymentMethods(),
    { shouldRetryOnError: false },
  )
  const { data: wallet, mutate: mutateWallet } = useSWR<WalletResponse>(
    isAuthenticated && !initializing ? '/wallet' : null,
    () => getWallet(),
    { shouldRetryOnError: false },
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickedMethod, setPickedMethod] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const idempotencyRef = useRef('')
  const handledPaymentRef = useRef(false)

  // Phương thức hiệu lực: giữ lựa chọn của người dùng nếu còn bật, nếu không
  // rơi về mặc định server trả rồi tới phương thức bật đầu tiên. Suy ra trực
  // tiếp thay vì setState trong effect để không tạo render dây chuyền.
  const enabledMethods = (methodData?.methods ?? []).filter((m) => m.enabled)
  const method = enabledMethods.some((m) => m.key === pickedMethod)
    ? pickedMethod
    : enabledMethods.some((m) => m.key === methodData?.default)
      ? methodData!.default
      : (enabledMethods[0]?.key ?? '')

  // VNPay redirects the browser back here with ?payment=success|failed|invalid.
  // On success refresh the JWT so the PARTNER claim is visible to /partner/*.
  useEffect(() => {
    if (handledPaymentRef.current) return
    const payment = new URLSearchParams(window.location.search).get('payment')
    if (!payment) return

    handledPaymentRef.current = true
    window.history.replaceState({}, '', window.location.pathname)

    if (payment === 'success') {
      void (async () => {
        const refreshed = await refreshSession()
        clearSWRCache()
        if (refreshed) {
          toast({ title: t('packages.paymentSuccess'), type: 'success' })
          window.location.replace('/partner/dashboard')
        } else {
          toast({ title: t('packages.paymentSuccessReload'), type: 'warning' })
        }
      })()
      return
    }

    toast({
      title: payment === 'invalid' ? t('packages.paymentInvalid') : t('packages.paymentFailed'),
      type: 'error',
    })
  }, [t, toast])

  const daysLeft = sub?.expires_at ? daysLeftFrom(sub.expires_at) : 0

  // Gói hiện tại: ưu tiên package_id (server mới), fallback theo tên để không
  // vỡ khi server cũ chưa trả field này.
  const isCurrentPackage = (pkg: AdPackage) =>
    !!sub && (sub.package_id ? sub.package_id === pkg.id : sub.package_name === pkg.name)
  const selectedPackage = packages?.find((p) => p.id === selectedId) ?? null
  const selectedIsCurrent = !!selectedPackage && isCurrentPackage(selectedPackage)

  const formatPrice = (v: number) => formatVnd(v)

  const handleSelect = (pkgId: string) => {
    if (!isAuthenticated && !initializing) {
      toast({ title: t('packages.loginRequired'), type: 'warning' })
      window.location.assign('/login?redirect=/packages')
      return
    }
    // Gói đang dùng không chọn được (server cũng trả payment.ALREADY_ACTIVE).
    const pkg = packages?.find((p) => p.id === pkgId)
    if (pkg && isCurrentPackage(pkg)) {
      setSelectedId(null)
      return
    }
    setSelectedId((prev) => (prev === pkgId ? null : pkgId))
  }

  const walletInsufficient =
    method === 'wallet' && !!selectedPackage && selectedPackage.price_monthly > (wallet?.available ?? 0)

  const handleSubscribe = async () => {
    if (!isAuthenticated && !initializing) {
      toast({ title: t('packages.loginRequired'), type: 'warning' })
      window.location.assign('/login?redirect=/packages')
      return
    }
    if (!selectedPackage || selectedIsCurrent) return
    if (!method) {
      toast({ title: t('payment.noMethod'), type: 'warning' })
      return
    }

    // Ví trả trước: hỏi xác nhận rồi trừ tiền + kích hoạt gói ngay. Khoá
    // idempotency được tạo một lần cho lần mở modal này.
    if (method === 'wallet') {
      if (walletInsufficient) return
      idempotencyRef.current = newPaymentRequestId()
      setConfirmOpen(true)
      return
    }

    setSubscribing(true)
    try {
      // Cổng ngoài: gói chỉ được kích hoạt sau khi return/IPN xác nhận, nên ở
      // đây chỉ tạo giao dịch rồi chuyển trình duyệt sang cổng.
      const res =
        method === 'vnpay'
          ? await createVNPayPayment(selectedPackage.id)
          : await createMoMoPayment(selectedPackage.id)
      redirectToExternal(res.payment_url)
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
      setSubscribing(false)
    }
  }

  const handleConfirmWallet = async () => {
    if (!selectedPackage || subscribing) return
    setSubscribing(true)
    try {
      const res = await createWalletPayment(selectedPackage.id, idempotencyRef.current)
      // Server cấp token mới khi role vừa đổi USER → PARTNER.
      if (res.tokens) storeTokens(res.tokens)
      clearSWRCache()
      setConfirmOpen(false)
      setSelectedId(null)
      toast({ title: t('packages.walletPaymentSuccess'), type: 'success' })
      await Promise.all([mutateSub(), mutateWallet()])
      if (!isPartner) {
        window.location.assign('/partner/dashboard')
      }
    } catch (err) {
      const insufficient = err instanceof ApiError && err.code === 'wallet.INSUFFICIENT_BALANCE'
      toast({
        title: err instanceof Error ? err.message : t('common.error'),
        type: 'error',
        action: insufficient
          ? { label: t('payment.topUp'), onClick: () => window.location.assign('/wallet') }
          : undefined,
      })
      setConfirmOpen(false)
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t('packages.title')}</h1>
          <p className={styles.subtitle}>{t('packages.subtitle')}</p>
        </div>
        <div className={styles.headerActions}>
          {isPartner && (
            <button className={styles.dashboardBtn} onClick={() => { window.location.assign('/partner/dashboard') }}>
              <i className="bx bx-grid-alt" />
              <span>{t('packages.openDashboard')}</span>
            </button>
          )}
          <Link href="/wallet" className={styles.dashboardBtn}>
            <i className="bx bx-wallet" />
            <span>{t('wallet.title')}</span>
          </Link>
        </div>
      </div>

      {loadingSub ? null : sub ? (
        <div className={styles.currentCard}>
          <div className={styles.currentHeader}>
            <i className="bx bx-package" />
            <span>{t('packages.currentPackage')}</span>
          </div>
          <div className={styles.currentBody}>
            <div className={styles.currentRow}>
              <span>{t('partner.packages.title')}</span>
              <strong>{sub.package_name}</strong>
            </div>
            <div className={styles.currentRow}>
              <span>{t('packages.daysLeft', { days: daysLeft })}</span>
              <strong>{t('packages.slotsUsed', { used: sub.slots_used, max: sub.max_slots })}</strong>
            </div>
          </div>
        </div>
      ) : (
        <p className={styles.noPackage}>{t('packages.noPackage')}</p>
      )}

      <h2 className={styles.sectionTitle}>{t('packages.select')}</h2>
      <p className={styles.hint}>{t('packages.selectHint')}</p>

      {loadingPkgs ? (
        <p className={styles.empty}>{t('common.loading')}</p>
      ) : !packages || packages.length === 0 ? (
        <p className={styles.empty}>{t('partner.packages.noPackages')}</p>
      ) : (
        <div className={styles.grid}>
          {packages.map((pkg) => {
            const current = isCurrentPackage(pkg)
            return (
            <div key={pkg.id} className={`${styles.card} ${current ? styles.cardCurrent : selectedId === pkg.id ? styles.cardSelected : ''}`}>
              {current && <span className={styles.currentBadge}>{t('packages.currentPackage')}</span>}
              <h3 className={styles.cardName}>{pkg.name}</h3>
              <p className={styles.cardPrice}>
                {formatPrice(pkg.price_monthly)}
                <span>{t('packages.perMonth')}</span>
              </p>
              <p className={styles.cardDesc}>{pkg.description}</p>
              <ul className={styles.cardFeatures}>
                <li>
                  <i className="bx bx-check" /> {t('packages.slotCount', { n: pkg.max_slots })}
                </li>
                <li>
                  <i className="bx bx-check" /> {t('packages.dayCount', { n: pkg.max_duration_days })}
                </li>
                {pkg.supports_video && (
                  <li>
                    <i className="bx bx-check" /> {t('packages.video')}
                  </li>
                )}
                {pkg.supports_carousel && (
                  <li>
                    <i className="bx bx-check" /> {t('packages.carousel')}
                  </li>
                )}
                {pkg.has_advanced_analytics && (
                  <li>
                    <i className="bx bx-check" /> {t('packages.advancedAnalytics')}
                  </li>
                )}
              </ul>
              <button
                className={`${styles.btnSelect} ${current ? styles.btnCurrent : selectedId === pkg.id ? styles.btnSelected : ''}`}
                disabled={current || loadingSub}
                onClick={() => handleSelect(pkg.id)}
              >
                {current ? t('packages.currentPackage') : selectedId === pkg.id ? t('packages.selected') : t('packages.select')}
              </button>
            </div>
            )
          })}
        </div>
      )}

      <PaymentMethodPicker
        methods={methodData?.methods ?? []}
        value={method}
        onChange={setPickedMethod}
        wallet={wallet}
        amount={selectedPackage?.price_monthly ?? 0}
        disabled={subscribing || loadingMethods}
      />

      <div className={styles.actions}>
        <button
          className={styles.cta}
          disabled={!selectedId || subscribing || selectedIsCurrent || !method || walletInsufficient || loadingMethods}
          onClick={handleSubscribe}
        >
          {subscribing ? t('packages.redirecting') : t('payment.payNow')}
        </button>
        {!selectedId && <p className={styles.ctaHint}>{t('packages.selectHint')}</p>}
        {selectedIsCurrent && <p className={styles.ctaHint}>{t('packages.currentHint')}</p>}
        {walletInsufficient && (
          <p className={styles.ctaHint}>
            {t('payment.insufficientWallet', {
              amount: formatVnd(selectedPackage!.price_monthly - (wallet?.available ?? 0)),
            })}{' '}
            <Link href="/wallet">{t('payment.topUp')}</Link>
          </p>
        )}
      </div>

      {selectedPackage && (
        <WalletPurchaseModal
          open={confirmOpen}
          packageName={selectedPackage.name}
          amount={selectedPackage.price_monthly}
          wallet={wallet}
          submitting={subscribing}
          onClose={() => {
            if (!subscribing) setConfirmOpen(false)
          }}
          onConfirm={handleConfirmWallet}
        />
      )}
    </div>
  )
}
