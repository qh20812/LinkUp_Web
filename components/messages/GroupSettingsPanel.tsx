'use client'

import { useCallback, useRef, useState } from 'react'
import Modal from '../Modal'
import GroupMemberList from './GroupMemberList'
import AddGroupMemberModal from './AddGroupMemberModal'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import ExternalImage from '../ExternalImage'
import {
  getGroupSettings,
  updateGroupSettings,
  banGroupMember,
  unmuteGroupMember,
  muteGroupMember,
  transferGroupAdmin,
  uploadMedia,
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

const MUTE_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'abuse', label: 'Lạm dụng' },
  { value: 'harassment', label: 'Quấy rối' },
  { value: 'violation', label: 'Vi phạm quy định' },
  { value: 'other', label: 'Lý do khác' },
] as const

const MUTE_DURATIONS = [
  { value: 1, label: '1 phút' },
  { value: 30, label: '30 phút' },
  { value: 60, label: '1 giờ' },
  { value: 1440, label: '24 giờ' },
  { value: 0, label: 'Vĩnh viễn' },
] as const

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
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [muteTarget, setMuteTarget] = useState<string | null>(null)
  const [muteReason, setMuteReason] = useState<string>('spam')
  const [muteDuration, setMuteDuration] = useState<number>(60)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarFileRef = useRef<HTMLInputElement>(null)

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

  if (open && !settings && !loading) {
    void loadSettings()
  }

  const isAdmin = settings?.members.some(
    (m: { user_id: string; role: string }) => m.user_id === myUserId && m.role === 'CHAT_ADMIN',
  ) ?? false
  const members = settings?.members ?? []

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

  const handleChangeAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !settings) return
    setAvatarUploading(true)
    try {
      const uploadRes = await uploadMedia(file)
      const res = await updateGroupSettings(chatId, { avatar_uri: uploadRes.data.file_uri })
      setSettings(res.data)
      onSettingsUpdated?.(res.data)
      toast({ type: 'success', title: t('chat.avatarUpdated') })
    } catch {
      toast({ type: 'error', title: t('common.error') })
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleToggleAllowMemberAdd = async () => {
    if (!settings) return
    const enabled = !settings.allow_member_add
    try {
      const res = await updateGroupSettings(chatId, { allow_member_add: enabled })
      setSettings(res.data)
      onSettingsUpdated?.(res.data)
      toast({ type: 'success', title: enabled ? t('chat.allowMemberAddOn') : t('chat.allowMemberAddOff') })
    } catch {
      toast({ type: 'error', title: t('common.error') })
    }
  }

  const handleToggleNotifications = async () => {
    if (!settings) return
    const enabled = !settings.member_settings.notifications_enabled
    try {
      const res = await updateGroupSettings(chatId, { notifications_enabled: enabled })
      setSettings(res.data)
      toast({ type: 'success', title: enabled ? t('chat.notificationsOn') : t('chat.notificationsOff') })
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
    setMuteTarget(memberId)
  }

  const handleConfirmMute = async () => {
    if (!muteTarget) return
    try {
      await muteGroupMember(chatId, muteTarget, muteReason, muteDuration)
      await loadSettings()
      toast({ type: 'success', title: t('chat.memberMuted') })
    } catch {
      toast({ type: 'error', title: t('common.error') })
    } finally {
      setMuteTarget(null)
      setMuteReason('spam')
      setMuteDuration(60)
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
      await request(`/api/group-chats/${chatId}/leave`, {
        method: 'POST',
        body: JSON.stringify({ leave_mode: 'public', history_mode: 'keep' }),
      })
      toast({ type: 'success', title: t('chat.leftGroup') })
      onLeave?.()
    } catch {
      toast({ type: 'error', title: t('common.error') })
    }
  }

  return (
    <>
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
              {isAdmin && (
                <div className={styles.section}>
                  <label className={styles.label}>{t('chat.groupAvatar')}</label>
                  <div className={styles.avatarSection}>
                    <div className={styles.avatarPreview}>
                      {settings.avatar_uri ? (
                        <ExternalImage src={settings.avatar_uri} alt="" className={styles.avatarImage} />
                      ) : (
                        <i className={`bx bx-group ${styles.avatarPlaceholder}`} />
                      )}
                      {avatarUploading && (
                        <div className={styles.avatarOverlay}>
                          <i className="bx bx-loader-circle bx-spin" />
                        </div>
                      )}
                    </div>
                    <button
                      className={styles.changeAvatarBtn}
                      onClick={() => avatarFileRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      <i className="bx bx-camera" />
                      <span>{t('chat.changeAvatar')}</span>
                    </button>
                  </div>
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleChangeAvatar}
                  />
                </div>
              )}

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
                <button className={styles.addMemberBtn} onClick={() => setAddMemberOpen(true)}>
                  <i className="bx bx-user-plus" />
                  <span>{t('chat.addMembers')}</span>
                </button>
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

              {isAdmin && (
                <div className={styles.section}>
                  <label className={styles.label}>{t('chat.adminSettings')}</label>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>{t('chat.allowMemberAdd')}</span>
                    <button
                      className={`${styles.toggle} ${settings.allow_member_add ? styles.toggleOn : ''}`}
                      onClick={handleToggleAllowMemberAdd}
                      type="button"
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.section}>
                <label className={styles.label}>{t('chat.notificationSettings')}</label>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>{t('chat.notifications')}</span>
                  <button
                    className={`${styles.toggle} ${settings.member_settings.notifications_enabled ? styles.toggleOn : ''}`}
                    onClick={handleToggleNotifications}
                    type="button"
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <AddGroupMemberModal
          open={addMemberOpen}
          onClose={() => setAddMemberOpen(false)}
          chatId={chatId}
          memberIds={new Set(members.map((m: { user_id: string }) => m.user_id))}
          onMembersAdded={loadSettings}
        />
      </Modal>

      <Modal
        open={muteTarget !== null}
        onClose={() => setMuteTarget(null)}
        title={t('chat.muteMember')}
        footer={
          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={() => setMuteTarget(null)}>
              {t('common.cancel')}
            </button>
            <button className={styles.saveBtn} onClick={handleConfirmMute}>
              {t('chat.mute')}
            </button>
          </div>
        }
      >
        <div className={styles.body}>
          <div className={styles.section}>
            <label className={styles.label}>{t('chat.muteReason')}</label>
            <select
              className={styles.input}
              value={muteReason}
              onChange={(e) => setMuteReason(e.target.value)}
            >
              {MUTE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.section}>
            <label className={styles.label}>{t('chat.muteDuration')}</label>
            <select
              className={styles.input}
              value={muteDuration}
              onChange={(e) => setMuteDuration(Number(e.target.value))}
            >
              {MUTE_DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </>
  )
}
