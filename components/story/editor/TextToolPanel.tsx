'use client'

import { useState } from 'react'
import styles from './TextToolPanel.module.css'
import { useTranslation } from '../../../hooks/useTranslation'
import {
  COLOR_PRESETS,
  FONT_OPTIONS,
  TEXT_SIZE_MAX,
  TEXT_SIZE_MIN,
  TYPE_PRESETS,
  type TextPanelStyle,
} from './canvasHelpers'

interface TextToolPanelProps {
  style: TextPanelStyle
  /** True while an existing text object is selected — style edits apply live to it. */
  hasSelection: boolean
  onStyleChange: (patch: Partial<TextPanelStyle>) => void
}

const OUTLINE_COLORS = ['#000000', '#FFFFFF', '#FFD600', '#E91E63', '#12A5A1']
const HIGHLIGHT_COLORS = ['#000000', '#FFD600', '#FFECB3', '#4CAF50', '#2196F3']

export default function TextToolPanel({ style, hasSelection, onStyleChange }: TextToolPanelProps) {
  const { t } = useTranslation()
  const [advanced, setAdvanced] = useState(false)
  const gradientOn = style.gradient !== null

  return (
    <div className={styles.panel}>
      {!hasSelection && (
        <p className={styles.hint}>
          <i className="bx bx-text" aria-hidden="true" />
          <span>{t('story.editor.tapToAdd')}</span>
        </p>
      )}

      <div className={styles.row}>
        <div className={styles.presetChips} role="group" aria-label={t('story.editor.presets')}>
          {TYPE_PRESETS.map((preset) => {
            const active =
              (preset.style.gradient?.from ?? null) === (style.gradient?.from ?? null) &&
              (preset.style.gradient?.to ?? null) === (style.gradient?.to ?? null) &&
              (preset.style.stroke ?? null) === style.stroke &&
              (preset.style.strokeWidth ?? 0) === style.strokeWidth &&
              (preset.style.highlight ?? null) === style.highlight
            return (
              <button
                key={preset.id}
                type="button"
                className={`${styles.presetChip} ${active ? styles.presetChipActive : ''}`}
                onClick={() => onStyleChange(preset.style)}
                aria-pressed={active}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.textStyleRow}>
          <button
            type="button"
            className={`${styles.styleBtn} ${style.fontWeight === 'bold' ? styles.styleBtnActive : ''}`}
            onClick={() =>
              onStyleChange({ fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold' })
            }
            aria-pressed={style.fontWeight === 'bold'}
            aria-label={t('story.editor.bold')}
          >
            <b>B</b>
          </button>
          <button
            type="button"
            className={`${styles.styleBtn} ${style.fontStyle === 'italic' ? styles.styleBtnActive : ''}`}
            onClick={() =>
              onStyleChange({ fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic' })
            }
            aria-pressed={style.fontStyle === 'italic'}
            aria-label={t('story.editor.italic')}
          >
            <i>I</i>
          </button>
          <button
            type="button"
            className={`${styles.styleBtn} ${style.underline ? styles.styleBtnActive : ''}`}
            onClick={() => onStyleChange({ underline: !style.underline })}
            aria-pressed={style.underline}
            aria-label={t('story.editor.underline')}
          >
            <u>U</u>
          </button>
          <span className={styles.styleDivider} />
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              type="button"
              className={`${styles.styleBtn} ${style.textAlign === align ? styles.styleBtnActive : ''}`}
              onClick={() => onStyleChange({ textAlign: align })}
              aria-pressed={style.textAlign === align}
              aria-label={t(`story.editor.align${align[0].toUpperCase() + align.slice(1)}`)}
            >
              <i className={`bx bx-${align === 'left' ? 'align-left' : align === 'right' ? 'align-right' : 'align-middle'}`} />
            </button>
          ))}
        </div>

        <label className={styles.rangeRow}>
          <span className={styles.rangeLabel}>{t('story.editor.fontSize')}</span>
          <input
            type="range"
            min={TEXT_SIZE_MIN}
            max={TEXT_SIZE_MAX}
            value={style.fontSize}
            onChange={(e) => onStyleChange({ fontSize: Number(e.target.value) })}
          />
          <span className={styles.sizeValue}>{style.fontSize}</span>
        </label>

        <button
          type="button"
          className={`${styles.advToggle} ${advanced ? styles.advToggleActive : ''}`}
          onClick={() => setAdvanced((v) => !v)}
          aria-expanded={advanced}
        >
          <i className="bx bx-slider-alt" aria-hidden="true" />
          <span>{t('story.editor.advanced')}</span>
        </button>
      </div>

      <div className={styles.row}>
        <div className={styles.swatches} role="group" aria-label={t('story.editor.textColor')}>
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              className={`${styles.swatch} ${!gradientOn && style.fill === color ? styles.swatchActive : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onStyleChange({ fill: color })}
              aria-label={color}
            />
          ))}
        </div>
      </div>

      {advanced && (
        <div className={styles.advanced}>
          <div className={styles.advField}>
            <span className={styles.advLabel}>{t('story.editor.fontFamily')}</span>
            <select
              className={styles.select}
              value={style.fontFamily}
              onChange={(e) => onStyleChange({ fontFamily: e.target.value })}
              aria-label={t('story.editor.fontFamily')}
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font.family} value={font.family} style={{ fontFamily: font.family }}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.advField}>
            <span className={styles.advLabel}>{t('story.editor.gradient')}</span>
            <div className={styles.advControls}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${gradientOn ? styles.toggleBtnActive : ''}`}
                onClick={() => {
                  if (gradientOn) {
                    onStyleChange({ gradient: null })
                  } else {
                    onStyleChange({ gradient: style.gradient ?? { from: '#FFD600', to: '#FF6F00' } })
                  }
                }}
                aria-pressed={gradientOn}
              >
                <i className="bx bx-palette" />
                <span>{t('story.editor.gradient')}</span>
              </button>
              {gradientOn && style.gradient && (
                <div className={styles.duoPickers}>
                  <label className={styles.colorPickLabel}>
                    <input
                      type="color"
                      className={styles.colorPick}
                      value={style.gradient.from}
                      onChange={(e) =>
                        onStyleChange({ gradient: { ...style.gradient!, from: e.target.value } })
                      }
                      aria-label={t('story.editor.gradientFrom')}
                    />
                    <span>{t('story.editor.gradientFrom')}</span>
                  </label>
                  <label className={styles.colorPickLabel}>
                    <input
                      type="color"
                      className={styles.colorPick}
                      value={style.gradient.to}
                      onChange={(e) =>
                        onStyleChange({ gradient: { ...style.gradient!, to: e.target.value } })
                      }
                      aria-label={t('story.editor.gradientTo')}
                    />
                    <span>{t('story.editor.gradientTo')}</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className={styles.advField}>
            <span className={styles.advLabel}>{t('story.editor.outline')}</span>
            <div className={styles.advControls}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${style.strokeWidth > 0 ? styles.toggleBtnActive : ''}`}
                onClick={() => {
                  if (style.strokeWidth > 0) {
                    onStyleChange({ strokeWidth: 0, stroke: null })
                  } else {
                    onStyleChange({ strokeWidth: 4, stroke: style.stroke ?? '#000000' })
                  }
                }}
                aria-pressed={style.strokeWidth > 0}
              >
                <i className="bx bxs-border-radius" />
                <span>{t('story.editor.outline')}</span>
              </button>
              {style.strokeWidth > 0 && (
                <>
                  <label className={styles.rangeRow}>
                    <input
                      type="range"
                      min={1}
                      max={16}
                      value={style.strokeWidth}
                      onChange={(e) => onStyleChange({ strokeWidth: Number(e.target.value) })}
                      aria-label={t('story.editor.outlineWidth')}
                    />
                  </label>
                  <div className={styles.swatches}>
                    {OUTLINE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`${styles.swatch} ${style.stroke === color ? styles.swatchActive : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => onStyleChange({ stroke: color })}
                        aria-label={color}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={styles.advField}>
            <span className={styles.advLabel}>{t('story.editor.highlight')}</span>
            <div className={styles.advControls}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${style.highlight !== null ? styles.toggleBtnActive : ''}`}
                onClick={() => {
                  onStyleChange({ highlight: style.highlight === null ? '#000000' : null })
                }}
                aria-pressed={style.highlight !== null}
              >
                <i className="bx bx-highlight" />
                <span>{t('story.editor.highlight')}</span>
              </button>
              {style.highlight !== null && (
                <div className={styles.swatches}>
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`${styles.swatch} ${style.highlight === color ? styles.swatchActive : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => onStyleChange({ highlight: color })}
                      aria-label={color}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
