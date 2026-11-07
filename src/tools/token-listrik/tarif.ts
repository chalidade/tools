// PLN tariffs and tax defaults live here, so a tariff change is a one-file
// edit. Check against the latest PLN / ESDM announcements before relying on it.

/** Date these figures were last reviewed (shown to the user). */
export const TARIF_AS_OF = '2025-03-01'

/** Source: Peraturan Menteri ESDM and PLN's published tariff adjustments. */
export const TARIF_SOURCE = 'PLN / Kementerian ESDM'

/** Rupiah per kWh, before PPJ. */
export interface Golongan {
  id: string
  label: [string, string]
  rate: number
  /** Whether PPN is normally charged for this class (larger/commercial connections). */
  ppn: boolean
}

export const GOLONGAN: Golongan[] = [
  { id: 'r1-450', label: ['R-1/TR 450 VA (bersubsidi)', 'R-1/TR 450 VA (subsidised)'], rate: 415, ppn: false },
  { id: 'r1-900-sub', label: ['R-1/TR 900 VA (bersubsidi)', 'R-1/TR 900 VA (subsidised)'], rate: 605, ppn: false },
  { id: 'r1-900', label: ['R-1/TR 900 VA-RTM (tidak bersubsidi)', 'R-1/TR 900 VA-RTM (non-subsidised)'], rate: 1352, ppn: false },
  { id: 'r1-1300', label: ['R-1/TR 1.300 VA', 'R-1/TR 1,300 VA'], rate: 1444.7, ppn: false },
  { id: 'r1-2200', label: ['R-1/TR 2.200 VA', 'R-1/TR 2,200 VA'], rate: 1444.7, ppn: false },
  { id: 'r2-3500', label: ['R-2/TR 3.500–5.500 VA', 'R-2/TR 3,500–5,500 VA'], rate: 1699.53, ppn: false },
  { id: 'r3-6600', label: ['R-3/TR 6.600 VA ke atas', 'R-3/TR 6,600 VA and above'], rate: 1699.53, ppn: true },
]

/** PPJ (pajak penerangan jalan) differs per region; this is only a starting value. */
export const DEFAULT_PPJ = 3
/** PPN on electricity for the classes flagged above. */
export const PPN_RATE = 11
