'use client'

import MessageMedia from './MessageMedia'
import type { ChatMessage } from '../../types'
import styles from './ChatWindow.module.css'

interface MediaStackProps {
  msgs: ChatMessage[]
  onOpen?: (msgs: ChatMessage[], index: number) => void
}

export default function MediaStack({ msgs, onOpen }: MediaStackProps) {
  const count = msgs.length
  const open = (index: number) => onOpen?.(msgs, index)

  if (count === 1) {
    return (
      <div className={styles.mediaWrap}>
        <MessageMedia message={msgs[0]} onClick={() => open(0)} />
      </div>
    )
  }

  if (count === 2) {
    return (
      <div className={styles.mediaStack2}>
        {msgs.map((m, i) => (
          <div key={m.id} className={styles.mediaWrap}>
            <MessageMedia message={m} onClick={() => open(i)} />
          </div>
        ))}
        <span className={styles.mediaCountBadge}>{count}</span>
      </div>
    )
  }

  // 3+ items: card stack
  const visible = msgs.slice(0, 3)

  return (
    <div className={styles.mediaStack}>
      {visible.map((m, idx) => (
        <div
          key={m.id}
          className={styles.mediaStackItem}
          onClick={() => open(idx)}
          style={{
            zIndex: 3 - idx,
            transform: `translateY(${idx * 14}px) rotate(${idx === 1 ? 2 : idx === 2 ? -1.5 : 0}deg)`,
          }}
        >
          <MessageMedia message={m} />
        </div>
      ))}
      <span className={styles.mediaCountBadge}>{count}</span>
    </div>
  )
}
