'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import useSWR from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { updateAdminSettings } from '../../../api/admin'
import { swrFetcher, invalidate } from '../../../api/swr'
import type { AdminSettingsResponse } from '../../../types'
import styles from './Settings.module.css'

const ALLOWED_KEYS = [
  'site_name', 'site_description', 'contact_email',
  'maintenance_mode', 'allow_registration', 'require_email_verify',
  'password_min_length', 'max_login_attempts', 'jwt_expiry_minutes', 'default_user_role',
  'refresh_token_expiry_days',
]

const GENERAL_KEYS = ['site_name', 'site_description', 'contact_email', 'maintenance_mode']
const SECURITY_KEYS = ['password_min_length', 'max_login_attempts', 'jwt_expiry_minutes', 'refresh_token_expiry_days']
const REGISTRATION_KEYS = ['allow_registration', 'require_email_verify', 'default_user_role']

const BOOLEAN_KEYS = new Set(['maintenance_mode', 'allow_registration', 'require_email_verify'])
const NUMERIC_KEYS = new Set(['password_min_length', 'max_login_attempts', 'jwt_expiry_minutes', 'refresh_token_expiry_days'])

type TabKey = 'general' | 'security' | 'registration'

const TABS: { key: TabKey; labelKey: string; icon: string }[] = [
  { key: 'general', labelKey: 'settings.tabGeneral', icon: 'bx bx-slider-alt' },
  { key: 'security', labelKey: 'settings.tabSecurity', icon: 'bx bx-shield-quarter' },
  { key: 'registration', labelKey: 'settings.tabRegistration', icon: 'bx bx-user-plus' },
]

const ALLOWED_TABS: TabKey[] = ['general', 'security', 'registration']

function getKeysForTab(tab: TabKey): string[] {
  switch (tab) {
    case 'general': return GENERAL_KEYS
    case 'security': return SECURITY_KEYS
    case 'registration': return REGISTRATION_KEYS
  }
}

function tabOfKey(key: string): TabKey {
  if (GENERAL_KEYS.includes(key)) return 'general'
  if (SECURITY_KEYS.includes(key)) return 'security'
  return 'registration'
}

