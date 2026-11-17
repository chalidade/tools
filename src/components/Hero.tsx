import { ShieldCheck } from 'lucide-react'
import { TOOLS } from '@/tools/registry'
import { useT } from '@/lib/i18n'

// Kept deliberately small and static: the tool list right below is the point
// of the page, so the intro should not push it far down or cost anything.
export function Hero() {
  const t = useT()
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-12">
      <h1 className="text-[2.375rem] leading-[1.02] font-semibold tracking-[-0.045em] sm:text-5xl">
        {t('Semua tools', 'All tools')} <span className="align-top font-mono text-sm font-normal tracking-normal text-brand-2">{TOOLS.length}</span>
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground text-pretty sm:text-base">
        {t(
          'Dokumen, PDF, gambar, video, audio, sampai data developer. Gratis, tanpa akun, dan semuanya jalan di perangkatmu.',
          'Documents, PDFs, images, video, audio and developer data. Free, no account, and all of it runs on your device.',
        )}
      </p>
      <p className="mt-4 inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-brand-2" />
        {t('File tidak pernah di-upload', 'Files are never uploaded')}
      </p>
    </section>
  )
}
