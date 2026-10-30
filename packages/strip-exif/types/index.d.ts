// Public types of @chalidade/strip-exif. They mirror src/tools/strip-exif/exif.ts;
// types/check.ts fails the build if they drift. Every function works on the
// file's bytes: `new Uint8Array(await file.arrayBuffer())`.

export interface ExifField {
  /** [Indonesian, English] label. */
  label: readonly [string, string]
  value: string
}

export interface ExifInfo {
  /** Camera, lens, date taken, software, aperture, shutter, ISO, focal length, size — whichever are present. */
  fields: ExifField[]
  /** Decimal degrees, when the photo carries a GPS position. */
  gps?: { lat: number; lon: number; altitude?: number }
  /** The EXIF orientation tag, 1 when absent. */
  orientation: number
  /** Which kinds of metadata the file holds. */
  has: { exif: boolean; xmp: boolean; iptc: boolean; comment: boolean }
}

/** The file type from its first bytes. */
export declare function sniff(bytes: Uint8Array): 'jpeg' | 'png' | 'webp' | 'other'
/** Reads the EXIF block (and notes XMP, IPTC, comments) of a JPEG, PNG or WebP. */
export declare function readExif(b: Uint8Array): ExifInfo
/**
 * The same JPEG without EXIF, XMP (also Extended XMP), IPTC, comments, other
 * APP segments, and anything after the end of the image (MPF previews, phone
 * trailers). Keeps the JFIF header, the ICC colour profile and Adobe's colour
 * transform; the image data is untouched.
 */
export declare function stripJpeg(b: Uint8Array): Uint8Array
/** The same PNG without eXIf, tEXt, zTXt, iTXt (XMP) and tIME chunks, and anything after IEND. */
export declare function stripPng(b: Uint8Array): Uint8Array
/** The same WebP without its EXIF and XMP chunks (the VP8X flags and RIFF size are fixed up). */
export declare function stripWebp(b: Uint8Array): Uint8Array
/**
 * Removes the metadata of a JPEG, PNG or WebP without re-encoding it. Returns
 * null for other formats, and for a JPEG whose picture relies on its EXIF
 * orientation (without the tag it would turn sideways: re-encode those).
 */
export declare function stripMetadata(b: Uint8Array): Uint8Array | null
/** "6.20880° S, 106.84560° E" */
export declare function formatCoords(lat: number, lon: number): string
/** A text grid of the world with ◉ at the position — a rough map without loading any tiles. */
export declare function textMap(lat: number, lon: number, cols?: number, rows?: number): string
