'use client'

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
  selectedText: string | null
  onStyleChange: (patch: Partial<TextPanelStyle>) => void
  onAddText: (text: string) => void
}

const OUTLINE_COLORS = ['#000000', '#FFFFFF', '#FFD600', '#E91E63', '#12A5A1']
const HIGHLIGHT_COLORS = ['#000000', '#FFD600', '#FFECB3', '#4CAF50', '#2196F3']

export default function TextToolPanel({
  style,
  selectedText,
  onStyleChange,
  onAddText,
}: TextToolPanelProps) {
  const { t } = useTranslation()
  const hasSelection = selectedText !== null
  const gradientOn = style.gradient !== null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const input = (e.currentTarget as HTMLFormElement).elements.namedItem(
      'storyTextInput',
    ) as HTMLInputElement | null
    const value = input?.value.trim()
    if (!value) return
    onAddText(value)
    if (input) input.value = ''
  }

  return (
    <form className={styles.panel} onSubmit={handleSubmit}>
      <div className={styles.inputRow}>
        <input
          type="text"
          name="storyTextInput"
          className={styles.textInput}
          placeholder={t('story.editor.textPlaceholder')}
          defaultValue=""
          autoComplete="off"
        />
        <button type="submit" className={styles.addBtn}>
          <i className="bx bx-plus" />
          <span>{hasSelection ? t('story.editor.update') : t('story.editor.addText')}</span>
        </button>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>{t('story.editor.presets')}</span>
        <div className={styles.presetChips}>
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

      <div className={styles.section}>
        <span className={styles.sectionLabel}>{t('story.editor.fontFamily')}</span>
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

      <div className={styles.section}>
        <label htmlFor="storyTextSize" className={styles.rangeRow}>
          <span>{t('story.editor.fontSize')}</span>
          <input
            id="storyTextSize"
            type="range"
            min={TEXT_SIZE_MIN}
            max={TEXT_SIZE_MAX}
            value={style.fontSize}
            onChange={(e) => onStyleChange({ fontSize: Number(e.target.value) })}
          />
          <span className={styles.sizeValue}>{style.fontSize}</span>
        </label>
      </div>

      {!gradientOn && (
        <div className={styles.section}>
          <div className={styles.swatches}>
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className={`${styles.swatch} ${style.fill === color ? styles.swatchActive : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onStyleChange({ fill: color })}
                aria-label={color}
              />
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
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

      <div className={styles.section}>
        <div className={styles.outlineWrap}>
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
              <label htmlFor="storyStrokeWidth">
                <input
                  id="storyStrokeWidth"
                  type="range"
                  min={1}
                  max={16}
                  value={style.strokeWidth}
                  onChange={(e) => onStyleChange({ strokeWidth: Number(e.target.value) })}
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

      <div className={styles.section}>
        <div className={styles.highlightWrap}>
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

      <div className={styles.section}>
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
      </div>
    </form>
  )
}