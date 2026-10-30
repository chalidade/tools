// Public types of @chalidade/encode-decode. They mirror
// src/tools/encode-decode/codec.ts; types/check.ts fails the build if they drift.

export type Mode = 'base64' | 'url' | 'html' | 'jwt'

/** UTF-8 text → Base64. `urlSafe` uses - and _ and drops the = padding. */
export declare function base64Encode(text: string, urlSafe?: boolean): string
/** Base64 (standard or URL-safe, padding optional, whitespace ignored) → UTF-8 text. Throws on invalid input or binary data. */
export declare function base64Decode(input: string): string
/** encodeURIComponent, or encodeURI with `full` (keeps : / ? & =). */
export declare function urlEncode(text: string, full?: boolean): string
/** Percent-decoding that also reads + as a space. Throws on a malformed % sequence. */
export declare function urlDecode(text: string): string
/** Escapes & < > " ' as HTML entities. */
export declare function htmlEncode(text: string): string
/** Decodes numeric entities and the common named ones (&amp; &nbsp; &copy; …); unknown entities stay as they are. */
export declare function htmlDecode(text: string): string

export interface Jwt {
  header: unknown
  payload: unknown
  /** The signature part, as is. It is NOT verified. */
  signature: string
  /** iat / nbf / exp claims as dates, when present. */
  times: { name: string; date: Date }[]
}

/** Reads a JWT's header and payload (a leading "Bearer " is ignored). Does not verify the signature. */
export declare function decodeJwt(token: string): Jwt
