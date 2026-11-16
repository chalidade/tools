// GPA (IPK) maths. A semester is a list of courses (credits × letter grade);
// IPS is the weighted average of one semester, IPK of all semesters so far.

export { parseNumber as num } from '@/tools/persen/percent'

export type ScaleId = 'ab' | 'plus'

/** Grade → points. `ab` is the common Indonesian A/AB/B/BC scale, `plus` the A/A-/B+ scale. */
export const SCALES: Record<ScaleId, [string, number][]> = {
  ab: [['A', 4], ['AB', 3.5], ['B', 3], ['BC', 2.5], ['C', 2], ['D', 1], ['E', 0]],
  plus: [['A', 4], ['A-', 3.7], ['B+', 3.3], ['B', 3], ['B-', 2.7], ['C+', 2.3], ['C', 2], ['D', 1], ['E', 0]],
}

export interface Course {
  id: number
  name: string
  sks: string
  grade: string
}

export interface Semester {
  id: number
  courses: Course[]
}

export const points = (scale: ScaleId, grade: string) => SCALES[scale].find(([g]) => g === grade)?.[1]

export interface Tally {
  sks: number
  points: number
}

export function tally(scale: ScaleId, courses: Course[], parse: (s: string) => number): Tally {
  let sks = 0
  let pts = 0
  for (const c of courses) {
    const s = parse(c.sks)
    const p = points(scale, c.grade)
    if (!(s > 0) || !Number.isFinite(s) || p === undefined) continue
    sks += s
    pts += s * p
  }
  return { sks, points: pts }
}

export const gpa = (t: Tally) => (t.sks > 0 ? t.points / t.sks : null)

/**
 * Average points needed over `remaining` more credits to reach `target` overall.
 * `need` is clamped to nothing: callers compare with 0 (already reached) and
 * the top grade (out of reach).
 */
export function neededAverage(done: Tally, remaining: number, target: number): number | null {
  if (!(remaining > 0) || !Number.isFinite(remaining) || !(target >= 0) || !Number.isFinite(target)) return null
  return (target * (done.sks + remaining) - done.points) / remaining
}

export interface Subject {
  id: number
  name: string
  score: string
  weight: string
}

/** Weighted average of report-card scores (weight defaults to 1 when blank). */
export function reportAverage(subjects: Subject[], parse: (s: string) => number): number | null {
  let sum = 0
  let w = 0
  for (const s of subjects) {
    const v = parse(s.score)
    if (!Number.isFinite(v)) continue
    const wt = s.weight.trim() === '' ? 1 : parse(s.weight)
    if (!(wt > 0) || !Number.isFinite(wt)) continue
    sum += v * wt
    w += wt
  }
  return w > 0 ? sum / w : null
}
