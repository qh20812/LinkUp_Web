'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { EmojiImage } from './EmojiImage'
import type { ChatMessage, EmojiItem } from '../../types'
import styles from './ChatWindow.module.css'

const QUICK_REACT_EMOJI_IDS = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥']

interface MessageToolbarProps {
  msg: ChatMessage
  mine: boolean
  visible: boolean
  emojis: Map<string, EmojiItem>
  onReact?: (messageId: string, emojiId: string) => void
  onReply: () => void
  onForward?: () => void
  onPin: () => void
  onUnpin: () => void
  onDelete: () => void
  isPinned: boolean
  canForward: boolean
  onToolbarMouseEnter: () => void
  onToolbarMouseLeave: () => void
}

export default function MessageToolbar({
  msg,
  mine,
  visible,
  emojis,
  onReact,
  onReply,
  onForward,
  onPin,
  onUnpin,
  onDelete,
  isPinned,
  canForward,
  onToolbarMouseEnter,
  onToolbarMouseLeave,
}: MessageToolbarProps) {
  const { t } = useTranslation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [reactionOpen, setReactionOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const reactionRef = useRef<HTMLDivElement>(null)
  const reactionBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!moreOpen && !reactionOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (moreRef.current?.contains(target) || moreBtnRef.current?.contains(target)) return
      if (reactionRef.current?.contains(target) || reactionBtnRef.current?.contains(target)) return
      setMoreOpen(false)
      setReactionOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moreOpen, reactionOpen])

  const quickEmojis = useMemo(() => {
    const result: EmojiItem[] = []
    for (const code of QUICK_REACT_EMOJI_IDS) {
      const item = emojis.get(code)
      if (item) result.push(item)
    }
    return result
  }, [emojis])

  const handleReact = (emojiId: string) => {
    setReactionOpen(false)
    onReact?.(msg.id, emojiId)
  }

  return (
    <div
      className={`${styles.messageToolbar} ${mine ? styles.toolbarMine : styles.toolbarTheirs} ${visible ? styles.toolbarVisible : ''}`}
      onMouseEnter={onToolbarMouseEnter}
      onMouseLeave={onToolbarMouseLeave}
      role="toolbar"
      aria-label={t('chat.messageActions')}
    >
      {onReact && (
        <div className={styles.toolbarReactWrap} ref={reactionRef}>
          <button
            ref={reactionBtnRef}
            className={`${styles.toolbarActionBtn} ${reactionOpen ? styles.toolbarActionBtnActive : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setReactionOpen((v) => !v)
              setMoreOpen(false)
            }}
            aria-label={t('chat.addReaction')}
            title={t('chat.addReaction')}
          >
            <i className="bx bx-smile" />
          </button>
          {reactionOpen && (
            <div className={styles.toolbarReactionPicker}>
              {quickEmojis.map((item) => (
                <button
                  key={item.id}
                  className={styles.toolbarReactionPickBtn}
                  onClick={() => handleReact(item.id)}
                  title={item.code}
                >
                  <EmojiImage emoji={item} className={styles.toolbarReactionPickEmoji} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <button
        className={styles.toolbarActionBtn}
        onClick={onReply}
        aria-label={t('chat.reply')}
        title={t('chat.reply')}
      >
        <i className="bx bx-reply" />
      </button>
      <div className={styles.toolbarMoreWrap} ref={moreRef}>
        <button
          ref={moreBtnRef}
          className={`${styles.toolbarActionBtn} ${moreOpen ? styles.toolbarActionBtnActive : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            setMoreOpen((v) => !v)
            setReactionOpen(false)
          }}
          aria-label={t('chat.more')}
          title={t('chat.more')}
        >
          <i className="bx bx-dots-horizontal-rounded" />
        </button>
        {moreOpen && (
          <div className={styles.toolbarMoreMenu} onClick={(e) => e.stopPropagation()}>
            {isPinned ? (
              <button onClick={() => { onUnpin(); setMoreOpen(false) }}>
                <i className="bx bx-pin" /> {t('chat.unpin')}
              </button>
            ) : (
              <button onClick={() => { onPin(); setMoreOpen(false) }}>
                <i className="bx bx-pin" /> {t('chat.pin')}
              </button>
            )}
            {canForward && (
              <button onClick={() => { onForward?.(); setMoreOpen(false) }}>
                <i className="bx bx-arrow-forward" /> {t('chat.forward')}
              </button>
            )}
            <button
              className={styles.moreMenuDanger}
              onClick={() => { onDelete(); setMoreOpen(false) }}
            >
              <i className="bx bx-trash" /> {t('chat.deleteForMe')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
