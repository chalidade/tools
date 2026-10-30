// Public types of @chalidade/link-wa. They mirror src/tools/qr/payload.ts;
// types/check.ts fails the build if they drift.

export interface MessageFields {
  /** The phone number, in any common format. */
  to: string
  /** Unused for WhatsApp. */
  subject: string
  /** Opening message; empty for none. */
  body: string
}

/** "0812-3456 7890" → "6281234567890". A leading 0 is taken as Indonesian (+62); a leading + is kept. */
export declare function internationalPhone(input: string): string
/** A wa.me chat link, with the message as `?text=`. */
export declare function buildWhatsApp(f: MessageFields): string
