'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Modal from '../../../components/Modal'
import ExternalImage from '../../../components/ExternalImage'
import ConversationList from '../../../components/messages/ConversationList'
import UserPickerModal, {
  type UserSearchItem,
} from '../../../components/messages/UserPickerModal'
import ForwardPickerModal, {
  type ForwardPickTarget,
} from '../../../components/messages/ForwardPickerModal'
import ChatWindow from '../../../components/messages/ChatWindow'
import CreateGroupModal from '../../../components/messages/CreateGroupModal'
import GroupSettingsPanel from '../../../components/messages/GroupSettingsPanel'
import ChatBackgroundPicker from '../../../components/messages/ChatBackgroundPicker'
import { useChatSocket } from '../../../hooks/useChatSocket'
import { useChatRoom } from '../../../hooks/useChatRoom'
import { useGroupChatSocket } from '../../../hooks/useGroupChatSocket'
import { useGroupChatRoom } from '../../../hooks/useGroupChatRoom'
import { useChatE2E, type ChatE2EStatus } from '../../../hooks/useChatE2E'
import { useE2ERecovery } from '../../../hooks/useE2ERecovery'
import { useAuth } from '../../../hooks/useAuth'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { useGroupCall } from '../../../contexts/GroupCallContext'
import { listChats, createDirectChat, deleteChat, listChatInvites, respondChatInvite, listGroupChats, getGroupSettings } from '../../../api/chats'
import { decryptChat, ensureChatKey } from '../../../utils/e2ee'
import type { ChatConversation, ChatInviteItem, ChatMessage, GroupChatConversation, ChatBackground } from '../../../types'
import styles from './Messages.module.css'

// Chạy fn trên từng item với độ đồng thời tối đa `limit`, giữ nguyên thứ tự.
async function mapLimited<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  )
  return results
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <MessagesContent />
    </Suspense>
  )
}

