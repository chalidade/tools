import { Cpu, Download, FileUp } from 'lucide-react'
import { useT } from '@/lib/i18n'

const STEPS = [
  {
    icon: FileUp,
    title: ['Pilih file', 'Pick a file'],
    body: [
      'Tarik file ke halaman atau pilih dari perangkat. File dibaca langsung ke memori browser.',
      'Drop a file on the page or choose one from your device. It is read straight into browser memory.',
    ],
  },
  {
    icon: Cpu,
    title: ['Diproses di perangkatmu', 'Processed on your device'],
    body: [
      'Semua berjalan dengan JavaScript di tab ini. Tidak ada server yang menerima file-mu.',
      'Everything runs as JavaScript in this tab. No server ever receives your file.',
    ],
  },
  {
    icon: Download,
    title: ['Unduh hasilnya', 'Download the result'],
    body: [
      'Hasil langsung tersimpan ke perangkat. Yang kamu simpan di tool, seperti catatan, tetap di browser ini saja.',
      'The result saves straight to your device. Anything a tool keeps, like notes, stays in this browser only.',
    ],
  },
] as const

export function HowItWorks() {
  const t = useT()
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20">
      <div className="grid gap-8 border-t pt-10 lg:grid-cols-[1fr_2fr] lg:gap-12 lg:pt-14">
        <div>
          <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{t('Cara kerja', 'How it works')}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance">
            {t('Privat sejak awal, bukan sekadar janji.', 'Private by design, not just by promise.')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t(
              'Situs ini statis — tidak punya backend sama sekali. Kodenya bisa dilihat di GitHub, jadi siapa pun bisa memeriksa bahwa tidak ada file yang dikirim keluar.',
              'This site is static — it has no backend at all. The code is on GitHub, so anyone can check that no file is ever sent out.',
            )}
          </p>
        </div>

        <ol className="grid gap-6 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title[0]} className="flex gap-4 sm:block">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-card">
                <step.icon className="size-[18px]" />
              </span>
              <div>
                <h3 className="font-semibold tracking-tight sm:mt-4">
                  <span className="mr-2 font-mono text-xs font-normal text-muted-foreground">0{i + 1}</span>
                  {t(step.title[0], step.title[1])}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(step.body[0], step.body[1])}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
