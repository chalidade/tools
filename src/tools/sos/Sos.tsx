import { useCallback, useEffect, useRef, useState } from 'react'
import { Flashlight, Siren, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'
import { sosSteps } from './morse'

type Mode = 'off' | 'sos' | 'light'
const UNIT_MS = 250

type TorchTrack = MediaStreamTrack

export default function Sos() {
  const t = useT()
  const [mode, setMode] = useState<Mode>('off')
  const [lit, setLit] = useState(false)
  const [siren, setSiren] = useState(true)
  const [torchOk, setTorchOk] = useState<boolean | null>(null)
  const [note, setNote] = useState('')
  const track = useRef<TorchTrack | null>(null)
  const audio = useRef<{ ctx: AudioContext; osc: OscillatorNode; gain: GainNode; timer: number } | null>(null)
  const wake = useRef<WakeLockSentinel | null>(null)

  const setTorch = useCallback((on: boolean) => {
    const tr = track.current
    if (!tr) return
    tr.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] }).catch(() => {})
  }, [])

  const stopAll = useCallback(() => {
    if (track.current) {
      setTorch(false)
      track.current.stop()
      track.current = null
    }
    const a = audio.current
    if (a) {
      clearInterval(a.timer)
      try {
        a.osc.stop()
      } catch {
        /* already stopped */
      }
      void a.ctx.close()
      audio.current = null
    }
    wake.current?.release().catch(() => {})
    wake.current = null
    setLit(false)
  }, [setTorch])

  useEffect(() => stopAll, [stopAll])

  // Blink pattern: drives the torch and the screen from one timer chain.
  useEffect(() => {
    if (mode === 'off') return
    if (mode === 'light') {
      setLit(true)
      setTorch(true)
      return
    }
    const steps = sosSteps()
    let i = 0
    let id = 0
    const tick = () => {
      const s = steps[i % steps.length]
      setLit(s.on)
      setTorch(s.on)
      i++
      id = window.setTimeout(tick, s.units * UNIT_MS)
    }
    tick()
    return () => clearTimeout(id)
  }, [mode, setTorch])

  async function start(next: Mode) {
    stopAll()
    setNote('')
    setMode(next)
    try {
      wake.current = (await navigator.wakeLock?.request('screen')) ?? null
    } catch {
      /* not allowed; the screen may dim */
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const tr = stream.getVideoTracks()[0] as TorchTrack
      if ((tr.getCapabilities?.() as { torch?: boolean } | undefined)?.torch) {
        track.current = tr
        setTorchOk(true)
      } else {
        tr.stop()
        setTorchOk(false)
      }
    } catch {
      setTorchOk(false)
    }
    if (next === 'sos' && siren) {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      gain.gain.value = 1
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      let hi = false
      const timer = window.setInterval(() => {
        hi = !hi
        osc.frequency.setTargetAtTime(hi ? 1100 : 650, ctx.currentTime, 0.05)
      }, 600)
      audio.current = { ctx, osc, gain, timer }
    }
  }

  function stop() {
    stopAll()
    setMode('off')
  }

  const active = mode !== 'off'

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        {t(
          'Bukan pengganti layanan darurat. Hubungi 112 bila bisa. Tool ini jalan offline setelah halaman termuat.',
          'Not a substitute for emergency services. Call 112 if you can. This tool works offline once the page has loaded.',
        )}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button className="h-28 text-2xl" variant="destructive" onClick={() => start('sos')}>
          <Siren className="mr-2 size-8" /> SOS
        </Button>
        <Button className="h-28 text-2xl" variant="secondary" onClick={() => start('light')}>
          <Flashlight className="mr-2 size-8" /> {t('Senter', 'Flashlight')}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={siren} onChange={(e) => setSiren(e.target.checked)} />
        {t('Bunyikan sirene saat SOS', 'Sound the siren during SOS')}
      </label>
      <p className="text-sm text-muted-foreground">
        {t(
          'Senter HP berkedip pola SOS (· · · — — — · · ·) di Chrome Android. iPhone tidak mengizinkan senter dari browser, jadi hanya layar putih yang berkedip.',
          'The phone torch blinks the SOS pattern (· · · — — — · · ·) on Chrome for Android. iPhone does not allow the torch from a browser, so only the white screen blinks there.',
        )}
        {torchOk === false && active && ' ' + t('Senter tidak tersedia di perangkat ini; memakai layar.', 'No torch on this device; using the screen.')}
      </p>
      {note && <p className="text-sm">{note}</p>}

      {active && (
        <div
          className="fixed inset-0 z-50 grid place-items-center select-none"
          style={{ background: lit ? '#fff' : '#000' }}
          onClick={stop}
        >
          <button
            type="button"
            onClick={stop}
            className="flex items-center gap-2 rounded-full bg-red-600 px-8 py-5 text-2xl font-bold text-white shadow-lg"
          >
            <X className="size-7" /> {t('Berhenti', 'Stop')}
          </button>
        </div>
      )}
    </div>
  )
}
