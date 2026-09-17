'use client'

import { useMemo, useState } from 'react'
import Modal from '../Modal'
import ExternalImage from '../ExternalImage'
import { useTranslation } from '../../hooks/useTranslation'
import type { ChatConversation, ChatMessage, GroupChatConversation } from '../../types'
import styles from './ForwardPickerModal.module.css'

export interface ForwardPickTarget {
  chatId: string
  type: 'direct' | 'group'
}

interface ForwardPickerModalProps {
  open: boolean
  source: ChatMessage | null
  onClose: () => void
  conversations: ChatConversation[]
  groupConversations: GroupChatConversation[]
  onPick: (target: ForwardPickTarget) => void
}

export default function ForwardPickerModal({
  open,
  source,
  onClose,
  conversations,
  groupConversations,
  onPick,
}: ForwardPickerModalProps) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')

  const filteredDirect = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return conversations.filter(
      (c) => !kw || (c.partner.display_name || '').toLowerCase().includes(kw),
    )
  }, [conversations, keyword])

  const filteredGroups = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return groupConversations.filter(
      (g) => !kw || (g.name || '').toLowerCase().includes(kw),
    )
  }, [groupConversations, keyword])

  return (
    <Modal open={open} onClose={onClose} title={t('chat.forwardTo')}>
      {source && (
        <div className={styles.sourcePreview}>
          <i className="bx bx-arrow-forward" />
          <span className={styles.sourceText}>
            {source.content || t('chat.attachment')}
          </span>
        </div>
      )}
      <input
        className={styles.search}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder={t('chat.forwardSearch')}
        aria-label={t('chat.forwardSearch')}
      />
      <div className={styles.list}>
        {filteredGroups.length > 0 && (
          <>
            <div className={styles.sectionLabel}>{t('chat.groups')}</div>
            {filteredGroups.map((g) => (
              <button
                key={g.chat_id}
                type="button"
                className={styles.item}
                onClick={() => onPick({ chatId: g.chat_id, type: 'group' })}
              >
                {g.avatar_uri ? (
                  <ExternalImage src={g.avatar_uri} alt="" className={styles.avatar} />
                ) : (
                  <div className={styles.avatar}>
                    <i className="bx bx-group" />
                  </div>
                )}
                <span className={styles.name}>{g.name}</span>
                <i className={`${styles.chevron} bx bx-chevron-right`} />
              </button>
            ))}
          </>
        )}
        {filteredDirect.length > 0 && (
          <>
            <div className={styles.sectionLabel}>{t('chat.directChats')}</div>
            {filteredDirect.map((c) => (
              <button
                key={c.chat_id}
                type="button"
                className={styles.item}
                onClick={() => onPick({ chatId: c.chat_id, type: 'direct' })}
              >
                {c.partner.avatar_uri ? (
                  <ExternalImage src={c.partner.avatar_uri} alt="" className={styles.avatar} />
                ) : (
                  <div className={styles.avatar}>
                    <i className="bx bx-user" />
                  </div>
                )}
                <span className={styles.name}>{c.partner.display_name}</span>
                <i className={`${styles.chevron} bx bx-chevron-right`} />
              </button>
            ))}
          </>
        )}
        {filteredGroups.length === 0 && filteredDirect.length === 0 && (
          <p className={styles.empty}>{t('chat.forwardNoTarget')}</p>
        )}
      </div>
    </Modal>
  )
}