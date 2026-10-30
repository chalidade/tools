// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.PasswordOptions, Source.PasswordOptions>>()
assert<Same<Public.PassphraseOptions, Source.PassphraseOptions>>()
assert<Same<Public.Level, Source.Level>>()
assert<Same<typeof Public.generatePassword, typeof Source.generatePassword>>()
assert<Same<typeof Public.passwordEntropy, typeof Source.passwordEntropy>>()
assert<Same<typeof Public.generatePassphrase, typeof Source.generatePassphrase>>()
assert<Same<typeof Public.passphraseEntropy, typeof Source.passphraseEntropy>>()
assert<Same<typeof Public.estimateStrength, typeof Source.estimateStrength>>()
assert<Same<typeof Public.secondsToGuess, typeof Source.secondsToGuess>>()
assert<Same<typeof Public.level, typeof Source.level>>()
assert<Same<typeof Public.randomInt, typeof Source.randomInt>>()
assert<Same<typeof Public.WORDS_EN, typeof Source.WORDS_EN>>()
assert<Same<typeof Public.WORDS_ID, typeof Source.WORDS_ID>>()
