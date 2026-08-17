'use client'

import { useMemo, useState } from 'react'
import ExternalImage from '../ExternalImage'
import OnlineIndicator from '../OnlineIndicator'
import { useTranslation } from '../../hooks/useTranslation'
import { useEmojis } from '../../hooks/useEmojis'
import { usePresenceBatch } from '../../hooks/usePresence'
import { formatChatTime } from '../../utils/chat'
import { emojiByCode, getEmotionEmojis } from '../../utils/emojis'
import { renderEmojiContent } from './EmojiImage'
import type { ChatConversation } from '../../types'
import styles from './ConversationList.module.css'

interface ConversationListProps {
  conversations: ChatConversation[]
  activeChatId: string | null
  myUserId: string
  loading: boolean
  onSelect: (chat: ChatConversation) => void
  onNewChat: () => void
}

export default function ConversationList({
  conversations,
  activeChatId,
  myUserId,
  loading,
  onSelect,
  onNewChat,
}: ConversationListProps) {
  const { t } = useTranslation()
  const { emojis } = useEmojis()
  const emojiCodeMap = useMemo(() => {
    const map = emojiByCode(getEmotionEmojis())
    for (const e of emojis.values()) map.set(e.code, e)
    return map
  }, [emojis])
  const [filter, setFilter] = useState('')

  const normalized = filter.trim().toLowerCase()
  const filtered = normalized
    ? conversations.filter((c) =>
        c.partner.display_name.toLowerCase().includes(normalized),
      )
    : conversations

  const partnerUserIds = useMemo(
    () => filtered.map((c) => c.partner.user_id).filter(Boolean),
    [filtered],
  )
  const { getPresenceForUser } = usePresenceBatch(partnerUserIds)

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>{t('sidebar.messages')}</span>
        <button
          className={styles.newBtn}
          onClick={onNewChat}
          title={t('chat.newMessage')}
          aria-label={t('chat.newMessage')}
        >
          <i className="bx bx-plus" />
        </button>
      </div>

      <div className={styles.search}>
        <i className="bx bx-search" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t('chat.search')}
        />
        {filter && (
          <button className={styles.clearBtn} onClick={() => setFilter('')}>
            <i className="bx bx-x" />
          </button>
        )}
      </div>

      <div className={styles.list}>
        {loading && conversations.length === 0 && (
          <div className={styles.center}>
            <span>{t('common.loading')}</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className={styles.center}>
            <i className="bx bx-message-rounded-dots" />
            <p>
              {normalized ? t('chat.noResults') : t('chat.noConversations')}
            </p>
          </div>
        )}

        {filtered.map((conv) => {
          const { isOnline } = getPresenceForUser(conv.partner.user_id)
          return (
            <button
              key={conv.chat_id}
              className={`${styles.row} ${
                conv.chat_id === activeChatId ? styles.active : ''
              }`}
              onClick={() => onSelect(conv)}
            >
              <div className={styles.avatar}>
                {conv.partner.avatar_uri ? (
                  <ExternalImage src={conv.partner.avatar_uri} alt="" />
                ) : (
                  <i className="bx bxs-user" />
                )}
                <div className={styles.onlineIndicator}>
                  <OnlineIndicator isOnline={isOnline} size="small" />
                </div>
              </div>
              <div className={styles.meta}>
                <div className={styles.rowTop}>
                  <span className={styles.name}>
                    {conv.partner.display_name || t('chat.unknown')}
                  </span>
                  {conv.last_message && (
                    <span className={styles.time}>
                      {formatChatTime(conv.last_message.created_at, t)}
                    </span>
                  )}
                </div>
                <span className={styles.preview}>
                  {conv.last_message ? (
                    <>
                      {conv.last_message.sender_id === myUserId ? t('chat.youPrefix') : ''}
                      {conv.last_message.media_id
                        ? t('chat.mediaMessage')
                        : conv.last_message.emoji_id
                          ? t('chat.emojiMessage')
                          : conv.is_encrypted && !conv.last_message.content
                            ? t('chat.encryptedPreview')
                            : renderEmojiContent(
                                conv.last_message.content || t('chat.mediaMessage'),
                                emojiCodeMap,
                                `pv-${conv.chat_id}`,
                              )}
                    </>
                  ) : (
                    t('chat.newChat')
                  )}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
