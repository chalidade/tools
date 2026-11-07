import { STANDARDS, type Band, type StandardId } from './data'

export function bmi(kg: number, cm: number): number {
  const m = cm / 100
  return kg / (m * m)
}

export function classify(value: number, std: StandardId): Band {
  const bands = STANDARDS[std].bands
  return bands.find((b) => value < b.upTo) ?? bands[bands.length - 1]
}

/** Healthy weight range (kg) for the standard's normal BMI band; the top is just under the cut-off. */
export function idealRange(cm: number, std: StandardId): [number, number] {
  const m = cm / 100
  const [lo, hi] = STANDARDS[std].normal
  return [lo * m * m, (hi - 0.1) * m * m]
}

/** Mifflin-St Jeor basal metabolic rate, kcal/day. */
export function bmr(kg: number, cm: number, age: number, male: boolean): number {
  return 10 * kg + 6.25 * cm - 5 * age + (male ? 5 : -161)
}
