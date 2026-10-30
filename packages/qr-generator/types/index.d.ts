// Public types of @chalidade/qr-generator. They mirror src/tools/qr/render.ts
// and src/tools/qr/payload.ts; types/check.ts fails the build if they drift.

/** Error correction: how much of the code may be damaged (or covered by a logo) and still scan. L 7%, M 15%, Q 25%, H 30%. */
export type ErrorLevel = 'L' | 'M' | 'Q' | 'H'
export type ModuleStyle = 'square' | 'rounded' | 'dots'

/** The QR symbol: `size` × `size` modules. */
export interface QrMatrix {
  size: number
  dark: (row: number, col: number) => boolean
}

export interface RenderOptions {
  /** Module color, any CSS color. */
  fg: string
  /** Background color; null = transparent. */
  bg: string | null
  /** Quiet zone in modules (4 is the standard). */
  margin: number
  style: ModuleStyle
  /** Logo as a data/object URL, drawn in the middle. Use level 'H' with a logo. */
  logo: string | null
}

/** Logo box width as a share of the symbol. */
export declare const LOGO_SHARE: 0.22

/** Encodes `text` into a QR symbol (node-qrcode, loaded on first use). Rejects when the text is too long for a QR code. */
export declare function qrMatrix(text: string, level: ErrorLevel): Promise<QrMatrix>
/** The symbol as a standalone SVG document string. */
export declare function toSvg(m: QrMatrix, opts: RenderOptions): string
/** The symbol drawn on a new `px` × `px` canvas (browser only). Looks exactly like `toSvg`. */
export declare function toCanvas(m: QrMatrix, opts: RenderOptions, px: number): Promise<HTMLCanvasElement>

export type QrKind = 'url' | 'text' | 'wifi' | 'whatsapp' | 'contact' | 'email' | 'phone'

export interface WifiFields {
  ssid: string
  password: string
  security: 'WPA' | 'WEP' | 'nopass'
  hidden: boolean
}
export interface ContactFields {
  name: string
  phone: string
  email: string
  org: string
  url: string
}
export interface MessageFields {
  /** Phone number or email address. */
  to: string
  subject: string
  body: string
}

/** "0812-3456 7890" → "6281234567890". A leading 0 is taken as Indonesian (+62); a leading + is kept. */
export declare function internationalPhone(input: string): string
/** "example.com/x" → "https://example.com/x"; text with a scheme, or that isn't a domain, is left alone. */
export declare function normalizeUrl(input: string): string
/** `WIFI:T:WPA;S:…;P:…;;`, the format phone cameras join. */
export declare function buildWifi(f: WifiFields): string
/** A vCard 3.0 contact. */
export declare function buildContact(f: ContactFields): string
/** A wa.me chat link, with the message as `?text=`. */
export declare function buildWhatsApp(f: MessageFields): string
/** A mailto: link with subject and body. */
export declare function buildEmail(f: MessageFields): string
/** A tel: link in international format. */
export declare function buildPhone(to: string): string
