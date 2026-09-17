'use client'

export interface MusicTrack {
  id: string
  label: string
  tempo: number
  roots: number[]
  minor: boolean
  wave: OscillatorType
  style: 'warm' | 'dark' | 'party'
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'sunrise',
    label: 'story.music.sunrise',
    tempo: 96,
    roots: [57, 53, 60, 55],
    minor: false,
    wave: 'triangle',
    style: 'warm',
  },
  {
    id: 'nightdrive',
    label: 'story.music.night',
    tempo: 80,
    roots: [57, 53, 50, 52],
    minor: true,
    wave: 'sine',
    style: 'dark',
  },
  {
    id: 'party',
    label: 'story.music.party',
    tempo: 128,
    roots: [45, 48, 48, 43],
    minor: false,
    wave: 'square',
    style: 'party',
  },
]

const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

function scheduleNote(
  dest: AudioNode,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  gainValue: number,
) {
  const ctx = dest.context
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(gainValue, start + 0.02)
  gain.gain.setValueAtTime(gainValue, start + Math.max(dur - 0.04, 0.02))
  gain.gain.linearRampToValueAtTime(0, start + dur)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

function renderNoise(dest: AudioNode): AudioBuffer {
  const ctx = dest.context
  const length = Math.floor(ctx.sampleRate * 0.06)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

function scheduleHat(dest: AudioNode, noise: AudioBuffer, start: number, dur: number, gainValue: number) {
  const ctx = dest.context
  const src = ctx.createBufferSource()
  const gain = ctx.createGain()
  src.buffer = noise
  gain.gain.setValueAtTime(gainValue, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  src.connect(gain)
  gain.connect(dest)
  src.start(start)
  src.stop(start + dur + 0.02)
}

function renderLoop(ctx: BaseAudioContext, track: MusicTrack): AudioBuffer {
  const spb = 60 / track.tempo
  const bars = track.roots.length
  const loopSeconds = bars * 4 * spb
  const offline = new OfflineAudioContext(2, Math.ceil(loopSeconds * ctx.sampleRate), ctx.sampleRate)

  const master = offline.createGain()
  master.gain.value = track.style === 'dark' ? 0.85 : 1
  master.connect(offline.destination)

  const intervals: number[] = track.minor ? [0, 3, 7] : [0, 4, 7]
  const arpSeq = [12, 16, 19, 24, 19, 16]
  const noise = track.style === 'party' ? renderNoise(master) : null

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * 4 * spb
    const root = track.roots[bar]

    scheduleNote(master, midiToFreq(root - 24), barStart, 4 * spb, 'sine', 0.32)
    for (const interval of intervals) {
      scheduleNote(master, midiToFreq(root + interval), barStart, 4 * spb, 'triangle', 0.045)
    }

    const arpBase = track.style === 'dark' ? -12 : 0
    for (let e = 0; e < arpSeq.length; e++) {
      const t = barStart + e * spb * 0.5
      scheduleNote(
        master,
        midiToFreq(root + arpBase + arpSeq[e]),
        t,
        spb * 0.42,
        track.wave,
        track.style === 'party' ? 0.1 : 0.07,
      )
    }

    if (noise) {
      for (let e = 0; e < 8; e++) {
        scheduleHat(master, noise, barStart + e * spb * 0.5, 0.06, 0.05)
      }
    }
  }

  return offline.startRendering() as unknown as AudioBuffer
}

class MusicEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private mediaDest: MediaStreamAudioDestinationNode | null = null
  private source: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private buffers = new Map<string, AudioBuffer>()
  private noise: AudioBuffer | null = null
  private trackId: string | null = null
  private generation = 0

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.mediaDest = this.ctx.createMediaStreamDestination()
      this.masterGain.gain.value = 1
      this.masterGain.connect(this.ctx.destination)
      this.masterGain.connect(this.mediaDest)
      this.noise = renderNoise(this.masterGain)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private async bufferFor(ctx: AudioContext, track: MusicTrack): Promise<AudioBuffer> {
    const cached = this.buffers.get(track.id)
    if (cached) return cached
    const rendered = await renderLoop(ctx, track)
    if (this.ctx === ctx) {
      this.buffers.set(track.id, rendered)
      return rendered
    }
    return rendered
  }

  async play(trackId: string, volume: number): Promise<void> {
    this.stop()
    const ctx = this.ensureContext()
    const track = MUSIC_TRACKS.find((x) => x.id === trackId)
    if (!track || !this.masterGain) return

    const gen = ++this.generation
    this.trackId = trackId

    const buffer = await this.bufferFor(ctx, track)
    if (this.generation !== gen || this.trackId !== trackId) return

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const gain = ctx.createGain()
    gain.gain.value = volume
    source.connect(gain)
    gain.connect(this.masterGain)
    source.start()
    this.source = source
    this.gainNode = gain
  }

  stop(): void {
    this.generation++
    this.trackId = null
    if (this.source) {
      try {
        this.source.stop()
      } catch {
        /* already stopped */
      }
      this.source.disconnect()
      this.source = null
    }
    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }
  }

  setVolume(volume: number): void {
    if (this.gainNode) this.gainNode.gain.value = volume
  }

  isPlaying(trackId: string): boolean {
    return this.trackId === trackId && this.source !== null
  }

  stream(): MediaStream | null {
    if (this.trackId === null || !this.mediaDest) return null
    return this.mediaDest.stream
  }

  dispose(): void {
    const ctx = this.ctx
    this.stop()
    if (ctx && ctx.state !== 'closed') void ctx.close()
    this.ctx = null
    this.masterGain = null
    this.mediaDest = null
    this.buffers.clear()
    this.noise = null
  }
}

export const musicEngine = new MusicEngine()