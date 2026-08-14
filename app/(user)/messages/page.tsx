'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '../../../components/Modal'
import ExternalImage from '../../../components/ExternalImage'
import ConversationList from '../../../components/messages/ConversationList'
import UserPickerModal, {
  type UserSearchItem,
} from '../../../components/messages/UserPickerModal'
import ChatWindow from '../../../components/messages/ChatWindow'
import { useChatSocket } from '../../../hooks/useChatSocket'
import { useChatRoom } from '../../../hooks/useChatRoom'
import { useChatE2E } from '../../../hooks/useChatE2E'
import { useAuth } from '../../../hooks/useAuth'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { listChats, createDirectChat, deleteChat, listChatInvites, respondChatInvite } from '../../../api/chats'
import { getChatKey as getStoredChatKey } from '../../../utils/idb'
import { decryptMessage } from '../../../utils/e2ee'
import type { ChatConversation, ChatInviteItem } from '../../../types'
import styles from './Messages.module.css'

export default function MessagesPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const { isAuthenticated, initializing, user } = useAuth()

  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [loadingChats, setLoadingChats] = useState(true)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ChatConversation | null>(null)
  const [invites, setInvites] = useState<ChatInviteItem[]>([])
  const [respondingInvite, setRespondingInvite] = useState<string | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const myUserId = user?.user_id ?? ''
  const socket = useChatSocket()

  const activeConversation =
    conversations.find((c) => c.chat_id === activeChatId) ?? null

  const encryption = useChatE2E({
    chatId: activeChatId,
    partnerUserId: activeConversation?.partner.user_id ?? null,
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

  const onNewMessage = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => {
      refreshList()
    }, 600)
  }, [refreshList])

  const room = useChatRoom({
    chatId: activeChatId,
    myUserId,
    socket,
    encryption,
    onNewMessage,
  })

  useEffect(() => {
    let cancelled = false
    listChats()
      .then((res) => hydrateConversations(res.data))
      .then((hydrated) => {
        if (!cancelled) setConversations(hydrated)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingChats(false)
      })
    return () => {
      cancelled = true
    }
  }, [hydrateConversations])

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
        if (res.chat_id) setActiveChatId(res.chat_id)
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

  const [selectionInitialized, setSelectionInitialized] = useState(false)
  if (!selectionInitialized && !loadingChats && conversations.length > 0) {
    setSelectionInitialized(true)
    const params =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : null
    const queryChat = params?.get('chat_id') ?? null
    const target =
      queryChat && conversations.some((c) => c.chat_id === queryChat)
        ? queryChat
        : conversations[0].chat_id
    setActiveChatId(target)
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
      setActiveChatId(res.chat_id)
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
        setActiveChatId(remaining[0]?.chat_id ?? null)
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
            activeChatId={activeChatId}
            myUserId={myUserId}
            loading={loadingChats}
            onSelect={(conv) => setActiveChatId(conv.chat_id)}
            onNewChat={() => setPickerOpen(true)}
          />
        </div>
        <div className={styles.windowPane}>
          <ChatWindow
            conversation={activeConversation}
            myUserId={myUserId}
            room={room}
            isEncrypted={encryption.ready || Boolean(activeConversation?.is_encrypted)}
            onDeleteChat={
              activeConversation ? () => setDeleteTarget(activeConversation) : undefined
            }
          />
        </div>
      </div>

      <UserPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handlePickUser}
      />

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
