import { motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { TOOLS } from '@/tools/registry'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
}

export function ToolGrid() {
  return (
    <section id="tools" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-12 sm:px-6 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Tools</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Pilih yang kamu butuhkan</h2>
        </div>
        <p className="hidden font-mono text-xs text-muted-foreground sm:block">
          {String(TOOLS.length).padStart(2, '0')} tersedia · terus bertambah
        </p>
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {TOOLS.map((tool) => (
          <motion.a
            key={tool.slug}
            variants={fadeUp}
            href={`#/${tool.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-2/10"
          >
            {/* Gradient hairline that lights up on hover. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl p-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)] bg-gradient-brand"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-gradient-brand opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
            />

            <div className="flex items-start justify-between">
              <span className="grid size-11 place-items-center rounded-xl bg-gradient-brand text-white shadow-md shadow-brand-2/25">
                <tool.icon className="size-5" />
              </span>
              <div className="flex items-center gap-2">
                {tool.badge && (
                  <span className="rounded-full border border-brand-2/30 bg-brand-2/10 px-2 py-0.5 text-[11px] font-medium text-brand-2">
                    {tool.badge}
                  </span>
                )}
                <ArrowUpRight className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
              </div>
            </div>

            <h3 className="mt-6 text-lg font-semibold tracking-tight">{tool.title}</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>

            <div className="mt-6 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              {tool.formats.split('→').map((part, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden>→</span>}
                  <span className="rounded-md border bg-muted px-1.5 py-0.5 text-foreground/80">{part.trim()}</span>
                </span>
              ))}
            </div>
          </motion.a>
        ))}

        <motion.div
          variants={fadeUp}
          className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center"
        >
          <p className="text-sm font-medium">Tool berikutnya menyusul</p>
          <p className="mt-1 text-sm text-muted-foreground">Ditambah satu per satu.</p>
        </motion.div>
      </motion.div>
    </section>
  )
}
