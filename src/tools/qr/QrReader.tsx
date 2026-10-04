import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, ExternalLink, Eye, EyeOff, Loader2, RotateCcw } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { parseQr } from './payload'
import { formatName, isQrLike, scanFile, scanPixels, type Scan } from './scan'

type Source = 'image' | 'camera'
const SOURCE_OPTIONS: { value: Source; label: string }[] = [
  { value: 'image', label: 'Dari gambar' },
  { value: 'camera', label: 'Kamera' },
]

export default function QrReader() {
  const [source, setSource] = useState<Source>('image')
  const [results, setResults] = useState<Scan[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function readFile(file: File) {
    setError(null)
    setResults(null)
    setBusy(true)
    try {
      const found = await scanFile(file)
      if (!found.length)
        setError(
          'Tidak ada QR code atau barcode yang terbaca di gambar ini. Pastikan kodenya utuh, tajam, dan tidak terlalu kecil.',
        )
      else setResults(found)
    } catch {
      setError('Gambar tidak bisa dibaca. Coba JPG, PNG, atau WebP.')
    } finally {
      setBusy(false)
    }
  }

  // Paste a screenshot straight from the clipboard.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) void readFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  return (
    <div className="space-y-6">
      <Segmented
        label="Sumber"
        value={source}
        options={SOURCE_OPTIONS}
        onChange={(s) => {
          setSource(s)
          setError(null)
        }}
      />

      {results ? (
        <div className="space-y-4">
          {results.length > 1 && (
            <p className="text-sm text-muted-foreground">{results.length} kode ditemukan di gambar ini.</p>
          )}
          {results.map((r, i) => (
            <Result key={i} scan={r} onAgain={() => setResults(null)} />
          ))}
        </div>
      ) : source === 'image' ? (
        <div className="space-y-3">
          <FileDrop
            accept="image/*"
            label="Tarik gambar QR code atau barcode ke sini"
            busyLabel={busy ? 'Membaca kode…' : undefined}
            onFiles={([f]) => void readFile(f)}
          />
          <p className="text-center text-xs text-muted-foreground">
            Atau tempel screenshot dari clipboard (Ctrl/⌘ + V).
          </p>
        </div>
      ) : (
        <CameraScanner onFound={(scan) => setResults([scan])} />
      )}

      {error && <ErrorNote message={error} />}
    </div>
  )
}

function CameraScanner({ onFound }: { onFound: (scan: Scan) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<'idle' | 'starting' | 'scanning'>('idle')
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setState('idle')
  }, [])

  // Release the camera when leaving.
  useEffect(() => stop, [stop])

  async function start() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Browser ini tidak bisa memakai kamera di halaman ini (perlu HTTPS dan browser yang mendukung).')
      return
    }
    setState('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      setState('scanning')
    } catch (e) {
      setState('idle')
      const name = (e as DOMException)?.name
      setError(
        name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Izinkan akses kamera untuk situs ini di pengaturan browser, lalu coba lagi.'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'Kamera tidak ditemukan di perangkat ini.'
            : 'Kamera tidak bisa dibuka. Mungkin sedang dipakai aplikasi lain.',
      )
    }
  }

  // While scanning, read a frame a few times a second until a code turns up.
  useEffect(() => {
    if (state !== 'scanning') return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    let stopped = false
    let reading = false
    const tick = async () => {
      const video = videoRef.current
      // Skip a tick while the previous frame is still being read.
      if (stopped || reading || !video || !video.videoWidth) return
      reading = true
      const k = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight))
      canvas.width = Math.round(video.videoWidth * k)
      canvas.height = Math.round(video.videoHeight * k)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const [found] = await scanPixels(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        canvas.width,
        canvas.height,
      )
      if (found && !stopped) {
        stopped = true
        navigator.vibrate?.(60)
        stop()
        onFound(found)
      }
      reading = false
    }
    const id = setInterval(() => void tick(), 200)
    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [state, stop, onFound])

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-[4/3] max-w-xl overflow-hidden rounded-2xl border bg-black">
        <video ref={videoRef} muted playsInline className="size-full object-cover" />
        {state === 'scanning' && (
          // Aiming frame; the whole picture is scanned anyway.
          <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]" />
        )}
        {state !== 'scanning' && (
          <div className="absolute inset-0 grid place-items-center">
            <Button onClick={() => void start()} disabled={state === 'starting'}>
              {state === 'starting' ? <Loader2 className="animate-spin" /> : <Camera />}
              Nyalakan kamera
            </Button>
          </div>
        )}
      </div>
      {state === 'scanning' && (
        <div className="flex items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">Arahkan kamera ke QR code atau barcode…</p>
          <Button variant="ghost" size="sm" onClick={stop}>
            <CameraOff />
            Matikan
          </Button>
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Gambar kamera hanya diproses di perangkat ini, tidak direkam atau dikirim.
      </p>
      {error && <ErrorNote message={error} />}
    </div>
  )
}

function Result({ scan, onAgain }: { scan: Scan; onAgain: () => void }) {
  const { text } = scan
  // Retail/industrial barcodes are plain numbers or codes; only 2D codes carry Wi-Fi, links, contacts.
  const parsed = isQrLike(scan.format)
    ? parseQr(text)
    : {
        kind: 'text' as const,
        title: formatName(scan.format),
        fields: [{ label: 'Kode', value: text }],
        href: undefined,
      }
  const [shown, setShown] = useState<Record<number, boolean>>({})

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          {parsed.title}
          {isQrLike(scan.format) && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">{formatName(scan.format)}</span>
          )}
        </p>
        <Button variant="ghost" size="sm" onClick={onAgain}>
          <RotateCcw />
          Pindai lagi
        </Button>
      </div>

      <dl className="divide-y rounded-xl border">
        {parsed.fields.map((f, i) => (
          <div key={i} className="px-3 py-2 sm:flex sm:items-start sm:gap-3">
            {/* Label above the value on phones, beside it on wider screens. */}
            <dt className="text-xs text-muted-foreground sm:w-32 sm:shrink-0 sm:pt-1.5">{f.label}</dt>
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <dd className="min-w-0 flex-1 pt-1 text-sm break-words whitespace-pre-wrap">
                {f.secret && !shown[i] ? <span className="whitespace-nowrap">••••••••</span> : f.value || '—'}
              </dd>
              <div className="flex shrink-0">
                {f.secret && (
                  <Button variant="ghost" size="sm" onClick={() => setShown((s) => ({ ...s, [i]: !s[i] }))}>
                    {shown[i] ? <EyeOff /> : <Eye />}
                  </Button>
                )}
                {f.value && <CopyButton text={f.value} />}
              </div>
            </div>
          </div>
        ))}
      </dl>

      {parsed.href && (
        <div className="space-y-1.5">
          <a href={parsed.href} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>
            <ExternalLink />
            {parsed.kind === 'whatsapp'
              ? 'Buka WhatsApp'
              : parsed.kind === 'email'
                ? 'Tulis email'
                : parsed.kind === 'phone'
                  ? 'Hubungi'
                  : 'Buka tautan'}
          </a>
          {parsed.kind === 'url' && (
            <p className="text-xs text-muted-foreground">
              Periksa domainnya dulu — QR code bisa mengarah ke situs palsu.
            </p>
          )}
        </div>
      )}

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Teks mentah</summary>
        <div className="mt-2 flex items-start gap-2">
          <pre className="min-w-0 flex-1 overflow-auto rounded-lg bg-muted/60 p-2 font-mono break-all whitespace-pre-wrap">
            {text}
          </pre>
          <CopyButton text={text} />
        </div>
      </details>
    </div>
  )
}
