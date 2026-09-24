'use client'

import { useRef, useState, useMemo, useEffect, type RefObject } from 'react'
import styles from './EmojiPicker.module.css'
import { useTranslation } from '../hooks/useTranslation'
import { EMOTION_GROUPS, EMOTION_EMOJIS, type EmojiGroup } from '../utils/emojis'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  /** Element that toggles this picker — clicks on it are not treated as outside. */
  ignoreRef?: RefObject<HTMLElement | null>
}

export default function EmojiPicker({ onSelect, onClose, ignoreRef }: EmojiPickerProps) {
  const { t } = useTranslation()
  const [group, setGroup] = useState<EmojiGroup>('positive')
  const rootRef = useRef<HTMLDivElement>(null)

  const emojis = useMemo(() => EMOTION_EMOJIS.filter((e) => e.group === group), [group])

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (ignoreRef?.current?.contains(target)) return
      if (rootRef.current && !rootRef.current.contains(target)) onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, ignoreRef])

  return (
    <div className={styles.root} ref={rootRef} role="dialog" aria-label={t('composer.emoji')}>
      <div className={styles.tabs}>
        {EMOTION_GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            className={`${styles.tab} ${group === g ? styles.tabActive : ''}`}
            onClick={() => setGroup(g)}
          >
            {t(`composer.emojiCat.${g}`)}
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        {emojis.map((e) => (
          <button
            key={e.code}
            type="button"
            className={styles.item}
            onClick={() => onSelect(e.emoji)}
            title={e.label}
            aria-label={e.label}
          >
            <span className={styles.char}>{e.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  )
}