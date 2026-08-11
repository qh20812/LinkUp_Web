'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '../../../components/Modal'
import ConversationList from '../../../components/messages/ConversationList'
import UserPickerModal, {
  type UserSearchItem,
} from '../../../components/messages/UserPickerModal'
import ChatWindow from '../../../components/messages/ChatWindow'
import { useChatSocket } from '../../../hooks/useChatSocket'
import { useChatRoom } from '../../../hooks/useChatRoom'
import { useAuth } from '../../../hooks/useAuth'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { listChats, createDirectChat, deleteChat } from '../../../api/chats'
import type { ChatConversation } from '../../../types'
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
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const myUserId = user?.user_id ?? ''
  const socket = useChatSocket()

  const refreshList = useCallback(async () => {
    try {
      const res = await listChats()
      setConversations(res.data)
    } catch {
      /* keep current list on background refresh */
    }
  }, [])

  const onNewMessage = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => {
      refreshList()
    }, 600)
  }, [refreshList])

  const room = useChatRoom({ chatId: activeChatId, myUserId, socket, onNewMessage })

  useEffect(() => {
    let cancelled = false
    listChats()
      .then((res) => {
        if (!cancelled) setConversations(res.data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingChats(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const [selectionInitialized, setSelectionInitialized] = useState(false)
  if (!selectionInitialized && !loadingChats && conversations.length > 0) {
    setSelectionInitialized(true)
    setActiveChatId(conversations[0].chat_id)
  }

  if (initializing) {
    return <div className={styles.page} />
  }

  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  const activeConversation =
    conversations.find((c) => c.chat_id === activeChatId) ?? null

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
