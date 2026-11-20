import { useMemo, useState } from 'react'
import { ArrowDownUp, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { TextFileButton } from '@/components/tool/TextFileButton'
import { detectSeparator, type CsvSeparator } from '@/lib/csv'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { csvToJson, jsonToCsv } from './convert'

const area =
  'w-full resize-y rounded-xl border bg-background p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
const PREVIEW_ROWS = 50

type Sep = 'auto' | CsvSeparator

export default function CsvJson() {
  const t = useT()
  const [toJson, setToJson] = useState(true)
  const [input, setInput] = useState('')
  const [sep, setSep] = useState<Sep>('auto')
  const [outSep, setOutSep] = useState<CsvSeparator>(',')
  const [header, setHeader] = useState(true)
  const [types, setTypes] = useState(true)
  const [indent, setIndent] = useState(2)
  const [name, setName] = useState('data')

  const used = sep === 'auto' ? detectSeparator(input) : sep
  const result = useMemo(() => {
    if (!input.trim()) return null
    try {
      if (toJson) {
        const { rows, json } = csvToJson(input, { sep: used, header, types }, indent)
        return { rows, out: json, error: '' }
      }
      const { rows, csv } = jsonToCsv(input, outSep)
      return { rows, out: csv, error: '' }
    } catch (e) {
      return { rows: [], out: '', error: e instanceof Error ? e.message : String(e) }
    }
  }, [input, toJson, used, header, types, indent, outSep])

  const sepName = (s: CsvSeparator) => (s === ',' ? t('koma', 'comma') : s === ';' ? t('titik koma', 'semicolon') : 'tab')
  const sepOptions = [
    { value: ',' as const, label: t('Koma ,', 'Comma ,') },
    { value: ';' as const, label: t('Titik koma ;', 'Semicolon ;') },
    { value: '\t' as const, label: 'Tab' },
  ]

  function download() {
    if (!result?.out) return
    const blob = toJson
      ? new Blob([result.out], { type: 'application/json' })
      : new Blob(['﻿' + result.out], { type: 'text/csv;charset=utf-8' }) // BOM so Excel reads UTF-8
    downloadBlob(blob, `${name}.${toJson ? 'json' : 'csv'}`)
  }

  const rows = result?.rows ?? []
  const cols = rows.reduce((n, r) => Math.max(n, r.length), 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('Arah', 'Direction')}
          value={toJson ? 'json' : 'csv'}
          onChange={(v) => setToJson(v === 'json')}
          options={[
            { value: 'json', label: 'CSV → JSON' },
            { value: 'csv', label: 'JSON → CSV' },
          ]}
        />
        {toJson ? (
          <Segmented<Sep>
            label={t('Pemisah', 'Separator')}
            value={sep}
            onChange={setSep}
            options={[{ value: 'auto', label: t('Otomatis', 'Auto') }, ...sepOptions]}
          />
        ) : (
          <Segmented<CsvSeparator> label={t('Pemisah hasil', 'Output separator')} value={outSep} onChange={setOutSep} options={sepOptions} />
        )}
        {toJson && (
          <Segmented
            label={t('Indentasi', 'Indent')}
            value={indent}
            onChange={setIndent}
            options={[
              { value: 2, label: '2' },
              { value: 4, label: '4' },
              { value: 0, label: t('Satu baris', 'One line') },
            ]}
          />
        )}
      </div>
      {toJson && (
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} />
            {t('Baris pertama jadi nama kolom', 'First row is the header')}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={types} onChange={(e) => setTypes(e.target.checked)} />
            {t('Angka dan true/false jadi tipe aslinya', 'Numbers and true/false keep their type')}
          </label>
        </div>
      )}

      <div className="space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          spellCheck={false}
          aria-label={t('Masukan', 'Input')}
          placeholder={toJson ? 'nama,kota,umur\nAni,Bandung,27' : '[{"nama": "Ani", "kota": "Bandung"}]'}
          className={area}
        />
        <div className="flex flex-wrap items-center gap-2">
          <TextFileButton
            accept={toJson ? '.csv,.tsv,.txt,text/csv' : '.json,application/json'}
            onText={(text, file) => {
              setInput(text)
              setName(file.replace(/\.[^.]+$/, '') || 'data')
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!result?.out}
            onClick={() => {
              setInput(result!.out)
              setToJson(!toJson)
            }}
          >
            <ArrowDownUp />
            {t('Pakai hasil sebagai masukan', 'Use result as input')}
          </Button>
          {toJson && input.trim() && sep === 'auto' && (
            <span className="text-xs text-muted-foreground">
              {t('Pemisah terdeteksi: ', 'Detected separator: ')}
              {sepName(used)}
            </span>
          )}
        </div>
      </div>

      {result?.error && <ErrorNote message={result.error} />}

      {rows.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {t('Pratinjau', 'Preview')} · {rows.length.toLocaleString()} {t('baris', 'rows')} · {cols} {t('kolom', 'columns')}
          </p>
          <div className="max-h-72 overflow-auto rounded-xl border">
            <table className="w-full text-left text-xs">
              <tbody>
                {rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                  <tr key={i} className={i === 0 && (header || !toJson) ? 'bg-muted/60 font-medium' : 'border-t'}>
                    {Array.from({ length: cols }, (_, c) => (
                      <td key={c} className="max-w-48 truncate px-2 py-1.5 whitespace-nowrap">
                        {r[c] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > PREVIEW_ROWS && (
            <p className="text-xs text-muted-foreground">
              {t(`Menampilkan ${PREVIEW_ROWS} baris pertama.`, `Showing the first ${PREVIEW_ROWS} rows.`)}
            </p>
          )}
        </div>
      )}

      {result?.out && (
        <div className="space-y-2">
          <textarea readOnly value={result.out} rows={8} aria-label={t('Hasil', 'Result')} className={area} />
          <div className="flex gap-2">
            <CopyButton text={result.out} variant="outline" />
            <Button size="sm" onClick={download}>
              <Download />
              {t('Unduh', 'Download')} .{toJson ? 'json' : 'csv'}
            </Button>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {t(
          'Ekspor Excel berbahasa Indonesia memakai titik koma; itu dikenali otomatis. File CSV hasil unduhan diberi penanda UTF-8 supaya huruf seperti é terbaca benar di Excel.',
          'Excel exports in decimal-comma locales use semicolons; that is detected automatically. Downloaded CSV files carry a UTF-8 marker so Excel reads letters like é correctly.',
        )}
      </p>
    </div>
  )
}
