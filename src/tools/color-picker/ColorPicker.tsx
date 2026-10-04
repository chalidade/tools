import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Check, ImagePlus, Pipette, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { decodeImage, newCanvas } from '@/lib/image'
import { cn } from '@/lib/utils'
import { colorScale, contrast, extractPalette, formats, parseColor, SCALE_STEPS, toHex, type RGB } from './color'

const WHITE: RGB = { r: 255, g: 255, b: 255 }
const BLACK: RGB = { r: 0, g: 0, b: 0 }
const LOUPE = 11 // pixels across in the magnifier

interface EyeDropperCtor {
  new (): { open: () => Promise<{ sRGBHex: string }> }
}
const EyeDropper = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper

export default function ColorPicker() {
  const [color, setColor] = useState<RGB>({ r: 109, g: 40, b: 217 })
  const [draft, setDraft] = useState('#6D28D9')
  const hex = toHex(color)

  function choose(next: RGB) {
    setColor(next)
    setDraft(toHex(next).toUpperCase())
  }

  async function pickFromScreen() {
    if (!EyeDropper) return
    try {
      const { sRGBHex } = await new EyeDropper().open()
      const parsed = parseColor(sRGBHex)
      if (parsed) choose(parsed)
    } catch {
      // Cancelled with Esc.
    }
  }

  const invalid = draft.trim() !== '' && !parseColor(draft)
  const scale = useMemo(() => colorScale(color), [color])

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current colour */}
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <div className="h-36 rounded-xl border shadow-inner" style={{ background: hex }} />
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-44 flex-1 space-y-2">
              <span className="text-xs font-medium text-muted-foreground">HEX, rgb(), hsl(), atau oklch()</span>
              <input
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  const parsed = parseColor(e.target.value)
                  if (parsed) setColor(parsed)
                }}
                spellCheck={false}
                className={cn(
                  'h-11 w-full rounded-xl border bg-background px-3 font-mono text-sm outline-none focus:border-brand-2/60',
                  invalid && 'border-destructive/60',
                )}
              />
            </label>
            <input
              type="color"
              value={hex}
              onChange={(e) => choose(parseColor(e.target.value) ?? color)}
              aria-label="Pilih warna"
              className="h-11 w-14 cursor-pointer rounded-lg border bg-background p-1"
            />
            {EyeDropper && (
              <Button variant="outline" className="h-11" onClick={() => void pickFromScreen()}>
                <Pipette />
                Dari layar
              </Button>
            )}
          </div>
          {invalid && <p className="text-xs text-destructive">Format warna tidak dikenali.</p>}

          <ul className="divide-y rounded-xl border">
            {formats(color).map((f) => (
              <li key={f.label} className="flex items-center gap-3 py-1 pr-1 pl-3">
                <span className="w-14 shrink-0 text-xs text-muted-foreground">{f.label}</span>
                <code className="min-w-0 flex-1 font-mono text-[13px] break-words">{f.value}</code>
                <CopyButton text={f.value} />
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <ImagePicker onPick={choose} />

          {/* Contrast */}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { fg: WHITE, label: 'Teks putih' },
              { fg: BLACK, label: 'Teks hitam' },
            ].map(({ fg, label }) => {
              const ratio = contrast(color, fg)
              return (
                <div key={label} className="overflow-hidden rounded-2xl border">
                  <div className="px-4 py-5" style={{ background: hex, color: toHex(fg) }}>
                    <p className="text-lg font-semibold">{label}</p>
                    <p className="text-sm">Contoh teks biasa di atas warna ini.</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-card px-4 py-2 text-xs">
                    <span className="font-mono font-medium whitespace-nowrap">{ratio.toFixed(2)} : 1</span>
                    <span className="flex flex-wrap gap-1.5">
                      <Badge pass={ratio >= 4.5} label="AA" />
                      <Badge pass={ratio >= 7} label="AAA" />
                      <Badge pass={ratio >= 3} label="AA besar" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Scale */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">Gradasi 50–950 (klik untuk memakai)</p>
          <CopyButton
            label="Salin sebagai CSS"
            text={scale.map((c, i) => `--color-${SCALE_STEPS[i]}: ${toHex(c)};`).join('\n')}
          />
        </div>
        <div className="grid grid-cols-11 overflow-hidden rounded-xl border">
          {scale.map((c, i) => {
            const h = toHex(c)
            return (
              <button
                key={SCALE_STEPS[i]}
                type="button"
                title={h}
                onClick={() => choose(c)}
                className="flex h-20 flex-col justify-end p-1.5 text-left transition-transform hover:z-10 hover:scale-105"
                style={{ background: h, color: contrast(c, WHITE) >= contrast(c, BLACK) ? '#fff' : '#000' }}
              >
                <span className="text-[10px] font-medium">{SCALE_STEPS[i]}</span>
                <span className="hidden font-mono text-[9px] sm:block">{h.slice(1)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Badge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium whitespace-nowrap',
        pass ? 'bg-brand-2/15 text-foreground' : 'bg-muted text-muted-foreground line-through',
      )}
    >
      {pass ? <Check className="size-3" /> : <X className="size-3" />}
      {label}
    </span>
  )
}

/** Click a pixel of a picked image; shows a magnifier while hovering, and the image's main colours. */
function ImagePicker({ onPick }: { onPick: (c: RGB) => void }) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [palette, setPalette] = useState<RGB[]>([])
  const [hover, setHover] = useState<{ x: number; y: number; px: number; py: number; color: RGB } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pickRef = useRef<HTMLInputElement>(null)
  const loupeRef = useRef<HTMLCanvasElement>(null)

  async function open(file: File) {
    setError(null)
    try {
      const image = await decodeImage(file)
      const s = Math.min(1, 1600 / Math.max(image.width, image.height))
      const c = newCanvas(image.width * s, image.height * s)
      const ctx = c.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(image.source, 0, 0, c.width, c.height)
      image.close()
      // Palette from a small copy: plenty of pixels for the main colours, and fast.
      const ps = Math.min(1, 120 / Math.max(c.width, c.height))
      const small = newCanvas(c.width * ps, c.height * ps)
      small.getContext('2d')!.drawImage(c, 0, 0, small.width, small.height)
      setPalette(extractPalette(small.getContext('2d')!.getImageData(0, 0, small.width, small.height).data, 8))
      setCanvas(c)
      setUrl(c.toDataURL('image/png'))
    } catch {
      setError('Gambar tidak bisa dibaca. Coba JPG, PNG, atau WebP.')
    }
  }

  function sample(e: MouseEvent<HTMLImageElement>) {
    if (!canvas) return null
    const rect = e.currentTarget.getBoundingClientRect()
    const px = Math.min(canvas.width - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width)))
    const py = Math.min(canvas.height - 1, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height)))
    const [r, g, b] = canvas.getContext('2d')!.getImageData(px, py, 1, 1).data
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, px, py, color: { r, g, b } }
  }

  // Draw the magnified pixels around the pointer.
  useEffect(() => {
    const loupe = loupeRef.current
    if (!hover || !canvas || !loupe) return
    const ctx = loupe.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, loupe.width, loupe.height)
    const half = (LOUPE - 1) / 2
    ctx.drawImage(canvas, hover.px - half, hover.py - half, LOUPE, LOUPE, 0, 0, loupe.width, loupe.height)
    const cell = loupe.width / LOUPE
    ctx.strokeStyle = contrast(hover.color, WHITE) >= contrast(hover.color, BLACK) ? '#fff' : '#000'
    ctx.lineWidth = 2
    ctx.strokeRect(half * cell, half * cell, cell, cell)
  }, [hover, canvas])

  if (!canvas || !url) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => pickRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f) void open(f)
          }}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-card px-6 py-10 text-sm text-muted-foreground transition-colors hover:border-brand-2/40 hover:text-foreground"
        >
          <ImagePlus className="size-6" />
          Ambil warna dari gambar — tarik gambar ke sini atau klik
        </button>
        <input
          ref={pickRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void open(f)
          }}
        />
        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Klik gambar untuk mengambil warna</p>
        <button
          type="button"
          onClick={() => {
            setCanvas(null)
            setUrl(null)
            setPalette([])
          }}
          className="text-xs font-medium text-brand-2 hover:underline"
        >
          Gambar lain
        </button>
      </div>
      <div className="relative grid place-items-center rounded-xl bg-muted/60 p-2">
        <div className="relative">
          <img
            src={url}
            alt=""
            draggable={false}
            onPointerMove={(e) => setHover(sample(e))}
            onPointerLeave={() => setHover(null)}
            onClick={(e) => {
              const s = sample(e)
              if (s) onPick(s.color)
            }}
            className="max-h-80 cursor-crosshair select-none"
          />
          {hover && (
            <div
              className="pointer-events-none absolute z-10 overflow-hidden rounded-full border-2 border-background shadow-lg"
              style={{ left: hover.x + 16, top: hover.y - 104 }}
            >
              <canvas ref={loupeRef} width={88} height={88} className="block" />
              <span className="absolute inset-x-0 bottom-2 text-center font-mono text-[10px]">
                <span className="rounded bg-background/90 px-1">{toHex(hover.color).toUpperCase()}</span>
              </span>
            </div>
          )}
        </div>
      </div>
      {palette.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Warna utama</p>
          <div className="flex flex-wrap gap-2">
            {palette.map((c, i) => {
              const h = toHex(c)
              return (
                <button
                  key={i}
                  type="button"
                  title={h}
                  onClick={() => onPick(c)}
                  className="size-9 rounded-lg border shadow-sm transition-transform hover:scale-110"
                  style={{ background: h }}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
