import { useCallback, useEffect, useRef, useState } from 'react'
import { Phone, PhoneOff, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/tool/Segmented'
import { Stage, useStage } from '@/components/tool/Stage'
import { useT } from '@/lib/i18n'

type Phase = 'setup' | 'waiting' | 'ringing' | 'talking'

const DELAYS = [0, 10, 30, 60, 300]

/** One ring: two short bursts of a 440+480 Hz pair, like a landline. */
function ring(ctx: AudioContext, when: number) {
  for (const start of [0, 0.5]) {
    for (const f of [440, 480]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = f
      gain.gain.setValueAtTime(0.0001, when + start)
      gain.gain.exponentialRampToValueAtTime(0.18, when + start + 0.02)
      gain.gain.setValueAtTime(0.18, when + start + 0.38)
      gain.gain.exponentialRampToValueAtTime(0.0001, when + start + 0.42)
      osc.connect(gain).connect(ctx.destination)
      osc.start(when + start)
      osc.stop(when + start + 0.45)
    }
  }
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function PanggilanPalsu() {
  const t = useT()
  const stage = useStage()
  const [name, setName] = useState('Mama')
  const [label, setLabel] = useState('mobile')
  const [delay, setDelay] = useState(10)
  const [phase, setPhase] = useState<Phase>('setup')
  const [wait, setWait] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const ctx = useRef<AudioContext | null>(null)
  const timers = useRef<number[]>([])
  const wake = useRef<WakeLockSentinel | null>(null)

  const clear = useCallback(() => {
    timers.current.forEach((id) => { window.clearTimeout(id); window.clearInterval(id) })
    timers.current = []
  }, [])

  const finish = useCallback(() => {
    clear()
    navigator.vibrate?.(0)
    setPhase('setup')
    setElapsed(0)
    stage.exit()
    void wake.current?.release().catch(() => {})
    wake.current = null
  }, [clear, stage])

  useEffect(() => () => {
    timers.current.forEach((id) => { window.clearTimeout(id); window.clearInterval(id) })
    navigator.vibrate?.(0)
    void wake.current?.release().catch(() => {})
    void ctx.current?.close().catch(() => {})
  }, [])

  // Leaving full screen (Exit button, Esc, back gesture) ends the call.
  const wasFull = useRef(false)
  useEffect(() => {
    if (wasFull.current && !stage.full) finish()
    wasFull.current = stage.full
  }, [stage.full, finish])

  function startRinging() {
    setPhase('ringing')
    const c = ctx.current
    const loop = () => {
      if (c) ring(c, c.currentTime + 0.05)
      navigator.vibrate?.([700, 300, 700, 1300])
    }
    loop()
    timers.current.push(window.setInterval(loop, 3000))
  }

  async function begin() {
    ctx.current ??= new AudioContext()
    await ctx.current.resume().catch(() => {})
    try {
      wake.current = (await navigator.wakeLock?.request('screen')) ?? null
    } catch {
      /* the screen may dim */
    }
    setElapsed(0)
    if (delay === 0) {
      void stage.enter()
      startRinging()
      return
    }
    setPhase('waiting')
    setWait(delay)
    const end = Date.now() + delay * 1000
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setWait(left)
      if (left <= 0) {
        window.clearInterval(id)
        void stage.enter()
        startRinging()
      }
    }, 250)
    timers.current.push(id)
  }

  function answer() {
    clear()
    navigator.vibrate?.(0)
    setPhase('talking')
    const start = Date.now()
    timers.current.push(window.setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500))
  }

  const incoming = phase === 'ringing' || phase === 'talking'
  const labels: Record<string, [string, string]> = {
    mobile: ['seluler', 'mobile'],
    home: ['rumah', 'home'],
    work: ['kantor', 'work'],
  }

  return (
    <div className="space-y-5">
      {phase === 'setup' || phase === 'waiting' ? (
        <section className="space-y-4 rounded-2xl border p-4">
          <label className="block space-y-1 text-sm font-medium">
            {t('Nama penelepon', 'Caller name')}
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="w-full rounded-lg border bg-background px-3 py-2 text-base font-normal" />
          </label>
          <Segmented
            label={t('Label', 'Label')}
            value={label}
            onChange={setLabel}
            options={Object.entries(labels).map(([value, l]) => ({ value, label: t(...l) }))}
          />
          <Segmented
            label={t('Berdering dalam', 'Rings in')}
            value={delay}
            onChange={setDelay}
            options={DELAYS.map((v) => ({ value: v, label: v === 0 ? t('Langsung', 'Now') : v < 60 ? `${v} ${t('dtk', 's')}` : `${v / 60} ${t('mnt', 'min')}` }))}
          />
          {phase === 'waiting' ? (
            <div className="space-y-3 text-center">
              <p className="text-3xl font-bold tabular-nums">{mmss(wait)}</p>
              <p className="text-sm text-muted-foreground">{t('Layar akan berubah jadi panggilan masuk. Biarkan halaman ini terbuka.', 'The screen will turn into an incoming call. Keep this page open.')}</p>
              <Button variant="outline" onClick={finish}>{t('Batal', 'Cancel')}</Button>
            </div>
          ) : (
            <Button size="lg" onClick={begin}><Play className="size-4" /> {t('Mulai', 'Start')}</Button>
          )}
          <p className="text-xs text-muted-foreground">
            {t(
              'Untuk keluar dengan sopan dari situasi yang tidak nyaman. Nada dering dibuat di perangkat dan getar hanya jalan di HP yang mendukungnya. Di iPhone getar dan layar penuh asli tidak tersedia.',
              'A polite way out of an awkward situation. The ringtone is generated on the device and vibration only works on phones that support it. On iPhone, vibration and native full screen are unavailable.',
            )}
          </p>
        </section>
      ) : null}

      <Stage stage={stage} title={t('Panggilan masuk', 'Incoming call')}>
        {incoming && (
          <div className="flex flex-1 flex-col items-center justify-between rounded-2xl bg-zinc-900 px-6 py-12 text-white">
            <div className="space-y-2 text-center">
              <p className="text-sm text-zinc-400">
                {phase === 'ringing' ? t('Panggilan masuk', 'Incoming call') : mmss(elapsed)}
              </p>
              <p className="text-4xl font-semibold">{name.trim() || t('Tanpa nama', 'Unknown')}</p>
              <p className="text-zinc-400">{t(...labels[label])}</p>
              <div className="mx-auto mt-6 flex size-28 items-center justify-center rounded-full bg-zinc-700 text-5xl font-semibold" aria-hidden="true">
                {(name.trim()[0] ?? '?').toUpperCase()}
              </div>
            </div>
            <div className="flex w-full max-w-xs justify-around">
              <button onClick={finish} className="flex size-16 items-center justify-center rounded-full bg-red-600" aria-label={t('Tolak / akhiri', 'Decline / end')}>
                <PhoneOff className="size-7" />
              </button>
              {phase === 'ringing' && (
                <button onClick={answer} className="flex size-16 animate-pulse items-center justify-center rounded-full bg-green-600" aria-label={t('Angkat', 'Answer')}>
                  <Phone className="size-7" />
                </button>
              )}
            </div>
          </div>
        )}
      </Stage>
    </div>
  )
}
