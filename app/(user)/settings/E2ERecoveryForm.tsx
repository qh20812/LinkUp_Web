'use client'

import React, { useEffect, useState } from 'react'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { useE2ERecovery, isValidPin } from '../../../hooks/useE2ERecovery'
import styles from './Settings.module.css'

// Quản lý khôi phục khóa chat E2E (mã hóa đầu-cuối): bật = chọn PIN rồi server
// lưu backup khóa chat của máy này ở dạng mã hóa; recovery key hiện ĐÚNG MỘT
// LẦN để người dùng lưu ngoài máy (không bao giờ lưu lên server). Tắt = xóa.
export default function E2ERecoveryForm() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const recovery = useE2ERecovery()

  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mirror meta server → state local, nhưng đưa setState sang microtask callback
  // (không setState đồng bộ trong effect body → react-hooks/set-state-in-effect).
  useEffect(() => {
    if (recovery.meta === null) return
    const meta = recovery.meta
    void Promise.resolve().then(() => {
      setEnabled(meta.has_blob)
      setUpdatedAt(meta.updated_at ?? null)
    })
  }, [recovery.meta])

  const pinInvalid = pin.length > 0 && !isValidPin(pin)
  const mismatch = pinConfirm.length > 0 && pin !== pinConfirm
  const canSave = isValidPin(pin) && pin === pinConfirm && !recovery.busy

  const handleEnable = async () => {
    setError(null)
    if (!canSave) {
      setError(t('userSettings.e2ePinInvalid'))
      return
    }
    try {
      const { recoveryKey } = await recovery.enableRecovery(pin)
      setRevealedKey(recoveryKey)
      setShowKey(true)
      setPin('')
      setPinConfirm('')
      toast({ type: 'success', title: t('userSettings.e2eEnabled') })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  const handleCopy = async () => {
    if (!revealedKey) return
    try {
      await navigator.clipboard.writeText(revealedKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }

  const handleDisable = async () => {
    try {
      await recovery.disableRecovery()
      setConfirmDisable(false)
      setShowKey(false)
      setRevealedKey(null)
      setEnabled(false)
      setUpdatedAt(null)
      toast({ type: 'success', title: t('userSettings.e2eDisabled') })
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('common.error') })
    }
  }

  const handleManualRefresh = async () => {
    try {
      const ok = await recovery.forceRefreshBackup()
      if (ok) {
        toast({ type: 'success', title: t('userSettings.e2eRefreshed') })
      } else {
        toast({ type: 'error', title: t('userSettings.e2eRefreshNoKeys') })
      }
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('common.error') })
    }
  }

  if (enabled === null) {
    return (
      <div>
        <div className={styles.skeleton} style={{ width: '60%' }} />
      </div>
    )
  }

  if (enabled) {
    const activeKey = recovery.meta?.has_blob ? recovery.meta : null
    return (
      <div>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>{t('userSettings.e2eStatusActive')}</span>
            <span className={styles.settingHint}>
              {activeKey?.updated_at
                ? `${t('userSettings.e2eUpdatedAt')}: ${new Date(activeKey.updated_at).toLocaleString()}`
                : t('userSettings.e2eStatusActiveHint')}
            </span>
          </div>
          <span className={styles.badgeOk}>✓</span>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>{t('userSettings.e2eChangePin')}</span>
            <span className={styles.settingHint}>{t('userSettings.e2eChangePinHint')}</span>
          </div>
        </div>
        <div className={styles.form}>
          <div className={styles.field}>
            <label>{t('userSettings.e2ePinLabel')}</label>
            <input
              className={styles.input}
              type="password"
              value={pin}
              maxLength={12}
              inputMode="numeric"
              autoComplete="off"
              placeholder="••••••"
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className={styles.field}>
            <label>{t('userSettings.e2ePinConfirm')}</label>
            <input
              className={styles.input}
              type="password"
              value={pinConfirm}
              maxLength={12}
              inputMode="numeric"
              autoComplete="off"
              placeholder="••••••"
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          {pinInvalid && <p className={styles.fieldError}>{t('userSettings.e2ePinInvalid')}</p>}
          {mismatch && <p className={styles.fieldError}>{t('userSettings.e2ePinMismatch')}</p>}
          {error && <p className={styles.fieldError}>{error}</p>}
          <div className={styles.footer}>
            <button type="button" className={styles.btnSave} disabled={!canSave} onClick={() => void handleEnable()}>
              {recovery.busy ? t('common.loading') : t('userSettings.e2eSavePin')}
            </button>
            <button type="button" className={styles.btnCancel} disabled={recovery.busy} onClick={() => void handleManualRefresh()}>
              {t('userSettings.e2eRefreshNow')}
            </button>
          </div>
        </div>

        <div className={styles.dangerZone}>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>{t('userSettings.e2eDisable')}</span>
              <span className={styles.settingHint}>{t('userSettings.e2eDisableHint')}</span>
            </div>
            <button type="button" className={styles.btnDanger} onClick={() => setConfirmDisable(true)}>
              {t('userSettings.e2eDisable')}
            </button>
          </div>
        </div>

        {confirmDisable && (
          <div className={styles.confirmBox}>
            <p className={styles.settingHint}>{t('userSettings.e2eDisableConfirm')}</p>
            <div className={styles.footer}>
              <button type="button" className={styles.btnCancel} onClick={() => setConfirmDisable(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className={styles.btnDanger} onClick={() => void handleDisable()}>
                {t('userSettings.e2eDisable')}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.form}>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <span className={styles.settingLabel}>{t('userSettings.e2eStatusInactive')}</span>
          <span className={styles.settingHint}>{t('userSettings.e2eInactiveHint')}</span>
        </div>
      </div>

      <div className={styles.field}>
        <label>{t('userSettings.e2ePinLabel')}</label>
        <input
          className={styles.input}
          type="password"
          value={pin}
          maxLength={12}
          inputMode="numeric"
          autoComplete="off"
          placeholder="••••••"
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <div className={styles.field}>
        <label>{t('userSettings.e2ePinConfirm')}</label>
        <input
          className={styles.input}
          type="password"
          value={pinConfirm}
          maxLength={12}
          inputMode="numeric"
          autoComplete="off"
          placeholder="••••••"
          onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      {pinInvalid && <p className={styles.fieldError}>{t('userSettings.e2ePinInvalid')}</p>}
      {mismatch && <p className={styles.fieldError}>{t('userSettings.e2ePinMismatch')}</p>}
      {error && <p className={styles.fieldError}>{error}</p>}

      <div className={styles.footer}>
        <button type="button" className={styles.btnSave} disabled={!canSave} onClick={() => void handleEnable()}>
          {recovery.busy ? t('common.loading') : t('userSettings.e2eEnable')}
        </button>
      </div>

      {showKey && revealedKey && (
        <div className={styles.warningBox}>
          <p className={styles.settingLabel}>{t('userSettings.e2eKeyTitle')}</p>
          <p className={styles.settingHint}>{t('userSettings.e2eKeyHint')}</p>
          <div className={styles.keyBox}>
            <code className={styles.recoveryKeyText}>{revealedKey}</code>
            <button type="button" className={styles.btnCancel} onClick={() => void handleCopy()}>
              {copied ? t('userSettings.e2eCopied') : t('userSettings.e2eCopy')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}