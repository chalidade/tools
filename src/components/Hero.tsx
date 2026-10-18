import { ShieldCheck } from 'lucide-react'
import { useT } from '@/lib/i18n'

const FACTS = [
  ['Gratis', 'Free'],
  ['Tanpa akun', 'No account'],
  ['Jalan di perangkatmu', 'Runs on your device'],
  ['Kode di GitHub', 'Code on GitHub'],
] as const

// Kept deliberately small and static: the tool list right below is the point
// of the page, so the intro should not push it far down or cost anything.
export function Hero() {
  const t = useT()
  return (
    <section className="mx-auto max-w-6xl px-5 pt-12 sm:px-6 sm:pt-16">
      <p className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pr-3.5 pl-2 text-sm text-muted-foreground">
        <span className="grid size-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-3.5" />
        </span>
        {t('100% diproses di browser', '100% processed in your browser')}
      </p>
      <h1 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
        {t('Semua tools,', 'Every tool,')}{' '}
        <span className="text-gradient">{t('langsung di browser.', 'right in your browser.')}</span>
      </h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground text-pretty">
        {t(
          'Kumpulan tools gratis untuk dokumen, PDF, gambar, video, audio, sampai data developer — semuanya jalan di perangkatmu, tanpa upload.',
          'Free tools for documents, PDFs, images, video, audio and developer data — all running on your device, nothing uploaded.',
        )}
      </p>
      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
        {FACTS.map((fact) => (
          <li key={fact[0]} className="flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-gradient-brand" />
            {t(fact[0], fact[1])}
          </li>
        ))}
      </ul>
    </section>
  )
}
