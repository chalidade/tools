// Public types of @chalidade/password-generator. They mirror
// src/tools/password-generator/password.ts; types/check.ts fails the build if they drift.

export interface PasswordOptions {
  length: number
  lower: boolean
  upper: boolean
  digits: boolean
  symbols: boolean
  /** Drop look-alike characters (l I O 0 1). */
  noAmbiguous: boolean
}

export interface PassphraseOptions {
  /** How many words. */
  words: number
  separator: string
  capitalize: boolean
  /** Append one digit to a random word. */
  number: boolean
}

/** 0 = very weak … 4 = very strong. */
export type Level = 0 | 1 | 2 | 3 | 4

/** A random password with at least one character of every chosen kind (crypto.getRandomValues, no modulo bias). */
export declare function generatePassword(o: PasswordOptions): string
/** Entropy in bits of a password generated with these options. */
export declare function passwordEntropy(o: PasswordOptions): number
/** Random words from `list` (e.g. WORDS_EN), joined by `separator`. */
export declare function generatePassphrase(list: readonly string[], o: PassphraseOptions): string
/** Entropy in bits of a passphrase from a list of `listSize` words. */
export declare function passphraseEntropy(listSize: number, o: PassphraseOptions): number
/** Estimated entropy in bits of a password someone typed, penalising repeats, runs (abcd, 4321) and common words. */
export declare function estimateStrength(pw: string): number
/** Average seconds to brute-force `bits` of entropy at 10 billion guesses per second. */
export declare function secondsToGuess(bits: number): number
/** Bits → strength level (under 40, 60, 80, 100, and above). */
export declare function level(bits: number): Level
/** Uniform random integer in [0, max), without modulo bias. */
export declare function randomInt(max: number): number
/** English word list for passphrases. */
export declare const WORDS_EN: readonly string[]
/** Indonesian word list for passphrases. */
export declare const WORDS_ID: readonly string[]
