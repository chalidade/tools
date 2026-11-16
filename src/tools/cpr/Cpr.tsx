import { useCallback, useEffect, useRef, useState } from 'react'
import { Phone, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/tool/Segmented'
import { useT } from '@/lib/i18n'
import { click } from '../metronome/click'

const COMPRESSIONS = 30
const BREATHS = 2
const BREATH_SECONDS = 5

export default function Cpr() {
  const t = useT()
  const [running, setRunning] = useState(false)
  const [bpm, setBpm] = useState(110)
  const [withBreaths, setWithBreaths] = useState<'on' | 'off'>('on')
  const [count, setCount] = useState(0)
  const [phase, setPhase] = useState<'press' | 'breathe'>('press')
  const [cycles, setCycles] = useState(0)
  const [sound, setSound] = useState<'on' | 'off'>('on')
  const timer = useRef(0)
  const ctx = useRef<AudioContext | null>(null)
  const wake = useRef<WakeLockSentinel | null>(null)
  const opts = useRef({ bpm, withBreaths, sound })
  opts.current = { bpm, withBreaths, sound }

  const stop = useCallback(() => {
    window.clearTimeout(timer.current)
    setRunning(false)
    setCount(0)
    setPhase('press')
    void wake.current?.release().catch(() => {})
    wake.current = null
  }, [])

  useEffect(() => () => {
    window.clearTimeout(timer.current)
    void wake.current?.release().catch(() => {})
    void ctx.current?.close().catch(() => {})
  }, [])

  async function start() {
    ctx.current ??= new AudioContext()
    await ctx.current.resume().catch(() => {})
    try {
      wake.current = (await navigator.wakeLock?.request('screen')) ?? null
    } catch {
      /* the screen may dim */
    }
    setCycles(0)
    setRunning(true)
    let n = 0
    const tick = () => {
      const o = opts.current
      n += 1
      setPhase('press')
      setCount(n)
      if (o.sound === 'on' && ctx.current) click(ctx.current, ctx.current.currentTime, n === 1 ? 'accent' : 'beat')
      navigator.vibrate?.(30)
      if (n >= COMPRESSIONS && o.withBreaths === 'on') {
        timer.current = window.setTimeout(() => {
          setPhase('breathe')
          setCount(0)
          timer.current = window.setTimeout(() => {
            n = 0
            setCycles((c) => c + 1)
            tick()
          }, BREATH_SECONDS * 1000)
        }, 60000 / o.bpm)
        return
      }
      if (n >= COMPRESSIONS) {
        n = 0
        setCycles((c) => c + 1)
      }
      timer.current = window.setTimeout(tick, 60000 / o.bpm)
    }
    tick()
  }

  const steps: [string, string][] = [
    ['Pastikan aman, lalu tepuk bahu dan panggil: korban tidak bereaksi dan tidak bernapas normal.', 'Check the scene is safe, tap the shoulders and shout: no response and not breathing normally.'],
    ['Telepon 112 (atau 119) lebih dulu, minta orang lain mencari AED. Aktifkan loudspeaker.', 'Call 112 (or 119) first and send someone for an AED. Use the loudspeaker.'],
    ['Baringkan telentang di permukaan keras. Letakkan tumit satu tangan di tengah dada (separuh bawah tulang dada), tangan lain di atasnya, siku lurus.', 'Lay them on their back on a firm surface. Put the heel of one hand on the centre of the chest (lower half of the breastbone), other hand on top, elbows straight.'],
    ['Tekan keras dan cepat: sedalam sekitar 5–6 cm (dewasa), 100–120 kali per menit, biarkan dada naik penuh di antara tekanan.', 'Push hard and fast: about 5–6 cm deep (adult), 100–120 per minute, letting the chest rise fully between presses.'],
    ['Bila terlatih: setelah 30 tekanan, beri 2 napas buatan (tiap napas ±1 detik, dada tampak naik). Bila tidak terlatih atau ragu, lakukan tekanan saja tanpa henti.', 'If trained: after 30 presses give 2 rescue breaths (about 1 second each, chest visibly rising). If untrained or unsure, do hands-only presses without stopping.'],
    ['Teruskan sampai petugas tiba, korban bergerak/bernapas, atau AED siap. Bila AED datang, nyalakan dan ikuti suara petunjuknya.', 'Continue until help arrives, the person moves or breathes, or an AED is ready. When an AED arrives, switch it on and follow its voice prompts.'],
  ]

  return (
    <div className="space-y-6">
      <a href="tel:112" className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-4 text-lg font-semibold text-white">
        <Phone className="size-5" /> {t('Telepon 112 dulu', 'Call 112 first')}
      </a>

      <section className="space-y-4 rounded-2xl border p-4 text-center" aria-live="polite">
        <div className="text-6xl font-bold tabular-nums">{running ? (phase === 'breathe' ? '2×' : count) : '—'}</div>
        <p className="min-h-6 text-lg font-medium">
          {!running
            ? t('Siap. Tekan Mulai begitu mulai menekan dada.', 'Ready. Press Start when you begin compressions.')
            : phase === 'breathe'
              ? t(`Beri ${BREATHS} napas buatan`, `Give ${BREATHS} rescue breaths`)
              : t('Tekan!', 'Push!')}
        </p>
        {running && <p className="text-sm text-muted-foreground">{t(`Siklus selesai: ${cycles}`, `Cycles done: ${cycles}`)}</p>}
        <div className="flex flex-wrap justify-center gap-4 text-left">
          <Segmented label={t('Kecepatan (per menit)', 'Rate (per minute)')} value={bpm} onChange={setBpm} options={[100, 110, 120].map((v) => ({ value: v, label: String(v) }))} />
          <Segmented label={t('Napas buatan', 'Rescue breaths')} value={withBreaths} onChange={setWithBreaths} options={[{ value: 'on', label: t('30 : 2', '30 : 2') }, { value: 'off', label: t('Tekan saja', 'Hands-only') }]} />
          <Segmented label={t('Bunyi', 'Sound')} value={sound} onChange={setSound} options={[{ value: 'on', label: t('Nyala', 'On') }, { value: 'off', label: t('Mati', 'Off') }]} />
        </div>
        <Button size="lg" variant={running ? 'outline' : 'default'} onClick={running ? stop : start}>
          {running ? <Square className="size-4" /> : <Play className="size-4" />} {running ? t('Berhenti', 'Stop') : t('Mulai', 'Start')}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('Langkah singkat', 'Quick steps')}</h2>
        <svg viewBox="0 0 320 120" className="w-full max-w-md rounded-xl border bg-muted/40" role="img" aria-label={t('Posisi tangan di tengah dada', 'Hand position on the centre of the chest')}>
          <ellipse cx="160" cy="62" rx="110" ry="42" fill="none" stroke="currentColor" strokeWidth="2" opacity=".5" />
          <line x1="160" y1="28" x2="160" y2="96" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity=".35" />
          <rect x="136" y="60" width="48" height="22" rx="8" className="fill-red-500/80" />
          <path d="M160 6v34m0 0l-9-9m9 9l9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x="160" y="112" textAnchor="middle" fontSize="11" fill="currentColor">{t('tengah dada, separuh bawah tulang dada', 'centre of chest, lower half of breastbone')}</text>
        </svg>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {steps.map(([id, en], i) => <li key={i}>{t(id, en)}</li>)}
        </ol>
        <p className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
          {t(
            'Ringkasan umum yang mengikuti pedoman resmi (AHA / PMI) untuk dewasa. Ini bukan pengganti pelatihan: ikuti kursus bantuan hidup dasar. Untuk anak dan bayi, kedalaman dan caranya berbeda, ikuti arahan petugas darurat di telepon.',
            'A general summary following official guidelines (AHA / PMI) for adults. It is not a substitute for training: take a basic life support course. For children and infants depth and technique differ, so follow the emergency dispatcher on the phone.',
          )}
        </p>
      </section>
    </div>
  )
}
