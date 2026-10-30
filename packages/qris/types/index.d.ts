// Public types of @chalidade/qris. They mirror src/tools/qris/qris.ts;
// types/check.ts fails the build if they drift.

/** One EMV tag-length-value item. */
export interface Tlv {
  tag: string
  value: string
}

/** CRC-16/CCITT-FALSE as four uppercase hex digits (the QRIS tag 63 checksum). */
export declare function crc16(text: string): string
/** Splits the top level of an EMV payload into items; null when a length runs past the end. */
export declare function parseTlv(text: string): Tlv[] | null

export interface QrisInfo {
  items: Tlv[]
  /** Tag 59. */
  merchant: string
  /** Tag 60. */
  city: string
  /** True when tag 01 is 12 (the code already asks for an amount). */
  dynamic: boolean
  /** Existing tag 54, or ''. */
  amount: string
  /** Whether the code's own CRC matches its content. */
  crcOk: boolean
}

/** The text is not an Indonesian QRIS; `message` says why. */
export declare class NotQrisError extends Error {}

/** Reads the text of a scanned QRIS. Throws NotQrisError otherwise. */
export declare function readQris(text: string): QrisInfo
/** "25000", "25.000", "Rp 25.000,50" → "25000" / "25000.5"; null unless a positive amount. */
export declare function parseAmount(input: string): string | null
/** The same QRIS asking for `amount` (from parseAmount): tag 01 → 12, tag 54 inserted, CRC recomputed. */
export declare function withAmount(info: QrisInfo, amount: string): string
