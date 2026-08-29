'use client'

import { useMemo, useState } from 'react'
import Modal from '../Modal'
import ExternalImage from '../ExternalImage'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './GroupCallMemberSelectModal.module.css'

interface Member {
  user_id: string
  display_name: string
  avatar_uri: string
}

interface GroupCallMemberSelectModalProps {
  open: boolean
  onClose: () => void
  members: Map<string, { display_name: string; avatar_uri: string }>
  myUserId: string
  onStartCall: (selectedIds: string[]) => void
}

export default function GroupCallMemberSelectModal({
  open,
  onClose,
  members,
  myUserId,
  onStartCall,
}: GroupCallMemberSelectModalProps) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const memberList = useMemo(() => {
    const list: Member[] = []
    members.forEach((val, key) => {
      if (key !== myUserId) {
        list.push({ user_id: key, display_name: val.display_name, avatar_uri: val.avatar_uri })
      }
    })
    return list.sort((a, b) => a.display_name.localeCompare(b.display_name))
  }, [members, myUserId])

  const filtered = useMemo(() => {
    if (!search.trim()) return memberList
    const q = search.toLowerCase()
    return memberList.filter(
      (m) =>
        m.display_name.toLowerCase().includes(q),
    )
  }, [memberList, search])

  const allSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.user_id))

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((m) => m.user_id)))
    }
  }

  const toggleMember = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const handleStart = () => {
    if (selected.size === 0) return
    onStartCall(Array.from(selected))
    setSelected(new Set())
    setSearch('')
    onClose()
  }

  const handleClose = () => {
    setSelected(new Set())
    setSearch('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('groupCall.selectMembers')}
      footer={
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={handleClose}>
            {t('common.cancel')}
          </button>
          <button
            className={styles.startBtn}
            onClick={handleStart}
            disabled={selected.size === 0}
          >
            <i className="bx bx-video" />
            {t('groupCall.startVideoCall')} ({selected.size})
          </button>
        </div>
      }
    >
      <div className={styles.searchRow}>
        <i className="bx bx-search" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search')}
        />
      </div>

      <div className={styles.selectAllRow}>
        <label className={styles.memberItem}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
          />
          <span className={styles.selectAllText}>
            {allSelected ? t('groupCall.deselectAll') : t('groupCall.selectAll')}
          </span>
          <span className={styles.memberCount}>{filtered.length}</span>
        </label>
      </div>

      <div className={styles.memberList}>
        {filtered.map((member) => (
          <label key={member.user_id} className={styles.memberItem}>
            <input
              type="checkbox"
              checked={selected.has(member.user_id)}
              onChange={() => toggleMember(member.user_id)}
            />
            <div className={styles.memberAvatar}>
              {member.avatar_uri ? (
                <ExternalImage src={member.avatar_uri} alt="" />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {member.display_name[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <span className={styles.memberName}>{member.display_name}</span>
          </label>
        ))}
        {filtered.length === 0 && (
          <div className={styles.empty}>{t('common.noData')}</div>
        )}
      </div>
    </Modal>
  )
}
