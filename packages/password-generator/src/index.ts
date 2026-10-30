// The headless API. The source lives with the site
// (src/tools/password-generator/), so the tool on chalidade.github.io/tools and
// this package are the same code.
//
//   import { generatePassword, estimateStrength } from '@chalidade/password-generator'
//   generatePassword({ length: 16, lower: true, upper: true, digits: true, symbols: true, noAmbiguous: false })

export {
  generatePassword,
  passwordEntropy,
  generatePassphrase,
  passphraseEntropy,
  estimateStrength,
  secondsToGuess,
  level,
  randomInt,
  type PasswordOptions,
  type PassphraseOptions,
  type Level,
} from '@/tools/password-generator/password'
export { WORDS_EN } from '@/tools/password-generator/words-en'
export { WORDS_ID } from '@/tools/password-generator/words-id'
