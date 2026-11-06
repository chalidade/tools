import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Mic, Square, X, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { useT } from '@/lib/i18n'
import { buildSummary, cellAt, coverage, keyLabel, type Verdict } from './summary'

const COLORS = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff']
const COLS = 6
const ROWS = 10
const KEYS = ['Escape', ...'1234567890'.split('').map((d) => `Digit${d}`), 'Backspace', ...'QWERTYUIOP'.split('').map((c) => `Key${c}`), ...'ASDFGHJKL'.split('').map((c) => `Key${c}`), 'Enter', ...'ZXCVBNM'.split('').map((c) => `Key${c}`), 'Space', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight']

type Id = 'screen' | 'touch' | 'speaker' | 'mic' | 'camera' | 'vibrate' | 'motion' | 'keyboard'

function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const t = useT()
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 select-none bg-black" style={{ touchAction: 'none' }}>
      {children}
      <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-full bg-neutral-800/80 px-3 py-1.5 text-sm text-white">
        {t('Selesai (Esc)', 'Done (Esc)')}
      </button>
    </div>
  )
}

function ScreenTest({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [i, setI] = useState(0)
  return (
    <Overlay onClose={onClose}>
      <div className="absolute inset-0 grid place-items-center" style={{ background: COLORS[i] }} onClick={() => setI((n) => (n + 1) % COLORS.length)}>
        <p className="rounded bg-neutral-500/70 px-3 py-1 text-sm text-white">
          {t('Ketuk untuk ganti warna. Cari titik mati atau bercak.', 'Tap to change colour. Look for dead pixels or stains.')} ({i + 1}/{COLORS.length})
        </p>
      </div>
    </Overlay>
  )
}

function TouchTest({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const t = useT()
  const [touched, setTouched] = useState<Set<number>>(() => new Set())
  const ref = useRef<HTMLDivElement>(null)
  const mark = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.buttons === 0) return
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const cell = cellAt(e.clientX - r.left, e.clientY - r.top, r.width, r.height, COLS, ROWS)
    setTouched((s) => (s.has(cell) ? s : new Set(s).add(cell)))
  }
  const pct = Math.round(coverage(touched, COLS * ROWS) * 100)
  useEffect(() => {
    if (pct === 100) onDone()
  }, [pct, onDone])
  return (
    <Overlay onClose={onClose}>
      <div ref={ref} className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${COLS},1fr)`, gridTemplateRows: `repeat(${ROWS},1fr)` }} onPointerDown={mark} onPointerMove={mark}>
        {Array.from({ length: COLS * ROWS }, (_, n) => (
          <div key={n} className={touched.has(n) ? 'bg-green-600' : 'border border-neutral-700'} />
        ))}
      </div>
      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-neutral-800/80 px-3 py-1 text-sm text-white">
        {t('Seret jari hingga semua kotak hijau', 'Drag a finger until every cell is green')}: {pct}%
      </p>
    </Overlay>
  )
}

function KeyboardTest({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [pressed, setPressed] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pressed.has('Escape')) return onClose()
      e.preventDefault()
      setPressed((s) => new Set(s).add(e.code))
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose, pressed])
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">
        {t('Tekan tiap tombol; yang sudah ditekan menyala. Tekan Esc dua kali untuk selesai.', 'Press each key; pressed keys light up. Press Esc twice to finish.')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {KEYS.map((c) => (
          <span key={c} className={`min-w-9 rounded-md border px-2 py-1.5 text-center text-xs ${pressed.has(c) ? 'border-green-600 bg-green-600 text-white' : 'bg-muted/50 text-muted-foreground'}`}>
            {keyLabel(c)}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{pressed.size} {t('tombol terdeteksi', 'keys detected')}</span>
        <Button size="sm" variant="outline" onClick={onClose}>{t('Selesai', 'Done')}</Button>
      </div>
    </div>
  )
}

function Row({ title, hint, verdict, onVerdict, children }: { title: string; hint: string; verdict: Verdict; onVerdict: (v: Verdict) => void; children?: ReactNode }) {
  const t = useT()
  const tone = verdict === 'pass' ? 'border-green-600/50' : verdict === 'fail' ? 'border-destructive/50' : ''
  return (
    <section className={`space-y-3 rounded-xl border p-4 ${tone}`}>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {children}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={verdict === 'pass' ? 'default' : 'outline'} onClick={() => onVerdict('pass')}><Check /> {t('Lulus', 'Pass')}</Button>
        <Button size="sm" variant={verdict === 'fail' ? 'destructive' : 'outline'} onClick={() => onVerdict('fail')}><X /> {t('Gagal', 'Fail')}</Button>
        <Button size="sm" variant={verdict === 'skip' ? 'secondary' : 'ghost'} onClick={() => onVerdict('skip')}><SkipForward /> {t('Lewati', 'Skip')}</Button>
      </div>
    </section>
  )
}

interface BatteryLike {
  level: number
  charging: boolean
}

export default function CekPerangkat() {
  const t = useT()
  const [verdicts, setVerdicts] = useState<Partial<Record<Id, Verdict>>>({})
  const [open, setOpen] = useState<null | 'screen' | 'touch' | 'keyboard'>(null)
  const [error, setError] = useState('')
  const set = useCallback((id: Id) => (v: Verdict) => setVerdicts((s) => ({ ...s, [id]: v })), [])

  // Speaker
  const ctxRef = useRef<AudioContext | null>(null)
  const beep = (pan: number) => {
    try {
      const ctx = (ctxRef.current ??= new AudioContext())
      void ctx.resume()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const panner = ctx.createStereoPanner()
      panner.pan.value = pan
      gain.gain.value = 0.2
      osc.frequency.value = 440
      osc.connect(gain).connect(panner).connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.8)
    } catch {
      setError(t('Browser ini tidak bisa memutar suara uji.', 'This browser cannot play the test sound.'))
    }
  }

  // Mic
  const [recState, setRecState] = useState<'idle' | 'rec' | 'done'>('idle')
  const [level, setLevel] = useState(0)
  const [micUrl, setMicUrl] = useState('')
  const micStop = useRef<(() => void) | null>(null)
  async function recordMic() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new AudioContext()
      const an = ctx.createAnalyser()
      ctx.createMediaStreamSource(stream).connect(an)
      const buf = new Uint8Array(an.fftSize)
      const rec = new MediaRecorder(stream)
      const chunks: Blob[] = []
      let raf = 0
      const tick = () => {
        an.getByteTimeDomainData(buf)
        let peak = 0
        for (const b of buf) peak = Math.max(peak, Math.abs(b - 128))
        setLevel(peak / 128)
        raf = requestAnimationFrame(tick)
      }
      const finish = () => {
        cancelAnimationFrame(raf)
        stream.getTracks().forEach((tr) => tr.stop())
        void ctx.close()
        micStop.current = null
      }
      rec.ondataavailable = (e) => chunks.push(e.data)
      rec.onstop = () => {
        finish()
        setLevel(0)
        setMicUrl((old) => {
          if (old) URL.revokeObjectURL(old)
          return URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }))
        })
        setRecState('done')
      }
      micStop.current = () => rec.state !== 'inactive' && rec.stop()
      rec.start()
      tick()
      setRecState('rec')
      setTimeout(() => micStop.current?.(), 4000)
    } catch {
      setError(t('Mikrofon tidak bisa diakses. Izinkan akses mikrofon di browser.', 'Cannot access the microphone. Allow microphone access in the browser.'))
    }
  }

  // Camera
  const [facing, setFacing] = useState<'user' | 'environment' | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (!facing) return
    let stream: MediaStream | undefined
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing } })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((tr) => tr.stop())
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch(() => {
        setError(t('Kamera tidak bisa diakses atau tidak ada.', 'The camera is unavailable or not allowed.'))
        setFacing(null)
      })
    return () => {
      cancelled = true
      stream?.getTracks().forEach((tr) => tr.stop())
    }
  }, [facing, t])

  // Motion
  const [motion, setMotion] = useState<{ a: number; b: number; g: number; ax: number; ay: number; az: number } | null>(null)
  const [motionOn, setMotionOn] = useState(false)
  useEffect(() => {
    if (!motionOn) return
    const o = (e: DeviceOrientationEvent) => setMotion((m) => ({ ax: 0, ay: 0, az: 0, ...m, a: e.alpha ?? 0, b: e.beta ?? 0, g: e.gamma ?? 0 }))
    const m = (e: DeviceMotionEvent) => setMotion((s) => ({ a: 0, b: 0, g: 0, ...s, ax: e.accelerationIncludingGravity?.x ?? 0, ay: e.accelerationIncludingGravity?.y ?? 0, az: e.accelerationIncludingGravity?.z ?? 0 }))
    window.addEventListener('deviceorientation', o)
    window.addEventListener('devicemotion', m)
    return () => {
      window.removeEventListener('deviceorientation', o)
      window.removeEventListener('devicemotion', m)
    }
  }, [motionOn])
  async function startMotion() {
    const req = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
    try {
      if (req && (await req()) !== 'granted') return setError(t('Izin sensor ditolak.', 'Sensor permission denied.'))
    } catch {
      return setError(t('Izin sensor ditolak.', 'Sensor permission denied.'))
    }
    setMotionOn(true)
  }

  // Info
  const [battery, setBattery] = useState('')
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> }
    nav.getBattery?.().then((b) => setBattery(`${Math.round(b.level * 100)}%${b.charging ? ` (${t('mengisi', 'charging')})` : ''}`)).catch(() => {})
  }, [t])
  useEffect(
    () => () => {
      micStop.current?.()
      void ctxRef.current?.close()
    },
    [],
  )
  useEffect(() => () => setMicUrl((u) => (u && URL.revokeObjectURL(u), '')), [])

  const info = useMemo<[string, string][]>(() => {
    const nav = navigator as Navigator & { deviceMemory?: number }
    const out: [string, string][] = [
      [t('Resolusi layar', 'Screen resolution'), `${screen.width}×${screen.height} @${window.devicePixelRatio}x`],
      [t('Jendela', 'Viewport'), `${window.innerWidth}×${window.innerHeight}`],
      [t('Titik sentuh maks.', 'Max touch points'), String(nav.maxTouchPoints ?? 0)],
      [t('Inti CPU', 'CPU cores'), String(nav.hardwareConcurrency ?? '?')],
    ]
    if (nav.deviceMemory) out.push([t('Memori (perkiraan)', 'Memory (approx.)'), `${nav.deviceMemory} GB`])
    if (battery) out.push([t('Baterai', 'Battery'), battery])
    out.push([t('Bahasa', 'Language'), nav.language], ['User agent', nav.userAgent])
    return out
  }, [t, battery])

  const defs: [Id, string][] = [
    ['screen', t('Layar', 'Screen')],
    ['touch', t('Sentuh', 'Touch')],
    ['speaker', t('Speaker kiri/kanan', 'Left/right speaker')],
    ['mic', t('Mikrofon', 'Microphone')],
    ['camera', t('Kamera', 'Camera')],
    ['vibrate', t('Getar', 'Vibration')],
    ['motion', t('Sensor gerak', 'Motion sensors')],
    ['keyboard', t('Keyboard', 'Keyboard')],
  ]
  const summary = buildSummary(
    defs.map(([id, label]) => ({ label, verdict: verdicts[id] })),
    info.filter(([k]) => k !== 'User agent'),
    { title: t('Hasil cek perangkat', 'Device check result'), pass: t('Lulus', 'Pass'), fail: t('Gagal', 'Fail'), skip: t('Dilewati', 'Skipped'), pending: t('Belum dicek', 'Not checked') },
  )
  const p = (id: Id) => ({ verdict: verdicts[id], onVerdict: set(id) })

  if (open === 'screen') return <ScreenTest onClose={() => setOpen(null)} />
  if (open === 'touch') return <TouchTest onClose={() => setOpen(null)} onDone={() => { set('touch')('pass'); setOpen(null) }} />

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} />}

      <Row title={defs[0][1]} hint={t('Layar penuh warna hitam, putih, merah, hijau, biru: cari titik mati, bercak, atau bayangan.', 'Full-screen black, white, red, green and blue: look for dead pixels, stains or burn-in.')} {...p('screen')}>
        <Button size="sm" onClick={() => setOpen('screen')}>{t('Mulai tes layar', 'Start screen test')}</Button>
      </Row>

      <Row title={defs[1][1]} hint={t('Gambar di seluruh layar; semua kotak harus berubah hijau.', 'Draw across the whole screen; every cell should turn green.')} {...p('touch')}>
        <Button size="sm" onClick={() => setOpen('touch')}>{t('Mulai tes sentuh', 'Start touch test')}</Button>
      </Row>

      <Row title={defs[2][1]} hint={t('Lepas headphone. Nada kiri harus keluar dari sisi kiri saja, begitu juga kanan.', 'Unplug headphones. The left tone should come from the left side only, and likewise the right.')} {...p('speaker')}>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => beep(-1)}>{t('Nada kiri', 'Left tone')}</Button>
          <Button size="sm" variant="outline" onClick={() => beep(0)}>{t('Tengah', 'Centre')}</Button>
          <Button size="sm" variant="outline" onClick={() => beep(1)}>{t('Nada kanan', 'Right tone')}</Button>
        </div>
      </Row>

      <Row title={defs[3][1]} hint={t('Rekam 4 detik sambil bicara, lalu putar ulang. Rekaman tidak disimpan dan tidak dikirim.', 'Record 4 seconds while talking, then play it back. Nothing is saved or sent.')} {...p('mic')}>
        <div className="space-y-2">
          <Button size="sm" variant="outline" disabled={recState === 'rec'} onClick={() => void recordMic()}>
            <Mic /> {recState === 'rec' ? t('Merekam…', 'Recording…') : t('Rekam', 'Record')}
          </Button>
          {recState === 'rec' && (
            <div className="h-2 w-full overflow-hidden rounded bg-muted">
              <div className="h-full bg-green-600 transition-[width]" style={{ width: `${Math.round(level * 100)}%` }} />
            </div>
          )}
          {micUrl && <audio controls src={micUrl} className="w-full" />}
        </div>
      </Row>

      <Row title={defs[4][1]} hint={t('Coba kamera depan dan belakang (laptop biasanya hanya satu). Juga pas untuk tes sebelum rapat online.', 'Try the front and back cameras (laptops usually have one). Also handy before an online meeting.')} {...p('camera')}>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setFacing('user')}>{t('Kamera depan', 'Front camera')}</Button>
            <Button size="sm" variant="outline" onClick={() => setFacing('environment')}>{t('Kamera belakang', 'Back camera')}</Button>
            {facing && <Button size="sm" variant="ghost" onClick={() => setFacing(null)}><Square /> {t('Matikan', 'Stop')}</Button>}
          </div>
          {facing && <video ref={videoRef} autoPlay playsInline muted className="max-h-72 w-full rounded-lg bg-black object-contain" />}
        </div>
      </Row>

      <Row title={defs[5][1]} hint={t('HP akan bergetar. Safari di iPhone tidak mendukung getar lewat browser.', 'The phone should buzz. Safari on iPhone does not support web vibration.')} {...p('vibrate')}>
        <Button size="sm" variant="outline" disabled={!('vibrate' in navigator)} onClick={() => navigator.vibrate([300, 150, 300])}>
          {'vibrate' in navigator ? t('Getarkan', 'Vibrate') : t('Tidak didukung browser ini', 'Not supported by this browser')}
        </Button>
      </Row>

      <Row title={defs[6][1]} hint={t('Miringkan dan putar perangkat; angka harus berubah.', 'Tilt and rotate the device; the numbers should change.')} {...p('motion')}>
        <div className="space-y-2">
          {!motionOn && <Button size="sm" variant="outline" onClick={() => void startMotion()}>{t('Aktifkan sensor', 'Enable sensors')}</Button>}
          {motionOn && (
            <p className="font-mono text-xs text-muted-foreground">
              {motion
                ? `α ${motion.a.toFixed(0)}° β ${motion.b.toFixed(0)}° γ ${motion.g.toFixed(0)}° · x ${motion.ax.toFixed(1)} y ${motion.ay.toFixed(1)} z ${motion.az.toFixed(1)}`
                : t('Belum ada data sensor (laptop biasanya tidak punya).', 'No sensor data yet (laptops usually have none).')}
            </p>
          )}
        </div>
      </Row>

      <Row title={defs[7][1]} hint={t('Untuk laptop atau keyboard Bluetooth: tombol yang ditekan menyala.', 'For laptops or Bluetooth keyboards: pressed keys light up.')} {...p('keyboard')}>
        {open === 'keyboard' ? <KeyboardTest onClose={() => setOpen(null)} /> : <Button size="sm" variant="outline" onClick={() => setOpen('keyboard')}>{t('Mulai tes keyboard', 'Start keyboard test')}</Button>}
      </Row>

      <section className="space-y-2 rounded-xl border p-4">
        <h3 className="font-medium">{t('Info yang terbaca browser', 'What the browser can read')}</h3>
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          {info.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">{t('Browser tidak bisa membaca kesehatan baterai, IMEI, atau kapasitas penyimpanan asli.', 'A browser cannot read battery health, IMEI or real storage capacity.')}</p>
      </section>

      <section className="space-y-2 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{t('Ringkasan', 'Summary')}</h3>
          <CopyButton text={summary} label={t('Salin ringkasan', 'Copy summary')} variant="outline" />
        </div>
        <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{summary}</pre>
      </section>
    </div>
  )
}
