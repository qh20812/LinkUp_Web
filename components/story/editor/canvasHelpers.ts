import { filters, Gradient, PencilBrush, util, type Canvas, type FabricImage, type TSimplePathData } from 'fabric'

export const CANVAS_WIDTH = 405
export const CANVAS_HEIGHT = 720

export type FilterPresetId = 'original' | 'bw' | 'warm' | 'cool' | 'vintage' | 'dramatic'

export interface FilterPreset {
  id: FilterPresetId
  label: string
  build: (intensity: number) => filters.BaseFilter<string>[]
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'original', label: 'story.editor.original', build: () => [] },
  {
    id: 'bw',
    label: 'story.editor.bw',
    build: (i) => [new filters.Saturation({ saturation: -1 * i })],
  },
  {
    id: 'warm',
    label: 'story.editor.warm',
    build: (i) => [
      new filters.HueRotation({ rotation: 0.12 * i }),
      new filters.Saturation({ saturation: 0.25 * i }),
      new filters.Brightness({ brightness: 0.06 * i }),
      new filters.BlendColor({ color: '#ff8a3d', mode: 'tint', alpha: 0.22 * i }),
    ],
  },
  {
    id: 'cool',
    label: 'story.editor.cool',
    build: (i) => [
      new filters.HueRotation({ rotation: 0.15 * i }),
      new filters.Saturation({ saturation: -0.1 * i }),
      new filters.Brightness({ brightness: 0.05 * i }),
    ],
  },
  {
    id: 'vintage',
    label: 'story.editor.vintage',
    build: (i) => [
      new filters.BlendColor({ color: '#7a4a21', mode: 'overlay', alpha: 0.38 * i }),
      new filters.Saturation({ saturation: -0.15 * i }),
      new filters.Brightness({ brightness: 0.04 * i }),
      new filters.Contrast({ contrast: -0.08 * i }),
    ],
  },
  {
    id: 'dramatic',
    label: 'story.editor.dramatic',
    build: (i) => [
      new filters.Contrast({ contrast: 0.32 * i }),
      new filters.Brightness({ brightness: -0.12 * i }),
      new filters.Saturation({ saturation: 0.18 * i }),
    ],
  },
]

export interface FontOption {
  family: string
  label: string
  googleUrl?: string
}

const googleCss = (family: string) =>
  `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@300..900&display=swap`

export const FONT_OPTIONS: FontOption[] = [
  { family: 'Montserrat', label: 'Montserrat' },
  { family: 'Open Sans', label: 'Open Sans' },
  { family: 'Poppins', label: 'Poppins', googleUrl: googleCss('Poppins') },
  { family: 'Oswald', label: 'Oswald', googleUrl: googleCss('Oswald') },
  { family: 'Lobster', label: 'Lobster', googleUrl: googleCss('Lobster') },
  { family: 'Pacifico', label: 'Pacifico', googleUrl: googleCss('Pacifico') },
  { family: 'Playfair Display', label: 'Playfair Display', googleUrl: googleCss('Playfair Display') },
  { family: 'Caveat', label: 'Caveat', googleUrl: googleCss('Caveat') },
  { family: 'Bangers', label: 'Bangers', googleUrl: googleCss('Bangers') },
  { family: 'Roboto Slab', label: 'Roboto Slab', googleUrl: googleCss('Roboto Slab') },
]

const loadedFonts = new Set<string>()

function ensureGoogleFont(font: FontOption) {
  if (!font.googleUrl || loadedFonts.has(font.family)) return
  loadedFonts.add(font.family)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = font.googleUrl
  document.head.appendChild(link)
}

export async function ensureTextFont(family: string) {
  const font = FONT_OPTIONS.find((f) => f.family === family)
  if (font?.googleUrl) ensureGoogleFont(font)
  try {
    await document.fonts.load(`700 32px "${family}"`)
  } catch {
    /* font may render with fallback */
  }
}

export function refreshCanvasForFonts(canvas: Canvas) {
  document.fonts.ready.then(() => canvas.requestRenderAll()).catch(() => {})
}

export const COLOR_PRESETS = [
  '#FFFFFF',
  '#000000',
  '#12A5A1',
  '#FF6F00',
  '#E91E63',
  '#F44336',
  '#FFD600',
  '#4CAF50',
  '#2196F3',
  '#9C27B0',
]

export const BRUSH_SIZE_MIN = 2
export const BRUSH_SIZE_MAX = 24
export const TEXT_SIZE_MIN = 18
export const TEXT_SIZE_MAX = 120

export interface TextPanelStyle {
  fontFamily: string
  fontSize: number
  fill: string
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  underline: boolean
  gradient: { from: string; to: string } | null
  stroke: string | null
  strokeWidth: number
  highlight: string | null
}

export const DEFAULT_TEXT_STYLE: TextPanelStyle = {
  fontFamily: 'Montserrat',
  fontSize: 40,
  fill: '#FFFFFF',
  fontWeight: 'bold',
  fontStyle: 'normal',
  textAlign: 'center',
  underline: false,
  gradient: null,
  stroke: null,
  strokeWidth: 0,
  highlight: null,
}

