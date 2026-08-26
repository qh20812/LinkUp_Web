'use client'

import { useEffect, useMemo, useState } from 'react'
import ExternalImage from '../ExternalImage'
import MultiAvatar from '../MultiAvatar'
import OnlineIndicator from '../OnlineIndicator'
import { usePresence } from '../../contexts/PresenceContext'
import { useTranslation } from '../../hooks/useTranslation'
import { useEmojis } from '../../hooks/useEmojis'
import { formatChatTime } from '../../utils/chat'
import { emojiByCode, getEmotionEmojis } from '../../utils/emojis'
import { renderEmojiContent } from './EmojiImage'
import type { ChatConversation, GroupChatConversation } from '../../types'
import styles from './ConversationList.module.css'

interface ConversationListProps {
  conversations: ChatConversation[]
  groupConversations: GroupChatConversation[]
  activeChatId: string | null
  myUserId: string
  loading: boolean
  onSelect: (chat: ChatConversation) => void
  onSelectGroup?: (group: GroupChatConversation) => void
  onNewChat: () => void
  onCreateGroup?: () => void
}

export default function ConversationList({
  conversations,
  groupConversations,
  activeChatId,
  myUserId,
  loading,
  onSelect,
  onSelectGroup,
  onNewChat,
  onCreateGroup,
}: ConversationListProps) {
  const { t } = useTranslation()
  const { emojis } = useEmojis()
  const { isOnline, prefetchPresence } = usePresence()
  const emojiCodeMap = useMemo(() => {
    const map = emojiByCode(getEmotionEmojis())
    for (const e of emojis.values()) map.set(e.code, e)
    return map
  }, [emojis])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const ids = conversations.map((c) => c.partner.user_id)
    if (ids.length > 0) prefetchPresence(ids)
  }, [conversations, prefetchPresence])

  const normalized = filter.trim().toLowerCase()
  const filteredDirect = normalized
    ? conversations.filter((c) =>
        c.partner.display_name.toLowerCase().includes(normalized),
      )
    : conversations
  const filteredGroups = normalized
    ? groupConversations.filter((c) => c.name.toLowerCase().includes(normalized))
    : groupConversations

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>{t('sidebar.messages')}</span>
        <div className={styles.headerActions}>
          {onCreateGroup && (
            <button
              className={styles.secondaryBtn}
              onClick={onCreateGroup}
              title={t('chat.createGroup')}
              aria-label={t('chat.createGroup')}
            >
              <i className="bx bx-group" />
            </button>
          )}
          <button
            className={styles.newBtn}
            onClick={onNewChat}
            title={t('chat.newMessage')}
            aria-label={t('chat.newMessage')}
          >
            <i className="bx bx-plus" />
          </button>
        </div>
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
        {loading && conversations.length === 0 && groupConversations.length === 0 && (
          <div className={styles.center}>
            <span>{t('common.loading')}</span>
          </div>
        )}

        {!loading && filteredDirect.length === 0 && filteredGroups.length === 0 && (
          <div className={styles.center}>
            <i className="bx bx-message-rounded-dots" />
            <p>
              {normalized
                ? t('chat.noResults')
                : t('chat.noConversations')}
            </p>
          </div>
        )}

        {filteredDirect.length > 0 && (
          <>
            <div className={styles.sectionHeader}>
              {t('chat.directMessages')}
            </div>
            {filteredDirect.map((conv) => (
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
                  <OnlineIndicator isOnline={isOnline(conv.partner.user_id)} />
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
                        {conv.last_message.sender_id === myUserId
                          ? t('chat.youPrefix')
                          : ''}
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
            ))}
          </>
        )}

        {filteredGroups.length > 0 && (
          <>
            <div className={styles.sectionHeader}>
              {t('chat.groupChats')}
            </div>
            {filteredGroups.map((group) => (
              <button
                key={group.chat_id}
                className={`${styles.row} ${
                  group.chat_id === activeChatId ? styles.active : ''
                }`}
                onClick={() => onSelectGroup?.(group)}
              >
                <div className={styles.avatar}>
                  {group.avatar_uri ? (
                    <ExternalImage src={group.avatar_uri} alt="" />
                  ) : (
                    <MultiAvatar srcs={[]} size={40} />
                  )}
                </div>
                <div className={styles.meta}>
                  <div className={styles.rowTop}>
                    <span className={styles.name}>{group.name}</span>
                    {group.last_message && (
                      <span className={styles.time}>
                        {formatChatTime(group.last_message.created_at, t)}
                      </span>
                    )}
                  </div>
                  <span className={styles.preview}>
                    {group.member_count} {t('chat.members')}
                    {group.last_message ? (
                      <> &middot; {group.last_message.content || t('chat.mediaMessage')}</>
                    ) : null}
                  </span>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
