// BMI cut-offs in one place. Upper bounds are exclusive; the last row is open-ended.
// Sources: WHO Expert Consultation 2004 / WHO-IASO-IOTF Asia-Pacific 2000,
// Kemenkes RI (Pedoman Gizi Seimbang 2014), WHO 1995/2000 global.
export type StandardId = 'asia' | 'kemenkes' | 'who'

export interface Band {
  upTo: number
  label: [string, string]
  tone: 'low' | 'ok' | 'warn' | 'high'
}

export const STANDARDS: Record<StandardId, { name: [string, string]; bands: Band[]; normal: [number, number] }> = {
  asia: {
    name: ['Asia-Pasifik (WHO 2000)', 'Asia-Pacific (WHO 2000)'],
    normal: [18.5, 23],
    bands: [
      { upTo: 18.5, label: ['Kurus', 'Underweight'], tone: 'low' },
      { upTo: 23, label: ['Normal', 'Normal'], tone: 'ok' },
      { upTo: 25, label: ['Berat berlebih (berisiko)', 'Overweight (at risk)'], tone: 'warn' },
      { upTo: 30, label: ['Obesitas I', 'Obese I'], tone: 'high' },
      { upTo: Infinity, label: ['Obesitas II', 'Obese II'], tone: 'high' },
    ],
  },
  kemenkes: {
    name: ['Kemenkes RI', 'Indonesian MoH (Kemenkes)'],
    normal: [18.5, 25],
    bands: [
      { upTo: 17, label: ['Kurus berat', 'Severely underweight'], tone: 'low' },
      { upTo: 18.5, label: ['Kurus ringan', 'Mildly underweight'], tone: 'low' },
      { upTo: 25.1, label: ['Normal', 'Normal'], tone: 'ok' },
      { upTo: 27.1, label: ['Gemuk ringan', 'Mildly overweight'], tone: 'warn' },
      { upTo: Infinity, label: ['Gemuk berat (obesitas)', 'Severely overweight (obese)'], tone: 'high' },
    ],
  },
  who: {
    name: ['WHO global', 'WHO global'],
    normal: [18.5, 25],
    bands: [
      { upTo: 18.5, label: ['Kurus', 'Underweight'], tone: 'low' },
      { upTo: 25, label: ['Normal', 'Normal'], tone: 'ok' },
      { upTo: 30, label: ['Berat berlebih', 'Overweight'], tone: 'warn' },
      { upTo: Infinity, label: ['Obesitas', 'Obese'], tone: 'high' },
    ],
  },
}

export const ACTIVITY: { id: string; factor: number; label: [string, string] }[] = [
  { id: 'sedentary', factor: 1.2, label: ['Jarang bergerak (kerja duduk)', 'Sedentary (desk job)'] },
  { id: 'light', factor: 1.375, label: ['Ringan (olahraga 1–3×/minggu)', 'Light (exercise 1–3×/week)'] },
  { id: 'moderate', factor: 1.55, label: ['Sedang (3–5×/minggu)', 'Moderate (3–5×/week)'] },
  { id: 'active', factor: 1.725, label: ['Aktif (6–7×/minggu)', 'Active (6–7×/week)'] },
  { id: 'extra', factor: 1.9, label: ['Sangat aktif (fisik berat)', 'Very active (physical job)'] },
]
