import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Download, FileText, FileUp, Plus, Save, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { IconButton } from '@/components/tool/IconButton'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { getLang, useT } from '@/lib/i18n'
import { cvDocx, cvPdf } from './export'
import {
  HEADINGS,
  buildDoc,
  cvFileName,
  emptyEdu,
  emptyExp,
  parseCv,
  sampleCv,
  type CvData,
  type CvLang,
  type Layout,
  type SectionId,
} from './model'

const KEY = 'tools.cv'
const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

function load(): CvData {
  try {
    const c = parseCv(localStorage.getItem(KEY) ?? '')
    if (c) return c
  } catch {
    /* storage blocked or empty */
  }
  return sampleCv(getLang())
}

export interface CvProps {
  /** Keep the CV in localStorage (default). The package's persist="false" turns it off. */
  persist?: boolean
}

function Field({ label, value, onChange, area, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; area?: boolean; rows?: number; placeholder?: string }) {
  return (
    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
      {label}
      {area ? (
        <textarea rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      ) : (
        <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      )}
    </label>
  )
}

export default function Cv({ persist = true }: CvProps) {
  const t = useT()
  const [cv, setCv] = useState<CvData>(() => (persist ? load() : sampleCv(getLang())))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'pdf' | 'docx' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const doc = useMemo(() => buildDoc(cv), [cv])

  useEffect(() => {
    if (!persist) return
    try {
      localStorage.setItem(KEY, JSON.stringify(cv))
    } catch {
      /* storage blocked */
    }
  }, [cv, persist])

  const set = <K extends keyof CvData>(k: K, v: CvData[K]) => setCv((p) => ({ ...p, [k]: v }))
  const setList = <K extends 'experience' | 'education'>(k: K, i: number, patch: Partial<CvData[K][number]>) =>
    setCv((p) => ({ ...p, [k]: p[k].map((x, j) => (j === i ? { ...x, ...patch } : x)) }) as CvData)
  const move = (id: SectionId, d: -1 | 1) =>
    setCv((p) => {
      const o = [...p.order]
      const i = o.indexOf(id)
      const j = i + d
      if (j < 0 || j >= o.length) return p
      ;[o[i], o[j]] = [o[j], o[i]]
      return { ...p, order: o }
    })

  async function download(kind: 'pdf' | 'docx') {
    setError(null)
    setBusy(kind)
    try {
      const blob = kind === 'pdf' ? await cvPdf(doc, cv.layout) : await cvDocx(doc, cv.layout)
      downloadBlob(blob, `${cvFileName(cv)}.${kind}`)
    } catch {
      setError(t('CV gagal dibuat. Coba lagi.', 'The CV could not be made. Try again.'))
    } finally {
      setBusy(null)
    }
  }

  async function importJson(file: File | undefined) {
    if (!file) return
    setError(null)
    const c = file.size < 2_000_000 ? parseCv(await file.text()) : null
    if (c) setCv(c)
    else setError(t('File ini bukan data CV dari tool ini.', 'This file is not CV data from this tool.'))
    if (fileRef.current) fileRef.current.value = ''
  }

  const exportJson = () => downloadBlob(new Blob([JSON.stringify(cv, null, 2)], { type: 'application/json' }), `${cvFileName(cv)}.json`)
  const fill = (lang: CvLang) => {
    if (window.confirm(t('Isi saat ini diganti contoh. Lanjutkan?', 'Your current entries will be replaced by the sample. Continue?'))) setCv(sampleCv(lang))
  }
  const heading = (id: SectionId) => HEADINGS[id][cv.lang]
  const sectionTitle = (id: SectionId) => <h3 className="text-sm font-semibold">{heading(id)}</h3>

  const editors: Record<SectionId, React.ReactNode> = {
    summary: <Field label={t('Ringkasan singkat (2–3 kalimat)', 'Short summary (2–3 sentences)')} area value={cv.summary} onChange={(v) => set('summary', v)} />,
    experience: (
      <div className="space-y-3">
        {cv.experience.map((e, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('Jabatan', 'Job title')} value={e.role} onChange={(v) => setList('experience', i, { role: v })} />
              <Field label={t('Perusahaan', 'Company')} value={e.org} onChange={(v) => setList('experience', i, { org: v })} />
              <Field label={t('Kota', 'Location')} value={e.place} onChange={(v) => setList('experience', i, { place: v })} />
              <Field label={t('Periode', 'Period')} value={e.period} placeholder="Jan 2022 – 2024" onChange={(v) => setList('experience', i, { period: v })} />
            </div>
            <Field label={t('Pencapaian (satu baris = satu poin)', 'Achievements (one line = one bullet)')} area rows={4} value={e.bullets} onChange={(v) => setList('experience', i, { bullets: v })} />
            <Button variant="ghost" size="sm" onClick={() => set('experience', cv.experience.filter((_, j) => j !== i))}>
              <Trash2 />
              {t('Hapus', 'Remove')}
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => set('experience', [...cv.experience, emptyExp()])}>
          <Plus />
          {t('Tambah pengalaman', 'Add experience')}
        </Button>
      </div>
    ),
    education: (
      <div className="space-y-3">
        {cv.education.map((e, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('Sekolah / kampus', 'School')} value={e.school} onChange={(v) => setList('education', i, { school: v })} />
              <Field label={t('Jurusan / gelar', 'Degree')} value={e.degree} onChange={(v) => setList('education', i, { degree: v })} />
              <Field label={t('Periode', 'Period')} value={e.period} onChange={(v) => setList('education', i, { period: v })} />
              <Field label={t('Catatan (IPK, penghargaan)', 'Note (GPA, honours)')} value={e.note} onChange={(v) => setList('education', i, { note: v })} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => set('education', cv.education.filter((_, j) => j !== i))}>
              <Trash2 />
              {t('Hapus', 'Remove')}
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => set('education', [...cv.education, emptyEdu()])}>
          <Plus />
          {t('Tambah pendidikan', 'Add education')}
        </Button>
      </div>
    ),
    skills: <Field label={t('Pisahkan dengan koma', 'Separate with commas')} area rows={2} value={cv.skills} onChange={(v) => set('skills', v)} />,
    projects: <Field label={t('Satu baris = satu poin', 'One line = one bullet')} area value={cv.projects} onChange={(v) => set('projects', v)} />,
    certs: <Field label={t('Satu baris = satu poin', 'One line = one bullet')} area value={cv.certs} onChange={(v) => set('certs', v)} />,
    languages: <Field label={t('Satu baris = satu poin', 'One line = one bullet')} area value={cv.languages} onChange={(v) => set('languages', v)} />,
  }

  const layoutLabel: Record<Layout, [string, string]> = { classic: ['Klasik', 'Classic'], modern: ['Modern', 'Modern'], compact: ['Ringkas', 'Compact'] }
  const serif = cv.layout === 'classic'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('Tata letak', 'Layout')}
          value={cv.layout}
          options={(Object.keys(layoutLabel) as Layout[]).map((l) => ({ value: l, label: t(layoutLabel[l][0], layoutLabel[l][1]) }))}
          onChange={(l) => set('layout', l)}
        />
        <Segmented
          label={t('Bahasa CV', 'CV language')}
          value={cv.lang}
          options={[
            { value: 'id' as CvLang, label: 'Indonesia' },
            { value: 'en' as CvLang, label: 'English' },
          ]}
          onChange={(l) => set('lang', l)}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => fill('id')}>
            <Wand2 />
            {t('Contoh Indonesia', 'Indonesian sample')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fill('en')}>
            <Wand2 />
            {t('Contoh Inggris', 'English sample')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t('Data diri', 'Personal details')}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('Nama lengkap', 'Full name')} value={cv.name} onChange={(v) => set('name', v)} />
              <Field label={t('Posisi yang dilamar / profesi', 'Target role / profession')} value={cv.headline} onChange={(v) => set('headline', v)} />
              <Field label="Email" value={cv.email} onChange={(v) => set('email', v)} />
              <Field label={t('Telepon', 'Phone')} value={cv.phone} onChange={(v) => set('phone', v)} />
              <Field label={t('Kota', 'Location')} value={cv.location} onChange={(v) => set('location', v)} />
              <Field label={t('Tautan (satu per baris)', 'Links (one per line)')} area rows={2} value={cv.links} onChange={(v) => set('links', v)} />
            </div>
          </section>

          {cv.order.map((id, i) => (
            <section key={id} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                {sectionTitle(id)}
                <div className="flex">
                  <IconButton label={t('Naikkan bagian', 'Move section up')} disabled={i === 0} onClick={() => move(id, -1)}>
                    <ArrowUp />
                  </IconButton>
                  <IconButton label={t('Turunkan bagian', 'Move section down')} disabled={i === cv.order.length - 1} onClick={() => move(id, 1)}>
                    <ArrowDown />
                  </IconButton>
                </div>
              </div>
              {editors[id]}
            </section>
          ))}
        </div>

        <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <p className="text-xs font-medium text-muted-foreground">{t('Pratinjau (bagian kosong dilewati)', 'Preview (empty sections are skipped)')}</p>
          <div className={`space-y-3 rounded-xl border bg-white p-5 text-[12px] leading-relaxed text-zinc-900 ${serif ? 'font-serif' : 'font-sans'} ${cv.layout === 'compact' ? 'text-[11px]' : ''}`}>
            <div className={cv.layout === 'classic' ? 'text-center' : ''}>
              {doc.name && <p className={`font-bold ${cv.layout === 'modern' ? 'text-2xl text-blue-900' : 'text-xl'}`}>{doc.name}</p>}
              {doc.headline && <p className="text-[13px]">{doc.headline}</p>}
              {doc.contact.length > 0 && <p>{doc.contact.join('  |  ')}</p>}
            </div>
            {doc.sections.map((s) => (
              <div key={s.id} className="space-y-1">
                <p className={`border-b pb-0.5 font-bold ${cv.layout === 'modern' ? 'border-blue-900 text-blue-900' : 'border-zinc-900'} ${cv.layout === 'compact' ? '' : 'uppercase'}`}>{s.heading}</p>
                {s.blocks.map((b, i) =>
                  b.kind === 'text' ? (
                    <p key={i}>{b.text}</p>
                  ) : b.kind === 'bullets' ? (
                    <ul key={i} className="list-disc pl-5">
                      {b.items.map((x, j) => (
                        <li key={j}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    <div key={i}>
                      <p className="flex justify-between gap-3 font-bold">
                        <span>{b.title}</span>
                        <span className="shrink-0 font-normal">{b.right}</span>
                      </p>
                      {b.sub && <p className="italic">{b.sub}</p>}
                      {b.bullets.length > 0 && (
                        <ul className="list-disc pl-5">
                          {b.bullets.map((x, j) => (
                            <li key={j}>{x}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ),
                )}
              </div>
            ))}
            {!doc.name && doc.sections.length === 0 && <p className="text-zinc-500">{t('Isi data di sebelah kiri.', 'Fill in your details on the left.')}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              'PDF dan Word memakai teks asli, satu kolom, dan heading standar supaya terbaca sistem ATS. Pratinjau ini perkiraan; hasil PDF bisa sedikit berbeda dalam jeda halaman.',
              'The PDF and Word files use real text, one column and standard headings so ATS software can read them. This preview is approximate; page breaks in the PDF may differ slightly.',
            )}
          </p>
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
        <Button variant="outline" onClick={exportJson}>
          <Save />
          {t('Simpan data (JSON)', 'Save data (JSON)')}
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <FileUp />
          {t('Buka data (JSON)', 'Open data (JSON)')}
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void importJson(e.target.files?.[0])} />
      </div>
      <p className="text-xs text-muted-foreground">
        {persist
          ? t(
              'Data CV tersimpan di browser ini dan tidak dikirim ke mana pun. Simpan file JSON sebagai cadangan atau untuk pindah perangkat.',
              'Your CV is kept in this browser and never sent anywhere. Save the JSON file as a backup or to move to another device.',
            )
          : t('Data tidak disimpan dan tidak dikirim ke mana pun. Simpan file JSON bila ingin melanjutkan nanti.', 'Nothing is stored or sent anywhere. Save the JSON file to continue later.')}
      </p>
    </div>
  )
}
