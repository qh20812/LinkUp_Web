'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './ProfileMenu.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import { blockUser } from '../../api/block'

interface ProfileMenuProps {
  userID: string
  isSelf: boolean
}

export default function ProfileMenu({ userID, isSelf }: ProfileMenuProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  if (isSelf) return null

  const handleBlock = async () => {
    if (blocking) return
    setBlocking(true)
    try {
      await blockUser(userID)
      toast({ type: 'success', title: t('profile.blockSuccess') })
      setIsOpen(false)
    } catch {
      toast({ type: 'error', title: t('common.error') })
    } finally {
      setBlocking(false)
    }
  }

  const handleReport = () => {
    toast({ type: 'info', title: t('profile.reportComingSoon') })
    setIsOpen(false)
  }

  return (
    <div className={styles.menuWrap} ref={menuRef}>
      <button className={styles.menuTrigger} onClick={() => setIsOpen(!isOpen)}>
        <i className="bx bx-dots-horizontal-rounded" />
      </button>
      {isOpen && (
        <div className={styles.menuDropdown}>
          <button className={styles.menuItem} onClick={handleBlock} disabled={blocking}>
            <i className="bx bx-block" />
            <span>{t('profile.blockUser')}</span>
          </button>
          <button className={styles.menuItem} onClick={handleReport}>
            <i className="bx bx-flag" />
            <span>{t('profile.reportUser')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
