// Public types of @chalidade/protect-pdf. They mirror src/tools/protect-pdf/protect.ts;
// types/check.ts fails the build if they drift.

/**
 * Whether the PDF is encrypted, read with qpdf. `needsPassword` is false for a
 * PDF that opens freely but carries print/copy/edit restrictions.
 */
export declare function encryptionInfo(input: Uint8Array): Promise<{ encrypted: boolean; needsPassword: boolean }>

export type Permission = 'print' | 'copy' | 'modify'

/** Thrown by protectPdf for a PDF that is already encrypted. */
export declare class AlreadyEncryptedError extends Error {}

/**
 * The PDF encrypted with AES-256 (qpdf, PDF security handler R6). `password`
 * is needed to open it; the permissions are locked with a random owner
 * password nobody knows.
 */
export declare function protectPdf(input: Uint8Array, password: string, allow: Record<Permission, boolean>): Promise<Uint8Array>
