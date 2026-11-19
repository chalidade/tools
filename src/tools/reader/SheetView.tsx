import { useEffect, useRef, useState } from 'react'
import { Grid3x3 } from 'lucide-react'
import { Stage, useStage } from '@/components/tool/Stage'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { readSpreadsheet, UnsupportedSheetError, type Sheet, type Spreadsheet } from '../excel-to-pdf/convert'
import { OpenFailed, Opening, ReaderBar, useZoom, type ViewProps } from './ui'

// The workbook is read by the same code as "Excel ke PDF" (ExcelJS + numfmt):
// values shown the way Excel formats them, with fonts, fills, borders,
// alignment, merged cells, column widths and row heights. Laid out like a
// spreadsheet, with column letters, row numbers and the sheet tabs. Rows are
// added in batches as you scroll, so a big sheet opens quickly.

type State = { kind: 'loading' } | { kind: 'ready'; book: Spreadsheet } | { kind: 'error'; tooBig: boolean }

const BATCH = 400

/** 0 → A, 25 → Z, 26 → AA. */
function columnName(i: number) {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

export default function SheetView({ file, onReset }: ViewProps) {
  const t = useT()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [active, setActive] = useState(0)
  const [grid, setGrid] = useState(true)
  const stage = useStage({ landscape: false })
  const { zoom, zoomIn, zoomOut, reset } = useZoom()

  useEffect(() => {
    let cancelled = false
    readSpreadsheet(file).then(
      (book) => !cancelled && setState({ kind: 'ready', book }),
      (e) => !cancelled && setState({ kind: 'error', tooBig: e instanceof UnsupportedSheetError }),
    )
    return () => {
      cancelled = true
    }
  }, [file])

  if (state.kind === 'loading') return <Opening file={file} />
  if (state.kind === 'error')
    return (
      <OpenFailed
        onReset={onReset}
        message={t(
          'Spreadsheet tidak bisa dibaca. Pastikan file .xlsx/.csv tidak rusak, tidak terkunci password, dan tidak kosong.',
          "The spreadsheet couldn't be read. Make sure the .xlsx/.csv file isn't damaged, password-protected or empty.",
        )}
      />
    )

  const { sheets } = state.book
  const sheet = sheets[Math.min(active, sheets.length - 1)]
  const cols = sheet.colWidths.length

  return (
    <Stage stage={stage} title={file.name} className="space-y-3">
      <ReaderBar
        file={file}
        info={t(
          `${sheets.length > 1 ? `${sheets.length} sheet · ` : ''}${sheet.rows.length} baris × ${cols} kolom`,
          `${sheets.length > 1 ? `${sheets.length} sheets · ` : ''}${sheet.rows.length} rows × ${cols} columns`,
        )}
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={reset}
        stage={stage}
        onReset={onReset}
      >
        <button
          type="button"
          aria-pressed={grid}
          onClick={() => setGrid((g) => !g)}
          title={t('Garis sel', 'Gridlines')}
          className={cn(
            'grid size-[34px] place-items-center rounded-xl border bg-background transition-colors [&_svg]:size-4',
            grid ? 'text-brand-2' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Grid3x3 />
        </button>
      </ReaderBar>

      <div className={cn('flex flex-col overflow-hidden rounded-2xl border', stage.full ? 'min-h-0 flex-1' : 'h-[78vh] min-h-[26rem]')}>
        {/* key: each sheet starts at the top with its first batch of rows. */}
        <SheetGrid key={active} sheet={sheet} zoom={zoom} grid={grid} />
        {sheets.length > 1 && (
          <div className="flex shrink-0 overflow-x-auto border-t bg-muted" role="tablist">
            {sheets.map((s, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={cn(
                  'shrink-0 border-t-2 px-3.5 py-2 text-xs whitespace-nowrap transition-colors',
                  i === active ? 'border-brand-2 bg-background font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </Stage>
  )
}

function SheetGrid({ sheet, zoom, grid }: { sheet: Sheet; zoom: number; grid: boolean }) {
  const t = useT()
  const [limit, setLimit] = useState(BATCH)
  const scroller = useRef<HTMLDivElement>(null)
  const more = useRef<HTMLDivElement>(null)
  const rows = sheet.rows.slice(0, limit)
  const hasMore = sheet.rows.length > limit

  // Next batch when the end of the table comes near.
  useEffect(() => {
    const el = more.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(([e]) => e.isIntersecting && setLimit((l) => l + BATCH), {
      root: scroller.current,
      rootMargin: '600px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, limit])

  const gridLine = grid ? '1px solid #e2e2e2' : '1px solid transparent'
  const headCell = 'border border-[#d4d4d4] bg-[#f3f3f3] font-normal text-[#555]'

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-auto overscroll-contain bg-white text-[#111]">
      <table
        className="border-separate border-spacing-0"
        style={{ tableLayout: 'fixed', zoom, fontFamily: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif' }}
      >
        <colgroup>
          <col style={{ width: 44 }} />
          {sheet.colWidths.map((w, i) => (
            <col key={i} style={{ width: `${w}pt` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className={cn(headCell, 'sticky top-0 left-0 z-30')} />
            {sheet.colWidths.map((_, i) => (
              <th key={i} className={cn(headCell, 'sticky top-0 z-20 h-6 px-1 text-center text-[11px]')}>
                {columnName(i)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} style={{ height: sheet.rowHeights[r] ? `${sheet.rowHeights[r]}pt` : '15pt' }}>
              <th className={cn(headCell, 'sticky left-0 z-10 px-1 text-right font-mono text-[10px] tabular-nums')}>{r + 1}</th>
              {row.map((cell, c) => {
                if (cell.covered) return null
                const s = cell.style
                const edge = (on: boolean) => (on ? '1px solid #3f3f46' : gridLine)
                return (
                  <td
                    key={c}
                    colSpan={cell.colSpan}
                    rowSpan={cell.rowSpan}
                    title={cell.text.length > 40 ? cell.text : undefined}
                    style={{
                      padding: '1pt 3pt',
                      fontSize: `${s.size}pt`,
                      lineHeight: 1.2,
                      fontWeight: s.bold ? 700 : 400,
                      fontStyle: s.italic ? 'italic' : undefined,
                      textDecoration: s.underline ? 'underline' : undefined,
                      color: s.color,
                      background: s.fill ?? '#fff',
                      textAlign: s.align,
                      verticalAlign: s.valign,
                      whiteSpace: s.wrap ? 'pre-wrap' : 'pre',
                      overflow: 'hidden',
                      textOverflow: 'clip',
                      // Only the right and bottom edge of each cell, so a shared edge is drawn once.
                      borderRight: edge(s.border.right),
                      borderBottom: edge(s.border.bottom),
                      borderTop: s.border.top ? edge(true) : undefined,
                      borderLeft: s.border.left ? edge(true) : undefined,
                    }}
                  >
                    {cell.text}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <div ref={more} className="p-3 text-center font-mono text-[11px] text-neutral-500">
          {t(`Memuat baris berikutnya… (${limit} dari ${sheet.rows.length})`, `Loading more rows… (${limit} of ${sheet.rows.length})`)}
        </div>
      )}
    </div>
  )
}

