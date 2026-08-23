'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Modal from '../../../components/Modal'
import ExternalImage from '../../../components/ExternalImage'
import ConversationList from '../../../components/messages/ConversationList'
import UserPickerModal, {
  type UserSearchItem,
} from '../../../components/messages/UserPickerModal'
import ChatWindow from '../../../components/messages/ChatWindow'
import CreateGroupModal from '../../../components/messages/CreateGroupModal'
import GroupSettingsPanel from '../../../components/messages/GroupSettingsPanel'
import { useChatSocket } from '../../../hooks/useChatSocket'
import { useChatRoom } from '../../../hooks/useChatRoom'
import { useGroupChatSocket } from '../../../hooks/useGroupChatSocket'
import { useGroupChatRoom } from '../../../hooks/useGroupChatRoom'
import { useChatE2E } from '../../../hooks/useChatE2E'
import { useAuth } from '../../../hooks/useAuth'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { listChats, createDirectChat, deleteChat, listChatInvites, respondChatInvite, listGroupChats, getGroupSettings } from '../../../api/chats'
import { getChatKey as getStoredChatKey } from '../../../utils/idb'
import { decryptMessage } from '../../../utils/e2ee'
import type { ChatConversation, ChatInviteItem, GroupChatConversation } from '../../../types'
import styles from './Messages.module.css'

export default function MessagesPage() {
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

  // Group chat state
  const [groupConversations, setGroupConversations] = useState<GroupChatConversation[]>([])
  const [activeChatType, setActiveChatType] = useState<'direct' | 'group'>('direct')
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false)
  const [activeGroupMembers, setActiveGroupMembers] = useState<Map<string, { display_name: string; avatar_uri: string }>>(new Map())

  const myUserId = user?.user_id ?? ''
  const socket = useChatSocket()
  const groupSocket = useGroupChatSocket()

  const activeConversation =
    conversations.find((c) => c.chat_id === activeChatId) ?? null

  const activeGroupConversation =
    groupConversations.find((c) => c.chat_id === activeChatId) ?? null

  const encryption = useChatE2E({
    chatId: activeChatType === 'direct' ? activeChatId : null,
    partnerUserId: activeChatType === 'direct' ? activeConversation?.partner.user_id ?? null : null,
    myUserId,
  })

  // Giải mã preview tin nhắn cuối của các hội thoại E2E. Nếu máy chưa có khóa
  // (chưa mở hội thoại lần nào) thì đánh dấu rỗng để UI hiện placeholder khóa.
  const hydrateConversations = useCallback(
    async (list: ChatConversation[]): Promise<ChatConversation[]> => {
      return Promise.all(
        list.map(async (conv) => {
          if (
            !conv.is_encrypted ||
            !conv.last_message ||
            !conv.last_message.content
          ) {
            return conv
          }
          const key = await getStoredChatKey(conv.chat_id)
          if (!key) {
            return { ...conv, last_message: { ...conv.last_message, content: '' } }
          }
          try {
            const plain = await decryptMessage(key, conv.last_message.content)
            return { ...conv, last_message: { ...conv.last_message, content: plain } }
          } catch {
            return { ...conv, last_message: { ...conv.last_message, content: '' } }
          }
        }),
      )
    },
    [],
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

  useEffect(() => {
    let cancelled = false
    Promise.all([listChats(), listGroupChats()])
      .then(([directRes, groupRes]) => {
        return hydrateConversations(directRes.data).then((hydrated) => {
          if (cancelled) return
          setConversations(hydrated)
          setGroupConversations(groupRes.data ?? [])

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
        })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingChats(false)
      })
    return () => {
      cancelled = true
    }
  }, [hydrateConversations, searchParams, activeChatId])

  useEffect(() => {
    if (activeChatType !== 'group' || !activeChatId) {
      setActiveGroupMembers(new Map())
      return
    }
    let cancelled = false
    getGroupSettings(activeChatId)
      .then((res) => {
        if (cancelled) return
        const settings = res.data
        const memberMap = new Map<string, { display_name: string; avatar_uri: string }>()
        for (const m of settings.members ?? []) {
          memberMap.set(m.user_id, { display_name: m.display_name, avatar_uri: m.avatar_uri })
        }
        setActiveGroupMembers(memberMap)
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

  const handleOpenGroupSettings = () => {
    setGroupSettingsOpen(true)
  }

  const handleGroupSettingsUpdated = (settings: { members: Array<{ user_id: string; display_name: string; avatar_uri: string }> }) => {
    const memberMap = new Map<string, { display_name: string; avatar_uri: string }>()
    for (const m of settings.members) {
      memberMap.set(m.user_id, { display_name: m.display_name, avatar_uri: m.avatar_uri })
    }
    setActiveGroupMembers(memberMap)
    refreshGroupList()
  }

  const handleGroupLeave = () => {
    setGroupSettingsOpen(false)
    setActiveGroupMembers(new Map())
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
      <div className={styles.layout}>
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
              groupName={activeGroupConversation.name}
              memberCount={activeGroupConversation.member_count}
              typingUsers={groupRoom.typingUsers}
              memberNames={activeGroupMembers}
              onOpenGroupSettings={handleOpenGroupSettings}
            />
          ) : activeChatType === 'direct' ? (
            <ChatWindow
              conversation={activeConversation}
              myUserId={myUserId}
              room={room}
              isEncrypted={encryption.ready || Boolean(activeConversation?.is_encrypted)}
              mode="direct"
              onDeleteChat={
                activeConversation ? () => setDeleteTarget(activeConversation) : undefined
              }
            />
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

      {activeChatId && activeChatType === 'group' && (
        <GroupSettingsPanel
          open={groupSettingsOpen}
          onClose={() => setGroupSettingsOpen(false)}
          chatId={activeChatId}
          myUserId={myUserId}
          onSettingsUpdated={handleGroupSettingsUpdated}
          onLeave={handleGroupLeave}
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