function validateField(
  t: (key: string, params?: Record<string, string | number>) => string,
  key: string,
  value: string,
): string | null {
  switch (key) {
    case 'password_min_length': {
      const num = parseInt(value, 10)
      if (isNaN(num)) return t('settings.validationNumber')
      if (num < 8) return t('settings.validationMin', { min: 8 })
      if (num > 50) return t('settings.validationMax', { max: 50 })
      return null
    }
    case 'max_login_attempts': {
      const num = parseInt(value, 10)
      if (isNaN(num)) return t('settings.validationNumber')
      if (num < 1) return t('settings.validationMin', { min: 1 })
      if (num > 10) return t('settings.validationMax', { max: 10 })
      return null
    }
    case 'jwt_expiry_minutes': {
      const num = parseInt(value, 10)
      if (isNaN(num)) return t('settings.validationNumber')
      if (num < 1) return t('settings.validationMin', { min: 1 })
      if (num > 60) return t('settings.validationMax', { max: 60 })
      return null
    }
    case 'refresh_token_expiry_days': {
      const num = parseInt(value, 10)
      if (isNaN(num)) return t('settings.validationNumber')
      if (num < 1) return t('settings.validationMin', { min: 1 })
      if (num > 30) return t('settings.validationMax', { max: 30 })
      return null
    }
    case 'contact_email':
      return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : t('settings.validationEmail')
    case 'maintenance_mode':
    case 'allow_registration':
    case 'require_email_verify':
      return (value === 'true' || value === 'false') ? null : t('settings.validationBoolean')
    default:
      return value.trim() ? null : t('settings.validationRequired')
  }
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as TabKey | null
  const activeTab: TabKey = tabParam && ALLOWED_TABS.includes(tabParam) ? tabParam : 'general'
  const active = TABS.find(x => x.key === activeTab) ?? TABS[0]

  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [initialValues, setInitialValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [touched, setTouched] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.role !== 'SUPER_ADMIN') {
        toast({ title: t('settings.unauthorized'), type: 'error' })
        router.push('/admin/dashboard')
        return
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthorized(true)
    } catch {
      router.push('/login')
    }
  }, [router, toast, t])

  const { data: res, error, isLoading } = useSWR(
    authorized ? '/admin/settings' : null,
    (url: string) => swrFetcher<AdminSettingsResponse>(url),
  )

  useEffect(() => {
    if (res?.settings) {
      const mapped: Record<string, string> = {}
      for (const key of ALLOWED_KEYS) {
        mapped[key] = res.settings[key] ?? ''
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormValues(mapped)
      setInitialValues(mapped)
    }
  }, [res])

  const handleChange = useCallback((key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }))
  }, [])

  const markTouched = useCallback((keys: string[]) => {
    setTouched(prev => {
      const next = new Set(prev)
      for (const k of keys) next.add(k)
      return next
    })
  }, [])

  const handleBlur = useCallback((key: string) => markTouched([key]), [markTouched])

  const dirty = JSON.stringify(formValues) !== JSON.stringify(initialValues)
  const tabKeys = getKeysForTab(activeTab)

  const fieldError = (key: string): string | null =>
    touched.has(key) ? validateField(t, key, formValues[key] ?? '') : null

  const hasErrors = Array.from(touched).some(
    key => validateField(t, key, formValues[key] ?? '') !== null,
  )

  const switchTab = (tab: TabKey) => {
    router.replace(`/admin/settings?tab=${tab}`)
  }

  const handleSave = async () => {
    const settingsToSave: Record<string, string> = {}
    const invalidKeys: string[] = []
    for (const key of ALLOWED_KEYS) {
      if (formValues[key] !== initialValues[key]) {
        const err = validateField(t, key, formValues[key])
        if (err) {
          invalidKeys.push(key)
          continue
        }
        settingsToSave[key] = formValues[key]
      }
    }

    if (invalidKeys.length > 0) {
      markTouched(invalidKeys)
      const first = invalidKeys[0]
      const firstErr = validateField(t, first, formValues[first])
      const firstTab = tabOfKey(first)
      if (firstTab !== activeTab) switchTab(firstTab)
      toast({ title: `${t(`settings.${first}`)}: ${firstErr}`, type: 'error' })
      return
    }

    if (Object.keys(settingsToSave).length === 0) {
      toast({ title: t('settings.noChanges'), type: 'warning' })
      return
    }

    setSaving(true)
    try {
      await updateAdminSettings({ settings: settingsToSave })
      toast({ title: t('settings.saveSuccess'), type: 'success' })
      setInitialValues({ ...formValues })
      invalidate('/admin/settings')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('settings.saveError'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormValues({ ...initialValues })
    setTouched(new Set())
  }

  if (authorized === null) return null

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}><i className="bx bx-error-circle" /><p>{t('settings.loadError')}</p></div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <div className={styles.skTitle} />
            <div className={styles.skSubtitle} />
          </div>
        </div>
        <div className={styles.settings}>
          <div className={styles.rail} aria-hidden="true">
            <div className={styles.skRail} />
            <div className={styles.skRail} />
            <div className={styles.skRail} />
          </div>
          <div className={styles.panel}>
            <div className={styles.card}>
              <div className={styles.skCardTitle} />
              {[0, 1, 2].map(i => (
                <div key={i} className={styles.skRow}>
                  <div className={styles.skLabel} />
                  <div className={styles.skInput} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderField = (key: string) => {
    const value = formValues[key] ?? ''
    const errorText = fieldError(key)

    if (BOOLEAN_KEYS.has(key)) {
      return (
        <div key={key} className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <label className={styles.settingLabel} htmlFor={`field-${key}`}>
              {t(`settings.${key}`)}
            </label>
            <span className={styles.settingHint}>{t(`settings.hint.${key}`)}</span>
            {key === 'maintenance_mode' && value === 'true' && (
              <span className={styles.banner}>
                <i className="bx bx-error-circle" aria-hidden="true" />
                {t('settings.maintenanceModeHint')}
              </span>
            )}
          </div>
          <label className={styles.toggle}>
            <input
              id={`field-${key}`}
              type="checkbox"
              checked={value === 'true'}
              onChange={e => handleChange(key, e.target.checked ? 'true' : 'false')}
            />
            <span className={styles.toggleTrack}>
              <span className={styles.toggleThumb} />
            </span>
          </label>
        </div>
      )
    }

    return (
      <div key={key} className={styles.field}>
        <label className={styles.label} htmlFor={`field-${key}`}>
          {t(`settings.${key}`)}
        </label>
        <span className={styles.hint} id={`hint-${key}`}>{t(`settings.hint.${key}`)}</span>
        {key === 'default_user_role' ? (
          <div className={styles.selectWrap}>
            <select
              id={`field-${key}`}
              className={styles.select}
              value={value}
              onChange={e => handleChange(key, e.target.value)}
              aria-describedby={`hint-${key}`}
            >
              <option value="USER">{t('settings.roleUser')}</option>
              <option value="ADMIN">{t('settings.roleAdmin')}</option>
            </select>
            <i className={`bx bx-chevron-down ${styles.selectChevron}`} aria-hidden="true" />
          </div>
        ) : key === 'site_description' ? (
          <textarea
            id={`field-${key}`}
            className={styles.textarea}
            value={value}
            onChange={e => handleChange(key, e.target.value)}
            onBlur={() => handleBlur(key)}
            rows={3}
            aria-describedby={`hint-${key}`}
            aria-invalid={errorText ? true : undefined}
          />
        ) : (
          <input
            id={`field-${key}`}
            type={key === 'contact_email' ? 'email' : 'text'}
            inputMode={NUMERIC_KEYS.has(key) ? 'numeric' : 'text'}
            className={styles.input}
            value={value}
            onChange={e => handleChange(key, e.target.value)}
            onBlur={() => handleBlur(key)}
            aria-describedby={`hint-${key}`}
            aria-invalid={errorText ? true : undefined}
          />
        )}
        {errorText && <span className={styles.fieldError} role="alert">{errorText}</span>}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t('settings.title')}</h1>
          <p className={styles.subtitle}>{t('settings.description')}</p>
        </div>
        <div className={styles.headerMeta}>
          {dirty && (
            <span className={styles.dirtyPill}>
              <span className={styles.dirtyDot} aria-hidden="true" />
              {t('settings.unsaved')}
            </span>
          )}
          <span className={styles.superBadge}>
            <i className="bx bx-shield-quarter" aria-hidden="true" />
            {t('settings.superAdminBadge')}
          </span>
        </div>
      </div>

      <div className={styles.settings}>
        <nav className={styles.rail} role="tablist" aria-orientation="vertical">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`settings-tab-${tab.key}`}
              aria-selected={activeTab === tab.key}
              aria-controls="settings-panel"
              className={`${styles.railTab}${activeTab === tab.key ? ` ${styles.railTabActive}` : ''}`}
              onClick={() => switchTab(tab.key)}
            >
              <i className={tab.icon} aria-hidden="true" />
              <span>{t(tab.labelKey)}</span>
            </button>
          ))}
        </nav>

        <div
          className={styles.panel}
          key={activeTab}
          role="tabpanel"
          id="settings-panel"
          aria-labelledby={`settings-tab-${activeTab}`}
        >
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t(active.labelKey)}</h2>
            <div className={styles.form}>
              {tabKeys.map(key => renderField(key))}
            </div>
          </div>

          <div className={styles.footer}>
            <button
              className={styles.btnSave}
              onClick={handleSave}
              disabled={saving || !dirty || hasErrors}
            >
              {saving ? t('common.loading') : t('settings.saveBtn')}
            </button>
            <button
              className={styles.btnCancel}
              onClick={handleCancel}
              disabled={saving || !dirty}
            >
              {t('settings.cancelBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
