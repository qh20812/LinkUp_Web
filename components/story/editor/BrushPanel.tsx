'use client'

import styles from './BrushPanel.module.css'
import { useTranslation } from '../../../hooks/useTranslation'
import {
  BRUSH_SIZE_MAX,
  BRUSH_SIZE_MIN,
  COLOR_PRESETS,
  type BrushGradientStyle,
} from './canvasHelpers'

interface BrushPanelProps {
  brushColor: string
  onBrushColorChange: (color: string) => void
  brushSize: number
  onBrushSizeChange: (size: number) => void
  gradient: BrushGradientStyle
  onGradientChange: (gradient: BrushGradientStyle) => void
  isEraser: boolean
  onEraserChange: (on: boolean) => void
  hasDrawings: boolean
  onClear: () => void
}

export default function BrushPanel({
  brushColor,
  onBrushColorChange,
  brushSize,
  onBrushSizeChange,
  gradient,
  onGradientChange,
  isEraser,
  onEraserChange,
  hasDrawings,
  onClear,
}: BrushPanelProps) {
  const { t } = useTranslation()

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <span className={styles.rangeRow}>
          <label htmlFor="storyBrushSize">{t('story.editor.brushSize')}</label>
          <input
            id="storyBrushSize"
            type="range"
            min={BRUSH_SIZE_MIN}
            max={BRUSH_SIZE_MAX}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          />
          <span className={styles.sizeValue}>{brushSize}</span>
        </span>

        <button
          type="button"
          className={`${styles.modeBtn} ${isEraser ? styles.modeBtnActive : ''}`}
          onClick={() => onEraserChange(!isEraser)}
          aria-pressed={isEraser}
        >
          <i className="bx bx-eraser" />
          <span>{t('story.editor.eraser')}</span>
        </button>

        <button
          type="button"
          className={styles.clearBtn}
          onClick={onClear}
          disabled={!hasDrawings}
        >
          <i className="bx bx-trash" />
          <span>{t('story.editor.clear')}</span>
        </button>
      </div>

      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.gradToggle} ${gradient.enabled ? styles.gradToggleActive : ''}`}
          onClick={() =>
            onGradientChange({ ...gradient, enabled: !gradient.enabled })
          }
          aria-pressed={gradient.enabled}
          disabled={isEraser}
        >
          <i className="bx bx-palette" />
          <span>{t('story.editor.brushGradient')}</span>
        </button>
        {gradient.enabled && !isEraser && (
          <div className={styles.duoPickers}>
            <label className={styles.colorPickLabel}>
              <input
                type="color"
                className={styles.colorPick}
                value={gradient.from}
                onChange={(e) =>
                  onGradientChange({ ...gradient, from: e.target.value })
                }
                aria-label={t('story.editor.gradientFrom')}
              />
              <span>{t('story.editor.gradientFrom')}</span>
            </label>
            <label className={styles.colorPickLabel}>
              <input
                type="color"
                className={styles.colorPick}
                value={gradient.to}
                onChange={(e) => onGradientChange({ ...gradient, to: e.target.value })}
                aria-label={t('story.editor.gradientTo')}
              />
              <span>{t('story.editor.gradientTo')}</span>
            </label>
          </div>
        )}
      </div>

      <div className={styles.row}>
        <div className={styles.swatches}>
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              className={`${styles.swatch} ${brushColor === color && !isEraser ? styles.swatchActive : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => {
                onBrushColorChange(color)
                onEraserChange(false)
              }}
              aria-label={color}
            />
          ))}
        </div>
      </div>
    </div>
  )
}