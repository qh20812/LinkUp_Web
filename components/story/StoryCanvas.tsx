'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Canvas as FabricCanvas,
  FabricImage,
  Gradient,
  IText,
  PencilBrush,
  Shadow,
  type FabricObject,
  type TPointerEventInfo,
} from 'fabric'
import styles from './StoryCanvas.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_TEXT_STORY_GRADIENT,
  GradientPencilBrush,
  applyFilterToImage,
  buildBlurredBackground,
  buildGradientBackground,
  ensureTextFont,
  exportCanvasBlob,
  exportVideoBlob,
  loadBackgroundImage,
  type BrushGradientStyle,
  type FilterPresetId,
  type TextPanelStyle,
  type TextStoryGradient,
} from './editor/canvasHelpers'

export type EditorTool = 'select' | 'text' | 'sticker' | 'brush' | 'filter' | 'music'
export type EditorMode = 'image' | 'video'
export type EditorVariant = 'media' | 'text'

export type EditorSelection =
  | { kind: 'text'; text: string; style: TextPanelStyle }
  | { kind: 'other' }
  | null

export interface StoryCanvasApi {
  addText: (text: string, style: TextPanelStyle) => void
  addSticker: (src: string) => void
  applyStyleToSelection: (patch: Partial<TextPanelStyle>) => void
  deleteSelected: () => void
  clearDrawings: () => void
  undo: () => void
  redo: () => void
  getHistoryState: () => { canUndo: boolean; canRedo: boolean }
  exportBlob: (multiplier?: number) => Promise<Blob | null>
  exportVideo: (audioStream?: MediaStream) => Promise<Blob | null>
  hasDrawings: () => boolean
  setBackgroundGradient: (from: string, to: string) => void
  resetPosition: () => void
}

interface StoryCanvasProps {
  mediaUrl?: string | null
  mode: EditorMode
  variant?: EditorVariant
  textBg?: TextStoryGradient | null
  stageSize?: { width: number; height: number } | null
  filterId: FilterPresetId
  filterIntensity: number
  brushColor: string
  brushSize: number
  brushGradient: BrushGradientStyle
  isEraser: boolean
  activeTool: EditorTool
  onApiReady: (api: StoryCanvasApi) => void
  onSelectionChange: (selection: EditorSelection) => void
}

const HISTORY_LIMIT = 20
const HISTORY_DEBOUNCE_MS = 500
const CANVAS_DEFAULT_FILL = '#FFFFFF'
const CANVAS_TEXT_SHADOW_COLOR = 'rgba(0, 0, 0, 0.45)'

interface GradientLike {
  colorStops?: Array<{ offset: number; color: string }>
}

function gradientFromFill(fill: unknown): { from: string; to: string } | null {
  if (fill && typeof fill === 'object') {
    const cs = (fill as GradientLike).colorStops
    if (cs && cs.length >= 2) {
      return { from: cs[0].color, to: cs[cs.length - 1].color }
    }
  }
  return null
}

function makeTextGradient(width: number, height: number, from: string, to: string) {
  return new Gradient({
    type: 'linear',
    gradientUnits: 'pixels',
    coords: { x1: 0, y1: 0, x2: width, y2: height },
    colorStops: [
      { offset: 0, color: from },
      { offset: 1, color: to },
    ],
  })
}

