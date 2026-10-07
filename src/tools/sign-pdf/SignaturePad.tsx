import { useRef, useState, type PointerEvent } from 'react'
import { Check, Eraser } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/tool/Segmented'
import { useT } from '@/lib/i18n'
import { trimToSignature, type Signature } from './sign'

const W = 900
const H = 300

/** Labels are [Indonesian, English]. */
const INK_OPTIONS: { value: string; label: readonly [string, string] }[] = [
  { value: '#111827', label: ['Hitam', 'Black'] },
  { value: '#1d4ed8', label: ['Biru', 'Blue'] },
]

/** A canvas to sign on with a mouse, finger, or pen. */
export function SignaturePad({ onDone }: { onDone: (signature: Signature) => void }) {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const last = useRef<{ x: number; y: number; mx: number; my: number } | null>(null)
  const [ink, setInk] = useState(INK_OPTIONS[0].value)
  const [empty, setEmpty] = useState(true)

  function point(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H }
  }

  function down(e: PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = point(e)
    last.current = { ...p, mx: p.x, my: p.y }
    // A tap leaves a dot.
    const ctx = e.currentTarget.getContext('2d')!
    ctx.fillStyle = ink
    ctx.beginPath()
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
    ctx.fill()
    setEmpty(false)
  }

  function move(e: PointerEvent<HTMLCanvasElement>) {
    const prev = last.current
    if (!prev) return
    const p = point(e)
    const mx = (prev.x + p.x) / 2
    const my = (prev.y + p.y) / 2
    const ctx = e.currentTarget.getContext('2d')!
    ctx.strokeStyle = ink
    // Pens report pressure; mice report 0.5.
    ctx.lineWidth = e.pointerType === 'pen' ? 2 + e.pressure * 4 : 5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // Curve through midpoints so fast strokes stay smooth instead of jagged.
    ctx.beginPath()
    ctx.moveTo(prev.mx, prev.my)
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my)
    ctx.stroke()
    last.current = { ...p, mx, my }
  }

  function clear() {
    canvasRef.current?.getContext('2d')!.clearRect(0, 0, W, H)
    setEmpty(true)
  }

  async function done() {
    if (!canvasRef.current) return
    const signature = await trimToSignature(canvasRef.current)
    if (signature) onDone(signature)
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border bg-white">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={() => (last.current = null)}
          onPointerCancel={() => (last.current = null)}
          className="block aspect-[3/1] w-full cursor-crosshair touch-none"
        />
        <div className="pointer-events-none absolute inset-x-8 bottom-[22%] border-b border-dashed border-zinc-300" />
        {empty && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-zinc-400">
            {t('Tanda tangan di sini', 'Sign here')}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Segmented
          label={t('Tinta', 'Ink')}
          value={ink}
          options={INK_OPTIONS.map((o) => ({ value: o.value, label: t(...o.label) }))}
          onChange={setInk}
        />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={clear} disabled={empty}>
            <Eraser />
            {t('Hapus', 'Clear')}
          </Button>
          <Button onClick={() => void done()} disabled={empty}>
            <Check />
            {t('Pakai tanda tangan ini', 'Use this signature')}
          </Button>
        </div>
      </div>
    </div>
  )
}
