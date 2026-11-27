// The tools in the extension. Free ones always work; Pro ones give free users
// a few saves a day (trial.ts) and then ask for a key. Each is a lazy chunk,
// like on the site; the registry itself is not imported (it would pull in
// every tool of the site).

import { lazy, type ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Combine,
  Crop,
  Eraser,
  FileArchive,
  FileImage,
  FileLock,
  ImageDown,
  Images,
  LockOpen,
  QrCode,
  Repeat,
  ScanLine,
  Scissors,
  ShieldOff,
  Signature,
  Stamp,
} from 'lucide-react'

export type Group = 'image' | 'pdf' | 'qr'

export interface ExtTool {
  slug: string
  group: Group
  icon: LucideIcon
  title: [string, string]
  blurb: [string, string]
  pro: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>
}

export const GROUPS: { id: Group; title: [string, string] }[] = [
  { id: 'image', title: ['Gambar', 'Images'] },
  { id: 'pdf', title: ['PDF', 'PDF'] },
  { id: 'qr', title: ['QR code', 'QR codes'] },
]

export const TOOLS: ExtTool[] = [
  // Free
  { slug: 'compress-image', group: 'image', icon: ImageDown, pro: false, title: ['Kompres Gambar', 'Compress Images'], blurb: ['JPG/PNG/WebP jadi lebih kecil, banyak sekaligus', 'Shrink JPG/PNG/WebP, many at once'], component: lazy(() => import('@/tools/compress-image/CompressImage')) },
  { slug: 'convert-image', group: 'image', icon: Repeat, pro: false, title: ['Ubah Format Gambar', 'Convert Images'], blurb: ['HEIC, WebP, PNG, JPG, AVIF', 'HEIC, WebP, PNG, JPG, AVIF'], component: lazy(() => import('@/tools/convert-image/ConvertImage')) },
  { slug: 'qr-generator', group: 'qr', icon: QrCode, pro: false, title: ['Buat QR Code', 'QR Code Generator'], blurb: ['Link, teks, Wi-Fi, WhatsApp, kontak', 'Links, text, Wi-Fi, WhatsApp, contacts'], component: lazy(() => import('@/tools/qr/QrGenerator')) },
  { slug: 'qr-reader', group: 'qr', icon: ScanLine, pro: false, title: ['Baca QR & Barcode', 'QR & Barcode Reader'], blurb: ['Dari gambar atau screenshot', 'From an image or screenshot'], component: lazy(() => import('@/tools/qr/QrReader')) },
  // Pro
  { slug: 'remove-background', group: 'image', icon: Eraser, pro: true, title: ['Hapus Latar Gambar', 'Remove Background'], blurb: ['AI di perangkatmu, hasil PNG transparan', 'On-device AI, transparent PNG'], component: lazy(() => import('@/tools/remove-background/RemoveBackground')) },
  { slug: 'crop-resize-image', group: 'image', icon: Crop, pro: true, title: ['Crop & Resize', 'Crop & Resize'], blurb: ['Ukuran pas untuk sosmed & dokumen', 'Exact sizes for social and documents'], component: lazy(() => import('@/tools/crop-resize-image/CropResizeImage')) },
  { slug: 'strip-exif', group: 'image', icon: ShieldOff, pro: true, title: ['Hapus Metadata Foto', 'Remove Photo Metadata'], blurb: ['Buang lokasi GPS & info kamera', 'Strip GPS location and camera data'], component: lazy(() => import('@/tools/strip-exif/StripExif')) },
  { slug: 'compress-pdf', group: 'pdf', icon: FileArchive, pro: true, title: ['Kompres PDF', 'Compress PDF'], blurb: ['Perkecil PDF untuk email & upload', 'Shrink PDFs for email and uploads'], component: lazy(() => import('@/tools/compress-pdf/CompressPdf')) },
  { slug: 'merge-pdf', group: 'pdf', icon: Combine, pro: true, title: ['Gabung PDF', 'Merge PDF'], blurb: ['Satukan beberapa PDF', 'Combine several PDFs'], component: lazy(() => import('@/tools/merge-pdf/MergePdf')) },
  { slug: 'split-pdf', group: 'pdf', icon: Scissors, pro: true, title: ['Pisah PDF', 'Split PDF'], blurb: ['Ambil halaman tertentu', 'Pull out the pages you need'], component: lazy(() => import('@/tools/split-pdf/SplitPdf')) },
  { slug: 'image-to-pdf', group: 'pdf', icon: Images, pro: true, title: ['Gambar ke PDF', 'Images to PDF'], blurb: ['Foto & scan jadi satu PDF', 'Photos and scans into one PDF'], component: lazy(() => import('@/tools/image-to-pdf/ImageToPdf')) },
  { slug: 'pdf-to-image', group: 'pdf', icon: FileImage, pro: true, title: ['PDF ke Gambar', 'PDF to Images'], blurb: ['Tiap halaman jadi JPG/PNG', 'Every page as JPG/PNG'], component: lazy(() => import('@/tools/pdf-to-image/PdfToImage')) },
  { slug: 'sign-pdf', group: 'pdf', icon: Signature, pro: true, title: ['Tanda Tangan PDF', 'Sign PDF'], blurb: ['Tanda tangan & teks di halaman', 'Signature and text on the page'], component: lazy(() => import('@/tools/sign-pdf/SignPdf')) },
  { slug: 'watermark-pdf', group: 'pdf', icon: Stamp, pro: true, title: ['Watermark PDF', 'Watermark PDF'], blurb: ['Teks atau logo di tiap halaman', 'Text or logo on every page'], component: lazy(() => import('@/tools/watermark-pdf/WatermarkPdf')) },
  { slug: 'protect-pdf', group: 'pdf', icon: FileLock, pro: true, title: ['Kunci PDF', 'Protect PDF'], blurb: ['Pasang password AES-256', 'Add an AES-256 password'], component: lazy(() => import('@/tools/protect-pdf/ProtectPdf')) },
  { slug: 'unlock-pdf', group: 'pdf', icon: LockOpen, pro: true, title: ['Buka Kunci PDF', 'Unlock PDF'], blurb: ['Hapus password yang kamu tahu', 'Remove a password you know'], component: lazy(() => import('@/tools/unlock-pdf/UnlockPdf')) },
]

export const findTool = (slug: string) => TOOLS.find((t) => t.slug === slug)