export default function StoryCanvas({
  mediaUrl,
  mode,
  variant = 'media',
  textBg = null,
  stageSize = null,
  filterId,
  filterIntensity,
  brushColor,
  brushSize,
  brushGradient,
  isEraser,
  activeTool,
  onApiReady,
  onSelectionChange,
}: StoryCanvasProps) {
  const { t } = useTranslation()
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<FabricCanvas | null>(null)
  const bgRef = useRef<FabricImage | null>(null)
  const fillRef = useRef<FabricImage | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const historyRef = useRef<{ snapshots: string[]; index: number }>({
    snapshots: [],
    index: -1,
  })
  const historyTimerRef = useRef<number | null>(null)
  const bgLoadedRef = useRef(false)
  const apiEmittedRef = useRef(false)
  const eraserRef = useRef(isEraser)
  const modeRef = useRef(mode)
  const variantRef = useRef(variant)
  const activeToolRef = useRef(activeTool)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    eraserRef.current = isEraser
  }, [isEraser])

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    variantRef.current = variant
  }, [variant])

  // ---- history helpers ----
  const pushHistory = () => {
    const canvas = fabricRef.current
    if (!canvas || !bgLoadedRef.current) return
    const h = historyRef.current
    h.snapshots = h.snapshots.slice(0, h.index + 1)
    const serialized = canvas
      .getObjects()
      .filter((o) => o !== bgRef.current && o !== fillRef.current)
      .map((o) => o.toObject())
    const bg = bgRef.current
    const bgTransform = bg
      ? { left: bg.left ?? 0, top: bg.top ?? 0, scaleX: bg.scaleX ?? 1, scaleY: bg.scaleY ?? 1 }
      : null
    h.snapshots.push(JSON.stringify({ objects: serialized, bgTransform }))
    if (h.snapshots.length > HISTORY_LIMIT) h.snapshots.shift()
    h.index = h.snapshots.length - 1
  }

  const scheduleHistory = () => {
    if (historyTimerRef.current !== null) window.clearTimeout(historyTimerRef.current)
    historyTimerRef.current = window.setTimeout(pushHistory, HISTORY_DEBOUNCE_MS)
  }

  const lockBackground = (target: FabricImage) => {
    target.selectable = false
    target.evented = false
    target.lockMovementX = true
    target.lockMovementY = true
    target.lockRotation = true
    target.lockScalingX = true
    target.lockScalingY = true
  }

  const configureMedia = (target: FabricObject, interactive: boolean) => {
    target.selectable = interactive
    target.evented = interactive
    target.lockMovementX = !interactive
    target.lockMovementY = !interactive
    target.lockScalingX = !interactive
    target.lockScalingY = !interactive
    target.lockRotation = true
    ;(target as FabricObject & { lockUniScaling?: boolean }).lockUniScaling = true
    if (interactive) {
      target.hasBorders = true
      target.hasControls = true
      target.transparentCorners = false
      target.cornerSize = 12
    }
  }

  useEffect(() => {
    activeToolRef.current = activeTool
    const bg = bgRef.current
    if (!bg) return
    configureMedia(bg, variantRef.current === 'media' && activeTool === 'select')
    if (activeTool !== 'select' && fabricRef.current?.getActiveObject() === bg) {
      fabricRef.current.discardActiveObject()
    }
    fabricRef.current?.requestRenderAll()
  }, [activeTool, mode])

  // ---- init canvas + load media ----
  useEffect(() => {
    const canvasEl = canvasElRef.current
    if (!canvasEl) return

    const fabric = new FabricCanvas(canvasEl, {
      width: stageSize?.width ?? CANVAS_WIDTH,
      height: stageSize?.height ?? CANVAS_HEIGHT,
    })
    fabric.freeDrawingBrush = new PencilBrush(fabric)
    fabricRef.current = fabric
    modeRef.current = mode
    variantRef.current = variant
    setLoading(true)
    setLoadError(false)

    const handleChange = (opt?: { target?: FabricObject; path?: FabricObject }) => {
      if (!bgLoadedRef.current) return
      if (opt?.target === fillRef.current) return
      scheduleHistory()
    }

    const emitSelection = () => {
      const active = fabric.getActiveObject()
      if (!active || active === bgRef.current || active === fillRef.current) {
        onSelectionChange(null)
        return
      }
      if (active instanceof IText) {
        const gradient = gradientFromFill(active.fill)
        onSelectionChange({
          kind: 'text',
          text: active.text ?? '',
          style: {
            fontFamily: active.fontFamily,
            fontSize: active.fontSize ?? 40,
            fill: typeof active.fill === 'string' ? active.fill : CANVAS_DEFAULT_FILL,
            fontWeight: active.fontWeight === 'bold' ? 'bold' : 'normal',
            fontStyle: active.fontStyle === 'italic' ? 'italic' : 'normal',
            textAlign:
              active.textAlign === 'left' || active.textAlign === 'right'
                ? active.textAlign
                : 'center',
            underline: !!active.underline,
            gradient,
            stroke: typeof active.stroke === 'string' && active.stroke !== '' ? active.stroke : null,
            strokeWidth: active.strokeWidth > 0 ? active.strokeWidth : 0,
            highlight: active.textBackgroundColor || null,
          },
        })
      } else {
        onSelectionChange({ kind: 'other' })
      }
    }

    const handleMouseDown = (opt: TPointerEventInfo<MouseEvent>) => {
      if (!eraserRef.current) return
      const target = opt.target as FabricObject | undefined
      if (target && target.isType('Path')) {
        fabric.remove(target)
        fabric.requestRenderAll()
      }
    }

    fabric.on('object:added', handleChange)
    fabric.on('object:removed', handleChange)
    fabric.on('object:modified', handleChange)
    fabric.on('path:created', handleChange)
    fabric.on('selection:created', emitSelection)
    fabric.on('selection:updated', emitSelection)
    fabric.on('selection:cleared', () => onSelectionChange(null))
    fabric.on('mouse:down', handleMouseDown as never)

    const emitApi = () => {
      if (apiEmittedRef.current) return
      apiEmittedRef.current = true
      onApiReady({
        addText: async (text, style) => {
          const canvas = fabricRef.current
          if (!canvas) return
          await ensureTextFont(style.fontFamily)
          const t = new IText(text || 'Text', {
            left: CANVAS_WIDTH / 2,
            top: CANVAS_HEIGHT / 2,
            originX: 'center',
            originY: 'center',
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fill: style.fill,
            stroke: style.stroke ?? undefined,
            strokeWidth: style.strokeWidth || 0,
            textBackgroundColor: style.highlight || undefined,
            fontWeight: style.fontWeight,
            fontStyle: style.fontStyle,
            textAlign: style.textAlign,
            underline: style.underline,
            shadow: new Shadow({
              color: CANVAS_TEXT_SHADOW_COLOR,
              blur: 6,
              offsetX: 0,
              offsetY: 2,
            }),
          })
          if (style.gradient) {
            t.fill = makeTextGradient(
              t.width || 120,
              t.height || style.fontSize,
              style.gradient.from,
              style.gradient.to,
            )
          }
          canvas.isDrawingMode = false
          canvas.add(t)
          canvas.setActiveObject(t)
          canvas.requestRenderAll()
          requestAnimationFrame(() => {
            t.enterEditing()
            canvas.requestRenderAll()
          })
        },
        addSticker: async (src) => {
          const canvas = fabricRef.current
          if (!canvas) return
          try {
            const el = await loadBackgroundImage(src)
            const sticker = new FabricImage(el, {
              left: CANVAS_WIDTH / 2,
              top: CANVAS_HEIGHT / 2,
              originX: 'center',
              originY: 'center',
            })
            const targetWidth = 112
            const scale = targetWidth / (el.width || 1)
            sticker.set({ scaleX: scale, scaleY: scale })
            canvas.isDrawingMode = false
            canvas.add(sticker)
            canvas.setActiveObject(sticker)
            canvas.requestRenderAll()
          } catch {
            /* ignore failed sticker load */
          }
        },
        applyStyleToSelection: (patch) => {
          const canvas = fabricRef.current
          const active = canvas?.getActiveObject()
          if (!canvas || !active || !(active instanceof IText)) return
          if (patch.fontFamily !== undefined) {
            active.fontFamily = patch.fontFamily
            void ensureTextFont(patch.fontFamily)
              .then(() => {
                if (fabricRef.current === canvas) canvas.requestRenderAll()
              })
              .catch(() => {})
          }
          if (patch.fontSize !== undefined) active.fontSize = patch.fontSize
          if (patch.gradient !== undefined) {
            if (patch.gradient) {
              active.fill = makeTextGradient(
                active.width || 120,
                active.height || (patch.fontSize ?? active.fontSize ?? 40),
                patch.gradient.from,
                patch.gradient.to,
              )
            } else {
              active.fill = patch.fill ?? CANVAS_DEFAULT_FILL
            }
          } else if (patch.fill !== undefined) {
            active.fill = patch.fill
          }
          if (patch.fontWeight !== undefined) active.fontWeight = patch.fontWeight
          if (patch.fontStyle !== undefined) active.fontStyle = patch.fontStyle
          if (patch.textAlign !== undefined) active.textAlign = patch.textAlign
          if (patch.underline !== undefined) active.underline = patch.underline
          if (patch.stroke !== undefined) active.stroke = patch.stroke ?? ''
          if (patch.strokeWidth !== undefined) active.strokeWidth = patch.strokeWidth
          if (patch.highlight !== undefined) active.textBackgroundColor = patch.highlight ?? ''
          active.setCoords()
          canvas.requestRenderAll()
          scheduleHistory()
        },
        deleteSelected: () => {
          const canvas = fabricRef.current
          const active = canvas?.getActiveObject()
          if (!canvas || !active || active === bgRef.current || active === fillRef.current) return
          canvas.remove(active)
          canvas.requestRenderAll()
        },
        resetPosition: () => {
          const canvas = fabricRef.current
          const bg = bgRef.current
          if (!canvas || !bg) return
          const cw = canvas.getWidth()
          const ch = canvas.getHeight()
          bg.set({
            originX: 'center',
            originY: 'center',
            left: cw / 2,
            top: ch / 2,
          })
          bg.setCoords()
          canvas.requestRenderAll()
          pushHistory()
        },
        clearDrawings: () => {
          const canvas = fabricRef.current
          if (!canvas) return
          const toRemove = canvas
            .getObjects()
            .filter((o) => o.isType('Path'))
            .slice()
          if (toRemove.length === 0) return
          toRemove.forEach((o) => canvas.remove(o))
          canvas.requestRenderAll()
        },
        undo: async () => {
          const h = historyRef.current
          if (h.index <= 0) return
          h.index -= 1
          await restoreSnapshot(h.snapshots[h.index])
        },
        redo: async () => {
          const h = historyRef.current
          if (h.index >= h.snapshots.length - 1) return
          h.index += 1
          await restoreSnapshot(h.snapshots[h.index])
        },
        getHistoryState: () => {
          const h = historyRef.current
          return {
            canUndo: h.index > 0,
            canRedo: h.index >= 0 && h.index < h.snapshots.length - 1,
          }
        },
        exportBlob: (multiplier = 2) => {
          const canvas = fabricRef.current
          if (!canvas) return Promise.resolve(null)
          return exportCanvasBlob(canvas, multiplier)
        },
        exportVideo: (audioStream?: MediaStream) => {
          const canvas = fabricRef.current
          const videoEl = videoRef.current
          if (!canvas || !videoEl || !videoEl.duration) return Promise.resolve(null)
          return exportVideoBlob(canvas, videoEl.duration, audioStream)
        },
        hasDrawings: () => {
          const canvas = fabricRef.current
          if (!canvas) return false
          return canvas.getObjects().some((o) => o.isType('Path'))
        },
        setBackgroundGradient: (from: string, to: string) => {
          const canvas = fabricRef.current
          if (!canvas) return
          const cw = canvas.getWidth()
          const ch = canvas.getHeight()
          void buildGradientBackground(from, to, cw, ch)
            .then((imgEl) => {
              const currentCanvas = fabricRef.current
              if (!currentCanvas) return
              const cw = currentCanvas.getWidth()
              const ch = currentCanvas.getHeight()
              const old = bgRef.current
              const fill = fillRef.current
              const bg = new FabricImage(imgEl, {
                left: cw / 2,
                top: ch / 2,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false,
              })
              if (old) currentCanvas.remove(old)
              bgRef.current = bg
              lockBackground(bg)
              if (fill) {
                currentCanvas.add(fill)
                currentCanvas.sendObjectToBack(fill)
                currentCanvas.add(bg)
              } else {
                currentCanvas.add(bg)
                currentCanvas.sendObjectToBack(bg)
              }
              currentCanvas.requestRenderAll()
            })
            .catch(() => {
              /* keep current background on failure */
            })
        },
      })
    }

    const finalizeBackgrounds = (fill: FabricImage | null, crisp: FabricImage) => {
      if (!fabricRef.current) return
      if (fill) {
        fabric.add(fill)
        fabric.sendObjectToBack(fill)
        lockBackground(fill)
      }
      const cw = fabric.getWidth()
      const ch = fabric.getHeight()
      fabric.add(crisp)
      crisp.set({
        originX: 'center',
        originY: 'center',
        left: cw / 2,
        top: ch / 2,
      })
      crisp.setCoords()
      configureMedia(crisp, variantRef.current === 'media' && activeToolRef.current === 'select')
      if (modeRef.current === 'image' && variantRef.current === 'media') {
        applyFilterToImage(crisp, filterId, filterIntensity)
      }
      fillRef.current = fill
      bgRef.current = crisp
      bgLoadedRef.current = true
      pushHistory()
      fabric.requestRenderAll()
      emitApi()
      setLoadError(false)
      setLoading(false)
    }

    let videoEl: HTMLVideoElement | null = null
    const onVideoFrame = () => {
      const c = fabricRef.current
      if (c) c.requestRenderAll()
    }

    if (variantRef.current === 'text') {
      const g = textBg ?? DEFAULT_TEXT_STORY_GRADIENT
      void buildGradientBackground(g.from, g.to, CANVAS_WIDTH, CANVAS_HEIGHT)
        .then((imgEl) => {
          if (!fabricRef.current) return
          const cw = fabricRef.current.getWidth()
          const ch = fabricRef.current.getHeight()
          const bg = new FabricImage(imgEl, {
            left: cw / 2,
            top: ch / 2,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
          })
          finalizeBackgrounds(null, bg)
        })
        .catch(() => {
          /* gradient failed to render, editor stays empty */
          setLoading(false)
          setLoadError(true)
        })
    } else if (mode === 'video') {
      videoEl = document.createElement('video')
      videoEl.muted = true
      videoEl.playsInline = true
      videoEl.loop = true
      videoEl.src = mediaUrl ?? ''
      videoRef.current = videoEl
      videoEl.addEventListener('timeupdate', onVideoFrame)
      const onLoadedData = () => {
        if (!fabricRef.current || !videoEl) return
        const vw = videoEl.videoWidth || CANVAS_WIDTH
        const vh = videoEl.videoHeight || CANVAS_HEIGHT
        const cw = fabricRef.current.getWidth()
        const ch = fabricRef.current.getHeight()
        const scale = Math.min(cw / vw, ch / vh)
        void (async () => {
          let fill: FabricImage | null = null
          try {
            const fillEl = await buildBlurredBackground(videoEl, cw, ch)
            fill = new FabricImage(fillEl, {
              left: cw / 2,
              top: ch / 2,
              originX: 'center',
              originY: 'center',
              selectable: false,
              evented: false,
            })
          } catch {
            fill = null
          }
          const bg = new FabricImage(videoEl, {
            left: cw / 2,
            top: ch / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
          })
          finalizeBackgrounds(fill, bg)
          void videoEl.play().catch(() => {})
        })()
      }
      videoEl.addEventListener('loadeddata', onLoadedData, { once: true })
      videoEl.addEventListener('error', () => {
        setLoading(false)
        setLoadError(true)
      })
      videoEl.load()
    } else {
      loadBackgroundImage(mediaUrl ?? '')
        .then(async (imgEl) => {
          if (!fabricRef.current) return
          const cw = fabricRef.current.getWidth()
          const ch = fabricRef.current.getHeight()
          const scale = Math.min(
            cw / imgEl.width,
            ch / imgEl.height,
          )
          let fill: FabricImage | null = null
          try {
            const fillEl = await buildBlurredBackground(imgEl, cw, ch)
            fill = new FabricImage(fillEl, {
              left: cw / 2,
              top: ch / 2,
              originX: 'center',
              originY: 'center',
              selectable: false,
              evented: false,
            })
          } catch {
            fill = null
          }
          const bg = new FabricImage(imgEl, {
            left: cw / 2,
            top: ch / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
          })
          finalizeBackgrounds(fill, bg)
        })
        .catch(() => {
          /* media failed to load, editor stays empty */
          setLoading(false)
          setLoadError(true)
        })
    }

    const restoreSnapshot = async (snapshot: string) => {
      const canvas = fabricRef.current
      if (!canvas) return
      canvas.discardActiveObject()
      canvas.isDrawingMode = false
      bgLoadedRef.current = false
      try {
        const data = JSON.parse(snapshot)
        const objects = Array.isArray(data) ? data : data.objects
        const bgTransform = Array.isArray(data) ? null : data.bgTransform
        const fill = fillRef.current
        const bg = bgRef.current
        await canvas.loadFromJSON({ objects })
        if (fill) {
          canvas.add(fill)
          canvas.sendObjectToBack(fill)
          lockBackground(fill)
        }
        if (bg) {
          canvas.add(bg)
          if (bgTransform) {
            bg.set({
              originX: 'center',
              originY: 'center',
              left: bgTransform.left,
              top: bgTransform.top,
              scaleX: bgTransform.scaleX,
              scaleY: bgTransform.scaleY,
            })
            bg.setCoords()
          } else {
            bg.set({ originX: 'center', originY: 'center' })
          }
          configureMedia(bg, variantRef.current === 'media' && activeToolRef.current === 'select')
        }
      } catch {
        /* ignore restore errors */
      } finally {
        bgLoadedRef.current = true
        canvas.requestRenderAll()
      }
    }

    return () => {
      if (historyTimerRef.current !== null) window.clearTimeout(historyTimerRef.current)
      historyTimerRef.current = null
      if (videoEl) {
        videoEl.pause()
        videoEl.removeEventListener('timeupdate', onVideoFrame)
      }
      apiEmittedRef.current = false
      bgLoadedRef.current = false
      bgRef.current = null
      fillRef.current = null
      videoRef.current = null
      fabric.dispose()
      fabricRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaUrl, mode, variant, reloadCount])

  // ---- apply filter to background when filterId / intensity changes ----
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !bgLoadedRef.current || mode !== 'image' || variant !== 'media') return
    const bg = bgRef.current
    if (bg && bg instanceof FabricImage) {
      applyFilterToImage(bg, filterId, filterIntensity)
      canvas.requestRenderAll()
    }
  }, [filterId, filterIntensity, mode, variant])

  // ---- brush setup ----
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (brushGradient.enabled) {
      const brush = new GradientPencilBrush(canvas)
      brush.gradientColors = [brushGradient.from, brushGradient.to]
      brush.width = brushSize
      canvas.freeDrawingBrush = brush
    } else {
      canvas.freeDrawingBrush = new PencilBrush(canvas)
    }
  }, [brushGradient, brushSize])

  // ---- brush color / size ----
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const brush = canvas.freeDrawingBrush
    if (!brush) return
    brush.width = brushSize
    if (brush instanceof PencilBrush && !(brush instanceof GradientPencilBrush)) {
      brush.color = brushColor
    }
  }, [brushColor, brushSize])

  // ---- tool mode ----
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.isDrawingMode = activeTool === 'brush' && !isEraser
  }, [activeTool, isEraser])

  // ---- sync canvas internal dimensions with stageSize ----
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const targetW = stageSize?.width ?? CANVAS_WIDTH
    const targetH = stageSize?.height ?? CANVAS_HEIGHT
    if (targetW === canvas.getWidth() && targetH === canvas.getHeight()) return

    canvas.setDimensions({ width: targetW, height: targetH })

    const bg = bgRef.current
    if (bg && bgLoadedRef.current) {
      const el = bg.getElement?.() ?? (bg as unknown as { _element: HTMLImageElement | HTMLVideoElement })._element
      const origW = el instanceof HTMLVideoElement
        ? (el.videoWidth || el.width || targetW)
        : (el.width || targetW)
      const origH = el instanceof HTMLVideoElement
        ? (el.videoHeight || el.height || targetH)
        : (el.height || targetH)
      const scale = Math.min(targetW / origW, targetH / origH)
      bg.set({
        scaleX: scale,
        scaleY: scale,
        left: targetW / 2,
        top: targetH / 2,
        originX: 'center',
        originY: 'center',
      })
      bg.setCoords()
      configureMedia(bg, variantRef.current === 'media' && activeToolRef.current === 'select')
    }

    const fill = fillRef.current
    if (fill) {
      fill.set({
        left: targetW / 2,
        top: targetH / 2,
        originX: 'center',
        originY: 'center',
      })
      fill.setCoords()
    }

    canvas.requestRenderAll()
  }, [stageSize])

  return (
    <div
      className={styles.stage}
      style={stageSize ? { width: stageSize.width, height: stageSize.height } : undefined}
    >
      <canvas ref={canvasElRef} className={styles.canvas} aria-label={t('story.editor.canvas')} />
      {loading && (
        <div className={styles.statusOverlay} aria-hidden="true">
          <div className={styles.skeletonShimmer} />
        </div>
      )}
      {loadError && (
        <div className={styles.statusOverlay}>
          <div className={styles.errorBox}>
            <i className="bx bx-image-alt" aria-hidden="true" />
            <p>{t('story.editor.mediaLoadFailed')}</p>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => setReloadCount((c) => c + 1)}
            >
              <i className="bx bx-revision" aria-hidden="true" />
              <span>{t('common.retry')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}