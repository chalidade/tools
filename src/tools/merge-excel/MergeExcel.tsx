import { useMemo, useState } from 'react'
import { Download, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { locale, tr, useT } from '@/lib/i18n'
import { buildCsv, buildWorkbook, buildZip, readFile, type LoadedFile, type OutSheet } from './io'
import { mergeTables, splitByColumn, type Table } from './table'

type Mode = 'merge' | 'split'
type MergeOut = 'one' | 'sheets'
type SplitOut = 'sheets' | 'xlsx' | 'csv'

let nextId = 1
const ACCEPT = '.xlsx,.csv,.tsv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export default function MergeExcel() {
  const t = useT()
  const [mode, setMode] = useState<Mode>('merge')
  const [files, setFiles] = useState<LoadedFile[]>([])
  const [off, setOff] = useState<Set<string>>(new Set()) // "fileId:index" of sheets left out
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [byTitle, setByTitle] = useState(true)
  const [source, setSource] = useState(true)
  const [mergeOut, setMergeOut] = useState<MergeOut>('one')

  const [pick, setPick] = useState('') // "fileId:index" of the sheet to split
  const [column, setColumn] = useState(0)
  const [splitOut, setSplitOut] = useState<SplitOut>('sheets')

  const all = useMemo(() => files.flatMap((f) => f.tables.map((tb, i) => ({ key: `${f.id}:${i}`, file: f, table: tb }))), [files])
  const chosen = all.filter((s) => !off.has(s.key))

  async function add(list: File[]) {
    setError('')
    setBusy(true)
    const next: LoadedFile[] = []
    const bad: string[] = []
    for (const f of list) {
      try {
        next.push({ id: nextId++, name: f.name, tables: await readFile(f) })
      } catch {
        bad.push(f.name)
      }
    }
    setFiles((cur) => (mode === 'split' ? next.slice(0, 1) : [...cur, ...next]))
    if (mode === 'split' && next[0]) setPick(`${next[0].id}:0`)
    if (bad.length)
      setError(
        t(
          `Tidak bisa dibaca: ${bad.join(', ')}. Pakai .xlsx atau .csv yang tidak rusak dan tidak dikunci password.`,
          `Couldn't read: ${bad.join(', ')}. Use an .xlsx or .csv that isn't damaged or password-protected.`,
        ),
      )
    setBusy(false)
  }

  function remove(id: number) {
    setFiles((cur) => cur.filter((f) => f.id !== id))
  }

  function toggle(key: string) {
    setOff((cur) => {
      const n = new Set(cur)
      if (!n.delete(key)) n.add(key)
      return n
    })
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    if (m === 'split') {
      const keep = files[0]
      setFiles(keep ? [keep] : [])
      setPick(keep ? `${keep.id}:0` : '')
      setColumn(0)
    }
  }

  const merged = useMemo(
    () =>
      mode === 'merge' && chosen.length
        ? mergeTables(
            chosen.map((s) => s.table),
            { byTitle, sourceColumn: source ? tr('Sumber', 'Source') : undefined },
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, files, off, byTitle, source],
  )

  const target: { table: Table } | undefined = all.find((s) => s.key === pick)
  const groups = useMemo(
    () => (mode === 'split' && target ? splitByColumn(target.table, column, tr('(kosong)', '(empty)')) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, target?.table, column],
  )

  const fmt = (n: number) => n.toLocaleString(locale())

  async function download() {
    setBusy(true)
    setError('')
    try {
      if (mode === 'merge' && merged) {
        if (mergeOut === 'one') {
          downloadBlob(await buildWorkbook([{ name: tr('Gabungan', 'Merged'), headers: merged.headers, rows: merged.rows }]), tr('gabungan.xlsx', 'merged.xlsx'))
        } else {
          const sheets: OutSheet[] = chosen.map((s) => ({ name: s.table.name, headers: s.table.headers, rows: s.table.rows }))
          downloadBlob(await buildWorkbook(sheets), tr('gabungan.xlsx', 'merged.xlsx'))
        }
      } else if (mode === 'split' && target) {
        const sheets: OutSheet[] = groups.map((g) => ({ name: g.value, headers: target.table.headers, rows: g.rows }))
        const base = target.table.name
        if (splitOut === 'sheets') downloadBlob(await buildWorkbook(sheets), `${base}-${tr('terpisah', 'split')}.xlsx`)
        else if (splitOut === 'csv' && sheets.length === 1) downloadBlob(buildCsv(sheets[0]), `${base}.csv`)
        else downloadBlob(await buildZip(sheets, splitOut === 'csv' ? 'csv' : 'xlsx'), `${base}-${tr('terpisah', 'split')}.zip`)
      }
    } catch {
      setError(t('Gagal membuat file. Coba file yang lebih kecil.', "Couldn't create the file. Try a smaller one."))
    }
    setBusy(false)
  }

  const canDownload = mode === 'merge' ? !!merged && merged.rows.length > 0 : groups.length > 0

  return (
    <div className="space-y-6">
      <Segmented
        label={t('Mau apa?', 'What do you need?')}
        value={mode}
        onChange={switchMode}
        options={[
          { value: 'merge', label: t('Gabung', 'Merge') },
          { value: 'split', label: t('Pisah per kolom', 'Split by column') },
        ]}
      />

      {(mode === 'merge' || files.length === 0) && (
        <FileDrop
          accept={ACCEPT}
          multiple={mode === 'merge'}
          label={mode === 'merge' ? t('Tarik file Excel/CSV ke sini (boleh banyak)', 'Drag Excel/CSV files here (several are fine)') : t('Tarik satu file Excel/CSV ke sini', 'Drag one Excel/CSV file here')}
          busyLabel={busy ? t('Membaca file…', 'Reading files…') : undefined}
          onFiles={(l) => void add(l)}
        />
      )}

      {error && <ErrorNote message={error} />}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className="rounded-xl border bg-card p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate font-medium">{f.name}</p>
                <button type="button" onClick={() => remove(f.id)} aria-label={t('Hapus', 'Remove')} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              </div>
              <ul className="mt-2 space-y-1">
                {f.tables.map((tb, i) => {
                  const key = `${f.id}:${i}`
                  return (
                    <li key={key} className="flex items-center gap-2 text-muted-foreground">
                      {mode === 'merge' ? (
                        <input type="checkbox" checked={!off.has(key)} onChange={() => toggle(key)} aria-label={tb.name} className="size-4 accent-primary" />
                      ) : (
                        <input type="radio" name="sheet" checked={pick === key} onChange={() => { setPick(key); setColumn(0) }} aria-label={tb.name} className="size-4 accent-primary" />
                      )}
                      <span className="min-w-0 truncate">{tb.name}</span>
                      <span className="ml-auto shrink-0 text-xs">
                        {t(`${fmt(tb.rows.length)} baris · ${tb.headers.length} kolom`, `${fmt(tb.rows.length)} rows · ${tb.headers.length} columns`)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {mode === 'merge' && files.length > 0 && (
        <div className="space-y-4 rounded-2xl border bg-card p-4">
          <Segmented
            label={t('Cocokkan kolom', 'Match columns')}
            value={byTitle ? 'title' : 'pos'}
            onChange={(v) => setByTitle(v === 'title')}
            options={[
              { value: 'title', label: t('Dari judul kolom', 'By column title') },
              { value: 'pos', label: t('Dari urutan', 'By position') },
            ]}
          />
          <Segmented
            label={t('Hasil', 'Output')}
            value={mergeOut}
            onChange={setMergeOut}
            options={[
              { value: 'one', label: t('Satu sheet', 'One sheet') },
              { value: 'sheets', label: t('Satu sheet per sumber', 'One sheet per source') },
            ]}
          />
          {mergeOut === 'one' && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={source} onChange={(e) => setSource(e.target.checked)} className="size-4 accent-primary" />
              {t('Tambah kolom “Sumber” (nama file/sheet asal)', 'Add a “Source” column (file/sheet each row came from)')}
            </label>
          )}
          {merged && mergeOut === 'one' && (
            <p className="text-sm text-muted-foreground">
              {t(`Hasil: ${fmt(merged.rows.length)} baris, ${merged.headers.length} kolom.`, `Result: ${fmt(merged.rows.length)} rows, ${merged.headers.length} columns.`)}
              {byTitle && ' ' + t('Kolom dengan judul yang sama disatukan, sisanya dibiarkan kosong di file lain.', 'Columns with the same title are joined; the rest stay empty for files that lack them.')}
            </p>
          )}
          {merged && mergeOut === 'one' && (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60">
                  <tr>{merged.headers.map((h, i) => <th key={i} className="whitespace-nowrap px-2 py-1.5 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {merged.rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t">
                      {r.map((v, j) => <td key={j} className="whitespace-nowrap px-2 py-1">{v instanceof Date ? v.toISOString().slice(0, 10) : v === null ? '' : String(v)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {mode === 'split' && target && (
        <div className="space-y-4 rounded-2xl border bg-card p-4">
          <label className="block space-y-2 text-sm">
            <span className="text-xs font-medium text-muted-foreground">{t('Pecah berdasarkan kolom', 'Split by column')}</span>
            <select value={column} onChange={(e) => setColumn(Number(e.target.value))} className="block w-full rounded-lg border bg-background px-3 py-2">
              {target.table.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
            </select>
          </label>
          <Segmented
            label={t('Hasil', 'Output')}
            value={splitOut}
            onChange={setSplitOut}
            options={[
              { value: 'sheets', label: t('Satu file, sheet per nilai', 'One file, a sheet per value') },
              { value: 'xlsx', label: t('ZIP .xlsx per nilai', 'ZIP of .xlsx files') },
              { value: 'csv', label: t('ZIP .csv per nilai', 'ZIP of .csv files') },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            {t(`${groups.length} nilai berbeda:`, `${groups.length} distinct values:`)}{' '}
            {groups.slice(0, 8).map((g) => `${g.value} (${fmt(g.rows.length)})`).join(', ')}
            {groups.length > 8 && '…'}
          </p>
          {splitOut === 'sheets' && groups.length > 100 && (
            <p className="text-sm text-destructive">{t('Banyak sekali nilai berbeda; pertimbangkan ZIP supaya file tetap ringan.', 'That is a lot of distinct values; consider a ZIP to keep things light.')}</p>
          )}
        </div>
      )}

      {files.length > 0 && (
        <Button onClick={() => void download()} disabled={busy || !canDownload}>
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
          {t('Unduh hasil', 'Download result')}
        </Button>
      )}
    </div>
  )
}
