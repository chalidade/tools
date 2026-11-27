/** PP 35/2021 (Pasal 40–57) — kept in one file so it is easy to update when the rules change. */
export const RULES_AS_OF = '2021-02-02'
export const RULES_SOURCE = 'PP 35/2021'

/** Pasal 40 ayat (2): uang pesangon, in months of wage by whole years of service. [minYears, months] */
export const PESANGON_TABLE: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9],
]
/** Pasal 40 ayat (3): uang penghargaan masa kerja. Below 3 years there is none. */
export const UPMK_TABLE: [number, number][] = [
  [3, 2], [6, 3], [9, 4], [12, 5], [15, 6], [18, 7], [21, 8], [24, 10],
]
/** Leave not yet taken is paid at wage / this divisor per day (common practice; the regulation sets no divisor). */
export const LEAVE_DIVISOR = 25

export interface Reason {
  id: string
  label: [string, string]
  pasal: string
  /** × the pesangon table value */
  pesangon: number
  /** × the UPMK table value */
  upmk: number
  /** false: only uang penggantian hak (and nothing else) */
  note?: [string, string]
}

export const REASONS: Reason[] = [
  { id: 'efisiensi-rugi', label: ['Efisiensi karena perusahaan rugi', 'Efficiency cuts because the company is losing money'], pasal: 'Pasal 43', pesangon: 0.5, upmk: 1 },
  { id: 'efisiensi-cegah', label: ['Efisiensi untuk mencegah kerugian', 'Efficiency cuts to prevent losses'], pasal: 'Pasal 44', pesangon: 1, upmk: 1 },
  { id: 'tutup-rugi', label: ['Perusahaan tutup karena rugi terus-menerus / keadaan memaksa', 'Company closes after continuous losses / force majeure'], pasal: 'Pasal 45', pesangon: 0.5, upmk: 1 },
  { id: 'fm-lanjut', label: ['Keadaan memaksa, perusahaan tidak tutup', 'Force majeure, company stays open'], pasal: 'Pasal 46', pesangon: 0.75, upmk: 1 },
  { id: 'pailit', label: ['Perusahaan pailit', 'Company bankrupt'], pasal: 'Pasal 47', pesangon: 1, upmk: 1 },
  { id: 'merger-pekerja', label: ['Merger / pengambilalihan, pekerja tidak bersedia lanjut', 'Merger / takeover, employee declines to continue'], pasal: 'Pasal 41 ayat (2)', pesangon: 0.5, upmk: 1 },
  { id: 'merger-pengusaha', label: ['Merger / pengambilalihan, pengusaha tidak bersedia menerima', 'Merger / takeover, employer declines to take the employee'], pasal: 'Pasal 41 ayat (3)', pesangon: 1, upmk: 1 },
  { id: 'pelanggaran', label: ['Pelanggaran perjanjian kerja / peraturan (setelah SP 3)', 'Breach of contract / rules (after third warning)'], pasal: 'Pasal 52', pesangon: 0.5, upmk: 1 },
  { id: 'pensiun', label: ['Pensiun', 'Retirement'], pasal: 'Pasal 56', pesangon: 1.75, upmk: 1 },
  { id: 'sakit', label: ['Sakit berkepanjangan / cacat akibat kecelakaan kerja', 'Long illness / disability from a work accident'], pasal: 'Pasal 55', pesangon: 2, upmk: 1 },
  { id: 'meninggal', label: ['Pekerja meninggal dunia (untuk ahli waris)', 'Employee dies (paid to heirs)'], pasal: 'Pasal 57', pesangon: 2, upmk: 1 },
  { id: 'resign', label: ['Mengundurkan diri atas kemauan sendiri', 'Resignation'], pasal: 'Pasal 50', pesangon: 0, upmk: 0, note: ['Hanya uang penggantian hak; uang pisah bisa diatur di perjanjian kerja atau PKB.', 'Only the entitlements payment; severance-like "uang pisah" may be set by the contract or CBA.'] },
  { id: 'mangkir', label: ['Mangkir 5 hari kerja atau lebih (dianggap mengundurkan diri)', 'Absent 5+ working days (treated as resignation)'], pasal: 'Pasal 51', pesangon: 0, upmk: 0, note: ['Hanya uang penggantian hak, dan uang pisah bila diatur.', 'Only the entitlements payment, plus "uang pisah" if provided for.'] },
]
