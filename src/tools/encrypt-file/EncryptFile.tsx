import { useState } from 'react'
import { Download, Lock, LockOpen, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { PasswordInput } from '@/components/tool/PasswordInput'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { BadPasswordError, NotEncryptedError, decryptBytes, encryptBytes, hasMagic } from './crypto'

type Mode = 'encrypt' | 'decrypt'

const fmt = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export default function EncryptFile() {
  const t = useT()
  const [mode, setMode] = useState<Mode>('encrypt')
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ blob: Blob; name: string; size: number } | null>(null)

  const mismatch = mode === 'encrypt' && confirm !== '' && confirm !== password
  const ready = !!file && password !== '' && (mode === 'decrypt' || confirm === password)

  function reset() {
    setFile(null)
    setPassword('')
    setConfirm('')
    setResult(null)
    setError(null)
  }

  async function run() {
    if (!file) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (mode === 'encrypt') {
        const out = await encryptBytes(bytes, file.name, password)
        setResult({ blob: new Blob([out as BlobPart], { type: 'application/octet-stream' }), name: `${file.name}.enc`, size: file.size })
      } else {
        const { name, data } = await decryptBytes(bytes, password)
        setResult({ blob: new Blob([data as BlobPart]), name: name || file.name.replace(/\.enc$/i, '') || 'file', size: data.length })
      }
    } catch (e) {
      if (e instanceof BadPasswordError)
        setError(t('Password salah, atau file ini rusak. Coba ketik ulang passwordnya.', 'Wrong password, or the file is damaged. Try typing the password again.'))
      else if (e instanceof NotEncryptedError)
        setError(t('File ini bukan hasil enkripsi tool ini (formatnya tidak dikenali).', "This file wasn't encrypted with this tool (format not recognised)."))
      else setError(t('File tidak bisa diproses. Kalau ukurannya sangat besar, coba file yang lebih kecil.', "The file couldn't be processed. If it's very large, try a smaller one."))
    } finally {
      setBusy(false)
    }
  }

  async function pick(f: File) {
    setResult(null)
    setError(null)
    setFile(f)
    // A file made by this tool opens in decrypt mode on its own.
    if (hasMagic(new Uint8Array(await f.slice(0, 7).arrayBuffer()))) setMode('decrypt')
  }

  return (
    <div className="space-y-6">
      <Segmented
        label={t('Mode', 'Mode')}
        value={mode}
        disabled={busy}
        options={[
          { value: 'encrypt', label: t('Kunci file', 'Encrypt') },
          { value: 'decrypt', label: t('Buka file', 'Decrypt') },
        ]}
        onChange={(v) => { setMode(v); setResult(null); setError(null); setConfirm('') }}
      />

      {!file ? (
        <FileDrop
          accept="*/*"
          label={mode === 'encrypt' ? t('Tarik file apa saja ke sini', 'Drop any file here') : t('Tarik file .enc ke sini', 'Drop an .enc file here')}
          onFiles={([f]) => void pick(f)}
        />
      ) : (
        <>
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 truncate font-medium">
              {file.name} <span className="text-sm font-normal text-muted-foreground">· {fmt(file.size)}</span>
            </p>
            <Button variant="ghost" disabled={busy} onClick={reset}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-4">
            <PasswordInput
              label={t('Password', 'Password')}
              value={password}
              onChange={(v) => { setPassword(v); setResult(null) }}
              autoComplete={mode === 'encrypt' ? 'new-password' : 'current-password'}
              onEnter={() => ready && void run()}
            />
            {mode === 'encrypt' && (
              <PasswordInput
                label={t('Ulangi password', 'Repeat password')}
                value={confirm}
                onChange={(v) => { setConfirm(v); setResult(null) }}
                autoComplete="new-password"
                invalid={mismatch}
                onEnter={() => ready && void run()}
              />
            )}
            {mismatch && <p className="text-xs text-destructive">{t('Dua password belum sama.', "The two passwords don't match.")}</p>}
          </div>

          {mode === 'encrypt' && (
            <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              {t(
                'Password yang lupa tidak bisa dipulihkan — tidak ada yang menyimpannya, termasuk situs ini. Catat di tempat aman.',
                'A forgotten password cannot be recovered — nobody keeps a copy, including this site. Store it somewhere safe.',
              )}
            </p>
          )}

          {result ? (
            <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 truncate text-sm">
                {mode === 'encrypt' ? t('Terkunci', 'Encrypted') : t('Terbuka', 'Decrypted')}: <span className="font-medium">{result.name}</span> · {fmt(result.blob.size)}
              </p>
              <Button onClick={() => downloadBlob(result.blob, result.name)}>
                <Download />
                {t('Unduh', 'Download')}
              </Button>
            </div>
          ) : (
            <Button disabled={!ready || busy} onClick={() => void run()}>
              {mode === 'encrypt' ? <Lock /> : <LockOpen />}
              {busy ? t('Memproses…', 'Working…') : mode === 'encrypt' ? t('Kunci file', 'Encrypt file') : t('Buka file', 'Decrypt file')}
            </Button>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'AES-256-GCM dengan kunci dari PBKDF2-SHA-256 (600.000 iterasi, salt acak). Nama file asli disimpan di dalam file terkunci. Semua berjalan di browser; file dan password tidak dikirim ke mana pun.',
          'AES-256-GCM with a key from PBKDF2-SHA-256 (600,000 iterations, random salt). The original file name is kept inside the encrypted file. Everything runs in your browser; the file and password are never sent anywhere.',
        )}
      </p>
      {error && <ErrorNote message={error} />}
    </div>
  )
}
