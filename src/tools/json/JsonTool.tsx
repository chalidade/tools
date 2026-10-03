import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { AlertCircle, Check, CheckCircle2, Copy, Download, Eraser, FileUp, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { cn } from '@/lib/utils'
import { formatJson, JsonSyntaxError, minifyJson, parseJson, stats, type Indent } from './json'

export type JsonMode = 'beautify' | 'minify'

const INDENT_OPTIONS: { value: Indent; label: string }[] = [
  { value: 2, label: '2 spasi' },
  { value: 4, label: '4 spasi' },
  { value: 'tab', label: 'Tab' },
]
const SORT_OPTIONS: { value: 'off' | 'on'; label: string }[] = [
  { value: 'off', label: 'Asli' },
  { value: 'on', label: 'A–Z' },
]

const SAMPLE = `{"order":{"id":12345678901234567890,"customer":{"name":"Budi Santoso","email":"budi@example.com"},"items":[{"sku":"LP-14","qty":1,"price":15500000.00},{"sku":"MS-01","qty":2,"price":250000}],"paid":true,"note":null}}`

const bytes = (text: string) => new TextEncoder().encode(text).length
function formatSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

export function JsonTool({ mode }: { mode: JsonMode }) {
  const [input, setInput] = useState('')
  const [indent, setIndent] = useState<Indent>(2)
  const [sortKeys, setSortKeys] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Large pastes stay responsive: React renders the old result while the new one computes.
  const source = useDeferredValue(input)
  const result = useMemo(() => {
    if (!source.trim()) return null
    try {
      const ast = parseJson(source)
      const output = mode === 'beautify' ? formatJson(ast, { indent, sortKeys }) : minifyJson(ast)
      return { ok: true as const, output, ...stats(ast) }
    } catch (e) {
      if (e instanceof JsonSyntaxError) return { ok: false as const, error: e }
      throw e
    }
  }, [source, mode, indent, sortKeys])

  async function openFile(file: File) {
    setInput(await file.text())
  }

  function jumpTo(offset: number) {
    const el = inputRef.current
    if (!el) return
    // Error offsets count from after a byte-order mark; the text area still has it.
    if (el.value.charCodeAt(0) === 0xfeff) offset++
    el.focus()
    el.setSelectionRange(offset, Math.min(offset + 1, el.value.length))
    // Scroll the caret's line into view: approximate by line height.
    const line = el.value.slice(0, offset).split('\n').length - 1
    el.scrollTop = Math.max(0, line * 20 - el.clientHeight / 2)
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked: the output stays selectable.
    }
  }

  const output = result?.ok ? result.output : ''
  const fileName = mode === 'beautify' ? 'data.json' : 'data.min.json'
  const before = bytes(input)
  const after = output ? bytes(output) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border bg-card p-4">
        {mode === 'beautify' ? (
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <Segmented label="Indentasi" value={indent} options={INDENT_OPTIONS} onChange={setIndent} />
            <Segmented
              label="Urutan key"
              value={sortKeys ? 'on' : 'off'}
              options={SORT_OPTIONS}
              onChange={(v) => setSortKeys(v === 'on')}
            />
          </div>
        ) : (
          <p className="max-w-md text-sm text-muted-foreground">
            Semua spasi dan baris baru di luar teks dihapus. Isi data tidak berubah sedikit pun.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <FileUp />
            Buka file
          </Button>
          <Button variant="outline" size="sm" onClick={() => setInput(SAMPLE)}>
            <Sparkles />
            Contoh
          </Button>
          <Button variant="ghost" size="sm" disabled={!input} onClick={() => setInput('')}>
            <Eraser />
            Bersihkan
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json,text/plain"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void openFile(f)
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col overflow-hidden rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
            <span>JSON masukan</span>
            {input && <span className="font-mono">{formatSize(before)}</span>}
          </div>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const f = e.dataTransfer.files[0]
              if (f) void openFile(f)
            }}
            spellCheck={false}
            placeholder="Tempel JSON di sini, atau tarik file .json ke kotak ini…"
            className={cn(
              'h-[28rem] w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-5 outline-none',
              dragging && 'bg-brand-2/5',
            )}
          />
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border bg-card">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-1.5 text-xs text-muted-foreground">
            <span>Hasil</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled={!output} onClick={() => void copy(output)}>
                {copied ? <Check /> : <Copy />}
                {copied ? 'Tersalin' : 'Salin'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!output}
                onClick={() => downloadBlob(new Blob([output], { type: 'application/json' }), fileName)}
              >
                <Download />
                Unduh
              </Button>
            </div>
          </div>
          {result && !result.ok ? (
            <ErrorPanel error={result.error} source={source} onJump={jumpTo} />
          ) : (
            <textarea
              readOnly
              value={output}
              spellCheck={false}
              placeholder="Hasil muncul di sini secara otomatis."
              className={cn(
                'h-[28rem] w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-5 outline-none',
                mode === 'minify' && 'break-all',
              )}
            />
          )}
        </div>
      </div>

      {result?.ok && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            JSON valid
          </span>
          <span>{result.keys} key</span>
          <span>kedalaman {result.depth}</span>
          <span className="font-mono">
            {formatSize(before)} → {formatSize(after)}
            {mode === 'minify' && before > 0 && ` (−${Math.max(0, Math.round((1 - after / before) * 100))}%)`}
          </span>
          <span>Angka disalin persis — tidak ada pembulatan.</span>
        </p>
      )}
    </div>
  )
}

function ErrorPanel({
  error,
  source,
  onJump,
}: {
  error: JsonSyntaxError
  source: string
  onJump: (offset: number) => void
}) {
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source
  const lineText = text.split('\n')[error.line - 1] ?? ''
  // Show at most ~80 characters around the problem.
  const from = Math.max(0, error.column - 40)
  const snippet = lineText.slice(from, from + 80)
  return (
    <div className="h-[28rem] space-y-4 overflow-auto p-4">
      <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="space-y-1">
          <p className="font-medium">{error.message}</p>
          <p className="text-muted-foreground">
            Baris {error.line}, kolom {error.column}
          </p>
        </div>
      </div>
      <pre className="overflow-x-auto rounded-xl border bg-muted/60 p-3 font-mono text-[13px] leading-5">
        <span className="text-muted-foreground">{String(error.line).padStart(4)} │ </span>
        {snippet}
        {'\n'}
        <span className="text-muted-foreground">{' '.repeat(4)} │ </span>
        {' '.repeat(Math.max(0, error.column - 1 - from))}
        <span className="font-bold text-destructive">^</span>
      </pre>
      <Button variant="outline" size="sm" onClick={() => onJump(error.offset)}>
        Lompat ke posisi kesalahan
      </Button>
    </div>
  )
}
