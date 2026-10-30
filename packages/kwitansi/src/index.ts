// The headless API. The source lives with the site (src/tools/kwitansi/),
// so the tool on chalidade.github.io/tools and this package are the same code.

export { totals, amountFromInput, wrapText, type Item, type Totals } from '@/tools/kwitansi/doc'
export { buildPdf, rupiahText, amountWords, type DocData } from '@/tools/kwitansi/pdf'

import { setLang, type Lang } from '@/lib/i18n'
/** Language of the generated text (words, dates, labels): 'id' or 'en'. Default: the visitor's browser language. */
export const setLanguage = (lang: Lang) => setLang(lang, { page: false })
