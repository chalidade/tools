import { useEffect, useRef, useState } from 'react'
import { Download, RotateCcw, Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { ProgressCard } from '@/components/tool/SizeResult'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { isPdfFile, openErrorMessage, pageThumbs, type PageThumb } from '@/lib/pdf-doc'
import { useT } from '@/lib/i18n'
import { isUsable, rectFromPoints, redactPdf, type Rect } from './redact'

type Phase =
  | { kind: 'idle' }
  | { kind: 'working'; done: number; total: number; startedAt: number }
  | { kind: 'done'; blob: Blob; pages: number }

const MAX_PAGES = 60

export default function RedactPdf() {
  const t = useT()
  const [file, setFile] = useState<File | null>(null)
  const [thumbs, setThumbs] = useState<PageThumb[]>([])
  const [loading, setLoading] = useState(false)
  const [marks, setMarks] = useState<Map<number, Rect[]>>(new Map())
  const [dpi, setDpi] = useState(150)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const signal = useRef({ cancelled: false })
  const load = useRef(0)

  useEffect(() => () => { load.current++ }, [])

  async function pick(f: File) {
    if (!isPdfFile(f)) {
      setError(t('Pilih file berformat .pdf.', 'Choose a file in .pdf format.'))
      return
    }
    const id = ++load.current
    setError(null)
    setFile(f)
    setThumbs([])
    setMarks(new Map())
    setPhase({ kind: 'idle' })
    setLoading(true)
    try {
      const { count } = await pageThumbs(f, 1, undefined, [1])
      if (count > MAX_PAGES) throw new Error('many')
      const { thumbs } = await pageThumbs(f, 900)
      if (id === load.current) setThumbs(thumbs)
    } catch (e) {
      if (id !== load.current) return
      setFile(null)
      setError(
        e instanceof Error && e.message === 'many'
          ? t(`PDF ini lebih dari ${MAX_PAGES} halaman. Pisahkan dulu dengan tool “Pisah PDF”.`, `This PDF has more than ${MAX_PAGES} pages. Split it first with the “Split PDF” tool.`)
          : openErrorMessage(e),
      )
    } finally {
      if (id === load.current) setLoading(false)
    }
  }

  function setPage(n: number, rects: Rect[]) {
    setMarks((m) => new Map(m).set(n, rects))
    setPhase({ kind: 'idle' })
  }

  async function run() {
    if (!file) return
    setError(null)
    signal.current = { cancelled: false }
    const startedAt = Date.now()
    setPhase({ kind: 'working', done: 0, total: 1, startedAt })
    try {
      const blob = await redactPdf(file, marks, dpi, (done, total) => setPhase({ kind: 'working', done, total, startedAt }), signal.current)
      setPhase({ kind: 'done', blob, pages: [...marks.values()].filter((r) => r.length).length })
    } catch (e) {
      setPhase({ kind: 'idle' })
      if (!signal.current.cancelled) setError(openErrorMessage(e))
    }
  }

  const busy = phase.kind === 'working'
  const total = [...marks.values()].reduce((s, r) => s + r.length, 0)

  return (
    <div className="space-y-6">
      {!file ? (
        <FileDrop accept="application/pdf,.pdf" label={t('Tarik file .pdf ke sini', 'Drop a .pdf file here')} onFiles={([f]) => void pick(f)} />
      ) : (
        <>
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 truncate font-medium">{file.name}</p>
            <Button variant="ghost" disabled={busy} onClick={() => { load.current++; setFile(null); setThumbs([]); setLoading(false); setPhase({ kind: 'idle' }) }}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {t('Seret di atas halaman untuk menandai area yang mau dihitamkan.', 'Drag across a page to mark an area to black out.')}
          </p>

          {loading && <p className="text-sm text-muted-foreground">{t('Memuat halaman…', 'Loading pages…')}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            {thumbs.map((th, i) => (
              <PageMarker key={i} n={i + 1} thumb={th} rects={marks.get(i + 1) ?? []} disabled={busy} onChange={(r) => setPage(i + 1, r)} />
            ))}
          </div>

          {thumbs.length > 0 && (
            <>
              <div className="rounded-2xl border bg-card p-4">
                <Segmented
                  label={t('Resolusi halaman yang diredaksi', 'Resolution of redacted pages')}
                  value={dpi}
                  disabled={busy}
                  options={[
                    { value: 100, label: t('100 dpi · hemat', '100 dpi · small') },
                    { value: 150, label: t('150 dpi · standar', '150 dpi · standard') },
                    { value: 200, label: t('200 dpi · tajam', '200 dpi · sharp') },
                  ]}
                  onChange={(v) => { setDpi(v); setPhase({ kind: 'idle' }) }}
                />
              </div>

              <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                {t(
                  'Halaman yang diredaksi dirender ulang jadi gambar: teks aslinya benar-benar hilang dari file, dan teks di halaman itu tidak bisa disalin atau dicari lagi. Halaman lain tetap utuh. Properti dokumen (judul, penulis) tidak diubah.',
                  'Redacted pages are re-rendered as images: the original text is really removed from the file, and the text on those pages can no longer be copied or searched. Other pages stay intact. Document properties (title, author) are left as they are.',
                )}
              </p>
            </>
          )}

          {phase.kind === 'working' && (
            <ProgressCard
              label={t(`Meredaksi halaman ${phase.done}/${phase.total}…`, `Redacting page ${phase.done}/${phase.total}…`)}
              progress={phase.done / phase.total}
              startedAt={phase.startedAt}
              action={
                <Button variant="ghost" size="sm" onClick={() => { signal.current.cancelled = true }}>
                  <X />
                  {t('Batal', 'Cancel')}
                </Button>
              }
            />
          )}

          {phase.kind === 'done' ? (
            <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">{t(`${phase.pages} halaman diredaksi.`, `${phase.pages} page(s) redacted.`)}</p>
              <Button onClick={() => downloadBlob(phase.blob, withExtension(file.name, '-redaksi.pdf'))}>
                <Download />
                {t('Unduh PDF', 'Download PDF')}
              </Button>
            </div>
          ) : (
            thumbs.length > 0 && (
              <Button disabled={busy || total === 0} onClick={() => void run()}>
                {total === 0 ? t('Tandai area dulu', 'Mark an area first') : t(`Redaksi ${total} area`, `Redact ${total} area(s)`)}
              </Button>
            )
          )}
        </>
      )}
      {error && <ErrorNote message={error} />}
    </div>
  )
}

function PageMarker({ n, thumb, rects, disabled, onChange }: { n: number; thumb: PageThumb; rects: Rect[]; disabled: boolean; onChange: (r: Rect[]) => void }) {
  const t = useT()
  const box = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ x: number; y: number; cx: number; cy: number } | null>(null)

  const point = (e: React.PointerEvent) => {
    const b = box.current!.getBoundingClientRect()
    return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height }
  }
  const live = drag ? rectFromPoints(drag.x, drag.y, drag.cx, drag.cy) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t(`Halaman ${n}`, `Page ${n}`)}</span>
        {rects.length > 0 && (
          <button type="button" disabled={disabled} className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => onChange(rects.slice(0, -1))}>
            <Undo2 className="size-3" />
            {t('Urungkan', 'Undo')} ({rects.length})
          </button>
        )}
      </div>
      <div
        ref={box}
        className="relative touch-none select-none overflow-hidden rounded-lg border bg-white"
        style={{ aspectRatio: `${thumb.width} / ${thumb.height}`, cursor: disabled ? 'default' : 'crosshair' }}
        onPointerDown={(e) => {
          if (disabled) return
          e.currentTarget.setPointerCapture(e.pointerId)
          const p = point(e)
          setDrag({ x: p.x, y: p.y, cx: p.x, cy: p.y })
        }}
        onPointerMove={(e) => {
          if (!drag) return
          const p = point(e)
          setDrag({ ...drag, cx: p.x, cy: p.y })
        }}
        onPointerUp={() => {
          if (live && isUsable(live)) onChange([...rects, live])
          setDrag(null)
        }}
        onPointerCancel={() => setDrag(null)}
      >
        <img src={thumb.src} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full" />
        {rects.map((r, i) => (
          <div key={i} className="absolute bg-black" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }} />
        ))}
        {live && <div className="absolute border border-red-500 bg-red-500/30" style={{ left: `${live.x * 100}%`, top: `${live.y * 100}%`, width: `${live.w * 100}%`, height: `${live.h * 100}%` }} />}
      </div>
    </div>
  )
}
