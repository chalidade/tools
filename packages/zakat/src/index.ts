// The headless API. The source lives with the site (src/tools/zakat/).
//
//   import { zakatMal } from '@chalidade/zakat'
//   zakatMal(200_000_000, 10_000_000, 1_500_000) // gold price per gram, entered by you

export {
  zakatMal,
  zakatMetal,
  zakatIncome,
  zakatFitrah,
  num,
  RATE,
  GOLD_NISAB_G,
  SILVER_NISAB_G,
  FITRAH_RICE_KG,
  type Outcome,
} from '@/tools/zakat/zakat'
