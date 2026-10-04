import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { decodeImage, type DecodedImage } from '@/lib/image'
import { buildFaviconZip, drawIcon, HTML_SNIPPET, type FaviconOptions, type Fit, type Shape } from './favicon'

type Source = 'image' | 'text'
const SOURCE_OPTIONS: { value: Source; label: string }[] = [
  { value: 'text', label: 'Teks / emoji' },
  { value: 'image', label: 'Gambar / logo' },
]
const SHAPE_OPTIONS: { value: Shape; label: string }[] = [
  { value: 'square', label: 'Persegi' },
  { value: 'rounded', label: 'Membulat' },
  { value: 'circle', label: 'Lingkaran' },
]
const FIT_OPTIONS: { value: Fit; label: string }[] = [
  { value: 'contain', label: 'Utuh' },
  { value: 'cover', label: 'Penuh' },
]
const PADDING_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Tanpa' },
  { value: 0.08, label: 'Kecil' },
  { value: 0.16, label: 'Sedang' },
]

export default function FaviconGenerator() {
  const [source, setSource] = useState<Source>('text')
  const [image, setImage] = useState<DecodedImage | null>(null)
  const [imageName, setImageName] = useState('')
  const [text, setText] = useState('T')
  const [textColor, setTextColor] = useState('#ffffff')
  const [transparent, setTransparent] = useState(false)
  const [background, setBackground] = useState('#6d28d9')
  const [shape, setShape] = useState<Shape>('rounded')
  const [fit, setFit] = useState<Fit>('contain')
  const [padding, setPadding] = useState(0.08)
  const [appName, setAppName] = useState('Situs Saya')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pickRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => image?.close(), [image])

  const opts: FaviconOptions = useMemo(
    () => ({
      image: source === 'image' ? image : null,
      text,
      textColor,
      background: transparent ? null : background,
      shape,
      fit,
      padding,
    }),
    [source, image, text, textColor, transparent, background, shape, fit, padding],
  )
  const ready = source === 'image' ? !!image : !!text.trim()
  /** iOS shows transparency as black, so its icon and the manifest get a solid colour. */
  const solid = transparent ? '#ffffff' : background

  // Redrawn on every change; a few small canvases draw instantly.
  const previews = useMemo(() => {
    if (!ready) return null
    const url = (size: number) => drawIcon(size, opts).toDataURL('image/png')
    return { 16: url(16), 32: url(32), 48: url(48), 180: drawIcon(180, { ...opts, shape: 'square' }, solid).toDataURL(), 512: url(512) }
  }, [ready, opts, solid])

  async function pick(file: File) {
    setError(null)
    try {
      setImage(await decodeImage(file))
      setImageName(file.name)
      setSource('image')
    } catch {
      setError('Gambar tidak bisa dibaca. Pakai PNG, JPG, WebP, atau SVG.')
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const blob = await buildFaviconZip(opts, appName.trim() || 'Situs Saya', solid)
      downloadBlob(blob, 'favicon.zip')
    } catch {
      setError('Gagal membuat favicon.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5 rounded-2xl border bg-card p-5">
          <Segmented label="Sumber" value={source} options={SOURCE_OPTIONS} onChange={setSource} />

          {source === 'text' ? (
            <div className="flex flex-wrap items-end gap-3">
              <label className="block min-w-40 flex-1 space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Huruf atau emoji (1–3 karakter)</span>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={6}
                  placeholder="A"
                  className="h-11 w-full rounded-xl border bg-background px-3 text-lg outline-none focus:border-brand-2/60"
                />
              </label>
              <ColorField label="Warna teks" value={textColor} onChange={setTextColor} />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Gambar (persegi, minimal 512 px paling bagus)</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => pickRef.current?.click()}>
                  <ImagePlus />
                  {image ? 'Ganti gambar' : 'Pilih gambar'}
                </Button>
                {image && (
                  <span className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
                    <span className="truncate">{imageName}</span>
                    <button type="button" aria-label="Hapus gambar" onClick={() => setImage(null)} className="hover:text-foreground">
                      <X className="size-4" />
                    </button>
                  </span>
                )}
              </div>
              <input
                ref={pickRef}
                type="file"
                accept="image/*,.svg"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void pick(f)
                }}
              />
              {image && <Segmented label="Penempatan" value={fit} options={FIT_OPTIONS} onChange={setFit} />}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Latar</p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={background}
                  disabled={transparent}
                  onChange={(e) => setBackground(e.target.value)}
                  aria-label="Warna latar"
                  className="h-10 w-14 cursor-pointer rounded-lg border bg-background p-1 disabled:opacity-40"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={transparent}
                    onChange={(e) => setTransparent(e.target.checked)}
                    className="size-4 accent-[var(--brand-2)]"
                  />
                  Transparan
                </label>
              </div>
            </div>
            <Segmented label="Bentuk" value={shape} options={SHAPE_OPTIONS} onChange={setShape} />
            <Segmented label="Jarak tepi" value={padding} options={PADDING_OPTIONS} onChange={setPadding} />
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Nama situs (untuk site.webmanifest)</span>
            <input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-brand-2/60"
            />
          </label>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">Pratinjau</p>
            {previews ? (
              <div className="mt-4 space-y-6">
                {/* Browser tab mock-up at real size. */}
                <div className="overflow-hidden rounded-xl border bg-muted/60">
                  <div className="flex items-end gap-1 px-2 pt-2">
                    <div className="flex w-56 items-center gap-2 rounded-t-lg bg-background px-3 py-2 text-xs">
                      <img src={previews[16]} alt="" width={16} height={16} />
                      <span className="truncate">{appName || 'Situs Saya'}</span>
                    </div>
                    <div className="flex w-40 items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                      <span className="size-4 rounded-full bg-muted-foreground/30" />
                      Tab lain
                    </div>
                  </div>
                  <div className="h-6 bg-background" />
                </div>

                <div className="flex flex-wrap items-end gap-5">
                  {([16, 32, 48] as const).map((size) => (
                    <figure key={size} className="space-y-1 text-center">
                      <img src={previews[size]} alt="" width={size} height={size} className="mx-auto" />
                      <figcaption className="font-mono text-[11px] text-muted-foreground">{size}</figcaption>
                    </figure>
                  ))}
                  <figure className="space-y-1 text-center">
                    <img src={previews[180]} alt="" width={90} height={90} className="mx-auto rounded-[20px]" />
                    <figcaption className="font-mono text-[11px] text-muted-foreground">iOS 180</figcaption>
                  </figure>
                  <figure className="space-y-1 text-center">
                    <img src={previews[512]} alt="" width={96} height={96} className="mx-auto" />
                    <figcaption className="font-mono text-[11px] text-muted-foreground">Android 512</figcaption>
                  </figure>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {source === 'image' ? 'Pilih gambar untuk melihat pratinjau.' : 'Tulis satu huruf atau emoji.'}
              </p>
            )}
          </div>

          <Button size="lg" onClick={() => void save()} disabled={!ready || saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Download />}
            Unduh favicon (.zip)
          </Button>
          <p className="text-xs text-muted-foreground">
            Isi: favicon.ico (16/32/48), PNG 16 &amp; 32, apple-touch-icon 180, android-chrome 192 &amp; 512, dan
            site.webmanifest.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-1.5 text-xs text-muted-foreground">
          <span>Taruh file di folder root situs, lalu tempel ini di &lt;head&gt;</span>
          <CopyButton text={HTML_SNIPPET} />
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-5">{HTML_SNIPPET}</pre>
      </div>

      {error && <ErrorNote message={error} />}
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block h-11 w-16 cursor-pointer rounded-lg border bg-background p-1"
      />
    </label>
  )
}
