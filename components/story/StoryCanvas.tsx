'use client'

import { useEffect, useRef } from 'react'
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
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GradientPencilBrush,
  applyFilterToImage,
  ensureTextFont,
  exportCanvasBlob,
  exportVideoBlob,
  loadBackgroundImage,
  type BrushGradientStyle,
  type FilterPresetId,
  type TextPanelStyle,
} from './editor/canvasHelpers'

export type EditorTool = 'select' | 'text' | 'sticker' | 'brush' | 'filter' | 'music'
export type EditorMode = 'image' | 'video'

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
}

interface StoryCanvasProps {
  mediaUrl: string
  mode: EditorMode
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
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<FabricCanvas | null>(null)
  const bgRef = useRef<FabricImage | null>(null)
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

  useEffect(() => {
    eraserRef.current = isEraser
  }, [isEraser])

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  // ---- history helpers ----
  const pushHistory = () => {
    const canvas = fabricRef.current
    if (!canvas || !bgLoadedRef.current) return
    const h = historyRef.current
    h.snapshots = h.snapshots.slice(0, h.index + 1)
    const serialized = canvas
      .getObjects()
      .filter((o) => o !== bgRef.current)
      .map((o) => o.toObject())
    h.snapshots.push(JSON.stringify(serialized))
    if (h.snapshots.length > HISTORY_LIMIT) h.snapshots.shift()
    h.index = h.snapshots.length - 1
  }

  const scheduleHistory = () => {
    if (historyTimerRef.current !== null) window.clearTimeout(historyTimerRef.current)
    historyTimerRef.current = window.setTimeout(pushHistory, HISTORY_DEBOUNCE_MS)
  }

  const protectBackground = (canvas: FabricCanvas, target?: FabricImage) => {
    const first = target ?? canvas.getObjects()[0]
    if (!first) return
    first.selectable = false
    first.evented = false
    first.lockMovementX = true
    first.lockMovementY = true
    first.lockRotation = true
    first.lockScalingX = true
    first.lockScalingY = true
    canvas.sendObjectToBack(first)
  }

  // ---- init canvas + load media ----
  useEffect(() => {
    const canvasEl = canvasElRef.current
    if (!canvasEl) return

    const fabric = new FabricCanvas(canvasEl, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    })
    fabric.freeDrawingBrush = new PencilBrush(fabric)
    fabricRef.current = fabric
    modeRef.current = mode

    const handleChange = () => {
      if (!bgLoadedRef.current) return
      scheduleHistory()
    }

    const emitSelection = () => {
      const active = fabric.getActiveObject()
      if (!active) {
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
            fill: typeof active.fill === 'string' ? active.fill : '#FFFFFF',
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
              color: 'rgba(0, 0, 0, 0.45)',
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
              active.fill = patch.fill ?? '#FFFFFF'
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
          if (!canvas || !active) return
          canvas.remove(active)
          canvas.requestRenderAll()
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
      })
    }

    const finalizeBg = (bg: FabricImage) => {
      if (!fabricRef.current) return
      fabric.add(bg)
      fabric.sendObjectToBack(bg)
      protectBackground(fabric, bg)
      if (modeRef.current === 'image') {
        applyFilterToImage(bg, filterId, filterIntensity)
      }
      bgRef.current = bg
      bgLoadedRef.current = true
      pushHistory()
      fabric.requestRenderAll()
      emitApi()
    }

    let videoEl: HTMLVideoElement | null = null
    const onVideoFrame = () => {
      const c = fabricRef.current
      if (c) c.requestRenderAll()
    }

    if (mode === 'video') {
      videoEl = document.createElement('video')
      videoEl.muted = true
      videoEl.playsInline = true
      videoEl.loop = true
      videoEl.src = mediaUrl
      videoRef.current = videoEl
      videoEl.addEventListener('timeupdate', onVideoFrame)
      const onLoadedData = () => {
        if (!fabricRef.current || !videoEl) return
        const vw = videoEl.videoWidth || CANVAS_WIDTH
        const vh = videoEl.videoHeight || CANVAS_HEIGHT
        const scale = Math.max(CANVAS_WIDTH / vw, CANVAS_HEIGHT / vh)
        const bg = new FabricImage(videoEl, {
          left: CANVAS_WIDTH / 2,
          top: CANVAS_HEIGHT / 2,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
          lockMovementX: true,
          lockMovementY: true,
        })
        finalizeBg(bg)
        void videoEl.play().catch(() => {})
      }
      videoEl.addEventListener('loadeddata', onLoadedData, { once: true })
      videoEl.load()
    } else {
      loadBackgroundImage(mediaUrl)
        .then((imgEl) => {
          if (!fabricRef.current) return
          const scale = Math.max(
            CANVAS_WIDTH / imgEl.width,
            CANVAS_HEIGHT / imgEl.height,
          )
          const bg = new FabricImage(imgEl, {
            left: CANVAS_WIDTH / 2,
            top: CANVAS_HEIGHT / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
          })
          finalizeBg(bg)
        })
        .catch(() => {
          /* media failed to load, editor stays empty */
        })
    }

    const restoreSnapshot = async (snapshot: string) => {
      const canvas = fabricRef.current
      if (!canvas) return
      canvas.discardActiveObject()
      canvas.isDrawingMode = false
      bgLoadedRef.current = false
      try {
        const objects = JSON.parse(snapshot)
        const bg = bgRef.current
        await canvas.loadFromJSON({ objects })
        if (bg) {
          canvas.add(bg)
          canvas.sendObjectToBack(bg)
          protectBackground(canvas, bg)
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
      videoRef.current = null
      fabric.dispose()
      fabricRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaUrl, mode])

  // ---- apply filter to background when filterId / intensity changes ----
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !bgLoadedRef.current || mode !== 'image') return
    const bg = canvas.getObjects().find((o) => o.isType('Image') && !o.selectable)
    if (bg && bg instanceof FabricImage) {
      applyFilterToImage(bg, filterId, filterIntensity)
      canvas.requestRenderAll()
    }
  }, [filterId, filterIntensity, mode])

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

  return (
    <div className={styles.stage}>
      <canvas ref={canvasElRef} className={styles.canvas} />
    </div>
  )
}