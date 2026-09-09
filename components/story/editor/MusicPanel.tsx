'use client'

import styles from './MusicPanel.module.css'
import { MUSIC_TRACKS } from './music'
import { useTranslation } from '../../../hooks/useTranslation'

interface MusicPanelProps {
  trackId: string | null
  volume: number
  onTrackChange: (trackId: string | null) => void
  onVolumeChange: (volume: number) => void
}

export default function MusicPanel({
  trackId,
  volume,
  onTrackChange,
  onVolumeChange,
}: MusicPanelProps) {
  const { t } = useTranslation()

  return (
    <div className={styles.panel}>
      <div className={styles.trackList}>
        <button
          type="button"
          className={`${styles.trackBtn} ${trackId === null ? styles.trackBtnActive : ''}`}
          onClick={() => onTrackChange(null)}
        >
          <i className={`bx ${trackId === null ? 'bx-music bx-tada' : 'bx-music'}`} />
          <span>{t('story.music.off')}</span>
        </button>
        {MUSIC_TRACKS.map((track) => (
          <button
            key={track.id}
            type="button"
            className={`${styles.trackBtn} ${trackId === track.id ? styles.trackBtnActive : ''}`}
            onClick={() => onTrackChange(track.id)}
          >
            <i className={`bx ${trackId === track.id ? 'bx-volume-full' : 'bx-music'}`} />
            <span>{t(track.label)}</span>
          </button>
        ))}
      </div>

      <div className={styles.volumeRow}>
        <i className="bx bx-volume-low" />
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className={styles.volumeSlider}
          aria-label={t('story.music.volume')}
        />
        <i className="bx bx-volume-full" />
      </div>
    </div>
  )
}