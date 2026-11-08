/**
 * Indonesian emergency numbers. Last checked: 2026-11-08, from memory of the
 * published national numbers (not re-fetched from an official page in the
 * build environment) — re-verify against official sources before relying on it.
 */
export const CHECKED_ON = '2026-11-08'

export interface EmergencyNumber {
  number: string
  name: [string, string]
  note?: [string, string]
}

export const NUMBERS: EmergencyNumber[] = [
  { number: '112', name: ['Darurat nasional', 'National emergency'], note: ['Gratis, semua jenis darurat', 'Free, any emergency'] },
  { number: '110', name: ['Polisi', 'Police'] },
  { number: '113', name: ['Pemadam kebakaran', 'Fire brigade'] },
  { number: '118', name: ['Ambulans', 'Ambulance'] },
  { number: '119', name: ['Gawat darurat medis (Kemenkes)', 'Medical emergency (Ministry of Health)'] },
  { number: '115', name: ['Basarnas (SAR)', 'Basarnas (search & rescue)'] },
  { number: '117', name: ['BNPB (bencana)', 'BNPB (disasters)'] },
  { number: '123', name: ['PLN (gangguan listrik)', 'PLN (power outage)'] },
]
