'use client'

import styles from './FilterPanel.module.css'
import { useTranslation } from '../../../hooks/useTranslation'
import { FILTER_PRESETS, type FilterPresetId } from './canvasHelpers'

interface FilterPanelProps {
  imageUrl: string
  activeFilter: FilterPresetId
  intensity: number
  onIntensityChange: (value: number) => void
  onSelect: (filterId: FilterPresetId) => void
}

function cssFilter(filterId: FilterPresetId, intensity: number): string {
  const i = intensity
  switch (filterId) {
    case 'bw':
      return `grayscale(${i})`
    case 'warm':
      return `sepia(${0.4 * i}) saturate(${1 + 0.3 * i}) brightness(${1 + 0.06 * i}) hue-rotate(${12 * i}deg)`
    case 'cool':
      return `hue-rotate(${12 * i}deg) saturate(${1 - 0.1 * i}) brightness(${1 + 0.05 * i})`
    case 'vintage':
      return `sepia(${0.5 * i}) contrast(${1 - 0.1 * i}) brightness(${1 + 0.06 * i})`
    case 'dramatic':
      return `contrast(${1 + 0.35 * i}) brightness(${1 - 0.05 * i}) saturate(${1 + 0.2 * i})`
    default:
      return 'none'
  }
}

export default function FilterPanel({
  imageUrl,
  activeFilter,
  intensity,
  onIntensityChange,
  onSelect,
}: FilterPanelProps) {
  const { t } = useTranslation()
  const showIntensity = activeFilter !== 'original'

  return (
    <div className={styles.panel}>
      {showIntensity && (
        <div className={styles.intensityRow}>
          <label htmlFor="storyFilterIntensity">{t('story.editor.intensity')}</label>
          <input
            id="storyFilterIntensity"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={intensity}
            onChange={(e) => onIntensityChange(Number(e.target.value))}
          />
          <span className={styles.intensityValue}>{Math.round(intensity * 100)}%</span>
        </div>
      )}
      {FILTER_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={`${styles.tile} ${activeFilter === preset.id ? styles.tileActive : ''}`}
          onClick={() => onSelect(preset.id)}
          aria-pressed={activeFilter === preset.id}
        >
          <span className={styles.thumb}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className={styles.thumbImg}
              style={{ filter: cssFilter(preset.id, activeFilter === preset.id ? intensity : 1) }}
            />
          </span>
          <span className={styles.label}>{t(preset.label)}</span>
        </button>
      ))}
    </div>
  )
}