'use client'

import React, { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
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

type TabKey = 'general' | 'security' | 'registration'

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'general', labelKey: 'settings.tabGeneral' },
  { key: 'security', labelKey: 'settings.tabSecurity' },
  { key: 'registration', labelKey: 'settings.tabRegistration' },
]

function getKeysForTab(tab: TabKey): string[] {
  switch (tab) {
    case 'general': return GENERAL_KEYS
    case 'security': return SECURITY_KEYS
    case 'registration': return REGISTRATION_KEYS
  }
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
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabKey>('general')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [initialValues, setInitialValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [roleOpen, setRoleOpen] = useState(false)

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

  const dirty = JSON.stringify(formValues) !== JSON.stringify(initialValues)
  const tabKeys = getKeysForTab(activeTab)
  const hasDirtyFieldsInTab = tabKeys.some(k => formValues[k] !== initialValues[k])

  const handleSave = async () => {
    const settingsToSave: Record<string, string> = {}
    for (const key of ALLOWED_KEYS) {
      if (formValues[key] !== initialValues[key]) {
        const err = validateField(t, key, formValues[key])
        if (err) {
          toast({ title: `${t(`settings.${key}`)}: ${err}`, type: 'error' })
          return
        }
        settingsToSave[key] = formValues[key]
      }
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
        <div className={styles.header}><h1 className={styles.title}>{t('settings.title')}</h1></div>
        <div className={styles.card}>
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('settings.title')}</h1>
      </div>

      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div className={styles.card}>
        {tabKeys.map(key => {
          const value = formValues[key] ?? ''
          return (
            <div key={key} className={styles.formGroup}>
              <label className={styles.label}>
                {t(`settings.${key}`)}
                {key === 'maintenance_mode' && value === 'true' && (
                  <span className={styles.warningBadge}>⚠️ {t('settings.maintenanceModeHint')}</span>
                )}
              </label>
              {key === 'maintenance_mode' || key === 'allow_registration' || key === 'require_email_verify' ? (
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={value === 'true'}
                    onChange={e => handleChange(key, e.target.checked ? 'true' : 'false')}
                  />
                  <span className={styles.toggleTrack}>
                    <span className={styles.toggleThumb} />
                  </span>
                </label>
              ) : key === 'default_user_role' ? (
                <div
                  className={styles.customSelect}
                  tabIndex={0}
                  onBlur={() => setRoleOpen(false)}
                  onClick={() => setRoleOpen(prev => !prev)}
                >
                  <div className={styles.customSelectTrigger}>
                    {value === 'USER' ? t('settings.roleUser') : t('settings.roleAdmin')}
                    <i className={`bx bx-chevron-down ${roleOpen ? styles.chevronUp : ''}`} />
                  </div>
                  {roleOpen && (
                    <div className={styles.customSelectMenu}>
                      <div
                        className={`${styles.customSelectOption} ${value === 'USER' ? styles.selected : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleChange(key, 'USER'); setRoleOpen(false) }}
                      >
                        {t('settings.roleUser')}
                      </div>
                      <div
                        className={`${styles.customSelectOption} ${value === 'ADMIN' ? styles.selected : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleChange(key, 'ADMIN'); setRoleOpen(false) }}
                      >
                        {t('settings.roleAdmin')}
                      </div>
                    </div>
                  )}
                </div>
              ) : key === 'site_description' ? (
                <textarea
                  className={styles.textarea}
                  value={value}
                  onChange={e => handleChange(key, e.target.value)}
                  rows={3}
                />
              ) : (
                <input
                  type={key === 'contact_email' ? 'email' : 'text'}
                  className={styles.input}
                  value={value}
                  onChange={e => handleChange(key, e.target.value)}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className={styles.footer}>
        <button
          className={styles.btnSave}
          onClick={handleSave}
          disabled={saving || !dirty || !hasDirtyFieldsInTab}
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
  )
}