import { motion } from 'motion/react'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { TOOLS } from '@/tools/registry'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

export function ToolGrid() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.h1
          variants={fadeUp}
          className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
        >
          Tools kecil, langsung di browser
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-4 max-w-2xl text-lg text-muted-foreground text-pretty">
          Konversi dan olah file tanpa upload. Semua proses berjalan di perangkatmu sendiri — file
          tidak dikirim ke server dan tidak disimpan di mana pun.
        </motion.p>
        <motion.p
          variants={fadeUp}
          className="mt-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground"
        >
          <ShieldCheck className="size-4 text-primary" />
          100% lokal · gratis · tanpa akun
        </motion.p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <motion.a
              key={tool.slug}
              variants={fadeUp}
              href={`#/${tool.slug}`}
              className="group flex flex-col rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between">
                <span className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                  <tool.icon className="size-5" />
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <h2 className="mt-5 text-lg font-medium">{tool.title}</h2>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{tool.description}</p>
              <p className="mt-4 font-mono text-xs text-muted-foreground/70">{tool.formats}</p>
            </motion.a>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
