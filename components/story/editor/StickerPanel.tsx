'use client'

import styles from './StickerPanel.module.css'
import { STICKERS } from './canvasHelpers'

interface StickerPanelProps {
  onSelect: (src: string) => void
}

export default function StickerPanel({ onSelect }: StickerPanelProps) {
  return (
    <div className={styles.panel}>
      {STICKERS.map((sticker) => (
        <button
          key={sticker.id}
          type="button"
          className={styles.tile}
          onClick={() => onSelect(sticker.src)}
          aria-label={sticker.name}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sticker.src} alt={sticker.name} className={styles.stickerImg} />
        </button>
      ))}
    </div>
  )
}