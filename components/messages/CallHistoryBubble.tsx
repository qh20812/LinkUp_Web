'use client'

import styles from './CallHistoryBubble.module.css'

export type CallBubbleTone = 'outgoing' | 'incoming' | 'missed'

interface CallHistoryBubbleProps {
  /** Visual tone: answered-outgoing / answered-incoming / missed-anywhere. */
  tone: CallBubbleTone
  /** true = row is right-aligned (caller side). Only tints the border. */
  mine: boolean
  /** true = video call — swaps the glyph set. */
  isVideo: boolean
  /** e.g. "Cuộc gọi thoại" / "Cuộc gọi nhỡ" — already localised by caller. */
  title: string
  /** e.g. "02:35" — omit when duration is 0 / missed. */
  durationText?: string | null
  /** e.g. "14:30" — clock time of the call. */
  timeText: string
  /** Show the circular callback button (incoming only, not in call). */
  showAction: boolean
  /** Localised "Gọi lại" / "Xin tham gia" label for tooltip + aria. */
  actionLabel: string
  onAction?: () => void
}

// Glyphs restricted to Boxicons already proven in the codebase
// (CallOverlay / GroupCallIncomingModal / ChatWindow header).
function glyphFor(tone: CallBubbleTone, mine: boolean, isVideo: boolean): string {
  if (tone === 'missed') return isVideo ? 'bx-video-off' : 'bx-phone-off'
  if (mine) return isVideo ? 'bx-video' : 'bx-phone-call'
  return isVideo ? 'bx-video' : 'bx-phone-incoming'
}

/**
 * Premium glass call-history row shared by direct (`kind === 'call'`) and
 * group (`kind === 'group_call'`) timeline items in ChatWindow.
 */
export default function CallHistoryBubble({
  tone,
  mine,
  isVideo,
  title,
  durationText,
  timeText,
  showAction,
  actionLabel,
  onAction,
}: CallHistoryBubbleProps) {
  const meta = durationText ? `${durationText} · ${timeText}` : timeText
  return (
    <div
      className={`${styles.bubble} ${styles[tone]}${mine ? ` ${styles.mine}` : ''}`}
      role="group"
      aria-label={`${title}, ${meta}`}
    >
      <span className={styles.chip} aria-hidden="true">
        <i className={`bx ${glyphFor(tone, mine, isVideo)}`} />
      </span>
      <span className={styles.content}>
        <span className={styles.title}>{title}</span>
        <span className={styles.meta}>{meta}</span>
      </span>
      {showAction && (
        <button
          type="button"
          className={styles.callbackBtn}
          onClick={onAction}
          data-tooltip={actionLabel}
          aria-label={actionLabel}
        >
          <i className="bx bx-phone" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
