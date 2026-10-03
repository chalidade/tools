import { motion } from 'motion/react'
import { ArrowDown, ArrowRight, Lock, ShieldCheck } from 'lucide-react'
import { TOOLS } from '@/tools/registry'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const FACTS = ['Tanpa upload', 'Tanpa akun', 'Gratis', 'Kode di GitHub']

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="bg-glow absolute inset-0 -z-10" />
      <div aria-hidden className="bg-grid absolute inset-0 -z-10" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-16 pb-10 sm:px-6 sm:pt-24 sm:pb-14 lg:grid-cols-[1.15fr_1fr]"
      >
        <div>
          <motion.p
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border bg-card/70 py-1 pr-3.5 pl-2 text-sm text-muted-foreground shadow-xs backdrop-blur"
          >
            <span className="grid size-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" />
            </span>
            100% diproses di browser
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="mt-7 max-w-3xl text-[2.6rem] leading-[1.04] font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl"
          >
            Konversi file,
            <br />
            <span className="text-gradient">tanpa upload.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty"
          >
            Kumpulan tools kecil yang bekerja langsung di perangkatmu. File tidak pernah meninggalkan
            browser — tidak dikirim ke server, tidak disimpan di mana pun.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#/"
              // Scroll instead of navigating: the hash is the router (#/<tool>).
              onClick={(e) => {
                e.preventDefault()
                document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="group inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
            >
              Lihat {TOOLS.length} tools
              <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" />
            </a>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
              {FACTS.map((fact) => (
                <li key={fact} className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-gradient-brand" />
                  {fact}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div variants={fadeUp} className="hidden lg:block">
          <ConversionCard />
        </motion.div>
      </motion.div>
    </section>
  )
}

/** Decorative: a file converting on-device, looping. Not interactive. */
function ConversionCard() {
  return (
    <div aria-hidden className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-brand opacity-20 blur-3xl" />
      <div className="rounded-3xl border bg-card/80 p-6 shadow-2xl shadow-brand-2/10 backdrop-blur-xl">
        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            perangkat ini
          </span>
          <span>lokal</span>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <FileTile ext="DOCX" name="laporan.docx" tone="from-sky-500 to-blue-600" />
          <motion.span
            animate={{ x: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="grid size-10 shrink-0 place-items-center rounded-full border bg-background"
          >
            <ArrowRight className="size-4" />
          </motion.span>
          <FileTile ext="PDF" name="laporan.pdf" tone="from-violet-500 to-fuchsia-500" />
        </div>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gradient-brand"
            animate={{ width: ['0%', '100%', '100%'] }}
            transition={{ duration: 2.8, times: [0, 0.7, 1], repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Lock className="size-3.5" />
            Tidak ada yang dikirim ke server
          </span>
          <span className="font-mono text-foreground/80">0 B di-upload</span>
        </div>
      </div>
    </div>
  )
}

function FileTile({ ext, name, tone }: { ext: string; name: string; tone: string }) {
  return (
    <div className="flex-1 rounded-2xl border bg-background p-4">
      <div className={`relative h-24 rounded-lg bg-gradient-to-br ${tone} p-3`}>
        <div className="space-y-1.5 opacity-70">
          <div className="h-1.5 w-3/4 rounded-full bg-white/80" />
          <div className="h-1.5 w-full rounded-full bg-white/50" />
          <div className="h-1.5 w-5/6 rounded-full bg-white/50" />
          <div className="h-1.5 w-2/3 rounded-full bg-white/50" />
        </div>
        <span className="absolute right-2 bottom-2 rounded-md bg-black/25 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white">
          {ext}
        </span>
      </div>
      <p className="mt-3 truncate font-mono text-[11px] text-muted-foreground">{name}</p>
    </div>
  )
}
