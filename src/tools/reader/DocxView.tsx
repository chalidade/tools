import { useEffect, useRef, useState } from 'react'
import { Stage, useStage } from '@/components/tool/Stage'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { renderDocx } from '../doc-to-pdf/convert'
import { scrollToChild, OpenFailed, Opening, PageJump, ReaderBar, useCurrentIndex, useKeepScroll, useWidth, useZoom, viewerClass, type ViewProps } from './ui'

// docx-preview lays the document out as Word pages (size, margins, headers
// and footers, tables, images, columns), the same renderer "Word ke PDF"
// uses — including its clean-up of anything in the file that could load a
// remote URL or run on click. Zoom uses CSS `zoom`, so text stays sharp.

type State = { kind: 'loading' } | { kind: 'ready'; pages: number; pageWidth: number } | { kind: 'error' }

export default function DocxView({ file, onReset }: ViewProps) {
  const t = useT()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const stage = useStage({ landscape: false })
  const { zoom, zoomIn, zoomOut, reset } = useZoom()
  const viewer = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const style = useRef<HTMLDivElement>(null)
  const width = useWidth(viewer)

  useEffect(() => {
    let cancelled = false
    renderDocx(file, body.current!, style.current!)
      .then((sections) => {
        if (cancelled) return
        if (!sections.length) throw new Error('empty')
        for (const [i, s] of sections.entries()) s.dataset.page = String(i)
        setState({ kind: 'ready', pages: sections.length, pageWidth: Math.max(...sections.map(pageWidthOf)) })
      })
      .catch(() => !cancelled && setState({ kind: 'error' }))
    return () => {
      cancelled = true
    }
  }, [file])

  const ready = state.kind === 'ready'
  // Fit the page (plus the wrapper's padding) to the viewer, never above 100%.
  const fit = ready && width ? Math.min(1, (width - 2) / (state.pageWidth + 32)) : 1
  const scale = fit * zoom
  const pages = ready ? state.pages : 0
  const current = useCurrentIndex(viewer, '[data-page]', pages)
  useKeepScroll(viewer, scale)

  const goTo = (i: number) => scrollToChild(viewer.current, `[data-page="${i}"]`)

  return (
    <>
      {state.kind === 'loading' && <Opening file={file} />}
      {state.kind === 'error' && (
        <OpenFailed
          onReset={onReset}
          message={t(
            'Dokumen tidak bisa dibaca. Pastikan file .docx tidak rusak atau terkunci password.',
            "The document couldn't be read. Make sure the .docx file isn't damaged or password-protected.",
          )}
        />
      )}
      {/* docx-preview's stylesheet goes here; kept mounted so the ref stays valid. */}
      <div ref={style} hidden />

      <Stage stage={stage} title={file.name} className={cn('space-y-3', !ready && 'hidden')}>
        {ready && (
          <ReaderBar
            file={file}
            info={t(`Word · ${pages} halaman`, `Word · ${pages} ${pages === 1 ? 'page' : 'pages'}`)}
            zoom={scale}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onZoomReset={reset}
            stage={stage}
            onReset={onReset}
          >
            <PageJump current={current} total={pages} onGo={goTo} label={t('Halaman', 'Page')} />
          </ReaderBar>
        )}
        <div ref={viewer} className={viewerClass(stage.full)}>
          <div
            ref={body}
            style={{ zoom: scale }}
            className="w-max min-w-full [&_.docx-wrapper]:bg-transparent! [&_.docx-wrapper]:p-4! [&_.docx-wrapper>section.docx]:mb-4! [&_.docx-wrapper>section.docx]:shadow-sm! [&_.docx-wrapper>section.docx]:ring-1 [&_.docx-wrapper>section.docx]:ring-black/10"
          />
        </div>
      </Stage>
    </>
  )
}

/** The page's width in CSS px. Read from the style, since the view is still hidden when this runs. */
function pageWidthOf(section: HTMLElement) {
  return parseFloat(getComputedStyle(section).width) || parseFloat(section.style.width) * (section.style.width.endsWith('pt') ? 4 / 3 : 1) || 816
}
