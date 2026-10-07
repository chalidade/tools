import { motion } from 'motion/react'
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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
}

export function HowItWorks() {
  const t = useT()
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-20">
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="grid lg:grid-cols-[1fr_2fr]">
          <div className="relative border-b p-8 sm:p-10 lg:border-r lg:border-b-0">
            <div aria-hidden className="bg-glow absolute inset-0 opacity-70" />
            <div className="relative">
              <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{t('Cara kerja', 'How it works')}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                {t('Privat sejak awal, bukan sekadar janji.', 'Private by design, not just by promise.')}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {t(
                  'Situs ini statis — tidak punya backend sama sekali. Kodenya bisa dilihat di GitHub, jadi siapa pun bisa memeriksa bahwa tidak ada file yang dikirim keluar.',
                  'This site is static — it has no backend at all. The code is on GitHub, so anyone can check that no file is ever sent out.',
                )}
              </p>
            </div>
          </div>

          <motion.ol
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
            className="grid sm:grid-cols-3"
          >
            {STEPS.map((step, i) => (
              <motion.li
                key={step.title[0]}
                variants={fadeUp}
                className="border-b p-8 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl border bg-background">
                    <step.icon className="size-[18px]" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-6 font-semibold tracking-tight">{t(step.title[0], step.title[1])}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(step.body[0], step.body[1])}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  )
}
