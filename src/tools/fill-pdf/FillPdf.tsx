import { useEffect, useState } from 'react'
import { Download, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { downloadBlob } from '@/lib/download'
import { getLang, useT } from '@/lib/i18n'
import { pageUrl } from '@/lib/route'
import { isPdfFile, openErrorMessage, pageThumbs, type PageThumb } from '@/lib/pdf-doc'
import { changed, fillForm, KIND_LABEL, readForm, type FormField, type FormInfo, type FormValues } from './fields'

const inputCls = 'h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-brand-2/60 disabled:opacity-60'

type Status = { kind: 'idle' } | { kind: 'reading'; name: string } | { kind: 'ready'; info: FormInfo } | { kind: 'error'; message: string }

export default function FillPdf() {
  const t = useT()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [values, setValues] = useState<FormValues>({})
  const [flatten, setFlatten] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [thumb, setThumb] = useState<PageThumb | null>(null)

  // Preview of the page the focused field is on.
  useEffect(() => {
    if (!file || status.kind !== 'ready') return
    let live = true
    pageThumbs(file, 900, undefined, [page + 1])
      .then(({ thumbs }) => live && setThumb(thumbs[0]))
      .catch(() => live && setThumb(null))
    return () => {
      live = false
    }
  }, [file, page, status.kind])

  async function open(next: File) {
    if (!isPdfFile(next)) {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a .pdf file.') })
      return
    }
    setFile(next)
    setError(null)
    setNotice(null)
    setStatus({ kind: 'reading', name: next.name })
    try {
      const info = await readForm(next)
      setValues(Object.fromEntries(info.fields.map((f) => [f.name, f.value])))
      setPage(Math.max(0, info.fields[0]?.page ?? 0))
      setStatus({ kind: 'ready', info })
    } catch (e) {
      setStatus({ kind: 'error', message: openErrorMessage(e) })
    }
  }

  async function save(info: FormInfo) {
    if (!file) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const { blob, failed } = await fillForm(file, info, values, flatten)
      downloadBlob(blob, file.name.replace(/\.pdf$/i, '') + t('-terisi.pdf', '-filled.pdf'))
      if (failed.length)
        setNotice(
          t(
            `Kolom ini tidak bisa diisi (mungkin ada huruf yang tidak didukung fontnya): ${failed.join(', ')}.`,
            `These fields could not be filled (maybe a character their font cannot draw): ${failed.join(', ')}.`,
          ),
        )
    } catch (e) {
      setError(openErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (status.kind === 'ready' && file) {
    const { info } = status
    const set = (name: string, v: string | boolean) => setValues((s) => ({ ...s, [name]: v }))
    const edits = changed(info.fields, values).length
    const header = (
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {info.fields.length
              ? t(`${info.fields.length} kolom, ${edits} diubah.`, `${info.fields.length} fields, ${edits} changed.`)
              : t('Tidak ada kolom isian.', 'No form fields.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {info.fields.length > 0 && (
            <Button onClick={() => void save(info)} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Download />}
              {t('Simpan PDF', 'Save PDF')}
            </Button>
          )}
          <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
            <RotateCcw />
            {t('File lain', 'Another file')}
          </Button>
        </div>
      </div>
    )

    if (!info.fields.length) {
      return (
        <div className="space-y-6">
          {header}
          <div className="rounded-2xl border bg-card p-5 text-sm">
            {info.xfa
              ? t(
                  'PDF ini memakai formulir XFA (Adobe LiveCycle), yang hanya bisa diisi di Adobe Acrobat. Tool ini tidak mendukung XFA.',
                  'This PDF uses an XFA form (Adobe LiveCycle), which only Adobe Acrobat can fill. This tool does not support XFA.',
                )
              : t(
                  'PDF ini tidak punya kolom isian yang bisa diketik. Untuk formulir biasa (hanya gambar atau garis), tulis langsung di halamannya dengan tool Edit PDF.',
                  'This PDF has no fillable fields. For an ordinary form (just images or lines), write on the page itself with the Edit PDF tool.',
                )}{' '}
            <a href={pageUrl('edit-pdf', getLang())} className="font-medium text-brand-2 underline">
              {t('Buka Edit PDF', 'Open Edit PDF')}
            </a>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {header}
        {info.xfa && (
          <p className="rounded-xl border bg-muted/60 p-3 text-xs text-muted-foreground">
            {t(
              'PDF ini formulir hibrida (XFA + AcroForm). Yang diisi di sini adalah bagian AcroForm; bagian XFA dibuang saat disimpan supaya isianmu yang tampil.',
              'This is a hybrid form (XFA + AcroForm). The AcroForm side is filled here; the XFA part is dropped on save so your answers are what shows.',
            )}
          </p>
        )}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3 rounded-2xl border bg-card p-5">
            {info.fields.map((f) => (
              <FieldRow key={f.name} f={f} value={values[f.name]} disabled={busy} onFocus={() => f.page >= 0 && setPage(f.page)} onChange={(v) => set(f.name, v)} />
            ))}
            <label className="flex items-start gap-2 border-t pt-4 text-sm">
              <input type="checkbox" className="mt-1" checked={flatten} disabled={busy} onChange={(e) => setFlatten(e.target.checked)} />
              <span>
                {t('Ratakan (kunci isian)', 'Flatten (lock the answers)')}
                <span className="block text-xs text-muted-foreground">
                  {t('Isian jadi bagian halaman dan tidak bisa diubah lagi.', 'Answers become part of the page and can no longer be edited.')}
                </span>
              </span>
            </label>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t(`Halaman ${page + 1} dari ${info.pages} (tampilan asli, belum berisi isianmu)`, `Page ${page + 1} of ${info.pages} (original, without your answers yet)`)}
            </p>
            <div className="grid place-items-center rounded-2xl border bg-muted/60 p-4">
              {thumb ? (
                <img src={thumb.src} alt={t(`Halaman ${page + 1}`, `Page ${page + 1}`)} className="w-full max-w-lg shadow-md ring-1 ring-black/5" />
              ) : (
                <Loader2 className="animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                {t('Sebelumnya', 'Previous')}
              </Button>
              <Button variant="ghost" size="sm" disabled={page >= info.pages - 1} onClick={() => setPage(page + 1)}>
                {t('Berikutnya', 'Next')}
              </Button>
            </div>
          </div>
        </div>
        {notice && <p className="rounded-xl border bg-muted/60 p-3 text-sm">{notice}</p>}
        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".pdf,application/pdf"
        label={t('Tarik file .pdf ke sini', 'Drop a .pdf file here')}
        busyLabel={status.kind === 'reading' ? t(`Membaca ${status.name}…`, `Reading ${status.name}…`) : undefined}
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}

function FieldRow({
  f,
  value,
  disabled,
  onFocus,
  onChange,
}: {
  f: FormField
  value: string | boolean
  disabled: boolean
  onFocus: () => void
  onChange: (v: string | boolean) => void
}) {
  const t = useT()
  const off = disabled || f.readOnly
  const label = (
    <span className="flex items-baseline justify-between gap-2 text-xs font-medium text-muted-foreground">
      <span className="truncate">{f.name}</span>
      <span className="shrink-0 font-mono text-[10px] uppercase">
        {f.page >= 0 ? `${t('Hal', 'Pg')} ${f.page + 1} · ` : ''}
        {KIND_LABEL[f.kind]()}
      </span>
    </span>
  )

  if (f.kind === 'check')
    return (
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={value === true} disabled={off} onFocus={onFocus} onChange={(e) => onChange(e.target.checked)} />
        <span className="min-w-0 flex-1 truncate">{f.name}</span>
        <span className="font-mono text-[10px] uppercase text-muted-foreground">{f.page >= 0 ? `${t('Hal', 'Pg')} ${f.page + 1}` : ''}</span>
      </label>
    )

  if (f.kind === 'text')
    return (
      <label className="block space-y-1">
        {label}
        {f.multiline ? (
          <textarea
            rows={3}
            maxLength={f.maxLength}
            value={String(value)}
            disabled={off}
            onFocus={onFocus}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-brand-2/60 disabled:opacity-60"
          />
        ) : (
          <input
            type={f.password ? 'password' : 'text'}
            maxLength={f.maxLength}
            value={String(value)}
            disabled={off}
            onFocus={onFocus}
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          />
        )}
      </label>
    )

  if (f.kind === 'radio')
    return (
      <fieldset className="space-y-1" disabled={off} onFocus={onFocus}>
        <legend className="w-full">{label}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {f.options.map((o) => (
            <label key={o} className="flex items-center gap-1.5">
              <input type="radio" name={f.name} checked={value === o} onChange={() => onChange(o)} />
              {o}
            </label>
          ))}
        </div>
      </fieldset>
    )

  return (
    <label className="block space-y-1">
      {label}
      <select value={String(value)} disabled={off} onFocus={onFocus} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">{t('— kosong —', '— empty —')}</option>
        {f.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
