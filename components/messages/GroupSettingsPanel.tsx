'use client'

import { useCallback, useRef, useState } from 'react'
import Modal from '../Modal'
import ExternalImage from '../ExternalImage'
import GroupMemberList from './GroupMemberList'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import {
  getGroupSettings,
  updateGroupSettings,
  addGroupMember,
  banGroupMember,
  unmuteGroupMember,
  muteGroupMember,
  transferGroupAdmin,
} from '../../api/chats'
import type { GroupChatSettings } from '../../types'
import styles from './GroupSettingsPanel.module.css'

interface GroupSettingsPanelProps {
  open: boolean
  onClose: () => void
  chatId: string
  myUserId: string
  onSettingsUpdated?: (settings: GroupChatSettings) => void
  onMemberBanned?: (memberId: string) => void
  onLeave?: () => void
}

export default function GroupSettingsPanel({
  open,
  onClose,
  chatId,
  myUserId,
  onSettingsUpdated,
  onMemberBanned,
  onLeave,
}: GroupSettingsPanelProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [settings, setSettings] = useState<GroupChatSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [addMemberSearch, setAddMemberSearch] = useState('')
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; username: string; display_name: string; avatar_uri: string }>
  >([])
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadSettings = useCallback(async () => {
    if (!open || !chatId) return
    setLoading(true)
    try {
      const res = await getGroupSettings(chatId)
      setSettings(res.data)
      setNameValue(res.data.name)
    } catch {
      toast({ type: 'error', title: t('common.error') })
    } finally {
      setLoading(false)
    }
  }, [open, chatId, toast, t])

  // Load settings when opened
  if (open && !settings && !loading) {
    void loadSettings()
  }

  const handleUpdateName = async () => {
    if (!nameValue.trim() || nameValue.trim().length < 3) {
      toast({ type: 'warning', title: 'Tên nhóm phải từ 3-50 ký tự' })
      return
    }
    try {
      const res = await updateGroupSettings(chatId, { name: nameValue.trim() })
      setSettings(res.data)
      setEditingName(false)
      onSettingsUpdated?.(res.data)
      toast({ type: 'success', title: t('common.success') })
    } catch {
      toast({ type: 'error', title: t('common.error') })
    }
  }

  const handleSearchMember = (value: string) => {
    setAddMemberSearch(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (value.trim().length < 2) {
      setSearchResults([])
      return
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const { searchFriends } = await import('../../api/chats')
        const res = await searchFriends(value.trim())
        setSearchResults(res.users ?? [])
      } catch {
        setSearchResults([])
      }
    }, 350)
  }

  const handleAddMember = async (userId: string) => {
    try {
      await addGroupMember(chatId, userId)
      setAddMemberSearch('')
      setSearchResults([])
      await loadSettings()
      toast({ type: 'success', title: t('chat.memberAdded') })
    } catch {
      toast({ type: 'error', title: t('common.error') })
    }
  }

  const handleBan = async (memberId: string) => {
    try {
      await banGroupMember(chatId, memberId)
      await loadSettings()
      onMemberBanned?.(memberId)
      toast({ type: 'success', title: t('chat.memberBanned') })
    } catch {
      toast({ type: 'error', title: t('common.error') })
    }
  }

  const handleMute = async (memberId: string) => {
    try {
      await muteGroupMember(chatId, memberId, 'Muted by admin', 60)
      await loadSettings()
      toast({ type: 'success', title: t('chat.memberMuted') })
    } catch {
      toast({ type: 'error', title: t('common.error') })
    }
  }

  const handleUnmute = async (memberId: string) => {
    try {
      await unmuteGroupMember(chatId, memberId)
      await loadSettings()
      toast({ type: 'success', title: t('chat.memberUnmuted') })
    } catch {
      toast({ type: 'error', title: t('common.error') })
    }
  }

  const handleTransferAdmin = async (memberId: string) => {
    try {
      await transferGroupAdmin(chatId, memberId)
      await loadSettings()
      toast({ type: 'success', title: t('chat.adminTransferred') })
    } catch {
      toast({ type: 'error', title: t('common.error') })
    }
  }

  const handleLeave = async () => {
    try {
      const { request } = await import('../../api/api')
      await request(`/api/group-chats/${chatId}/leave`, { method: 'POST' })
      toast({ type: 'success', title: t('chat.leftGroup') })
      onLeave?.()
    } catch {
      toast({ type: 'error', title: t('common.error') })
    }
  }

  const isAdmin = settings?.members.some((m: { user_id: string; role: string }) => m.user_id === myUserId && m.role === 'CHAT_ADMIN') ?? false
  const members = settings?.members ?? []

  return (
    <Modal
      open={open}
      onClose={() => { setSettings(null); onClose() }}
      title={t('chat.groupSettings')}
      footer={
        <div className={styles.footer}>
          <button className={styles.leaveBtn} onClick={handleLeave}>
            {t('chat.leaveGroup')}
          </button>
        </div>
      }
    >
      <div className={styles.body}>
        {loading && !settings && (
          <div className={styles.loading}>{t('common.loading')}</div>
        )}

        {settings && (
          <>
            <div className={styles.section}>
              <label className={styles.label}>{t('chat.groupName')}</label>
              {editingName ? (
                <div className={styles.editRow}>
                  <input
                    className={styles.input}
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    maxLength={50}
                  />
                  <button className={styles.saveBtn} onClick={handleUpdateName}>
                    {t('common.save')}
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setEditingName(false)}>
                    {t('common.cancel')}
                  </button>
                </div>
              ) : (
                <div className={styles.viewRow}>
                  <span className={styles.nameValue}>{settings.name}</span>
                  {isAdmin && (
                    <button className={styles.editBtn} onClick={() => setEditingName(true)}>
                      <i className="bx bx-edit" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className={styles.section}>
              <label className={styles.label}>{t('chat.addMember')}</label>
              <input
                className={styles.input}
                value={addMemberSearch}
                onChange={(e) => handleSearchMember(e.target.value)}
                placeholder={t('chat.searchFriends')}
              />
              {searchResults.length > 0 && (
                <div className={styles.searchResults}>
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      className={styles.searchResult}
                      onClick={() => handleAddMember(user.id)}
                    >
                      <ExternalImage src={user.avatar_uri} alt="" className={styles.resultAvatar} />
                      <span>{user.display_name}</span>
                      <i className="bx bx-plus-circle" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.section}>
              <label className={styles.label}>{t('chat.members')} ({members.length})</label>
              <GroupMemberList
                members={members}
                myUserId={myUserId}
                isAdmin={isAdmin}
                onBan={handleBan}
                onMute={handleMute}
                onUnmute={handleUnmute}
                onTransferAdmin={handleTransferAdmin}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
