'use client'

import React, { useRef, useState } from 'react'
import useSWR from 'swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import {
  createMoMoPayment,
  createWalletPayment,
  createVNPayPayment,
  getMySubscription,
  getPackages,
  getPaymentMethods,
  newPaymentRequestId,
} from '../../../api/package'
import { getWallet } from '../../../api/wallet'
import { ApiError, storeTokens } from '../../../api/api'
import { redirectToExternal } from '../../../lib/navigate'
import PaymentMethodPicker from '../../../components/checkout/PaymentMethodPicker'
import WalletPurchaseModal from '../../../components/checkout/WalletPurchaseModal'
import type {
  AdPackage,
  PaymentMethodsResponse,
  SubscriptionResponse,
  WalletResponse,
} from '../../../types'
import styles from './Packages.module.css'

export default function PackagesPage() {
  const { t, language } = useTranslation()
  const { toast } = useToast()

  const { data: packages, isLoading: loadingPkgs } = useSWR<AdPackage[]>('/ads/packages', () => getPackages())
  const { data: sub, isLoading: loadingSub, mutate: mutateSub } = useSWR<SubscriptionResponse>(
    '/ads-management/subscription',
    () => getMySubscription(),
    { shouldRetryOnError: false },
  )
  const { data: methodData } = useSWR<PaymentMethodsResponse>(
    '/ads-management/payment-methods',
    () => getPaymentMethods(),
    { shouldRetryOnError: false },
  )
  const { data: wallet, mutate: mutateWallet } = useSWR<WalletResponse>('/wallet', () => getWallet(), {
    shouldRetryOnError: false,
  })

  const [pickedMethod, setPickedMethod] = useState('')
  const [paying, setPaying] = useState<string | null>(null)
  const [confirmPkg, setConfirmPkg] = useState<AdPackage | null>(null)
  const idempotencyRef = useRef('')

  // Suy ra phương thức hiệu lực tại chỗ (không setState trong effect).
  const enabledMethods = (methodData?.methods ?? []).filter((m) => m.enabled)
  const method = enabledMethods.some((m) => m.key === pickedMethod)
    ? pickedMethod
    : enabledMethods.some((m) => m.key === methodData?.default)
      ? methodData!.default
      : (enabledMethods[0]?.key ?? '')

  const formatPrice = (v: number) =>
    new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(v)

  const isActive = (pkgId: string) => {
    if (!sub) return false
    // Ưu tiên ID; server cũ chưa trả package_id thì so theo tên.
    if (sub.package_id) return sub.package_id === pkgId
    return packages?.find((p) => p.id === pkgId)?.name === sub.package_name
  }

  const walletAvailable = wallet?.available ?? 0
  const isWallet = method === 'wallet'

  const handlePay = async (pkg: AdPackage) => {
    if (isActive(pkg.id) || paying) return
    if (!method) {
      toast({ title: t('payment.noMethod'), type: 'warning' })
      return
    }

    if (isWallet) {
      if (pkg.price_monthly > walletAvailable) {
        toast({
          title: t('payment.insufficientWallet', {
            amount: formatPrice(pkg.price_monthly - walletAvailable),
          }),
          type: 'warning',
          action: { label: t('payment.topUp'), onClick: () => window.location.assign('/wallet') },
        })
        return
      }
      idempotencyRef.current = newPaymentRequestId()
      setConfirmPkg(pkg)
      return
    }

    setPaying(pkg.id)
    try {
      // Gói chỉ được kích hoạt sau khi cổng ngoài xác nhận thanh toán.
      const res =
        method === 'vnpay' ? await createVNPayPayment(pkg.id) : await createMoMoPayment(pkg.id)
      redirectToExternal(res.payment_url)
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
      setPaying(null)
    }
  }

  const handleConfirmWallet = async () => {
    if (!confirmPkg || paying) return
    setPaying(confirmPkg.id)
    try {
      const res = await createWalletPayment(confirmPkg.id, idempotencyRef.current)
      if (res.tokens) storeTokens(res.tokens)
      setConfirmPkg(null)
      toast({ title: t('packages.walletPaymentSuccess'), type: 'success' })
      await Promise.all([mutateSub(), mutateWallet()])
    } catch (err) {
      const insufficient = err instanceof ApiError && err.code === 'wallet.INSUFFICIENT_BALANCE'
      toast({
        title: err instanceof Error ? err.message : t('common.error'),
        type: 'error',
        action: insufficient
          ? { label: t('payment.topUp'), onClick: () => window.location.assign('/wallet') }
          : undefined,
      })
      setConfirmPkg(null)
    } finally {
      setPaying(null)
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('partner.packages.title')}</h1>

      {sub && (
        <div className={styles.currentCard}>
          <div className={styles.currentHeader}>
            <i className="bx bx-package" />
            <span>{t('partner.packages.currentPackage')}</span>
          </div>
          <div className={styles.currentBody}>
            <div className={styles.currentRow}>
              <span>{t('partner.packages.title')}</span>
              <strong>{sub.package_name}</strong>
            </div>
            <div className={styles.currentRow}>
              <span>{t('partner.packages.slotsLeft')}</span>
              <strong>{sub.slots_left} / {sub.max_slots}</strong>
            </div>
            <div className={styles.currentRow}>
              <span>{t('partner.packages.expiresAt')}</span>
              <strong>{new Date(sub.expires_at).toLocaleDateString('vi-VN')}</strong>
            </div>
          </div>
        </div>
      )}

      <PaymentMethodPicker
        methods={methodData?.methods ?? []}
        value={method}
        onChange={setPickedMethod}
        wallet={wallet}
        amount={0}
        disabled={!!paying}
      />

      {loadingPkgs || loadingSub ? (
        <p>{t('common.loading')}</p>
      ) : !packages || packages.length === 0 ? (
        <p className={styles.empty}>{t('partner.packages.noPackages')}</p>
      ) : (
        <div className={styles.grid}>
          {packages.map((pkg) => {
            const active = isActive(pkg.id)
            const shortfall = Math.max(0, pkg.price_monthly - walletAvailable)
            const blockedByWallet = isWallet && shortfall > 0
            return (
              <div key={pkg.id} className={`${styles.card} ${active ? styles.cardActive : ''}`}>
                <h3 className={styles.cardName}>{pkg.name}</h3>
                <p className={styles.cardPrice}>{formatPrice(pkg.price_monthly)}<span>{t('packages.perMonth')}</span></p>
                <p className={styles.cardDesc}>{pkg.description}</p>
                <ul className={styles.cardFeatures}>
                  <li><i className="bx bx-check" /> {t('packages.slotCount', { n: pkg.max_slots })}</li>
                  <li><i className="bx bx-check" /> {t('packages.dayCount', { n: pkg.max_duration_days })}</li>
                  {pkg.supports_video && <li><i className="bx bx-check" /> {t('packages.video')}</li>}
                  {pkg.supports_carousel && <li><i className="bx bx-check" /> {t('packages.carousel')}</li>}
                  {pkg.has_advanced_analytics && <li><i className="bx bx-check" /> {t('packages.advancedAnalytics')}</li>}
                </ul>
                <button
                  className={`${styles.btnSubscribe} ${active ? styles.btnSubscribed : ''}`}
                  disabled={active || paying === pkg.id || blockedByWallet || !method}
                  onClick={() => handlePay(pkg)}
                  title={blockedByWallet ? t('payment.walletShort', { amount: formatPrice(shortfall) }) : undefined}
                >
                  {paying === pkg.id ? t('common.loading') : active ? t('partner.packages.subscribed') : t('payment.payNow')}
                </button>
                {blockedByWallet && !active && (
                  <p className={styles.cardHint}>{t('payment.walletShort', { amount: formatPrice(shortfall) })}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <WalletPurchaseModal
        open={!!confirmPkg}
        packageName={confirmPkg?.name ?? ''}
        amount={confirmPkg?.price_monthly ?? 0}
        wallet={wallet}
        submitting={!!paying}
        onClose={() => {
          if (!paying) setConfirmPkg(null)
        }}
        onConfirm={handleConfirmWallet}
      />
    </div>
  )
}
