import { useRef, useState } from 'react'
import { Download, FileArchive, FolderOpen, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { formatBytes } from '@/lib/image'
import { createZip, filePath, readZip, safePath, type ZipEntry } from './zip'

type Mode = 'create' | 'open'
type Level = 'store' | 'normal' | 'max'

export default function Zip() {
  const t = useT()
  const [mode, setMode] = useState<Mode>('create')
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="space-y-6">
      <Segmented
        label={t('Mau apa?', 'What do you want?')}
        value={mode}
        options={[
          { value: 'create', label: t('Buat ZIP', 'Make a ZIP') },
          { value: 'open', label: t('Buka ZIP', 'Open a ZIP') },
        ]}
        onChange={(m) => { setMode(m); setError(null) }}
      />
      {mode === 'create' ? <Create setError={setError} /> : <Open setError={setError} />}
      {error && <ErrorNote message={error} />}
    </div>
  )
}

function Create({ setError }: { setError: (m: string | null) => void }) {
  const t = useT()
  const [files, setFiles] = useState<File[]>([])
  const [level, setLevel] = useState<Level>('normal')
  const [name, setName] = useState('arsip')
  const [pct, setPct] = useState<number | null>(null)
  const folderInput = useRef<HTMLInputElement>(null)

  const add = (list: File[]) => { setError(null); setFiles((cur) => [...cur, ...list]) }
  const total = files.reduce((n, f) => n + f.size, 0)

  async function save() {
    setError(null)
    setPct(0)
    try {
      const blob = await createZip(files, level, setPct)
      downloadBlob(blob, (safePath(name) || 'arsip').replace(/\.zip$/i, '') + '.zip')
    } catch {
      setError(t('Gagal membuat ZIP. Mungkin file terlalu besar untuk memori browser.', 'Could not make the ZIP. The files may be too large for the browser’s memory.'))
    } finally {
      setPct(null)
    }
  }

  if (files.length === 0) {
    return (
      <div className="space-y-3">
        <FileDrop accept="*/*" multiple label={t('Tarik file apa pun ke sini', 'Drop any files here')} onFiles={add} />
        <Button variant="outline" onClick={() => folderInput.current?.click()}>
          <FolderOpen />
          {t('Pilih satu folder', 'Pick a folder')}
        </Button>
        <FolderPicker input={folderInput} onFiles={add} />
      </div>
    )
  }
  const busy = pct !== null
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {busy
            ? t(`Memampatkan… ${Math.round(pct)}%`, `Compressing… ${Math.round(pct)}%`)
            : t(`${files.length} file, ${formatBytes(total)}.`, `${files.length} files, ${formatBytes(total)}.`)}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <FileArchive />}
            {t('Buat & unduh ZIP', 'Make & download ZIP')}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setFiles([])}>
            <RotateCcw />
            {t('Ulangi', 'Start over')}
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">{t('Nama file ZIP', 'ZIP file name')}</span>
            <input className="w-full rounded-lg border bg-background px-3 py-2" value={name} disabled={busy} onChange={(e) => setName(e.target.value)} />
          </label>
          <Segmented
            label={t('Pemampatan', 'Compression')}
            value={level}
            options={[
              { value: 'store', label: t('Tanpa', 'None') },
              { value: 'normal', label: t('Biasa', 'Normal') },
              { value: 'max', label: t('Maksimal', 'Maximum') },
            ]}
            disabled={busy}
            onChange={setLevel}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.onchange = () => add([...(i.files ?? [])]); i.click() }}>
              <Plus />
              {t('Tambah file', 'Add files')}
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => folderInput.current?.click()}>
              <FolderOpen />
              {t('Tambah folder', 'Add folder')}
            </Button>
          </div>
          <FolderPicker input={folderInput} onFiles={add} />
        </div>
        <ul className="max-h-96 divide-y overflow-auto rounded-2xl border bg-card text-sm">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0 truncate font-mono text-xs">{filePath(f)}</span>
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                {formatBytes(f.size)}
                <Button size="icon" variant="ghost" disabled={busy} aria-label={t('Hapus', 'Remove')} onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function FolderPicker({ input, onFiles }: { input: React.RefObject<HTMLInputElement | null>; onFiles: (f: File[]) => void }) {
  return (
    <input
      ref={input}
      type="file"
      className="hidden"
      // @ts-expect-error webkitdirectory is not in React's input typings
      webkitdirectory=""
      onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = '' }}
    />
  )
}

function Open({ setError }: { setError: (m: string | null) => void }) {
  const t = useT()
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<Awaited<ReturnType<typeof readZip>> | null>(null)
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState<string | null>(null)

  async function open(list: File[]) {
    const f = list[0]
    if (!f) return
    setError(null)
    setLoading(true)
    try {
      setState(await readZip(f))
      setFile(f)
    } catch {
      setError(t('File ini bukan ZIP yang valid, atau rusak.', 'This is not a valid ZIP, or it is damaged.'))
    } finally {
      setLoading(false)
    }
  }

  async function take(e: ZipEntry) {
    if (!state) return
    setWorking(e.path)
    try {
      const raw = Object.values(state.zip.files).find((z) => safePath(z.name) === e.path)
      if (raw) downloadBlob(await raw.async('blob'), e.path.split('/').pop() ?? e.path)
    } catch {
      setError(t('Gagal membuka file ini (mungkin berkata sandi).', 'Could not open this file (it may be password-protected).'))
    } finally {
      setWorking(null)
    }
  }

  if (!file || !state) {
    return <FileDrop accept=".zip,application/zip" label={t('Tarik file .zip ke sini', 'Drop a .zip file here')} busyLabel={loading ? t('Membaca ZIP…', 'Reading ZIP…') : undefined} onFiles={(f) => void open(f)} />
  }
  const files = state.entries.filter((e) => !e.dir)
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">{t(`${files.length} file.`, `${files.length} files.`)}</p>
        </div>
        <Button variant="ghost" onClick={() => { setFile(null); setState(null) }}>
          <RotateCcw />
          {t('ZIP lain', 'Another ZIP')}
        </Button>
      </div>
      <ul className="max-h-[28rem] divide-y overflow-auto rounded-2xl border bg-card text-sm">
        {files.map((e) => (
          <li key={e.path} className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="min-w-0 truncate font-mono text-xs">{e.path}</span>
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              {formatBytes(e.size)}
              <Button size="icon" variant="ghost" disabled={working === e.path} aria-label={t('Ambil file ini', 'Get this file')} onClick={() => void take(e)}>
                {working === e.path ? <Loader2 className="animate-spin" /> : <Download />}
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