export interface TypePreset {
  id: string
  label: string
  style: Partial<TextPanelStyle>
}

export const TYPE_PRESETS: TypePreset[] = [
  {
    id: 'classic',
    label: 'Classic',
    style: {
      fontFamily: 'Montserrat',
      fontWeight: 'bold',
      fill: '#FFFFFF',
      gradient: null,
      stroke: null,
      strokeWidth: 0,
      highlight: null,
    },
  },
  {
    id: 'gradient',
    label: 'Gradient',
    style: {
      gradient: { from: '#FFD600', to: '#FF6F00' },
      stroke: null,
      strokeWidth: 0,
      highlight: null,
      fill: '#FFFFFF',
    },
  },
  {
    id: 'neon',
    label: 'Neon',
    style: {
      gradient: { from: '#00F5FF', to: '#9C27B0' },
      stroke: '#000000',
      strokeWidth: 6,
      highlight: null,
      fill: '#FFFFFF',
    },
  },
  {
    id: 'outline',
    label: 'Outline',
    style: {
      fill: '#FFFFFF',
      gradient: null,
      stroke: '#000000',
      strokeWidth: 10,
      highlight: null,
    },
  },
  {
    id: 'highlight',
    label: 'Caption',
    style: {
      fill: '#FFFFFF',
      gradient: null,
      stroke: null,
      strokeWidth: 0,
      highlight: '#000000',
      textAlign: 'left',
    },
  },
  {
    id: 'playful',
    label: 'Playful',
    style: {
      fontFamily: 'Bangers',
      gradient: { from: '#FFECB3', to: '#FFB300' },
      stroke: '#000000',
      strokeWidth: 4,
      highlight: null,
      fontSize: 56,
    },
  },
]

export interface StickerDef {
  id: string
  name: string
  src: string
}

