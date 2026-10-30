// Public types of @chalidade/unlock-pdf. They mirror src/tools/unlock-pdf/unlock.ts;
// types/check.ts fails the build if they drift.

/**
 * Whether the PDF is encrypted, read with qpdf. `needsPassword` is false for a
 * PDF that opens freely but carries print/copy/edit restrictions.
 */
export declare function encryptionInfo(input: Uint8Array): Promise<{ encrypted: boolean; needsPassword: boolean }>

/** The password is missing or wrong. */
export declare class WrongPasswordError extends Error {}

/**
 * The PDF without encryption. A PDF that needs a password to open is only
 * decrypted with that password; one that opens freely loses its restrictions.
 */
export declare function unlockPdf(input: Uint8Array, password?: string): Promise<Uint8Array>
