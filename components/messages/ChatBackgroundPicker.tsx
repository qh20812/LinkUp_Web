'use client'

import { useState, useRef, useCallback } from 'react'
import Modal from '../Modal'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import {
  updateChatBackground,
  deleteChatBackground,
  updateGroupChatBackground,
  deleteGroupChatBackground,
  uploadMedia,
} from '../../api/chats'
import type { ChatBackground } from '../../types'
import styles from './ChatBackgroundPicker.module.css'

const SOLID_COLORS = [
  '#FFE4C4', '#E8D5B7', '#B5D8CC', '#AEC6CF', '#C7CEEA', '#F6C6CE',
  '#F0E68C', '#DDA0DD', '#98FB98', '#FFB6C1', '#B0E0E6', '#D2B48C',
  '#E6E6FA', '#FFF0F5', '#F5FFFA', '#F0FFF0', '#F5F5DC', '#FAEBD7',
  '#FFE4E1', '#FFF8DC', '#F5F5F5', '#FAFAFA',
]

const GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fad0c4, #ffd1ff)',
  'linear-gradient(135deg, #ffecd2, #fcb69f)',
  'linear-gradient(135deg, #89f7fe, #66a6ff)',
  'linear-gradient(135deg, #fddb92, #d1fdff)',
  'linear-gradient(135deg, #c1dfc4, #deecdd)',
  'linear-gradient(135deg, #0ba360, #3cba92)',
  'linear-gradient(135deg, #ff9a9e, #fecfef)',
  'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
  'linear-gradient(135deg, #d4fc79, #96e6a1)',
]

const PRESETS = [
  'preset-01.jpg', 'preset-02.jpg', 'preset-03.jpg',
  'preset-04.jpg', 'preset-05.jpg', 'preset-06.jpg',
  'preset-07.jpg', 'preset-08.jpg', 'preset-09.jpg',
  'preset-10.jpg', 'preset-11.jpg', 'preset-12.jpg',
]

type TabKey = 'solid' | 'gradient' | 'preset' | 'custom'

interface ChatBackgroundPickerProps {
  open: boolean
  onClose: () => void
  chatId: string
  currentBackground: ChatBackground | null
  onApplied: (bg: ChatBackground | null) => void
  mode: 'direct' | 'group'
}

export default function ChatBackgroundPicker({
  open,
  onClose,
  chatId,
  currentBackground,
  onApplied,
  mode,
}: ChatBackgroundPickerProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabKey>('solid')
  const [selected, setSelected] = useState<ChatBackground | null>(currentBackground)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'solid', label: t('chat.backgroundSolid') },
    { key: 'gradient', label: t('chat.backgroundGradient') },
    { key: 'preset', label: t('chat.backgroundPreset') },
    { key: 'custom', label: t('chat.backgroundCustom') },
  ]

  const handleSelect = useCallback((bg: ChatBackground) => {
    setSelected(bg)
  }, [])

  const handleRemove = useCallback(async () => {
    setSaving(true)
    try {
      if (mode === 'direct') {
        await deleteChatBackground(chatId)
      } else {
        await deleteGroupChatBackground(chatId)
      }
      setSelected(null)
      onApplied(null)
      toast({ type: 'success', title: t('chat.backgroundApplied') })
      onClose()
    } catch {
      toast({ type: 'error', title: t('common.error') })
    } finally {
      setSaving(false)
    }
  }, [chatId, mode, onApplied, onClose, toast, t])

  const handleApply = useCallback(async () => {
    if (!selected) return
    setSaving(true)
    try {
      if (mode === 'direct') {
        await updateChatBackground(chatId, selected.type, selected.value)
      } else {
        await updateGroupChatBackground(chatId, selected.type, selected.value)
      }
      onApplied(selected)
      toast({ type: 'success', title: t('chat.backgroundApplied') })
      onClose()
    } catch {
      toast({ type: 'error', title: t('common.error') })
    } finally {
      setSaving(false)
    }
  }, [selected, chatId, mode, onApplied, onClose, toast, t])

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSaving(true)
    try {
      const res = await uploadMedia(file)
      const url = res.data.file_uri
      setSelected({ type: 'custom', value: url })
    } catch {
      toast({ type: 'error', title: t('common.error') })
    } finally {
      setSaving(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [toast, t])

  const renderColorGrid = () => (
    <div className={styles.colorGrid}>
      {SOLID_COLORS.map((color) => (
        <button
          key={color}
          className={`${styles.colorSwatch} ${selected?.type === 'solid' && selected.value === color ? styles.selected : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => handleSelect({ type: 'solid', value: color })}
          aria-label={color}
        />
      ))}
    </div>
  )

  const renderGradientGrid = () => (
    <div className={styles.gradientGrid}>
      {GRADIENTS.map((g) => (
        <button
          key={g}
          className={`${styles.gradientSwatch} ${selected?.type === 'gradient' && selected.value === g ? styles.selected : ''}`}
          style={{ backgroundImage: g }}
          onClick={() => handleSelect({ type: 'gradient', value: g })}
          aria-label="gradient"
        />
      ))}
    </div>
  )

  const renderPresetGrid = () => (
    <div className={styles.presetGrid}>
      {PRESETS.map((p) => (
        <button
          key={p}
          className={`${styles.presetSwatch} ${selected?.type === 'preset' && selected.value === p ? styles.selected : ''}`}
          onClick={() => handleSelect({ type: 'preset', value: p })}
        >
          <img
            src={`/presets/chat-bg/${p}`}
            alt={p}
            className={styles.presetImg}
          />
        </button>
      ))}
    </div>
  )

  const renderCustomUpload = () => (
    <div className={styles.customSection}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={handleUpload}
      />
      <button
        className={styles.uploadBtn}
        onClick={() => fileInputRef.current?.click()}
        disabled={saving}
      >
        <i className="bx bx-image-add" />
        <span>{t('chat.backgroundUpload')}</span>
      </button>
      {selected?.type === 'custom' && selected.value && (
        <div className={styles.customPreview}>
          <img src={selected.value} alt="custom" className={styles.customPreviewImg} />
        </div>
      )}
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('chat.backgroundPicker')}
      footer={
        <div className={styles.footer}>
          <button
            className={styles.removeBtn}
            onClick={handleRemove}
            disabled={saving || !currentBackground}
          >
            {t('chat.backgroundRemove')}
          </button>
          <button
            className={styles.applyBtn}
            onClick={handleApply}
            disabled={saving || !selected}
          >
            {t('chat.backgroundApply')}
          </button>
        </div>
      }
    >
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === 'solid' && renderColorGrid()}
        {activeTab === 'gradient' && renderGradientGrid()}
        {activeTab === 'preset' && renderPresetGrid()}
        {activeTab === 'custom' && renderCustomUpload()}
      </div>
    </Modal>
  )
}
