'use client'

import styles from './EditorToolbar.module.css'
import { useTranslation } from '../../../hooks/useTranslation'
import type { EditorTool } from '../StoryCanvas'

interface EditorToolbarProps {
  activeTool: EditorTool
  onToolChange: (tool: EditorTool) => void
  hiddenTools?: EditorTool[]
}

interface ToolDef {
  id: EditorTool
  icon: string
  label: string
}

const TOOLS: ToolDef[] = [
  { id: 'select', icon: 'bx-move', label: 'story.editor.select' },
  { id: 'text', icon: 'bx-text', label: 'story.editor.text' },
  { id: 'sticker', icon: 'bx-smile', label: 'story.editor.stickers' },
  { id: 'brush', icon: 'bx-pen', label: 'story.editor.draw' },
  { id: 'filter', icon: 'bx-adjust', label: 'story.editor.filters' },
  { id: 'music', icon: 'bx-music', label: 'story.editor.music' },
]

export default function EditorToolbar({
  activeTool,
  onToolChange,
  hiddenTools = [],
}: EditorToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className={styles.toolbar}>
      {TOOLS.filter((tool) => !hiddenTools.includes(tool.id)).map((tool) => (
        <button
          key={tool.id}
          type="button"
          className={`${styles.toolBtn} ${activeTool === tool.id ? styles.toolBtnActive : ''}`}
          onClick={() => onToolChange(tool.id)}
          aria-pressed={activeTool === tool.id}
          aria-label={t(tool.label)}
        >
          <i className={`bx ${tool.icon}`} />
          <span className={styles.toolLabel}>{t(tool.label)}</span>
        </button>
      ))}
    </div>
  )
}