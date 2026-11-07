import { useEffect, useMemo, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { letterDocx, letterPdf } from './export'
import { TEMPLATES, headerLine, type Values } from './templates'

const KEY = 'tools.surat'
const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
const today = () => new Date().toLocaleDateString('en-CA')

interface Saved {
  kind: string
  values: Record<string, Values>
}

// The last answers are kept on this device so the next letter starts filled in.
function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (s && typeof s === 'object' && typeof s.kind === 'string' && s.values && typeof s.values === 'object') return s
  } catch {
    /* storage blocked or empty */
  }
  return { kind: TEMPLATES[0].id, values: {} }
}

export interface SuratProps {
  /** Keep the last answers in localStorage (default). The package's persist="false" turns it off. */
  persist?: boolean
}

export default function Surat({ persist = true }: SuratProps) {
  const t = useT()
  const [s, setS] = useState<Saved>(() => (persist ? load() : { kind: TEMPLATES[0].id, values: {} }))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'pdf' | 'docx' | null>(null)
  const tpl = TEMPLATES.find((x) => x.id === s.kind) ?? TEMPLATES[0]
  const values = useMemo<Values>(() => ({ date: today(), from: today(), last: today(), ...s.values[tpl.id] }), [s.values, tpl.id])
  const letter = useMemo(() => tpl.build(values), [tpl, values])

  useEffect(() => {
    if (!persist) return
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* storage blocked */
    }
  }, [s, persist])

  const setValue = (key: string, val: string) => setS((p) => ({ ...p, values: { ...p.values, [tpl.id]: { ...p.values[tpl.id], [key]: val } } }))

  async function download(kind: 'pdf' | 'docx') {
    setError(null)
    setBusy(kind)
    try {
      const name = `surat-${tpl.id}`
      downloadBlob(kind === 'pdf' ? await letterPdf(letter) : await letterDocx(letter), `${name}.${kind}`)
    } catch {
      setError(t('Surat gagal dibuat. Coba lagi.', 'The letter could not be made. Try again.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div role="radiogroup" aria-label={t('Jenis surat', 'Letter type')} className="flex flex-wrap gap-2">
        {TEMPLATES.map((x) => (
          <button
            key={x.id}
            role="radio"
            aria-checked={x.id === tpl.id}
            onClick={() => setS((p) => ({ ...p, kind: x.id }))}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${x.id === tpl.id ? 'border-transparent bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {t(x.name[0], x.name[1])}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {tpl.fields.map((f) => {
            const common = {
              value: values[f.key] ?? '',
              onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setValue(f.key, e.target.value),
              placeholder: f.placeholder,
              className: inputCls,
            }
            return (
              <label key={f.key} className={`block space-y-1 text-xs font-medium text-muted-foreground ${f.kind === 'area' ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
                {t(f.label[0], f.label[1])}
                {f.kind === 'area' ? <textarea rows={3} {...common} /> : <input type={f.kind === 'date' ? 'date' : 'text'} {...common} />}
              </label>
            )
          })}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">{t('Pratinjau', 'Preview')}</p>
          <div className="space-y-3 rounded-xl border bg-white p-5 font-serif text-[13px] leading-relaxed text-zinc-900">
            {letter.title ? (
              <p className="text-center text-base font-bold underline">{letter.title}</p>
            ) : (
              <>
                <p className="text-right">{headerLine(letter)}</p>
                {letter.to.length > 0 && <p className="whitespace-pre-line">{letter.to.join('\n')}</p>}
                {letter.subject && <p className="font-bold">Perihal: {letter.subject}</p>}
              </>
            )}
            {letter.opening && <p>{letter.opening}</p>}
            {letter.blocks.map((b, i) =>
              'rows' in b ? (
                <dl key={i} className="grid grid-cols-[auto_1fr] gap-x-3 pl-4">
                  {b.rows.map(([k, val]) => (
                    <div key={k} className="contents">
                      <dt>{k}</dt>
                      <dd>: {val}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p key={i} className="whitespace-pre-line">
                  {b.p}
                </p>
              ),
            )}
            <div className="pt-4 text-right">
              {letter.title && <p>{headerLine(letter)}</p>}
              {letter.signOff && <p>{letter.signOff}</p>}
              <p className="mt-10 font-bold">{letter.signer}</p>
              {letter.signerRole && <p className="text-xs">{letter.signerRole}</p>}
            </div>
          </div>
        </div>
      </div>

      {error && <ErrorNote message={error} />}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void download('pdf')} disabled={!!busy}>
          <Download />
          {t('Unduh PDF', 'Download PDF')}
        </Button>
        <Button variant="outline" onClick={() => void download('docx')} disabled={!!busy}>
          <FileText />
          {t('Unduh Word', 'Download Word')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {persist
          ? t(
              'Isian terakhir tersimpan di browser ini supaya tidak perlu mengetik ulang; tidak dikirim ke mana pun. Surat ditulis dalam bahasa Indonesia formal. Tanda tangan dan meterai ditempel manual setelah dicetak; surat ini contoh format, bukan nasihat hukum.',
              'Your last answers are kept in this browser; nothing is sent anywhere. Letters are written in formal Indonesian. Sign and add stamp duty by hand after printing; these are format examples, not legal advice.',
            )
          : t(
              'Isian tidak disimpan dan tidak dikirim ke mana pun. Surat ditulis dalam bahasa Indonesia formal. Tanda tangan dan meterai ditempel manual setelah dicetak.',
              'Nothing is stored or sent anywhere. Letters are written in formal Indonesian. Sign and add stamp duty by hand after printing.',
            )}
      </p>
    </div>
  )
}
