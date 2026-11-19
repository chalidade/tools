import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/tool/PasswordInput'
import { Stage, useStage } from '@/components/tool/Stage'
import { importPdfjs } from '@/lib/pdf-text'
import { useT } from '@/lib/i18n'
import { scrollToChild, OpenFailed, Opening, PageJump, ReaderBar, useCurrentIndex, useKeepScroll, useWidth, useZoom, viewerClass, type ViewProps } from './ui'
import './pdf-view.css'

// Pages are drawn by pdf.js on a canvas, with its text layer laid over them
// so text can be selected, copied and found with the browser's own search.
// Only pages near the visible area are drawn; ones scrolled far away free
// their canvas again, so a long document stays light.

type Pdfjs = Awaited<ReturnType<typeof importPdfjs>>

interface Doc {
  pdfjs: Pdfjs
  task: PDFDocumentLoadingTask
  pdf: PDFDocumentProxy
  pages: PDFPageProxy[]
  /** Page sizes at scale 1 (CSS px at 72 dpi), after /Rotate. */
  sizes: { width: number; height: number }[]
}

type State =
  | { kind: 'loading' }
  | { kind: 'password'; wrong: boolean }
  | { kind: 'ready'; doc: Doc }
  | { kind: 'error' }

/** Largest page the viewer fits to the width, in CSS px — wider screens get margins, not giant text. */
const MAX_FIT = 920
/** Cap on one canvas's pixels (iOS Safari refuses canvases much past 16 MP). */
const MAX_PIXELS = 14_000_000

async function openDoc(data: Uint8Array, password?: string): Promise<Doc> {
  const pdfjs = await importPdfjs()
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  // getDocument takes ownership of the buffer, so each attempt gets a copy.
  const task = pdfjs.getDocument({ data: data.slice(), password })
  try {
    const pdf = await task.promise
    const pages: PDFPageProxy[] = []
    for (let i = 1; i <= pdf.numPages; i++) pages.push(await pdf.getPage(i))
    const sizes = pages.map((p) => {
      const vp = p.getViewport({ scale: 1 })
      return { width: vp.width, height: vp.height }
    })
    return { pdfjs, task, pdf, pages, sizes }
  } catch (e) {
    void task.destroy()
    throw e
  }
}

export default function PdfView({ file, onReset }: ViewProps) {
  const t = useT()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [password, setPassword] = useState('')
  const data = useRef<Uint8Array | null>(null)
  const docRef = useRef<Doc | null>(null)

  const load = useCallback(
    async (pw?: string) => {
      try {
        data.current ??= new Uint8Array(await file.arrayBuffer())
        const doc = await openDoc(data.current, pw)
        docRef.current = doc
        setState({ kind: 'ready', doc })
      } catch (e) {
        const pdfjs = await importPdfjs()
        if (e instanceof pdfjs.PasswordException) {
          setState({ kind: 'password', wrong: e.code === pdfjs.PasswordResponses.INCORRECT_PASSWORD })
        } else setState({ kind: 'error' })
      }
    },
    [file],
  )

  useEffect(() => {
    void load()
    return () => void docRef.current?.task.destroy()
  }, [load])

  if (state.kind === 'loading') return <Opening file={file} />
  if (state.kind === 'error')
    return (
      <OpenFailed
        onReset={onReset}
        message={t('PDF tidak bisa dibuka. Pastikan filenya tidak rusak.', "The PDF couldn't be opened. Make sure the file isn't damaged.")}
      />
    )
  if (state.kind === 'password')
    return (
      <form
        className="space-y-4 rounded-2xl border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault()
          setState({ kind: 'loading' })
          void load(password)
        }}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-[0.625rem] border bg-background text-brand-2">
            <LockKeyhole className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{t('PDF ini dikunci password.', 'This PDF is password-protected.')}</p>
          </div>
        </div>
        <PasswordInput
          label={t('Password', 'Password')}
          value={password}
          onChange={setPassword}
          autoFocus
          invalid={state.wrong}
          autoComplete="current-password"
        />
        {state.wrong && <p className="text-xs text-destructive">{t('Password salah. Coba lagi.', 'Wrong password. Try again.')}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={!password}>
            {t('Buka', 'Open')}
          </Button>
          <Button type="button" variant="ghost" onClick={onReset}>
            {t('File lain', 'Another file')}
          </Button>
        </div>
      </form>
    )

  return <PdfPages doc={state.doc} file={file} onReset={onReset} />
}

function PdfPages({ doc, file, onReset }: { doc: Doc; file: File; onReset: () => void }) {
  const t = useT()
  const stage = useStage({ landscape: false })
  const { zoom, zoomIn, zoomOut, reset } = useZoom()
  const viewer = useRef<HTMLDivElement>(null)
  const width = useWidth(viewer)
  const widest = Math.max(...doc.sizes.map((s) => s.width))
  const fit = width ? Math.min(width - 32, MAX_FIT) / widest : 0
  const scale = fit * zoom
  const count = doc.pages.length
  const current = useCurrentIndex(viewer, '[data-page]', fit ? count : 0)
  useKeepScroll(viewer, scale)

  const goTo = useCallback((index: number) => {
    scrollToChild(viewer.current, `[data-page="${index}"]`)
  }, [])

  // Internal links ("see page 4", a table of contents) point at a destination, not a page number.
  const goToDest = useCallback(
    async (dest: string | unknown[]) => {
      try {
        const explicit = typeof dest === 'string' ? await doc.pdf.getDestination(dest) : dest
        const ref = explicit?.[0]
        if (ref == null) return
        const index = typeof ref === 'number' ? ref : await doc.pdf.getPageIndex(ref as Parameters<PDFDocumentProxy['getPageIndex']>[0])
        goTo(index)
      } catch {
        // A broken link goes nowhere, like in any reader.
      }
    },
    [doc, goTo],
  )

  return (
    <Stage stage={stage} title={file.name} className="space-y-3">
      <ReaderBar
        file={file}
        info={t(`PDF · ${count} halaman`, `PDF · ${count} ${count === 1 ? 'page' : 'pages'}`)}
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={reset}
        stage={stage}
        onReset={onReset}
      >
        <PageJump current={current} total={count} onGo={goTo} label={t('Halaman', 'Page')} />
      </ReaderBar>

      <div ref={viewer} className={viewerClass(stage.full)}>
        {fit > 0 && (
          <div className="flex w-max min-w-full flex-col items-center gap-4 p-4">
            {doc.pages.map((page, i) => (
              <PdfPage
                key={i}
                index={i}
                page={page}
                pdfjs={doc.pdfjs}
                width={doc.sizes[i].width * scale}
                height={doc.sizes[i].height * scale}
                scale={scale}
                root={viewer}
                onDest={goToDest}
                label={t(`Halaman ${i + 1}`, `Page ${i + 1}`)}
              />
            ))}
          </div>
        )}
      </div>
    </Stage>
  )
}

