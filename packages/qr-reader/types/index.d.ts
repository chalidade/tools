// Public types of @chalidade/qr-reader. They mirror src/tools/qr/scan.ts and
// src/tools/qr/payload.ts; types/check.ts fails the build if they drift.

export interface Scan {
  text: string
  /** ZXing's format name: "QRCode", "EAN13", "Code128"… */
  format: string
}

/** Thrown by `scanFile` when the browser can't decode the picture. */
export declare class UnreadableImageError extends Error {}

/**
 * Every QR code and barcode in a picture file (up to 8), EXIF rotation applied.
 * Large photos are scaled to 3000 px, then 1000 px if nothing is found. Browser only.
 */
export declare function scanFile(file: File): Promise<Scan[]>
/** Reads raw RGBA pixels, e.g. from `getImageData` or a video frame. `onlyQr` looks for one QR code only (faster). */
export declare function scanPixels(data: Uint8ClampedArray, width: number, height: number, onlyQr?: boolean): Promise<Scan[]>
/** "EAN13" → "Barcode EAN-13", "QRCode" → "QR code". */
export declare function formatName(format: string): string
/** True for 2D codes (QR, Aztec, Data Matrix, PDF417…) that can carry links, Wi-Fi or contacts. */
export declare function isQrLike(format: string): boolean

export type QrKind = 'url' | 'text' | 'wifi' | 'whatsapp' | 'contact' | 'email' | 'phone'

export interface ParsedQr {
  kind: QrKind
  title: string
  fields: { label: string; value: string; secret?: boolean }[]
  /** A link that is safe to offer (http, https, mailto, tel, sms), never javascript: or data:. */
  href?: string
}

/** Reads a scanned text into labelled fields: Wi-Fi, vCard, mailto:, tel:, sms:, wa.me, links or plain text. */
export declare function parseQr(text: string): ParsedQr
