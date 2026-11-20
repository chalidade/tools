import { useState } from 'react'
import { ArrowLeftRight, CheckCircle2, Pipette, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { contrast, fromHsl, parseColor, toHex, toHsl, type RGB } from '../color-picker/color'

interface EyeDropperCtor {
  new (): { open: () => Promise<{ sRGBHex: string }> }
}
const EyeDropper = typeof window === 'undefined' ? undefined : (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper

const field =
  'min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

const LEVELS = [
  { id: 'AA', size: 'normal', min: 4.5 },
  { id: 'AAA', size: 'normal', min: 7 },
  { id: 'AA', size: 'large', min: 3 },
  { id: 'AAA', size: 'large', min: 4.5 },
] as const

/** WCAG works on 8-bit colours; round first so "#777" is judged as browsers draw it. */
const rounded = (c: RGB): RGB => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) })
const ratioOf = (a: RGB, b: RGB) => contrast(rounded(a), rounded(b))
/** Shown truncated, never rounded up: 4.496 must not read as passing 4.5. */
const show = (r: number) => (Math.floor(r * 100) / 100).toFixed(2)

/** The text colour closest in lightness to `fg` (same hue and saturation) that reaches `target` on `bg`. */
function nearestPassing(fg: RGB, bg: RGB, target: number): RGB | null {
  const { h, s, l } = toHsl(fg)
  for (let step = 0; step <= 100; step += 0.5) {
    for (const candidate of [l - step, l + step]) {
      if (candidate < 0 || candidate > 100) continue
      const c = rounded(fromHsl(h, s, candidate))
      if (ratioOf(c, bg) >= target) return c
    }
  }
  return null
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const t = useT()
  const parsed = parseColor(value)
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <input type="color" value={parsed ? toHex(parsed) : '#000000'} onChange={(e) => onChange(e.target.value)} aria-label={label} className="size-10 shrink-0 cursor-pointer rounded-lg border bg-transparent" />
        <input value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} aria-label={label} className={cn(field, !parsed && 'border-destructive')} />
        {EyeDropper && (
          <Button
            variant="outline"
            size="icon"
            aria-label={t('Ambil dari layar', 'Pick from screen')}
            onClick={() =>
              void new EyeDropper()
                .open()
                .then((r) => onChange(r.sRGBHex))
                .catch(() => {})
            }
          >
            <Pipette />
          </Button>
        )}
      </div>
    </div>
  )
}

export default function KontrasWarna() {
  const t = useT()
  const [fgText, setFg] = useState('#7a7a7a')
  const [bgText, setBg] = useState('#ffffff')
  const fg = parseColor(fgText)
  const bg = parseColor(bgText)
  const ratio = fg && bg ? ratioOf(fg, bg) : null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <ColorField label={t('Warna teks', 'Text colour')} value={fgText} onChange={setFg} />
        <Button
          variant="outline"
          size="icon"
          aria-label={t('Tukar', 'Swap')}
          onClick={() => {
            setFg(bgText)
            setBg(fgText)
          }}
        >
          <ArrowLeftRight />
        </Button>
        <ColorField label={t('Warna latar', 'Background colour')} value={bgText} onChange={setBg} />
      </div>

      {fg && bg && ratio !== null && (
        <>
          <div className="overflow-hidden rounded-2xl border" style={{ background: toHex(bg), color: toHex(fg) }}>
            <div className="space-y-2 p-6">
              <p className="text-3xl font-semibold tracking-tight">{t('Teks besar 24 px', 'Large text 24 px')}</p>
              <p className="text-base">
                {t(
                  'Teks biasa 16 px. Pastikan tulisan ini nyaman dibaca oleh semua orang, termasuk yang penglihatannya kurang.',
                  'Normal text at 16 px. Make sure this reads comfortably for everyone, including people with low vision.',
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-5xl font-semibold tracking-tight tabular-nums">{show(ratio)}</span>
            <span className="text-muted-foreground">: 1</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {LEVELS.map((lv) => {
              const pass = ratio >= lv.min
              const fix = pass ? null : nearestPassing(fg, bg, lv.min)
              return (
                <div key={lv.id + lv.size} className="flex items-center gap-3 rounded-xl border p-3">
                  {pass ? <CheckCircle2 className="size-5 shrink-0 text-brand-2" /> : <XCircle className="size-5 shrink-0 text-destructive" />}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">
                      {lv.id} · {lv.size === 'normal' ? t('teks biasa', 'normal text') : t('teks besar', 'large text')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('minimal', 'at least')} {lv.min}:1
                    </p>
                  </div>
                  {fix && (
                    <button type="button" onClick={() => setFg(toHex(fix))} className="flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-xs hover:border-brand-2" title={t('Pakai warna teks ini', 'Use this text colour')}>
                      <span className="size-3.5 rounded-sm border" style={{ background: toHex(fix) }} />
                      {toHex(fix)}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Menurut WCAG 2.2: teks besar berarti minimal 24 px, atau 18,66 px tebal. Saran warna menjaga hue dan saturasi teks, hanya mengubah terang-gelapnya. Terima HEX, rgb(), hsl(), dan oklch().',
          'Per WCAG 2.2: large text means at least 24 px, or 18.66 px bold. Suggestions keep the text hue and saturation and only change its lightness. Accepts HEX, rgb(), hsl() and oklch().',
        )}
      </p>
    </div>
  )
}
