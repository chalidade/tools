import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { ALGORITHMS, hashText, type Algorithm } from './algorithms'

type Digests = Record<Algorithm, string>

const area =
  'w-full resize-y rounded-xl border bg-background p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

const size = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : n < 1024 ** 3 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${(n / 1024 ** 3).toFixed(2)} GB`

export default function Hash() {
  const t = useT()
  const [source, setSource] = useState<'text' | 'file'>('text')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [digests, setDigests] = useState<Digests | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [expected, setExpected] = useState('')
  const [upper, setUpper] = useState(false)
  const worker = useRef<Worker | null>(null)

  useEffect(() => () => worker.current?.terminate(), [])

  // Text hashes update as you type.
  useEffect(() => {
    if (source !== 'text') return
    let live = true
    void hashText(text).then((d) => live && setDigests(d))
    return () => {
      live = false
    }
  }, [text, source])

  function hashFile(f: File) {
    worker.current?.terminate()
    setFile(f)
    setDigests(null)
    setError('')
    setProgress(0)
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    w.onmessage = (e: MessageEvent<{ progress?: number; digests?: Digests; error?: string }>) => {
      if (e.data.progress !== undefined) setProgress(e.data.progress)
      if (e.data.digests) {
        setDigests(e.data.digests)
        setProgress(null)
        w.terminate()
      }
      if (e.data.error) {
        setError(e.data.error)
        setProgress(null)
        w.terminate()
      }
    }
    w.postMessage(f)
  }

  function cancel() {
    worker.current?.terminate()
    setProgress(null)
    setFile(null)
  }

  const want = expected.trim().toLowerCase().replace(/^[a-z0-9-]+[:=]\s*/, '').split(/\s+/)[0] ?? ''
  const matched = want && digests ? ALGORITHMS.find((a) => digests[a] === want) : undefined
  const show = (v: string) => (upper ? v.toUpperCase() : v)

  return (
    <div className="space-y-5">
      <Segmented
        label={t('Sumber', 'Source')}
        value={source}
        onChange={(v) => {
          setSource(v)
          setDigests(null)
          if (v === 'file') setFile(null)
        }}
        options={[
          { value: 'text', label: t('Teks', 'Text') },
          { value: 'file', label: 'File' },
        ]}
      />

      {source === 'text' ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          spellCheck={false}
          aria-label={t('Teks', 'Text')}
          placeholder={t('Ketik atau tempel teks…', 'Type or paste text…')}
          className={area}
        />
      ) : (
        <div className="space-y-3">
          <FileDrop
            accept="*/*"
            label={t('Tarik file apa saja ke sini', 'Drop any file here')}
            busyLabel={progress !== null ? t(`Menghitung… ${Math.round(progress * 100)}%`, `Hashing… ${Math.round(progress * 100)}%`) : undefined}
            onFiles={([f]) => hashFile(f)}
          />
          {file && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="truncate font-medium">{file.name}</span>
              <span className="text-muted-foreground">{size(file.size)}</span>
              {progress !== null && (
                <Button variant="outline" size="sm" onClick={cancel}>
                  {t('Batal', 'Cancel')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {error && <ErrorNote message={error} />}

      {digests && (source === 'text' || file) && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} />
            {t('HURUF BESAR', 'UPPERCASE')}
          </label>
          <ul className="divide-y rounded-xl border">
            {ALGORITHMS.map((a) => (
              <li
                key={a}
                className={cn('flex items-center gap-3 px-3 py-2', matched === a && 'bg-[color-mix(in_oklab,var(--brand-2)_12%,transparent)]')}
              >
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{a}</span>
                <code className="min-w-0 flex-1 text-xs break-all">{show(digests[a])}</code>
                <CopyButton text={show(digests[a])} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <label className="block space-y-2 text-xs font-medium text-muted-foreground">
          <span className="block">{t('Cocokkan dengan checksum (tempel di sini)', 'Compare with a checksum (paste here)')}</span>
          <input
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            spellCheck={false}
            placeholder="e3b0c44298fc1c149afbf4c8996fb924…"
            className="w-full rounded-xl border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {want && digests && (
          <p className={cn('flex items-center gap-2 text-sm', matched ? 'text-brand-2' : 'text-destructive')}>
            {matched ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            {matched
              ? t(`Cocok dengan ${matched}. File utuh.`, `Matches ${matched}. The file is intact.`)
              : t('Tidak cocok dengan hash mana pun di atas.', 'Does not match any hash above.')}
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {t(
          'MD5 dan SHA-1 sudah tidak aman untuk keamanan (tanda tangan, password); pakai hanya untuk cek keutuhan file. File dihitung bertahap di perangkatmu, jadi file berukuran GB pun tidak dimuat sekaligus ke memori.',
          'MD5 and SHA-1 are no longer safe for security (signatures, passwords); use them only to check a file is intact. Files are hashed in pieces on your device, so even multi-GB files are never loaded into memory at once.',
        )}
      </p>
    </div>
  )
}
