'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import ExternalImage from '../ExternalImage'
import { createStories } from '../../api/stories'
import StoryCanvas, {
  type EditorMode,
  type EditorSelection,
  type EditorTool,
  type EditorVariant,
  type StoryCanvasApi,
} from './StoryCanvas'
import EditorToolbar from './editor/EditorToolbar'
import TextToolPanel from './editor/TextToolPanel'
import FilterPanel from './editor/FilterPanel'
import StickerPanel from './editor/StickerPanel'
import BrushPanel from './editor/BrushPanel'
import MusicPanel from './editor/MusicPanel'
import { musicEngine } from './editor/music'
import styles from './StoryEditorModal.module.css'
import {
  DEFAULT_BRUSH_GRADIENT,
  DEFAULT_TEXT_STORY_GRADIENT,
  DEFAULT_TEXT_STYLE,
  TEXT_STORY_GRADIENTS,
  type FilterPresetId,
  type TextPanelStyle,
} from './editor/canvasHelpers'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'

type Step = 'pick' | 'edit'

interface StoryEditorModalProps {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

interface PickedFile {
  file: File | null
  url: string | null
  gradient: { from: string; to: string } | null
  previewUrl: string | null
  editedBlob: Blob | null
  caption: string
  /** Serialized canvas edits (text/stickers/drawings) for re-editing later. */
  snapshot: string | null
}

const MAX_MEDIA_COUNT = 10

const isVideoItem = (item: PickedFile | null): boolean =>
  !!item?.file && item.file.type.startsWith('video/')

export default function StoryEditorModal({ open, onClose, onCreated }: StoryEditorModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [step, setStep] = useState<Step>('pick')
  const [postSheet, setPostSheet] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [items, setItems] = useState<PickedFile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [filterId, setFilterId] = useState<FilterPresetId>('original')
  const [filterIntensity, setFilterIntensity] = useState(1)
  const [activeTool, setActiveTool] = useState<EditorTool>('select')
  const [textStyle, setTextStyle] = useState<TextPanelStyle>(DEFAULT_TEXT_STYLE)
  const [selectionKind, setSelectionKind] = useState<'text' | 'other' | null>(null)
  const [brushColor, setBrushColor] = useState('#FFFFFF')
  const [brushSize, setBrushSize] = useState(6)
  const [brushGradient, setBrushGradient] = useState(DEFAULT_BRUSH_GRADIENT)
  const [isEraser, setIsEraser] = useState(false)
  const [hasDrawings, setHasDrawings] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false })
  const [musicTrackId, setMusicTrackId] = useState<string | null>(null)
  const [musicVolume, setMusicVolume] = useState(100)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const createdUrlsRef = useRef<string[]>([])
  const apiRef = useRef<StoryCanvasApi | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const [overlayHeight, setOverlayHeight] = useState(0)
  const [stageSize, setStageSize] = useState<{ width: number; height: number } | null>(null)

  const current = items[currentIndex] ?? null
  const mode: EditorMode = isVideoItem(current) ? 'video' : 'image'
  const isImage = mode === 'image'
  const variant: EditorVariant = current?.gradient ? 'text' : 'media'
  const isTextStory = variant === 'text'

  const trackUrl = useCallback((url: string) => {
    createdUrlsRef.current.push(url)
  }, [])

  const releaseUrls = useCallback(() => {
    createdUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    createdUrlsRef.current = []
  }, [])

  const resetForm = useCallback(() => {
    releaseUrls()
    musicEngine.stop()
    apiRef.current = null
    setItems([])
    setCurrentIndex(0)
    setPostSheet(false)
    setConfirmLeave(false)
    setMusicTrackId(null)
    setMusicVolume(100)
    setFilterId('original')
    setFilterIntensity(1)
    setActiveTool('select')
    setTextStyle(DEFAULT_TEXT_STYLE)
    setSelectionKind(null)
    setBrushColor('#FFFFFF')
    setBrushSize(6)
    setBrushGradient(DEFAULT_BRUSH_GRADIENT)
    setIsEraser(false)
    setHasDrawings(false)
    setStep('pick')
    setError(null)
  }, [releaseUrls])

  const handleClose = useCallback(() => {
    if (submitting) return
    // Anything picked/edited is lost on close — ask first.
    if (items.length > 0) {
      setConfirmLeave(true)
      return
    }
    resetForm()
    onClose()
  }, [submitting, items.length, resetForm, onClose])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.documentElement.style.overflow = prev
    }
  }, [open, handleClose])

  useEffect(() => () => releaseUrls(), [releaseUrls])

  useEffect(() => {
    if (!open || step !== 'edit') return
    const overlayEl = overlayRef.current
    const wrapEl = canvasWrapRef.current
    if (!overlayEl || !wrapEl) return
    const update = () => {
      const padBottom = overlayEl.offsetHeight
      setOverlayHeight(padBottom)
      const visibleH = Math.max(0, wrapEl.clientHeight - padBottom)
      const visibleW = Math.max(0, wrapEl.clientWidth)
      const w = Math.min(visibleW, (visibleH * 9) / 16)
      const h = (w * 16) / 9
      setStageSize(h > 0 && w > 0 ? { width: Math.round(w), height: Math.round(h) } : null)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(overlayEl)
    ro.observe(wrapEl)
    return () => ro.disconnect()
  }, [open, step])

  useEffect(() => {
    if (!open || step !== 'edit' || postSheet) musicEngine.stop()
  }, [open, step, postSheet])

  useEffect(() => {
    if (!open || step !== 'edit') return
    const timer = window.setInterval(() => {
      const state = apiRef.current?.getHistoryState()
      if (state) setHistoryState(state)
    }, 600)
    return () => window.clearInterval(timer)
  }, [open, step])

  const handleMusicTrackChange = (trackId: string | null) => {
    setMusicTrackId(trackId)
    if (trackId === null) {
      musicEngine.stop()
    } else {
      void musicEngine.play(trackId, musicVolume / 100)
    }
  }

  const handleMusicVolumeChange = (volume: number) => {
    setMusicVolume(volume)
    musicEngine.setVolume(volume / 100)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (selected.length === 0) return
    musicEngine.stop()

    const hasVideo = selected.some((f) => f.type.startsWith('video/'))
    if (hasVideo && (selected.length > 1 || items.length > 0)) {
      setError(t('story.multiErrorVideo'))
      return
    }
    if (items.length + selected.length > MAX_MEDIA_COUNT) {
      setError(t('story.multiErrorMax'))
      return
    }

    const fresh = items.length === 0
    if (fresh) {
      releaseUrls()
      setFilterId('original')
      setFilterIntensity(1)
      setSelectionKind(null)
      setBrushGradient(DEFAULT_BRUSH_GRADIENT)
      setIsEraser(false)
      setActiveTool('select')
      setCurrentIndex(0)
    }

    const additions: PickedFile[] = selected.map((f) => {
      const url = URL.createObjectURL(f)
      trackUrl(url)
      return {
        file: f,
        url,
        gradient: null,
        previewUrl: null,
        editedBlob: null,
        caption: '',
        snapshot: null,
      }
    })

    if (fresh) {
      setItems(additions)
    } else {
      setItems((prev) => [...prev, ...additions])
    }
    setError(null)
    setStep('edit')
  }

  const patchItem = useCallback((index: number, patch: Partial<PickedFile>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    )
  }, [])

  const removeMedia = () => {
    releaseUrls()
    musicEngine.stop()
    setItems([])
    setCurrentIndex(0)
    setFilterId('original')
    setFilterIntensity(1)
    setTextStyle(DEFAULT_TEXT_STYLE)
    setSelectionKind(null)
    setBrushGradient(DEFAULT_BRUSH_GRADIENT)
    setHasDrawings(false)
    setStep('pick')
    setError(null)
  }

  const startTextStory = () => {
    releaseUrls()
    musicEngine.stop()
    setItems([
      {
        file: null,
        url: null,
        gradient: DEFAULT_TEXT_STORY_GRADIENT,
        previewUrl: null,
        editedBlob: null,
        caption: '',
        snapshot: null,
      },
    ])
    setCurrentIndex(0)
    setError(null)
    setFilterId('original')
    setFilterIntensity(1)
    setSelectionKind(null)
    setBrushGradient(DEFAULT_BRUSH_GRADIENT)
    setIsEraser(false)
    setActiveTool('select')
    setStep('edit')
  }

  const handleApiReady = useCallback((api: StoryCanvasApi) => {
    apiRef.current = api
  }, [])

  const handleSelectionChange = useCallback((selection: EditorSelection) => {
    if (!selection) {
      setSelectionKind(null)
      return
    }
    if (selection.kind === 'text') {
      setSelectionKind('text')
      setTextStyle(selection.style)
    } else {
      setSelectionKind('other')
    }
  }, [])

  const handleToolChange = (tool: EditorTool) => {
    setActiveTool(tool)
    if (tool !== 'brush') setIsEraser(false)
    if (tool === 'brush') {
      setHasDrawings(apiRef.current?.hasDrawings() ?? false)
    }
  }

  const handleTextStyleChange = (patch: Partial<TextPanelStyle>) => {
    setTextStyle((prev) => ({ ...prev, ...patch }))
    apiRef.current?.applyStyleToSelection(patch)
  }

  const handleDeleteSelected = () => {
    apiRef.current?.deleteSelected()
    setSelectionKind(null)
    setActiveTool('select')
  }

  const captureSnapshot = () => {
    patchItem(currentIndex, { snapshot: apiRef.current?.getSnapshot() ?? null })
  }

  const exportCurrentItem = useCallback(async (): Promise<boolean> => {
    const api = apiRef.current
    if (!api) return false
    const index = currentIndex
    if (mode === 'video') {
      const blob = await api.exportVideo(musicEngine.stream() ?? undefined)
      if (blob) {
        const previewUrl = URL.createObjectURL(blob)
        trackUrl(previewUrl)
        patchItem(index, { previewUrl, editedBlob: blob })
        return true
      }
      return false
    }
    const blob = await api.exportBlob()
    if (blob?.type.startsWith('image/')) {
      const preview = await api.exportBlob(true)
      if (preview) {
        const previewUrl = URL.createObjectURL(preview)
        trackUrl(previewUrl)
        patchItem(index, { previewUrl, editedBlob: blob })
      } else {
        patchItem(index, { editedBlob: blob })
      }
      return true
    }
    return false
  }, [currentIndex, mode, patchItem, trackUrl])

  const goToItem = async (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= items.length || nextIndex === currentIndex) return
    if (exporting) return
    setExporting(true)
    try {
      await exportCurrentItem()
      captureSnapshot()
    } finally {
      setExporting(false)
    }
    const nextItem = items[nextIndex]
    if (nextItem && !isVideoItem(nextItem)) musicEngine.stop()
    setCurrentIndex(nextIndex)
    setSelectionKind(null)
    setActiveTool('select')
    setIsEraser(false)
  }

  const handleBackToPick = async () => {
    if (exporting) return
    setExporting(true)
    try {
      await exportCurrentItem()
      captureSnapshot()
    } finally {
      setExporting(false)
    }
    setActiveTool('select')
    setIsEraser(false)
    setSelectionKind(null)
    setStep('pick')
  }

  const handleOpenPostSheet = async () => {
    if (exporting || submitting) return
    setExporting(true)
    try {
      await exportCurrentItem()
      captureSnapshot()
    } finally {
      setExporting(false)
    }
    setActiveTool('select')
    setIsEraser(false)
    setSelectionKind(null)
    setPostSheet(true)
  }

  const handleBackFromSheet = () => {
    setPostSheet(false)
    if (musicTrackId) void musicEngine.play(musicTrackId, musicVolume / 100)
  }

  const removeItemAt = (index: number) => {
    if (items.length <= 1) return
    const next = items.filter((_, i) => i !== index)
    setItems(next)
    setCurrentIndex((ci) => Math.min(ci > index ? ci - 1 : ci, next.length - 1))
  }

  const handleSubmit = async () => {
    if (submitting) return
    if (items.length === 0) {
      setError(t('story.contentRequired'))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await createStories(
        items.map((item) => ({
          file: toUploadFile(item),
          caption: item.caption,
        })),
      )
      toast({ type: 'success', title: t('story.created') })
      onCreated?.()
      resetForm()
      onClose()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSubmitting(false)
    }
  }

  const toUploadFile = (item: PickedFile): File | null => {
    if (item.editedBlob) {
      const blob = item.editedBlob
      const isVideo = blob.type.startsWith('video/')
      if (isVideo) {
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
        return new File([blob], `story-video.${ext}`, { type: blob.type })
      }
      return new File([blob], 'story-image.jpg', { type: 'image/jpeg' })
    }
    return item.file
  }

  if (!open) return null

  const showCanvas = current !== null && step === 'edit' && !postSheet

  return createPortal(
    <div className={styles.overlay} onClick={handleClose}>
      <div className={`${styles.modal} ${step === 'edit' ? styles.modalEdit : ''}`} onClick={(e) => e.stopPropagation()}>
        {step === 'pick' && (
          <>
            <div className={styles.header}>
              <span className={styles.title}>{t('story.createTitle')}</span>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={handleClose}
                aria-label={t('common.cancel')}
              >
                <i className="bx bx-x" />
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.storyFrame}>
                {current ? (
                  <div className={styles.selectedMedia}>
                    {isTextStory ? (
                      <div
                        className={styles.textStoryPreview}
                        role="img"
                        aria-label={t('story.textStory')}
                        style={{
                          background: `linear-gradient(180deg, ${current.gradient?.from ?? ''}, ${current.gradient?.to ?? ''})`,
                        }}
                      />
                    ) : isImage ? (
                      <ExternalImage src={current.url ?? ''} alt="" className={styles.mediaEl} />
                    ) : (
                      <video
                        src={current.url ?? ''}
                        muted
                        playsInline
                        preload="metadata"
                        className={styles.mediaEl}
                      />
                    )}
                    <button
                      type="button"
                      className={styles.removeMediaBtn}
                      onClick={removeMedia}
                      aria-label={t('story.editor.delete')}
                    >
                      <i className="bx bx-trash" />
                    </button>
                    <div className={styles.pickActions}>
                      {items.length < MAX_MEDIA_COUNT && (
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <i className="bx bx-plus" />
                          <span>{t('story.editor.addMore')}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.editAgainBtn}
                        onClick={() => setStep('edit')}
                      >
                        <i className="bx bx-edit" />
                        <span>{t('story.editor.editAgain')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.pickTiles}>
                    <button
                      type="button"
                      className={styles.pickTileMain}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <i className="bx bx-camera" />
                      <span className={styles.pickTileLabel}>{t('story.mediaPlaceholder')}</span>
                      <span className={styles.pickTileHint}>{t('story.mediaHint')}</span>
                    </button>
                    <button type="button" className={styles.pickTileSub} onClick={startTextStory}>
                      <i className="bx bx-text" />
                      <span className={styles.pickTileLabel}>{t('story.textStory')}</span>
                      <span className={styles.pickTileHint}>{t('story.textStoryHint')}</span>
                    </button>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className={styles.fileInput}
                onChange={handleFileChange}
              />

              {error && <p className={styles.errorText}>{error}</p>}
            </div>

            <div className={styles.footer}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleClose}
                disabled={submitting}
              >
                {t('common.cancel')}
              </button>
            </div>
          </>
        )}

        {step === 'edit' && showCanvas && (
          <>
            <div className={styles.header}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={handleBackToPick}
                aria-label={t('story.editor.back')}
              >
                <i className="bx bx-chevron-left" />
              </button>
              <span className={styles.title}>{t('story.editor.title')}</span>
              <div className={styles.headerActions}>
                {variant === 'media' && (
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => apiRef.current?.resetPosition()}
                    aria-label={t('story.editor.resetPosition')}
                  >
                    <i className="bx bx-current-location" />
                  </button>
                )}
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => apiRef.current?.undo()}
                  disabled={!historyState.canUndo}
                  aria-label={t('story.editor.undo')}
                >
                  <i className="bx bx-undo" />
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => apiRef.current?.redo()}
                  disabled={!historyState.canRedo}
                  aria-label={t('story.editor.redo')}
                >
                  <i className="bx bx-redo" />
                </button>
                {selectionKind !== null ? (
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.deleteBtn}`}
                    onClick={handleDeleteSelected}
                    aria-label={t('story.editor.delete')}
                  >
                    <i className="bx bx-trash" />
                  </button>
                ) : (
                  <span className={styles.headerSpacer} />
                )}
                <button
                  type="button"
                  className={styles.doneBtn}
                  onClick={handleOpenPostSheet}
                  disabled={exporting}
                >
                  <span>{t('story.submit')}</span>
                  <i className="bx bx-send" />
                </button>
              </div>
            </div>

            <div className={styles.editorStage}>
              <div
                className={styles.canvasWrap}
                ref={canvasWrapRef}
                style={overlayHeight ? { paddingBottom: overlayHeight } : undefined}
              >
                <StoryCanvas
                  mediaUrl={current.url}
                  mode={mode}
                  variant={variant}
                  textBg={current.gradient ?? DEFAULT_TEXT_STORY_GRADIENT}
                  stageSize={stageSize}
                  filterId={filterId}
                  filterIntensity={filterIntensity}
                  activeTool={activeTool}
                  brushColor={brushColor}
                  brushSize={brushSize}
                  brushGradient={brushGradient}
                  isEraser={isEraser}
                  textStyle={textStyle}
                  initialSnapshot={current.snapshot}
                  onApiReady={handleApiReady}
                  onSelectionChange={handleSelectionChange}
                />
              </div>

              <div className={styles.editorOverlay} ref={overlayRef}>
                {activeTool === 'text' && (
                  <TextToolPanel
                    style={textStyle}
                    hasSelection={selectionKind === 'text'}
                    onStyleChange={handleTextStyleChange}
                  />
                )}
                {activeTool === 'filter' && isImage && !isTextStory && (
                  <FilterPanel
                    imageUrl={current.url ?? ''}
                    activeFilter={filterId}
                    intensity={filterIntensity}
                    onIntensityChange={setFilterIntensity}
                    onSelect={setFilterId}
                  />
                )}
                {activeTool === 'sticker' && (
                  <StickerPanel
                    onSelect={(src) => {
                      apiRef.current?.addSticker(src)
                    }}
                  />
                )}
                {activeTool === 'music' && (
                  <MusicPanel
                    trackId={musicTrackId}
                    volume={musicVolume}
                    onTrackChange={handleMusicTrackChange}
                    onVolumeChange={handleMusicVolumeChange}
                  />
                )}
                {activeTool === 'brush' && (
                  <BrushPanel
                    brushColor={brushColor}
                    onBrushColorChange={setBrushColor}
                    brushSize={brushSize}
                    onBrushSizeChange={setBrushSize}
                    gradient={brushGradient}
                    onGradientChange={setBrushGradient}
                    isEraser={isEraser}
                    onEraserChange={setIsEraser}
                    hasDrawings={hasDrawings}
                    onClear={() => {
                      apiRef.current?.clearDrawings()
                      setHasDrawings(false)
                    }}
                  />
                )}

                {items.length > 1 && (
                  <div className={styles.navRow}>
                    <button
                      type="button"
                      className={styles.navBtn}
                      onClick={() => goToItem(currentIndex - 1)}
                      disabled={currentIndex === 0}
                      aria-label={t('story.editor.back')}
                    >
                      <i className="bx bx-chevron-left" />
                    </button>
                    <span className={styles.navCount}>
                      {currentIndex + 1}/{items.length}
                    </span>
                    <button
                      type="button"
                      className={styles.navBtn}
                      onClick={() => goToItem(currentIndex + 1)}
                      disabled={currentIndex === items.length - 1}
                      aria-label={t('story.editor.select')}
                    >
                      <i className="bx bx-chevron-right" />
                    </button>
                  </div>
                )}

                {isTextStory && (
                  <>
                    <div className={styles.gradientRow} role="group" aria-label={t('story.background')}>
                      {TEXT_STORY_GRADIENTS.map((g, i) => {
                        const active =
                          current.gradient?.from === g.from && current.gradient?.to === g.to
                        return (
                          <button
                            key={`${g.from}:${g.to}`}
                            type="button"
                            className={styles.gradientSwatch}
                            style={{ background: `linear-gradient(180deg, ${g.from}, ${g.to})` }}
                            aria-label={`${t('story.background')} ${i + 1}`}
                            aria-pressed={active}
                            title={`${g.from} → ${g.to}`}
                            onClick={() => {
                              patchItem(currentIndex, { gradient: g })
                              apiRef.current?.setBackgroundGradient(g.from, g.to)
                            }}
                          />
                        )
                      })}
                    </div>
                  </>
                )}

                <EditorToolbar
                  activeTool={activeTool}
                  onToolChange={handleToolChange}
                  hiddenTools={
                    isTextStory
                      ? ['filter', 'music']
                      : mode === 'video'
                        ? ['filter']
                        : ['music']
                  }
                />
              </div>
            </div>
          </>
        )}

        {step === 'edit' && postSheet && current && (
          <>
            <div className={styles.header}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={handleBackFromSheet}
                aria-label={t('story.editor.back')}
              >
                <i className="bx bx-chevron-left" />
              </button>
              <span className={styles.title}>{t('story.postTitle')}</span>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={handleClose}
                aria-label={t('common.cancel')}
              >
                <i className="bx bx-x" />
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.storyFrame}>
                {isImage ? (
                  current.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={current.previewUrl}
                      alt=""
                      className={styles.storyFrameMedia}
                    />
                  ) : (
                    <ExternalImage src={current.url ?? ''} alt="" className={styles.storyFrameMedia} />
                  )
                ) : (
                  <video
                    src={current.previewUrl ?? current.url ?? ''}
                    muted
                    playsInline
                    controls
                    preload="metadata"
                    className={styles.storyFrameMedia}
                  />
                )}
              </div>

              <textarea
                className={styles.captionInput}
                value={current.caption}
                onChange={(e) => patchItem(currentIndex, { caption: e.target.value.slice(0, 300) })}
                placeholder={t('story.captionPlaceholder')}
                maxLength={300}
                rows={2}
                aria-label={t('story.captionPlaceholder')}
              />

              {items.length > 1 && (
                <div className={styles.stripRow}>
                  {items.map((item, i) => (
                    <div key={item.url ?? item.previewUrl ?? i} className={styles.stripItem}>
                      <button
                        type="button"
                        className={`${styles.stripThumb} ${i === currentIndex ? styles.stripThumbActive : ''}`}
                        onClick={() => setCurrentIndex(i)}
                        aria-label={t('story.editor.select')}
                        aria-pressed={i === currentIndex}
                      >
                        {!isVideoItem(item) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.previewUrl ?? item.url ?? ''}
                            alt=""
                            className={styles.stripThumbImg}
                          />
                        ) : (
                          <video
                            src={item.previewUrl ?? item.url ?? ''}
                            muted
                            playsInline
                            preload="metadata"
                            className={styles.stripThumbImg}
                          />
                        )}
                      </button>
                      {items.length > 1 && (
                        <button
                          type="button"
                          className={styles.stripRemove}
                          onClick={(e) => {
                            e.stopPropagation()
                            removeItemAt(i)
                          }}
                          aria-label={t('common.delete')}
                        >
                          <i className="bx bx-x" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {error && <p className={styles.errorText}>{error}</p>}
            </div>

            <div className={styles.footer}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleBackFromSheet}
                disabled={submitting}
              >
                <i className="bx bx-edit" />
                <span>{t('story.editor.editAgain')}</span>
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? (
                  <span className={styles.submitPulse}>{t('story.posting')}</span>
                ) : (
                  <>
                    <i className="bx bx-send" />
                    <span>{t('story.submit')}</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {confirmLeave && (
          <div
            className={styles.confirmOverlay}
            onClick={(e) => {
              e.stopPropagation()
              setConfirmLeave(false)
            }}
          >
            <div
              className={styles.confirmBox}
              role="alertdialog"
              aria-modal="true"
              aria-label={t('story.leaveConfirmTitle')}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.confirmTitle}>{t('story.leaveConfirmTitle')}</h3>
              <p className={styles.confirmBody}>{t('story.leaveConfirmBody')}</p>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setConfirmLeave(false)}
                >
                  {t('story.leaveConfirmStay')}
                </button>
                <button
                  type="button"
                  className={styles.confirmDanger}
                  onClick={() => {
                    resetForm()
                    onClose()
                  }}
                >
                  {t('story.leaveConfirmLeave')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}