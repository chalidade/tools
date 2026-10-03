import { motion } from 'motion/react'
import { Cpu, Download, FileUp } from 'lucide-react'

const STEPS = [
  {
    icon: FileUp,
    title: 'Pilih file',
    body: 'Tarik file ke halaman atau pilih dari perangkat. File dibaca langsung ke memori browser.',
  },
  {
    icon: Cpu,
    title: 'Diproses di perangkatmu',
    body: 'Konversi berjalan dengan JavaScript di tab ini. Tidak ada server yang menerima file-mu.',
  },
  {
    icon: Download,
    title: 'Unduh hasilnya',
    body: 'Hasil langsung tersimpan ke perangkat. Tutup tab, dan semua data ikut hilang.',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
}

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-20">
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="grid lg:grid-cols-[1fr_2fr]">
          <div className="relative border-b p-8 sm:p-10 lg:border-r lg:border-b-0">
            <div aria-hidden className="bg-glow absolute inset-0 opacity-70" />
            <div className="relative">
              <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Cara kerja</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Privat sejak awal, bukan sekadar janji.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Situs ini statis — tidak punya backend sama sekali. Kodenya bisa dilihat di GitHub, jadi
                siapa pun bisa memeriksa bahwa tidak ada file yang dikirim keluar.
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
                key={step.title}
                variants={fadeUp}
                className="border-b p-8 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl border bg-background">
                    <step.icon className="size-[18px]" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-6 font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  )
}
