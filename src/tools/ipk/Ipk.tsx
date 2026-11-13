import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Segmented } from '@/components/tool/Segmented'
import { useT } from '@/lib/i18n'
import { gpa, neededAverage, num, points, reportAverage, SCALES, tally, type Course, type ScaleId, type Semester, type Subject } from './gpa'

const KEY = 'tools:ipk'
const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

let nextId = 100
const course = (): Course => ({ id: nextId++, name: '', sks: '3', grade: 'A' })
const subject = (): Subject => ({ id: nextId++, name: '', score: '', weight: '' })
const semester = (): Semester => ({ id: nextId++, courses: [course()] })

interface Saved {
  mode: 'gpa' | 'report'
  scale: ScaleId
  semesters: Semester[]
  subjects: Subject[]
  target: string
  remaining: string
}

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (s && Array.isArray(s.semesters) && s.semesters.length && Array.isArray(s.subjects)) {
      nextId = 1000 + Math.floor(Math.random() * 1e6)
      return s
    }
  } catch {
    /* storage blocked or empty */
  }
  return { mode: 'gpa', scale: 'ab', semesters: [semester()], subjects: [subject(), subject()], target: '', remaining: '' }
}

const f2 = (n: number) => n.toFixed(2)

export default function Ipk() {
  const t = useT()
  const [s, setS] = useState(load)
  const set = <K extends keyof Saved>(k: K, v: Saved[K]) => setS((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* storage blocked */
    }
  }, [s])

  const editSem = (id: number, fn: (c: Course[]) => Course[]) =>
    set('semesters', s.semesters.map((x) => (x.id === id ? { ...x, courses: fn(x.courses) } : x)))
  const changeScale = (scale: ScaleId) => {
    // Keep each grade if it exists in the new scale, otherwise fall back to the closest letter.
    const fix = (g: string) => (points(scale, g) !== undefined ? g : g.startsWith('A') ? 'A' : g.startsWith('B') ? 'B' : g.startsWith('C') ? 'C' : g)
    setS((p) => ({ ...p, scale, semesters: p.semesters.map((x) => ({ ...x, courses: x.courses.map((c) => ({ ...c, grade: fix(c.grade) })) })) }))
  }

  const perSem = s.semesters.map((x) => tally(s.scale, x.courses, num))
  const total = perSem.reduce((a, b) => ({ sks: a.sks + b.sks, points: a.points + b.points }), { sks: 0, points: 0 })
  const ipk = gpa(total)
  const target = num(s.target)
  const rest = num(s.remaining)
  const need = ipk !== null ? neededAverage(total, rest, target) : null
  const top = SCALES[s.scale][0][1]
  const report = reportAverage(s.subjects, num)

  return (
    <div className="space-y-6">
      <Segmented
        label={t('Mode', 'Mode')}
        value={s.mode}
        onChange={(v) => set('mode', v)}
        options={[
          { value: 'gpa', label: t('IPK kuliah', 'University GPA') },
          { value: 'report', label: t('Nilai rapor', 'Report-card average') },
        ]}
      />

      {s.mode === 'gpa' ? (
        <>
          <Segmented
            label={t('Skala nilai', 'Grade scale')}
            value={s.scale}
            onChange={changeScale}
            options={[
              { value: 'ab', label: 'A / AB / B / BC' },
              { value: 'plus', label: 'A / A- / B+ / B' },
            ]}
          />

          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground">{t('IPK saat ini', 'Current GPA')}</p>
            <p className="text-3xl font-semibold tabular-nums">{ipk === null ? '–' : f2(ipk)}</p>
            <p className="text-xs text-muted-foreground">{t(`${total.sks} SKS ditempuh`, `${total.sks} credits taken`)}</p>
          </div>

          {s.semesters.map((sem, si) => {
            const ips = gpa(perSem[si])
            return (
              <section key={sem.id} className="space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    {t(`Semester ${si + 1}`, `Semester ${si + 1}`)} · IPS {ips === null ? '–' : f2(ips)}
                  </h3>
                  {s.semesters.length > 1 && (
                    <button
                      type="button"
                      aria-label={t('Hapus semester', 'Remove semester')}
                      onClick={() => set('semesters', s.semesters.filter((x) => x.id !== sem.id))}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                {sem.courses.map((c) => (
                  <div key={c.id} className="grid grid-cols-[1fr_4rem_5rem_auto] items-center gap-2">
                    <input
                      value={c.name}
                      onChange={(e) => editSem(sem.id, (cs) => cs.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))}
                      className={inputCls}
                      placeholder={t('Mata kuliah', 'Course')}
                      aria-label={t('Mata kuliah', 'Course')}
                    />
                    <input
                      inputMode="decimal"
                      value={c.sks}
                      onChange={(e) => editSem(sem.id, (cs) => cs.map((x) => (x.id === c.id ? { ...x, sks: e.target.value } : x)))}
                      className={inputCls}
                      aria-label="SKS"
                      placeholder="SKS"
                    />
                    <select
                      value={c.grade}
                      onChange={(e) => editSem(sem.id, (cs) => cs.map((x) => (x.id === c.id ? { ...x, grade: e.target.value } : x)))}
                      className={inputCls}
                      aria-label={t('Nilai', 'Grade')}
                    >
                      {SCALES[s.scale].map(([g]) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={t('Hapus mata kuliah', 'Remove course')}
                      onClick={() => editSem(sem.id, (cs) => (cs.length > 1 ? cs.filter((x) => x.id !== c.id) : cs))}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => editSem(sem.id, (cs) => [...cs, course()])}
                  className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <Plus className="size-4" />
                  {t('Mata kuliah', 'Course')}
                </button>
              </section>
            )
          })}
          <button
            type="button"
            onClick={() => set('semesters', [...s.semesters, semester()])}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Plus className="size-4" />
            {t('Tambah semester', 'Add semester')}
          </button>

          <section className="space-y-3 rounded-xl border p-4">
            <h3 className="text-sm font-semibold">{t('Simulasi: butuh nilai berapa?', 'Simulation: what do I need?')}</h3>
            <div className="grid max-w-md grid-cols-2 gap-3">
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('Target IPK', 'Target GPA')}
                <input inputMode="decimal" value={s.target} onChange={(e) => set('target', e.target.value)} className={inputCls} placeholder="3,50" />
              </label>
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('Sisa SKS', 'Credits left')}
                <input inputMode="decimal" value={s.remaining} onChange={(e) => set('remaining', e.target.value)} className={inputCls} placeholder="40" />
              </label>
            </div>
            {need !== null && (
              <p className="text-sm">
                {need <= 0
                  ? t('Target sudah tercapai, berapa pun nilai di sisa SKS.', 'The target is already secured, whatever the remaining grades.')
                  : need > top
                    ? t(`Tidak mungkin tercapai: butuh rata-rata ${f2(need)}, padahal nilai tertinggi ${f2(top)}.`, `Out of reach: you would need an average of ${f2(need)}, but the top grade is ${f2(top)}.`)
                    : t(`Butuh rata-rata nilai ${f2(need)} di sisa ${rest} SKS.`, `You need an average of ${f2(need)} over the remaining ${rest} credits.`)}
              </p>
            )}
          </section>
        </>
      ) : (
        <section className="space-y-3">
          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground">{t('Rata-rata berbobot', 'Weighted average')}</p>
            <p className="text-3xl font-semibold tabular-nums">{report === null ? '–' : f2(report)}</p>
          </div>
          {s.subjects.map((x) => (
            <div key={x.id} className="grid grid-cols-[1fr_4.5rem_4.5rem_auto] items-center gap-2">
              <input
                value={x.name}
                onChange={(e) => set('subjects', s.subjects.map((y) => (y.id === x.id ? { ...y, name: e.target.value } : y)))}
                className={inputCls}
                placeholder={t('Mapel', 'Subject')}
                aria-label={t('Mapel', 'Subject')}
              />
              <input
                inputMode="decimal"
                value={x.score}
                onChange={(e) => set('subjects', s.subjects.map((y) => (y.id === x.id ? { ...y, score: e.target.value } : y)))}
                className={inputCls}
                placeholder={t('Nilai', 'Score')}
                aria-label={t('Nilai', 'Score')}
              />
              <input
                inputMode="decimal"
                value={x.weight}
                onChange={(e) => set('subjects', s.subjects.map((y) => (y.id === x.id ? { ...y, weight: e.target.value } : y)))}
                className={inputCls}
                placeholder={t('Bobot', 'Weight')}
                aria-label={t('Bobot', 'Weight')}
              />
              <button
                type="button"
                aria-label={t('Hapus mapel', 'Remove subject')}
                onClick={() => set('subjects', s.subjects.length > 1 ? s.subjects.filter((y) => y.id !== x.id) : s.subjects)}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set('subjects', [...s.subjects, subject()])}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Plus className="size-4" />
            {t('Tambah mapel', 'Add subject')}
          </button>
          <p className="text-xs text-muted-foreground">{t('Bobot kosong dihitung 1 (misalnya jumlah jam atau SKS mapel).', 'A blank weight counts as 1 (for example the subject’s hours or credits).')}</p>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'IPS = Σ(SKS × bobot nilai) ÷ Σ SKS; IPK menghitung semua semester. Bobot nilai bisa berbeda antar kampus (A = 4, AB = 3,5, B = 3, …); cek pedoman akademik kampusmu. Data tersimpan di perangkat ini saja.',
          'Semester GPA = Σ(credits × grade points) ÷ Σ credits; the cumulative GPA covers every semester. Grade points differ between universities (A = 4, AB = 3.5, B = 3, …); check your own academic rules. Data stays on this device only.',
        )}
      </p>
    </div>
  )
}
