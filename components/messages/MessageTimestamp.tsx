'use client'

import { formatClockTime } from '../../utils/chat'
import type { ChatMessage } from '../../types'
import styles from './ChatWindow.module.css'

interface MessageTimestampProps {
  msg: ChatMessage
  mine: boolean
  visible: boolean
}

export default function MessageTimestamp({ msg, mine, visible }: MessageTimestampProps) {
  return (
    <span
      className={`${styles.msgTimestamp} ${mine ? styles.timestampMine : ''} ${visible ? styles.timestampVisible : ''}`}
    >
      {formatClockTime(msg.created_at)}
    </span>
  )
}
