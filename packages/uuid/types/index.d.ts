// Public types of @chalidade/uuid. They mirror src/tools/uuid/uuid.ts;
// types/check.ts fails the build if they drift.

export interface UuidOptions {
  version: 'v4' | 'v7'
  /** How many ids to generate. */
  count: number
  upper: boolean
  hyphens: boolean
  /** Wrap each id in {…} (the Windows GUID style). */
  braces: boolean
}

/** A random (version 4) UUID, from crypto.getRandomValues. */
export declare function uuidV4(): string
/** A time-ordered (version 7) UUID: ids made later sort later, even within the same millisecond. */
export declare function uuidV7(now?: number): string
/** `count` formatted ids. */
export declare function generate(o: UuidOptions): string[]