function emojiSticker(id: string, name: string, emoji: string): StickerDef {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><text x="60" y="84" font-size="100" text-anchor="middle">${emoji}</text></svg>`
  return {
    id,
    name,
    src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  }
}

export const STICKERS: StickerDef[] = [
  emojiSticker('like', 'Story sticker', '👍'),
  emojiSticker('heart', 'Story sticker', '❤️'),
  emojiSticker('laugh', 'Story sticker', '😂'),
  emojiSticker('fire', 'Story sticker', '🔥'),
  emojiSticker('party', 'Story sticker', '🎉'),
  emojiSticker('cool', 'Story sticker', '😎'),
  emojiSticker('crown', 'Story sticker', '👑'),
  emojiSticker('bolt', 'Story sticker', '⚡'),
  emojiSticker('gem', 'Story sticker', '💎'),
  emojiSticker('rocket', 'Story sticker', '🚀'),
  emojiSticker('rainbow', 'Story sticker', '🌈'),
  emojiSticker('cat', 'Story sticker', '🐱'),
  emojiSticker('flower', 'Story sticker', '🌸'),
  emojiSticker('star', 'Story sticker', '⭐'),
  emojiSticker('sun', 'Story sticker', '☀️'),
  emojiSticker('chat', 'Story sticker', '💬'),
  emojiSticker('music', 'Story sticker', '🎵'),
  emojiSticker('trophy', 'Story sticker', '🏆'),
]

export function applyFilterToImage(
  image: FabricImage,
  filterId: FilterPresetId,
  intensity = 1,
): void {
  const preset = FILTER_PRESETS.find((p) => p.id === filterId) ?? FILTER_PRESETS[0]
  image.filters = preset.build(intensity)
  image.applyFilters()
}

export function loadBackgroundImage(
  url: string,
): Promise<HTMLImageElement> {
  return util.loadImage(url)
}

const BLUR_SOURCE_OVERSCAN = 1.15

export async function buildBlurredBackground(
  src: HTMLImageElement | HTMLVideoElement | string,
  w: number,
  h: number,
  blurPx = 40,
): Promise<HTMLImageElement> {
  let el: HTMLImageElement | HTMLVideoElement
  if (typeof src === 'string') {
    el = await util.loadImage(src)
  } else {
    el = src
  }
  const srcW =
    el instanceof HTMLVideoElement ? el.videoWidth || el.width || w : el.width || w
  const srcH =
    el instanceof HTMLVideoElement ? el.videoHeight || el.height || h : el.height || h

  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not supported')

  const scale = Math.max(w / srcW, h / srcH) * BLUR_SOURCE_OVERSCAN
  const dw = srcW * scale
  const dh = srcH * scale
  ctx.filter = `blur(${blurPx}px)`
  ctx.drawImage(el, (w - dw) / 2, (h - dh) / 2, dw, dh)
  return util.loadImage(cv.toDataURL('image/png'))
}

export interface TextStoryGradient {
  from: string
  to: string
}

export const TEXT_STORY_GRADIENTS: TextStoryGradient[] = [
  { from: '#833AB4', to: '#FD1D1D' },
  { from: '#0F2027', to: '#2C5364' },
  { from: '#FF512F', to: '#DD2476' },
  { from: '#11998E', to: '#38EF7D' },
]

export const DEFAULT_TEXT_STORY_GRADIENT: TextStoryGradient = TEXT_STORY_GRADIENTS[0]

export async function buildGradientBackground(
  from: string,
  to: string,
  w: number,
  h: number,
): Promise<HTMLImageElement> {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not supported')
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, from)
  grad.addColorStop(1, to)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  return util.loadImage(cv.toDataURL('image/png'))
}

export async function exportCanvasBlob(
  canvas: Canvas,
  multiplier = 2,
): Promise<Blob | null> {
  canvas.discardActiveObject()
  canvas.requestRenderAll()
  return canvas.toBlob({ format: 'jpeg', quality: 0.92, multiplier })
}

export async function exportVideoBlob(
  canvas: Canvas,
  durationSec: number,
  audioStream?: MediaStream,
): Promise<Blob | null> {
  const el = canvas.getElement()
  if (typeof el.captureStream !== 'function') return null

  canvas.discardActiveObject()
  const canvasStream = el.captureStream(30)

  const stream = new MediaStream()
  for (const track of canvasStream.getVideoTracks()) stream.addTrack(track)
  if (audioStream) {
    for (const track of audioStream.getAudioTracks()) stream.addTrack(track)
  }
  if (stream.getAudioTracks().length === 0 && stream.getVideoTracks().length === 0) return null

  const mimeCandidates = audioStream
    ? [
      'video/webm;codecs="opus, vp9"',
      'video/webm;codecs="opus, vp8"',
      'video/webm',
    ]
    : [
      'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ]
  const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''

  const chunks: BlobPart[] = []
  let stopResolve!: () => void
  let stopReject!: (e: unknown) => void
  const finished = new Promise<void>((resolve, reject) => {
    stopResolve = resolve
    stopReject = reject
  })

  const recorder = new MediaRecorder(stream, {
    mimeType: mimeType || undefined,
    videoBitsPerSecond: 3_500_000,
  })
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  recorder.onstop = stopResolve
  recorder.onerror = (e) => stopReject(e.error ?? new Error('recorder error'))

  try {
    recorder.start(250)
  } catch {
    canvasStream.getTracks().forEach((track) => track.stop())
    return null
  }

  const ticker = window.setInterval(() => canvas.requestRenderAll(), 1000 / 30)

  const elapsed = Math.max(Math.round(durationSec * 1000), 1500)
  await new Promise<void>((resolve) => window.setTimeout(resolve, elapsed))
  if (recorder.state !== 'inactive') recorder.stop()
  await finished

  window.clearInterval(ticker)
  canvasStream.getTracks().forEach((track) => track.stop())

  const type = recorder.mimeType || mimeType || 'video/webm'
  return new Blob(chunks, { type })
}

export interface BrushGradientStyle {
  enabled: boolean
  from: string
  to: string
}

export const DEFAULT_BRUSH_GRADIENT: BrushGradientStyle = {
  enabled: false,
  from: '#FFFFFF',
  to: '#FF6BD6',
}

export class GradientPencilBrush extends PencilBrush {
  gradientColors: [string, string] = ['#FFFFFF', '#FF6BD6']

  _render(ctx = this.canvas.contextTop) {
    if (this._points.length > 1) {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const p of this._points) {
        if (p.x < minX) minX = p.x
        if (p.y < minY) minY = p.y
        if (p.x > maxX) maxX = p.x
        if (p.y > maxY) maxY = p.y
      }
      const grad = ctx.createLinearGradient(minX, minY, maxX, maxY)
      grad.addColorStop(0, this.gradientColors[0])
      grad.addColorStop(1, this.gradientColors[1])
      ctx.strokeStyle = grad
    }
    super._render(ctx)
  }

  createPath(pathData: TSimplePathData) {
    const path = super.createPath(pathData)
    const width = path.width || 1
    const height = path.height || 1
    path.stroke = new Gradient({
      type: 'linear',
      gradientUnits: 'pixels',
      coords: { x1: 0, y1: 0, x2: width, y2: height },
      colorStops: [
        { offset: 0, color: this.gradientColors[0] },
        { offset: 1, color: this.gradientColors[1] },
      ],
    })
    return path
  }
}

export function buildGradientFill(
  target: { width?: number; height?: number },
  from: string,
  to: string,
) {
  const w = 'width' in target && target.width ? target.width : CANVAS_WIDTH
  const h = 'height' in target && target.height ? target.height : CANVAS_HEIGHT
  return new Gradient({
    type: 'linear',
    gradientUnits: 'pixels',
    coords: { x1: 0, y1: 0, x2: w, y2: h },
    colorStops: [
      { offset: 0, color: from },
      { offset: 1, color: to },
    ],
  })
}