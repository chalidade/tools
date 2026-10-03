import { useState } from 'react'
import { Check, Loader2, Lock, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { PasswordInput } from '@/components/tool/PasswordInput'
import { downloadBlob } from '@/lib/download'
import { encryptionInfo, runQpdf } from '@/lib/qpdf'
import { cn } from '@/lib/utils'

type Status =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ready'; bytes: Uint8Array }
  | { kind: 'error'; message: string }

const PERMISSIONS = [
  { key: 'print', label: 'Boleh dicetak' },
  { key: 'copy', label: 'Boleh salin teks' },
  { key: 'modify', label: 'Boleh diubah' },
] as const
type Permission = (typeof PERMISSIONS)[number]['key']

/**
 * The owner password guards the permission flags. The visitor only sets the
 * open password; a random owner password keeps the restrictions from being
 * lifted with the open password alone in readers that honour them.
 */
function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 32)
}

export default function ProtectPdf() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [allowed, setAllowed] = useState<Record<Permission, boolean>>({ print: true, copy: true, modify: false })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open(next: File) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: 'Pilih file berformat .pdf.' })
      return
    }
    setFile(next)
    setDone(false)
    setError(null)
    setStatus({ kind: 'checking' })
    const bytes = new Uint8Array(await next.arrayBuffer())
    const info = await encryptionInfo(bytes)
    if (info.encrypted) {
      setStatus({
        kind: 'error',
        message: 'PDF ini sudah terproteksi. Buka proteksinya dulu dengan tool “Buka Proteksi PDF”, lalu proteksi ulang di sini.',
      })
      return
    }
    setStatus({ kind: 'ready', bytes })
  }

  const tooShort = password.length > 0 && password.length < 4
  const mismatch = confirm.length > 0 && confirm !== password
  const canSave = password.length >= 4 && confirm === password && !saving

  async function protect(bytes: Uint8Array) {
    if (!file || !canSave) return
    setSaving(true)
    setError(null)
    try {
      const { code, output } = await runQpdf(bytes, (i, o) => [
        i,
        '--encrypt',
        `--user-password=${password}`,
        `--owner-password=${randomPassword()}`,
        '--bits=256', // AES-256, the strongest PDF encryption
        `--print=${allowed.print ? 'full' : 'none'}`,
        `--extract=${allowed.copy ? 'y' : 'n'}`,
        `--modify=${allowed.modify ? 'all' : 'none'}`,
        '--',
        o,
      ])
      if (code === 2 || !output) throw new Error('qpdf')
      downloadBlob(new Blob([output as BlobPart], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-terproteksi.pdf')
      setDone(true)
    } catch {
      setError('Gagal memproteksi PDF. File mungkin rusak.')
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setStatus({ kind: 'idle' })
    setPassword('')
    setConfirm('')
    setDone(false)
    setError(null)
  }

  if (status.kind === 'ready' && file) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {done ? 'Selesai — PDF terproteksi sudah diunduh.' : 'Atur password untuk membuka PDF ini.'}
            </p>
          </div>
          <Button variant="ghost" disabled={saving} onClick={reset}>
            <RotateCcw />
            File lain
          </Button>
        </div>

        <div className="grid gap-6 rounded-2xl border bg-card p-5 md:grid-cols-2">
          <div className="space-y-4">
            <PasswordInput
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Minimal 4 karakter"
              autoFocus
              invalid={tooShort}
              autoComplete="new-password"
            />
            <PasswordInput
              label="Ulangi password"
              value={confirm}
              onChange={setConfirm}
              invalid={mismatch}
              autoComplete="new-password"
              onEnter={() => void protect(status.bytes)}
            />
            {(tooShort || mismatch) && (
              <p className="text-xs text-destructive">
                {tooShort ? 'Password minimal 4 karakter.' : 'Kedua password belum sama.'}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Setelah dibuka, pembaca PDF…</p>
            <div className="flex flex-col gap-2">
              {PERMISSIONS.map((p) => {
                const on = allowed[p.key]
                return (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAllowed((a) => ({ ...a, [p.key]: !a[p.key] }))}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                      on ? 'border-brand-2/40 bg-brand-2/10' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-4 place-items-center rounded border',
                        on ? 'border-transparent bg-gradient-brand text-white' : 'bg-background',
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    {p.label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Batasan ini dihormati Adobe Reader, browser, dan kebanyakan aplikasi PDF, tapi tidak semua.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => void protect(status.bytes)} disabled={!canSave}>
            {saving ? <Loader2 className="animate-spin" /> : <Lock />}
            Proteksi &amp; unduh
          </Button>
          <p className="text-xs text-muted-foreground">
            Enkripsi AES-256. Simpan password-nya baik-baik — tanpa password, isi PDF tidak bisa dipulihkan.
          </p>
        </div>

        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".pdf,application/pdf"
        label="Tarik file .pdf ke sini"
        busyLabel={status.kind === 'checking' ? `Memeriksa ${file?.name}…` : undefined}
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