interface Link {
  /** Position in % of the page, so it holds at any zoom. */
  left: number
  top: number
  width: number
  height: number
  url?: string
  dest?: string | unknown[]
}

const PdfPage = memo(function PdfPage({
  index,
  page,
  pdfjs,
  width,
  height,
  scale,
  root,
  onDest,
  label,
}: {
  index: number
  page: PDFPageProxy
  pdfjs: Pdfjs
  width: number
  height: number
  scale: number
  root: React.RefObject<HTMLDivElement | null>
  onDest: (dest: string | unknown[]) => void
  label: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const text = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [drawn, setDrawn] = useState(false)
  const [links, setLinks] = useState<Link[]>([])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      root: root.current,
      rootMargin: '1500px 0px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [root])

  // Draw the page (and its text layer) while it is near the view; free it when it leaves.
  useEffect(() => {
    const c = canvas.current
    const layer = text.current
    if (!near || !c || !layer || scale <= 0) return
    let cancelled = false
    const viewport = page.getViewport({ scale })
    const area = viewport.width * viewport.height
    const ratio = Math.min(window.devicePixelRatio || 1, 3, Math.sqrt(MAX_PIXELS / area))
    c.width = Math.floor(viewport.width * ratio)
    c.height = Math.floor(viewport.height * ratio)
    const ctx = c.getContext('2d')!
    const task = page.render({
      canvas: c,
      canvasContext: ctx,
      viewport,
      transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
      // 'print' never waits on requestAnimationFrame; ENABLE paints form fields
      // and stamps from their appearance, since there is no annotation layer.
      intent: 'print',
      annotationMode: pdfjs.AnnotationMode.ENABLE,
    })
    task.promise.then(
      () => !cancelled && setDrawn(true),
      () => {},
    )

    layer.replaceChildren()
    layer.style.setProperty('--total-scale-factor', String(scale))
    const textLayer = new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: layer, viewport })
    textLayer.render().catch(() => {})

    return () => {
      cancelled = true
      task.cancel()
      textLayer.cancel()
    }
  }, [near, scale, page, pdfjs])

  useEffect(() => {
    if (near) return
    // Far away: give the canvas memory back.
    if (canvas.current) {
      canvas.current.width = 0
      canvas.current.height = 0
    }
    text.current?.replaceChildren()
    setDrawn(false)
  }, [near])

  // Links, read once per page.
  useEffect(() => {
    if (!near || links.length) return
    let cancelled = false
    void page.getAnnotations({ intent: 'display' }).then((annots) => {
      if (cancelled) return
      const vp = page.getViewport({ scale: 1 })
      const found: Link[] = []
      for (const a of annots as { subtype: string; rect: number[]; url?: string; dest?: string | unknown[] }[]) {
        if (a.subtype !== 'Link') continue
        const url = a.url && /^(https?:|mailto:)/i.test(a.url) ? a.url : undefined
        if (!url && !a.dest) continue
        const [x1, y1] = vp.convertToViewportPoint(a.rect[0], a.rect[1]) as number[]
        const [x2, y2] = vp.convertToViewportPoint(a.rect[2], a.rect[3]) as number[]
        found.push({
          left: (Math.min(x1, x2) / vp.width) * 100,
          top: (Math.min(y1, y2) / vp.height) * 100,
          width: (Math.abs(x2 - x1) / vp.width) * 100,
          height: (Math.abs(y2 - y1) / vp.height) * 100,
          url,
          dest: url ? undefined : a.dest,
        })
      }
      setLinks(found)
    }, () => {})
    return () => {
      cancelled = true
    }
  }, [near, page, links.length])

  return (
    <div
      ref={box}
      data-page={index}
      aria-label={label}
      className="toowl-pdf-page relative shrink-0 bg-white shadow-sm ring-1 ring-black/10"
      style={{ width, height }}
    >
      <canvas ref={canvas} className="absolute inset-0 size-full" style={{ visibility: drawn ? 'visible' : 'hidden' }} />
      <div ref={text} className="textLayer" />
      {links.map((l, i) =>
        l.url ? (
          <a
            key={i}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            title={l.url}
            className="absolute z-[2] hover:bg-brand-2/15"
            style={{ left: `${l.left}%`, top: `${l.top}%`, width: `${l.width}%`, height: `${l.height}%` }}
          />
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onDest(l.dest!)}
            className="absolute z-[2] cursor-pointer hover:bg-brand-2/15"
            style={{ left: `${l.left}%`, top: `${l.top}%`, width: `${l.width}%`, height: `${l.height}%` }}
          />
        ),
      )}
    </div>
  )
})