function MessagesContent() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const { isAuthenticated, initializing, user } = useAuth()

  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [loadingChats, setLoadingChats] = useState(true)
  const searchParams = useSearchParams()
  const [activeChatId, setActiveChatId] = useState<string | null>(
    searchParams.get('chat_id'),
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ChatConversation | null>(null)
  const [invites, setInvites] = useState<ChatInviteItem[]>([])
  const [respondingInvite, setRespondingInvite] = useState<string | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const e2eStatusRef = useRef<ChatE2EStatus>('unavailable')
  const autoSelectRef = useRef(false)

  // Khôi phục khóa E2E trên thiết bị mới: chặn hydrate danh sách (nội dung sẽ
  // giải mã ra rỗng) cho tới khi mở bằng PIN/recovery key hoặc bỏ qua.
  const e2eRecovery = useE2ERecovery()
  const [recoveryGate, setRecoveryGate] = useState<'checking' | 'unlocked' | 'skipped' | 'none'>('checking')
  const [recoverySecret, setRecoverySecret] = useState('')
  const [recoveryKind, setRecoveryKind] = useState<'pin' | 'recovery'>('pin')
  const [recoveryError, setRecoveryError] = useState<string | null>(null)

  // Group chat state
  const [groupConversations, setGroupConversations] = useState<GroupChatConversation[]>([])
  const [activeChatType, setActiveChatType] = useState<'direct' | 'group'>('direct')
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false)
  const [forwardPickerOpen, setForwardPickerOpen] = useState(false)
  const [forwardTarget, setForwardTarget] = useState<ChatMessage | null>(null)
  const [forwardDraft, setForwardDraft] = useState<{
    message: ChatMessage
    targetChatId: string
    targetType: 'direct' | 'group'
  } | null>(null)
  const [activeGroupMembers, setActiveGroupMembers] = useState<{ chatId: string; members: Map<string, { display_name: string; avatar_uri: string }> }>({ chatId: '', members: new Map() })
  const [backgroundPickerOpen, setBackgroundPickerOpen] = useState(false)

  const myUserId = user?.user_id ?? ''
  const socket = useChatSocket()
  const groupSocket = useGroupChatSocket()
  const { call: groupCall } = useGroupCall()

  const activeConversation =
    conversations.find((c) => c.chat_id === activeChatId) ?? null

  const activeGroupConversation =
    groupConversations.find((c) => c.chat_id === activeChatId) ?? null

  const chatBackground = useMemo<ChatBackground | null>(() => {
    if (!activeChatId) return null
    const list = activeChatType === 'group' ? groupConversations : conversations
    const conv = list.find((c) => c.chat_id === activeChatId)
    if (!conv?.background_type || !conv?.background_value) return null
    return { type: conv.background_type as ChatBackground['type'], value: conv.background_value }
  }, [activeChatId, activeChatType, conversations, groupConversations])

  const encryption = useChatE2E({
    chatId: activeChatType === 'direct' ? activeChatId : null,
    partnerUserId: activeChatType === 'direct' ? activeConversation?.partner.user_id ?? null : null,
    myUserId,
  })

  // Giải mã preview tin nhắn cuối của các hội thoại E2E. Nếu máy chưa có khóa
  // (chưa mở hội thoại lần nào) thì tự set-up khóa E2E (lấy từ server / tạo
  // mới) rồi giải mã. Không set-up được (đối phương chưa đăng ký khóa) → đánh
  // dấu rỗng để UI hiện placeholder khóa.
  const hydrateConversations = useCallback(
    async (list: ChatConversation[]): Promise<ChatConversation[]> => {
      const userId = myUserId
      if (!userId) return list

      const encryptedIndices: number[] = []
      list.forEach((conv, i) => {
        if (
          conv.is_encrypted &&
          conv.last_message &&
          conv.last_message.content &&
          conv.last_message.e2e_version === 1
        ) {
          encryptedIndices.push(i)
        }
      })
      const encrypted = encryptedIndices.map((i) => list[i])

      const hydrated = await mapLimited(encrypted, 4, async (conv) => {
        let key: string | null = null
        try {
          key = await ensureChatKey({
            chatId: conv.chat_id,
            myUserId: userId,
            partnerUserId: conv.partner.user_id,
          })
        } catch {
          key = null
        }
        if (!key || !conv.last_message) {
          return { ...conv, last_message: { ...conv.last_message!, content: '' } }
        }
        try {
          const content = await decryptChat(conv.chat_id, conv.last_message.content)
          return { ...conv, last_message: { ...conv.last_message, content } }
        } catch {
          return { ...conv, last_message: { ...conv.last_message, content: '' } }
        }
      })

      const next = [...list]
      encryptedIndices.forEach((idx, j) => {
        next[idx] = hydrated[j]
      })
      return next
    },
    [myUserId],
  )

  const refreshList = useCallback(async () => {
    try {
      const res = await listChats()
      const hydrated = await hydrateConversations(res.data)
      setConversations(hydrated)
    } catch {
      /* keep current list on background refresh */
    }
  }, [hydrateConversations])

  const refreshGroupList = useCallback(async () => {
    try {
      const res = await listGroupChats()
      setGroupConversations(res.data ?? [])
    } catch {
      /* keep current list on background refresh */
    }
  }, [])

  const onNewMessage = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => {
      refreshList()
      refreshGroupList()
    }, 600)
  }, [refreshList, refreshGroupList])

  const room = useChatRoom({
    chatId: activeChatType === 'direct' ? activeChatId : null,
    myUserId,
    socket,
    encryption,
    onNewMessage,
  })

  const groupRoom = useGroupChatRoom({
    chatId: activeChatType === 'group' ? activeChatId : null,
    myUserId,
    socket: groupSocket,
    onNewMessage,
  })

  // Sau khi khóa E2E của hội thoại đang mở trở nên sẵn sàng, refresh danh sách
  // để preview vừa giải mã hiển thị ngay (không phải chờ tin nhắn mới).
  useEffect(() => {
    if (e2eStatusRef.current === encryption.status) return
    e2eStatusRef.current = encryption.status
    if (encryption.status === 'ready') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshList()
    }
  }, [encryption.status, refreshList])

  const navigateToChat = useCallback(
    (chatId: string | null, type: 'direct' | 'group' = 'direct') => {
      setActiveChatId(chatId)
      setActiveChatType(type)
      const params = new URLSearchParams(searchParams.toString())
      if (chatId) {
        params.set('chat_id', chatId)
        params.set('type', type)
      } else {
        params.delete('chat_id')
        params.delete('type')
      }
      router.replace(`/messages?${params.toString()}`)
    },
    [searchParams, router],
  )

  // Cổng khôi phục khóa E2E (thiết bị mới): nếu chưa từng "giải quyết" recovery
  // ở localStorage của máy này và server có blob backup → chặn hydrate tới khi
  // mở khóa thành công hoặc bỏ qua. useE2ERecovery tự fetch meta khi mount.
  useEffect(() => {
    let cancelled = false
    // Đọc flag như một async step → setState nằm trong promise callback, tránh
    // react-hooks/set-state-in-effect (không setState đồng bộ trong effect).
    void (async () => {
      let seen = false
      try {
        seen = localStorage.getItem('linkup-e2e-recovery-resolved') === '1'
      } catch {
        /* private mode */
      }
      await Promise.resolve()
      if (cancelled) return
      if (seen) {
        setRecoveryGate('none')
        return
      }
      if (e2eRecovery.meta === null) return // chờ hook fetch xong
      if (e2eRecovery.meta.has_blob && e2eRecovery.meta.salt) {
        setRecoveryGate('checking')
      } else {
        setRecoveryGate('none')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [e2eRecovery.meta])

  const markRecoveryResolved = useCallback(() => {
    try {
      localStorage.setItem('linkup-e2e-recovery-resolved', '1')
    } catch {
      /* private mode */
    }
  }, [])

  const handleRecoverySkip = useCallback(() => {
    markRecoveryResolved()
    setRecoveryGate('skipped')
  }, [markRecoveryResolved])

  // Mở khóa: tryUnlock tự dẫn key + gửi hash check + import khóa vào IDB, rồi
  // hydrate lại danh sách hội thoại để preview giải mã được.
  const handleRecoveryUnlock = useCallback(async () => {
    if (!recoverySecret.trim() || e2eRecovery.busy) return
    setRecoveryError(null)
    try {
      await e2eRecovery.tryUnlock(recoverySecret.trim(), recoveryKind)
      markRecoveryResolved()
      setRecoveryGate('unlocked')
      await refreshList()
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : t('common.error'))
    }
  }, [e2eRecovery, recoverySecret, recoveryKind, markRecoveryResolved, refreshList, t])

  useEffect(() => {
    let cancelled = false
    // Không hydrate tới khi khôi phục được giải quyết (hoặc không có backup).
    if (recoveryGate === 'checking') return undefined
    Promise.all([listChats(), listGroupChats()])
      .then(([directRes, groupRes]) => {
        return hydrateConversations(directRes.data).then((hydrated) => {
          if (cancelled) return
          setConversations(hydrated)
          setGroupConversations(groupRes.data ?? [])

          if (!autoSelectRef.current) {
            autoSelectRef.current = true
            const queryChat = searchParams.get('chat_id')
            const queryType = searchParams.get('type') as 'direct' | 'group' | null

            if (queryChat && queryType === 'group') {
              setActiveChatId(queryChat)
              setActiveChatType('group')
            } else if (queryChat && hydrated.some((c) => c.chat_id === queryChat)) {
              setActiveChatId(queryChat)
              setActiveChatType('direct')
            } else if (!activeChatId && hydrated.length > 0) {
              setActiveChatId(hydrated[0].chat_id)
              setActiveChatType('direct')
            }
          }
        })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingChats(false)
      })
    return () => {
      cancelled = true
    }
  }, [hydrateConversations, searchParams, activeChatId, recoveryGate])

  useEffect(() => {
    if (activeChatType !== 'group' || !activeChatId) return
    let cancelled = false
    getGroupSettings(activeChatId)
      .then((res) => {
        if (cancelled) return
        const settings = res.data
        const memberMap = new Map<string, { display_name: string; avatar_uri: string }>()
        for (const m of settings.members ?? []) {
          memberMap.set(m.user_id, { display_name: m.display_name, avatar_uri: m.avatar_uri })
        }
        setActiveGroupMembers({ chatId: activeChatId, members: memberMap })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activeChatId, activeChatType])

  useEffect(() => {
    let cancelled = false
    listChatInvites()
      .then((res) => {
        if (!cancelled) setInvites(res.data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Draft chuyển tiếp chỉ có ý nghĩa khi đang đứng trong hội thoại đích; rời đi
  // (hoặc chọn hội thoại khác) là tự hủy để tránh chuyển tiếp nhầm.
  useEffect(() => {
    if (
      forwardDraft &&
      (forwardDraft.targetChatId !== activeChatId ||
        forwardDraft.targetType !== activeChatType)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForwardDraft(null)
    }
  }, [forwardDraft, activeChatId, activeChatType])

  const handleRespondInvite = async (invite: ChatInviteItem, accept: boolean) => {
    if (respondingInvite) return
    setRespondingInvite(invite.invite_id)
    try {
      const res = await respondChatInvite(invite.invite_id, accept)
      setInvites((prev) => prev.filter((i) => i.invite_id !== invite.invite_id))
      if (accept) {
        await refreshList()
        if (res.chat_id) navigateToChat(res.chat_id)
        toast({ type: 'success', title: t('chat.inviteAccepted') })
      } else {
        toast({ type: 'info', title: t('chat.inviteDeclined') })
      }
    } catch (err) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('common.error'),
      })
    } finally {
      setRespondingInvite(null)
    }
  }

  if (initializing) {
    return <div className={styles.page} />
  }

  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  const handlePickUser = async (user: UserSearchItem) => {
    setPickerOpen(false)
    try {
      const res = await createDirectChat(user.id)
      await refreshList()
      navigateToChat(res.chat_id)
    } catch (err) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('common.error'),
      })
    }
  }

  const handleDeleteChat = async () => {
    if (!deleteTarget) return
    try {
      await deleteChat(deleteTarget.chat_id)
      const remaining = conversations.filter((c) => c.chat_id !== deleteTarget.chat_id)
      setConversations(remaining)
      if (activeChatId === deleteTarget.chat_id) {
        navigateToChat(remaining[0]?.chat_id ?? null)
      }
      setDeleteTarget(null)
      toast({ type: 'success', title: t('chat.deleteChatSuccess') })
    } catch (err) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('common.error'),
      })
    }
  }

  const handleSelectGroup = (group: GroupChatConversation) => {
    navigateToChat(group.chat_id, 'group')
  }

  const handleGroupCreated = (chatId: string) => {
    setCreateGroupOpen(false)
    refreshGroupList()
    navigateToChat(chatId, 'group')
  }

  const handleGroupInviteAccepted = (groupChatId: string) => {
    refreshGroupList()
    refreshList()
    navigateToChat(groupChatId, 'group')
  }

  const handleOpenGroupSettings = () => {
    setGroupSettingsOpen(true)
  }

  const handleForwardMessage = (msg: ChatMessage) => {
    setForwardTarget(msg)
    setForwardPickerOpen(true)
  }

  const handleForwardPick = (target: ForwardPickTarget) => {
    setForwardPickerOpen(false)
    if (!forwardTarget) return
    setForwardDraft({
      message: forwardTarget,
      targetChatId: target.chatId,
      targetType: target.type,
    })
    navigateToChat(target.chatId, target.type)
  }

  const handleGroupSettingsUpdated = (settings: { members: Array<{ user_id: string; display_name: string; avatar_uri: string }> }) => {
    const memberMap = new Map<string, { display_name: string; avatar_uri: string }>()
    for (const m of settings.members) {
      memberMap.set(m.user_id, { display_name: m.display_name, avatar_uri: m.avatar_uri })
    }
    setActiveGroupMembers({ chatId: activeChatId ?? '', members: memberMap })
    refreshGroupList()
  }

  const handleGroupLeave = () => {
    setGroupSettingsOpen(false)
    setActiveGroupMembers({ chatId: '', members: new Map() })
    refreshGroupList()
    navigateToChat(null)
  }

  return (
    <div className={styles.page}>
      {invites.length > 0 && (
        <div className={styles.inviteBanner}>
          <div className={styles.inviteHeader}>
            <i className="bx bx-envelope-open" />
            <span>{t('chat.inviteTitle')}</span>
          </div>
          <div className={styles.inviteList}>
            {invites.map((invite) => (
              <div key={invite.invite_id} className={styles.inviteItem}>
                {invite.requester_avatar ? (
                  <ExternalImage
                    src={invite.requester_avatar}
                    alt=""
                    className={styles.inviteAvatar}
                  />
                ) : (
                  <div className={styles.inviteAvatar}>
                    <i className="bx bx-user" />
                  </div>
                )}
                <span className={styles.inviteName}>
                  {invite.requester_name ?? 'User'}
                </span>
                <div className={styles.inviteActions}>
                  <button
                    type="button"
                    className={styles.inviteAcceptBtn}
                    disabled={respondingInvite !== null}
                    onClick={() => handleRespondInvite(invite, true)}
                  >
                    {t('chat.inviteAccept')}
                  </button>
                  <button
                    type="button"
                    className={styles.inviteDeclineBtn}
                    disabled={respondingInvite !== null}
                    onClick={() => handleRespondInvite(invite, false)}
                  >
                    {t('chat.inviteDecline')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={`${styles.layout}${activeChatId ? ` ${styles.hasChat}` : ''}`}>
        <div className={styles.listPane}>
          <ConversationList
            conversations={conversations}
            groupConversations={groupConversations}
            activeChatId={activeChatId}
            myUserId={myUserId}
            loading={loadingChats}
            onSelect={(conv) => navigateToChat(conv.chat_id, 'direct')}
            onSelectGroup={handleSelectGroup}
            onNewChat={() => setPickerOpen(true)}
            onCreateGroup={() => setCreateGroupOpen(true)}
          />
        </div>
        <div className={styles.windowPane}>
          {activeChatType === 'group' && activeGroupConversation ? (
            <ChatWindow
              conversation={null}
              myUserId={myUserId}
              room={groupRoom}
              mode="group"
              onReact={groupRoom.reactToMessage}
              onForward={handleForwardMessage}
              forwarding={forwardDraft?.message ?? null}
              onClearForward={() => setForwardDraft(null)}
              groupChatId={activeChatId}
              groupName={activeGroupConversation.name}
              groupAvatarUri={activeGroupConversation.avatar_uri}
              memberCount={activeGroupConversation.member_count}
              typingUsers={groupRoom.typingUsers}
              memberNames={activeChatType === 'group' && activeGroupMembers.chatId === activeChatId ? activeGroupMembers.members : undefined}
              onOpenGroupSettings={handleOpenGroupSettings}
              groupCallHistory={groupRoom.callHistory}
              activeGroupCallId={groupCall?.callId ?? null}
              onBack={() => navigateToChat(null)}
              chatBackground={chatBackground}
              onOpenBackgroundPicker={() => setBackgroundPickerOpen(true)}
            />
          ) : activeChatType === 'direct' ? (
            <>
              {encryption.status === 'partner_changed' && (
                <div className={styles.e2eWarningBanner}>
                  <i className="bx bx-shield-quarter" />
                  <span>{t('chat.e2ePartnerChanged')}</span>
                </div>
              )}
              <ChatWindow
                conversation={activeConversation}
                myUserId={myUserId}
                room={room}
                isEncrypted={encryption.ready || Boolean(activeConversation?.is_encrypted)}
                mode="direct"
                onReact={room.reactToMessage}
                onForward={handleForwardMessage}
                forwarding={forwardDraft?.message ?? null}
                onClearForward={() => setForwardDraft(null)}
                onDeleteChat={
                  activeConversation ? () => setDeleteTarget(activeConversation) : undefined
                }
                onGroupInviteAccepted={handleGroupInviteAccepted}
                onBack={() => navigateToChat(null)}
                chatBackground={chatBackground}
                onOpenBackgroundPicker={() => setBackgroundPickerOpen(true)}
              />
            </>
          ) : (
            <div className={styles.center}>
              <i className="bx bx-message-rounded-dots" />
              <p>{t('chat.selectConversation')}</p>
            </div>
          )}
        </div>
      </div>

      <UserPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handlePickUser}
      />

      <CreateGroupModal
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onCreated={handleGroupCreated}
      />

      {recoveryGate === 'checking' && (
        <Modal
          open
          onClose={handleRecoverySkip}
          title={t('chat.recovery.gateTitle')}
          footer={
            <div className={styles.modalFooter}>
              <button className={styles.ghostBtn} onClick={handleRecoverySkip}>
                {t('chat.recovery.skip')}
              </button>
              <button className={styles.primaryBtn} disabled={!recoverySecret.trim() || e2eRecovery.busy} onClick={() => void handleRecoveryUnlock()}>
                {e2eRecovery.busy ? t('common.loading') : t('chat.recovery.unlock')}
              </button>
            </div>
          }
        >
          <p className={styles.modalText}>{t('chat.recovery.gateSubtitle')}</p>
          <div className={styles.recoveryTabs}>
            <button
              type="button"
              className={`${styles.recoveryTab}${recoveryKind === 'pin' ? ` ${styles.recoveryTabActive}` : ''}`}
              onClick={() => setRecoveryKind('pin')}
            >
              {t('chat.recovery.pinTab')}
            </button>
            <button
              type="button"
              className={`${styles.recoveryTab}${recoveryKind === 'recovery' ? ` ${styles.recoveryTabActive}` : ''}`}
              onClick={() => setRecoveryKind('recovery')}
            >
              {t('chat.recovery.recoveryTab')}
            </button>
          </div>
          <input
            type={recoveryKind === 'pin' ? 'password' : 'text'}
            autoComplete="off"
            value={recoverySecret}
            onChange={(e) => setRecoverySecret(e.target.value)}
            className={styles.recoveryInput}
            placeholder={
              recoveryKind === 'pin'
                ? t('chat.recovery.pinPlaceholder')
                : t('chat.recovery.recoveryPlaceholder')
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleRecoveryUnlock()
            }}
          />
          {recoveryError && (
            <p className={styles.recoveryError}>{recoveryError}</p>
          )}
        </Modal>
      )}

      <ForwardPickerModal
        open={forwardPickerOpen}
        source={forwardTarget}
        onClose={() => setForwardPickerOpen(false)}
        conversations={conversations}
        groupConversations={groupConversations}
        onPick={handleForwardPick}
      />

      {activeChatId && activeChatType === 'group' && (
        <GroupSettingsPanel
          open={groupSettingsOpen}
          onClose={() => setGroupSettingsOpen(false)}
          chatId={activeChatId}
          myUserId={myUserId}
          onSettingsUpdated={handleGroupSettingsUpdated}
          onLeave={handleGroupLeave}
          onOpenBackgroundPicker={() => setBackgroundPickerOpen(true)}
          currentBackground={chatBackground}
        />
      )}

      {activeChatId && (
        <ChatBackgroundPicker
          open={backgroundPickerOpen}
          onClose={() => setBackgroundPickerOpen(false)}
          chatId={activeChatId}
          currentBackground={chatBackground}
          onApplied={(bg) => {
            if (activeChatType === 'group') {
              setGroupConversations((prev) =>
                prev.map((c) =>
                  c.chat_id === activeChatId
                    ? { ...c, background_type: bg?.type ?? undefined, background_value: bg?.value ?? undefined }
                    : c,
                ),
              )
            } else {
              setConversations((prev) =>
                prev.map((c) =>
                  c.chat_id === activeChatId
                    ? { ...c, background_type: bg?.type ?? undefined, background_value: bg?.value ?? undefined }
                    : c,
                ),
              )
            }
          }}
          mode={activeChatType}
        />
      )}

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t('chat.deleteChat')}
        footer={
          <div className={styles.modalFooter}>
            <button className={styles.ghostBtn} onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </button>
            <button className={styles.dangerBtn} onClick={handleDeleteChat}>
              {t('chat.delete')}
            </button>
          </div>
        }
      >
        <p className={styles.modalText}>{t('chat.deleteChatConfirm')}</p>
      </Modal>
    </div>
  )
}
