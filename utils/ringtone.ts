let ctx: AudioContext | null = null
let timer: ReturnType<typeof setInterval> | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  return ctx
}

function beep(ctx: AudioContext, frequency: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = frequency
  gain.gain.value = 0

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()

  const now = ctx.currentTime
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.35, now + 0.02)
  gain.gain.setValueAtTime(0.35, now + 1.0)
  gain.gain.linearRampToValueAtTime(0, now + 1.1)

  const stopAt = now + 1.15
  osc.stop(stopAt)
  osc.onended = () => {
    osc.disconnect()
    gain.disconnect()
  }
}

function startLoop(frequency: number): void {
  stopRingtone()
  const audio = getContext()
  if (!audio) return

  if (audio.state === 'suspended') audio.resume().catch(() => {})
  beep(audio, frequency)
  timer = setInterval(() => beep(audio, frequency), 1600)
}

export function playRingtone(): void {
  startLoop(880)
}

export function playRinging(): void {
  startLoop(440)
}

export function stopRingtone(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
