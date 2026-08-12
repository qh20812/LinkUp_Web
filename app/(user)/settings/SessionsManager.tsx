'use client'

import React, { useEffect, useState } from 'react'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { getSessions, revokeSession, revokeOtherSessions } from '../../../api/settings'
import type { UserSessionDTO } from '../../../types'
import { formatDateTime } from '../../../lib/formatters'
import styles from './Settings.module.css'

export default function SessionsManager() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [sessions, setSessions] = useState<UserSessionDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState(false)
  const [confirmAll, setConfirmAll] = useState(false)

  const load = async () => {
    const res = await getSessions()
    setSessions(res.data)
    setError(null)
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await getSessions()
        if (cancelled) return
        setSessions(res.data)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : t('userSettings.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [t])

  const handleRevoke = async (id: string) => {
    setRevokingId(id)
    try {
      const res = await revokeSession(id)
      toast({ type: 'success', title: res.message || t('userSettings.revokeSuccess') })
      await load()
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('userSettings.saveError') })
    } finally {
      setRevokingId(null)
    }
  }

  const handleRevokeAll = async () => {
    setRevokingAll(true)
    try {
      const res = await revokeOtherSessions()
      toast({ type: 'success', title: res.message || t('userSettings.revokeAllSuccess') })
      setConfirmAll(false)
      await load()
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('userSettings.saveError') })
    } finally {
      setRevokingAll(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className={styles.skeleton} style={{ width: '90%' }} />
        <div className={styles.skeleton} style={{ width: '80%' }} />
        <div className={styles.skeleton} style={{ width: '70%' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.empty}>
        <i className="bx bx-error-circle" />
        <p>{error}</p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className={styles.empty}>
        <i className="bx bx-devices" />
        <p>{t('userSettings.sessionsEmpty')}</p>
        <p>{t('userSettings.sessionsEmptyDesc')}</p>
      </div>
    )
  }

  return (
    <div>
      {sessions.map((session) => (
        <div key={session.id} className={styles.sessionRow}>
          <div className={styles.sessionInfo}>
            <div className={styles.sessionIcon}>
              <i className="bx bx-laptop" />
            </div>
            <div className={styles.sessionDetails}>
              <div className={styles.sessionDevice}>
                {session.device_name || '—'}
                {session.is_current && (
                  <span className={`${styles.badge} ${styles.badgeCurrent}`} style={{ marginLeft: 8 }}>
                    {t('userSettings.currentBadge')}
                  </span>
                )}
              </div>
              <div className={styles.sessionMeta}>
                {t('userSettings.lastActiveLabel')}: {formatDateTime(session.last_active_at)}
              </div>
              <div className={styles.sessionMeta}>
                {t('userSettings.createdAtLabel')}: {formatDateTime(session.created_at)}
              </div>
            </div>
          </div>
          {!session.is_current && (
            <button
              type="button"
              className={styles.btnDanger}
              style={{ flexShrink: 0 }}
              disabled={revokingId === session.id}
              onClick={() => handleRevoke(session.id)}
            >
              {revokingId === session.id ? t('common.loading') : t('userSettings.revokeBtn')}
            </button>
          )}
        </div>
      ))}

      {sessions.some((s) => !s.is_current) && (
        <div className={styles.sessionsFooter}>
          <button type="button" className={styles.btnDanger} disabled={revokingAll} onClick={() => setConfirmAll(true)}>
            {revokingAll ? t('common.loading') : t('userSettings.revokeAllBtn')}
          </button>
        </div>
      )}

      {confirmAll && (
        <div className={styles.overlay} onClick={() => setConfirmAll(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{t('userSettings.revokeAllBtn')}</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setConfirmAll(false)}
                aria-label="Close"
              >
                <i className="bx bx-x" />
              </button>
            </div>
            <p className={styles.confirmText}>{t('userSettings.revokeAllConfirm')}</p>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={() => setConfirmAll(false)}>
                {t('userSettings.cancelBtn')}
              </button>
              <button type="button" className={styles.btnDanger} onClick={handleRevokeAll}>
                {t('userSettings.confirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
