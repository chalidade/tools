import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { motion } from 'motion/react'
import { ArrowDown, Gamepad2, ShieldCheck, Stamp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOOLS } from '@/tools/registry'
import { Dialog } from '@/components/playground/Dialog'
import { CALLS, colorFor } from '@/components/playground/dialog'
import { buildWorld, collide, type Point } from '@/components/playground/layout'
import { Keeper, NPC_TYPES, Npc, Plant, Player } from '@/components/playground/Sprites'

/*
 * The home page is a small walkable town: one district per category, one stall
 * character per tool, laid out from the registry (so a new tool shows up here
 * with no extra work). Walk with WASD/arrows, Shift to run, E/Enter next to a
 * tool to talk to it: it explains what it does and offers to open itself. On
 * touch, tap the ground to walk or a character to go talk to it.
 *
 * The loop mutates transforms on refs every frame and only touches React state
 * when something the UI shows changes (who is in reach, the dialog, stamps).
 * The plain ToolGrid below stays the accessible way in — the world is
 * aria-hidden and has no tab stops.
 */

const WALK = 230
const RUN = 410
const PLAYER_R = 15
const NPC_R = 12
const REACH = 64
const CALL_RANGE = 260

const KEYMAP: Record<string, 'up' | 'down' | 'left' | 'right' | 'run'> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
}

const LINES = [
  'Aku nggak pernah di-upload.',
  'Psst… semua diproses di sini.',
  'Kompres aku dong, berat nih.',
  'Pengin jadi PDF!',
  'Server? Nggak kenal.',
  '0 byte keluar. Mantap.',
  'Tutup tab, aku ikut hilang.',
  'Jalan-jalan dulu ah.',
]
const GREETINGS = ['Halo! 👋', 'Hai! Mau konversi apa?', 'Selamat datang!', 'Eh, ada tamu!']

const FACTS = ['Tanpa upload', 'Tanpa akun', 'Gratis', 'Kode di GitHub']

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

/** Where the player stood when a tool was opened — back on the home page, they're still there. */
let savedPosition: Point | null = null

const VISITED_KEY = 'tools:visited'
function readVisited() {
  try {
    const raw = JSON.parse(localStorage.getItem(VISITED_KEY) ?? '[]')
    return new Set<string>(Array.isArray(raw) ? raw : [])
  } catch {
    return new Set<string>()
  }
}

interface NpcState {
  x: number
  y: number
  tx: number
  ty: number
  wait: number
  speed: number
  face: number
  talk: number
  next: number
  greeted: boolean
  stuck: number
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)
const isControl = (t: EventTarget | null) => t instanceof HTMLElement && /^(A|BUTTON)$/.test(t.tagName)

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
}
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }

export function Playground() {
  const world = useMemo(buildWorld, [])

  const viewportRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const viewRef = useRef<SVGRectElement>(null)
  const npcEls = useRef<(HTMLDivElement | null)[]>([])
  const bubbleEls = useRef<(HTMLSpanElement | null)[]>([])
  const keeperEls = useRef<(HTMLDivElement | null)[]>([])
  const keeperBubbles = useRef<(HTMLSpanElement | null)[]>([])
  const keeperState = useRef(world.keepers.map(() => ({ face: 1, next: 1 + Math.random() * 6, talk: 0 })))

  const keys = useRef(new Set<string>())
  const active = useRef(false)
  const target = useRef<{ point: Point; talk?: string; stuck: number } | null>(null)
  const talkingRef = useRef<string | null>(null)
  const nearRef = useRef<string | null>(null)
  const game = useRef({
    pos: { ...(savedPosition ?? world.spawn) },
    vel: { x: 0, y: 0 },
    face: 1,
    cam: { x: 0, y: 0 },
    scale: 1,
    puff: 0,
  })
  const npcs = useRef<NpcState[]>([])
  if (!npcs.current.length) {
    npcs.current = NPC_TYPES.map((_, i) => {
      const zone = world.zones[i % world.zones.length].rect
      const p = { x: zone.x + 40 + Math.random() * (zone.w - 80), y: zone.y + zone.h - 30 }
      collide(p, NPC_R, world)
      return { ...p, tx: p.x, ty: p.y, wait: Math.random() * 2, speed: 55 + Math.random() * 40, face: 1, talk: 0, next: 2 + Math.random() * 10, greeted: false, stuck: 0 }
    })
  }

  const [near, setNear] = useState<string | null>(null)
  const [visited, setVisited] = useState(readVisited)
  const [introOpen, setIntroOpen] = useState(true)
  const [talking, setTalking] = useState<string | null>(null)
  talkingRef.current = talking

  const open = useCallback((slug: string) => {
    savedPosition = { ...game.current.pos }
    // Written straight away: the hash change unmounts this page before a state update would land.
    const next = readVisited().add(slug)
    try {
      localStorage.setItem(VISITED_KEY, JSON.stringify([...next]))
    } catch {
      // Private mode: stamps just won't persist.
    }
    setVisited(next)
    window.location.hash = `#/${slug}`
  }, [])

  // Keyboard. Only while the world is on screen, so arrows still scroll the rest of the page.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // While a conversation is open the Dialog owns the keyboard.
      if (!active.current || talkingRef.current || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      const dir = KEYMAP[e.code]
      if (dir) {
        keys.current.add(dir)
        if (dir !== 'run') e.preventDefault()
        if (dir !== 'run') setIntroOpen(false)
        return
      }
      if ((e.code === 'KeyE' || e.key === 'Enter' || e.code === 'Space') && nearRef.current && !isControl(e.target)) {
        e.preventDefault()
        keys.current.clear()
        setTalking(nearRef.current)
      }
    }
    const up = (e: KeyboardEvent) => {
      const dir = KEYMAP[e.code]
      if (dir) keys.current.delete(dir)
    }
    const clear = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        active.current = entry.intersectionRatio >= 0.45
        if (!active.current) keys.current.clear()
      },
      { threshold: [0, 0.45, 1] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // The game loop.
  useEffect(() => {
    const vp = viewportRef.current
    const worldEl = worldRef.current
    const playerEl = playerRef.current
    if (!vp || !worldEl || !playerEl) return
    const flipEl = playerEl.querySelector<HTMLElement>('.pg-flip')
    const eyesEl = playerEl.querySelector<SVGGElement>('.pg-eyes')
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    const g = game.current

    const puff = (x: number, y: number) => {
      const el = document.createElement('span')
      el.className = 'pointer-events-none absolute size-3 rounded-full bg-muted-foreground/40'
      el.style.left = `${x - 6 + (Math.random() - 0.5) * 8}px`
      el.style.top = `${y - 6}px`
      el.style.zIndex = String(Math.round(y) - 1)
      worldEl.appendChild(el)
      el.animate(
        [
          { opacity: 0.7, transform: 'scale(0.6)' },
          { opacity: 0, transform: 'translateY(-8px) scale(1.8)' },
        ],
        { duration: 520, easing: 'ease-out' },
      ).onfinish = () => el.remove()
    }

    let raf = 0
    let last = performance.now()
    let first = true

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!active.current && !first) return

      g.scale = vp.clientWidth < 640 ? 0.78 : 1
      const vw = vp.clientWidth / g.scale
      const vh = vp.clientHeight / g.scale

      // --- Player input: keys win over a click target.
      const k = keys.current
      let ix = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0)
      let iy = (k.has('down') ? 1 : 0) - (k.has('up') ? 1 : 0)
      let speed = k.has('run') ? RUN : WALK
      if (talkingRef.current) {
        ix = iy = 0
        target.current = null
      }
      const t = target.current
      if (ix || iy) target.current = null
      else if (t) {
        const dx = t.point.x - g.pos.x
        const dy = t.point.y - g.pos.y
        const d = Math.hypot(dx, dy)
        if (d < 6) target.current = null
        else {
          ix = dx / d
          iy = dy / d
          speed = d > 280 ? RUN : WALK
        }
      }
      const len = Math.hypot(ix, iy)
      if (len > 1) {
        ix /= len
        iy /= len
      }

      const ease = 1 - Math.exp(-dt * 12)
      g.vel.x += (ix * speed - g.vel.x) * ease
      g.vel.y += (iy * speed - g.vel.y) * ease
      const before = { ...g.pos }
      g.pos.x += g.vel.x * dt
      g.pos.y += g.vel.y * dt
      collide(g.pos, PLAYER_R, world)
      for (const n of npcs.current) {
        const dx = g.pos.x - n.x
        const dy = g.pos.y - n.y
        const d = Math.hypot(dx, dy) || 0.001
        if (d < PLAYER_R + NPC_R) {
          g.pos.x = n.x + (dx / d) * (PLAYER_R + NPC_R)
          g.pos.y = n.y + (dy / d) * (PLAYER_R + NPC_R)
        }
      }

      // A click target that can't be reached (a tree in the way) is given up.
      const moved = Math.hypot(g.pos.x - before.x, g.pos.y - before.y)
      if (target.current) {
        target.current.stuck = moved < 0.4 && dt > 0 ? target.current.stuck + dt : 0
        if (target.current.stuck > 0.5) target.current = null
      }

      const vel = Math.hypot(g.vel.x, g.vel.y)
      const walking = vel > 25 && moved > 0.2
      if (Math.abs(g.vel.x) > 20) g.face = Math.sign(g.vel.x)

      if (walking && vel > RUN * 0.8) {
        g.puff -= dt
        if (g.puff <= 0) {
          g.puff = 0.07
          puff(g.pos.x, g.pos.y)
        }
      }

      // --- Which tool is within reach; tool characters turn to watch the player.
      let best: string | null = null
      let bestD = REACH
      world.keepers.forEach((keeper, i) => {
        const ks = keeperState.current[i]
        const d = Math.hypot(g.pos.x - keeper.home.x, g.pos.y - keeper.home.y)
        if (d < bestD) {
          bestD = d
          best = keeper.tool.slug
        }
        if (d < CALL_RANGE * 1.4 && Math.abs(g.pos.x - keeper.home.x) > 6) ks.face = Math.sign(g.pos.x - keeper.home.x)
        const bubble = keeperBubbles.current[i]
        // Call out to a player passing by, now and then.
        ks.next -= dt
        if (bubble && ks.next <= 0 && d > REACH && d < CALL_RANGE && !talkingRef.current) {
          ks.next = 9 + Math.random() * 10
          ks.talk = 2
          bubble.textContent = pick(CALLS)
          bubble.dataset.show = ''
        }
        if (ks.talk > 0) {
          ks.talk -= dt
          if (ks.talk <= 0 || d < REACH) {
            ks.talk = 0
            if (bubble) delete bubble.dataset.show
          }
        }
        const flip = keeperEls.current[i]?.querySelector<HTMLElement>('.pg-flip')
        if (flip) flip.style.transform = `scaleX(${ks.face})`
      })
      if (best !== nearRef.current) {
        nearRef.current = best
        setNear(best)
      }
      if (best && target.current?.talk === best) {
        target.current = null
        setTalking(best)
      }

      // --- Wandering files.
      npcs.current.forEach((n, i) => {
        const toPlayer = Math.hypot(g.pos.x - n.x, g.pos.y - n.y)
        const say = (text: string, seconds: number) => {
          const b = bubbleEls.current[i]
          if (!b) return
          b.textContent = text
          b.dataset.show = ''
          n.talk = seconds
        }

        let mx = 0
        if (toPlayer < 80) {
          // Stop and look at the visitor.
          n.face = Math.sign(g.pos.x - n.x) || n.face
          if (!n.greeted) {
            n.greeted = true
            say(pick(GREETINGS), 2.2)
          }
        } else {
          if (toPlayer > 160) n.greeted = false
          if (n.wait > 0) n.wait -= dt
          else {
            const dx = n.tx - n.x
            const dy = n.ty - n.y
            const d = Math.hypot(dx, dy)
            if (d < 4 || n.stuck > 0.8) {
              n.wait = 0.8 + Math.random() * 2.6
              n.stuck = 0
              n.tx = Math.min(Math.max(n.x + (Math.random() - 0.5) * 520, 40), world.width - 40)
              n.ty = Math.min(Math.max(n.y + (Math.random() - 0.5) * 420, 60), world.height - 40)
            } else {
              const ox = n.x
              const oy = n.y
              n.x += (dx / d) * n.speed * dt
              n.y += (dy / d) * n.speed * dt
              collide(n, NPC_R, world)
              mx = Math.hypot(n.x - ox, n.y - oy)
              n.stuck = mx < n.speed * dt * 0.3 ? n.stuck + dt : 0
              if (Math.abs(dx) > 2) n.face = Math.sign(dx)
            }
          }
        }

        n.next -= dt
        if (n.next <= 0) {
          n.next = 7 + Math.random() * 12
          if (toPlayer < 700) say(pick(LINES), 2.8)
        }
        if (n.talk > 0) {
          n.talk -= dt
          if (n.talk <= 0) delete bubbleEls.current[i]?.dataset.show
        }

        const el = npcEls.current[i]
        if (!el) return
        el.style.transform = `translate3d(${n.x - 17}px, ${n.y - 44}px, 0)`
        el.style.zIndex = String(Math.round(n.y) + (n.talk > 0 ? 3000 : 0))
        if (mx > 0.1) el.dataset.walking = ''
        else delete el.dataset.walking
        const flip = el.querySelector<HTMLElement>('.pg-flip')
        if (flip) flip.style.transform = `scaleX(${n.face})`
      })

      // --- Camera follows, clamped to the world (centred when the world is smaller).
      const fit = (pos: number, view: number, size: number) =>
        size <= view ? (size - view) / 2 : Math.min(Math.max(pos - view / 2, 0), size - view)
      const cx = fit(g.pos.x, vw, world.width)
      const cy = fit(g.pos.y - 20, vh, world.height)
      const follow = first || reduceMotion ? 1 : 1 - Math.exp(-dt * 6)
      g.cam.x += (cx - g.cam.x) * follow
      g.cam.y += (cy - g.cam.y) * follow
      worldEl.style.transform = `translate3d(${-g.cam.x * g.scale}px, ${-g.cam.y * g.scale}px, 0) scale(${g.scale})`

      // --- Player sprite.
      playerEl.style.transform = `translate3d(${g.pos.x - 22}px, ${g.pos.y - 52}px, 0)`
      playerEl.style.zIndex = String(Math.round(g.pos.y))
      if (walking) playerEl.dataset.walking = ''
      else delete playerEl.dataset.walking
      if (walking && vel > RUN * 0.8) playerEl.dataset.running = ''
      else delete playerEl.dataset.running
      if (flipEl) flipEl.style.transform = `scaleX(${g.face})`
      if (eyesEl) eyesEl.style.transform = `translate(${(Math.abs(g.vel.x) / RUN) * 2}px, ${(g.vel.y / RUN) * 3}px)`

      dotRef.current?.setAttribute('cx', String(g.pos.x))
      dotRef.current?.setAttribute('cy', String(g.pos.y))
      const view = viewRef.current
      if (view) {
        view.setAttribute('x', String(Math.max(0, g.cam.x)))
        view.setAttribute('y', String(Math.max(0, g.cam.y)))
        view.setAttribute('width', String(Math.min(vw, world.width)))
        view.setAttribute('height', String(Math.min(vh, world.height)))
      }
      first = false
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [world])

  const toWorld = (e: MouseEvent) => {
    const r = viewportRef.current!.getBoundingClientRect()
    const { cam, scale } = game.current
    return { x: (e.clientX - r.left) / scale + cam.x, y: (e.clientY - r.top) / scale + cam.y }
  }

  const walkTo = (point: Point, slug?: string) => {
    if (talkingRef.current) return
    target.current = { point, talk: slug, stuck: 0 }
    setIntroOpen(false)
    const m = markerRef.current
    if (!m) return
    m.style.left = `${point.x - 12}px`
    m.style.top = `${point.y - 8}px`
    m.animate(
      [
        { opacity: 1, transform: 'scale(0.4)' },
        { opacity: 0, transform: 'scale(1.4)' },
      ],
      { duration: 600, easing: 'ease-out' },
    )
  }

  const visitedCount = TOOLS.filter((t) => visited.has(t.slug)).length
  const nearTool = near ? TOOLS.find((t) => t.slug === near) : undefined
  const talkTool = talking ? TOOLS.find((t) => t.slug === talking) : undefined
  const fireflies = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        x: ((i * 7919) % 1000) / 1000,
        y: ((i * 104729) % 1000) / 1000,
        delay: -((i * 37) % 90) / 10,
        duration: 6 + ((i * 13) % 6),
      })),
    [],
  )

  return (
    <section aria-label="Beranda" className="relative isolate">
      {/* Intro: above the world on phones, floating over it from md up. */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className={cn(
          'relative px-5 pt-10 pb-7 sm:px-6 md:absolute md:top-6 md:left-6 md:z-20 md:w-[27rem] md:rounded-3xl md:border md:bg-card/85 md:p-7 md:shadow-2xl md:shadow-brand-2/10 md:backdrop-blur-xl',
          !introOpen && 'md:hidden',
        )}
      >
        <button
          type="button"
          onClick={() => setIntroOpen(false)}
          aria-label="Sembunyikan"
          className="absolute top-4 right-4 hidden size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground md:grid"
        >
          <X className="size-4" />
        </button>
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
          className="mt-5 text-[2.4rem] leading-[1.04] font-semibold tracking-[-0.035em] text-balance sm:text-5xl md:text-[2.7rem]"
        >
          Konversi file,
          <br />
          <span className="text-gradient">tanpa upload.</span>
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-4 leading-relaxed text-muted-foreground text-pretty">
          Kumpulan tools kecil yang bekerja langsung di perangkatmu. Sapa tiap tool, tanya bisa bantu apa — file
          tidak pernah meninggalkan browser.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIntroOpen(false)
              viewportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
            }}
            className="group hidden h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 md:inline-flex"
          >
            <Gamepad2 className="size-4" />
            Mulai jalan
          </button>
          <a
            href="#/"
            // Scroll instead of navigating: the hash is the router (#/<tool>).
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium shadow-xs transition-transform hover:-translate-y-0.5 max-md:bg-primary max-md:text-primary-foreground"
          >
            Lihat daftar {TOOLS.length} tools
            <ArrowDown className="size-4" />
          </a>
        </motion.div>
        <motion.ul
          variants={fadeUp}
          className="mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground"
        >
          {FACTS.map((fact) => (
            <li key={fact} className="flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-gradient-brand" />
              {fact}
            </li>
          ))}
        </motion.ul>
      </motion.div>

      <div
        ref={viewportRef}
        onClick={(e) => walkTo(toWorld(e))}
        className="relative h-[62vh] min-h-[400px] touch-pan-y overflow-clip border-y select-none md:h-[calc(100dvh-4rem)] md:max-h-[880px] md:min-h-[560px]"
      >
        <p className="sr-only">
          Peta interaktif berisi semua tools: gerakkan karakter dengan tombol panah atau WASD dan tekan E di
          dekat sebuah tool untuk mengobrol dengannya. Daftar biasa ada di bawah.
        </p>

        <div
          ref={worldRef}
          aria-hidden
          className="pg-ground absolute top-0 left-0 origin-top-left will-change-transform"
          style={{ width: world.width, height: world.height }}
        >
          {world.zones.map((zone) => (
            <div
              key={zone.id}
              className="absolute rounded-[2rem] border-2 border-dashed border-brand-2/25 bg-card/45 dark:bg-card/35"
              style={{ left: zone.rect.x, top: zone.rect.y, width: zone.rect.w, height: zone.rect.h }}
            >
              <div className="absolute top-4 left-6 flex items-baseline gap-3">
                <span className="text-xl font-semibold tracking-tight">{zone.title}</span>
                <span className="font-mono text-xs text-muted-foreground">{zone.keepers.length} tools</span>
              </div>
              <span className="absolute top-11 left-6 text-xs text-muted-foreground">{zone.description}</span>
            </div>
          ))}

          {/* Plaza with the monument the player spawns under. */}
          <div
            className="absolute rounded-[3rem] border bg-muted/50"
            style={{ left: world.plaza.x, top: world.plaza.y, width: world.plaza.w, height: world.plaza.h }}
          >
            <span className="absolute inset-6 rounded-[2.4rem] border border-dashed" />
            <span className="absolute inset-x-0 bottom-7 text-center font-mono text-xs text-muted-foreground">
              Selamat datang · {TOOLS.length} tools · 0 byte di-upload
            </span>
          </div>
          <div
            className="absolute"
            style={{
              left: world.monument.x - world.monument.r,
              top: world.monument.y - world.monument.r * 1.9,
              width: world.monument.r * 2,
              height: world.monument.r * 2.4,
              zIndex: Math.round(world.monument.y + world.monument.r),
            }}
          >
            <span className="absolute inset-x-0 bottom-0 h-1/3 rounded-[50%] bg-black/15" />
            <span className="absolute inset-x-3 bottom-[12%] h-1/4 rounded-[50%] border bg-card" />
            <div className="pg-float absolute inset-x-4 top-0 aspect-square">
              <span className="absolute -inset-3 rounded-full bg-gradient-brand opacity-30 blur-xl" />
              <span className="relative grid size-full place-items-center rounded-full bg-gradient-brand text-white shadow-xl shadow-brand-2/30">
                <ShieldCheck className="size-9" />
              </span>
            </div>
          </div>

          {world.trees.map((tree, i) => (
            <Plant key={i} tree={tree} index={i} />
          ))}

          {world.keepers.map((keeper, i) => (
            <Keeper
              key={keeper.tool.slug}
              ref={(el) => {
                keeperEls.current[i] = el
              }}
              bubbleRef={(el) => {
                keeperBubbles.current[i] = el
              }}
              keeper={keeper}
              color={colorFor(keeper.tool)}
              near={near === keeper.tool.slug}
              talking={talking === keeper.tool.slug}
              visited={visited.has(keeper.tool.slug)}
              onClick={() =>
                near === keeper.tool.slug ? setTalking(keeper.tool.slug) : walkTo(keeper.front, keeper.tool.slug)
              }
            />
          ))}

          {NPC_TYPES.map((npc, i) => (
            <Npc
              key={npc.label}
              ref={(el) => {
                npcEls.current[i] = el
              }}
              bubbleRef={(el) => {
                bubbleEls.current[i] = el
              }}
              label={npc.label}
              fill={npc.fill}
            />
          ))}

          <Player ref={playerRef} />

          <div
            ref={markerRef}
            className="pointer-events-none absolute size-6 rounded-full border-2 border-brand-2 opacity-0"
            style={{ zIndex: 1 }}
          />

          {fireflies.map((f, i) => (
            <span
              key={i}
              className="pg-firefly pointer-events-none absolute size-1.5 rounded-full bg-brand-2/50 dark:bg-amber-200 dark:shadow-[0_0_10px_3px] dark:shadow-amber-200/60"
              style={{
                left: f.x * world.width,
                top: f.y * world.height,
                zIndex: 9000,
                animationDelay: `${f.delay}s`,
                animationDuration: `${f.duration}s`,
              }}
            />
          ))}
        </div>

        {/* Soft fade at the edges of the view. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_20px_var(--background)]" />

        {/* HUD: minimap + stamp count. */}
        <div
          aria-hidden
          className="absolute top-4 right-4 hidden w-44 rounded-2xl border bg-card/85 p-2.5 shadow-lg backdrop-blur sm:block"
          onClick={(e) => e.stopPropagation()}
        >
          <svg viewBox={`0 0 ${world.width} ${world.height}`} className="block w-full">
            <rect width={world.width} height={world.height} rx={60} className="fill-muted" />
            <rect
              x={world.plaza.x}
              y={world.plaza.y}
              width={world.plaza.w}
              height={world.plaza.h}
              rx={60}
              className="fill-border"
            />
            {world.keepers.map((k) => (
              <circle
                key={k.tool.slug}
                cx={k.home.x}
                cy={k.home.y - 20}
                r={42}
                className={visited.has(k.tool.slug) ? 'fill-emerald-500' : 'fill-brand-2/60'}
              />
            ))}
            <rect ref={viewRef} rx={30} className="fill-none stroke-foreground/40" strokeWidth={14} />
            <circle ref={dotRef} r={38} className="fill-foreground stroke-card" strokeWidth={14} />
          </svg>
          <div className="mt-2 flex items-center justify-between gap-2 px-0.5 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Stamp className="size-3.5" />
              Paspor
            </span>
            <span className="font-mono font-medium">
              {visitedCount}/{TOOLS.length}
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-brand transition-[width] duration-500"
              style={{ width: `${(visitedCount / TOOLS.length) * 100}%` }}
            />
          </div>
        </div>

        {!introOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIntroOpen(true)
            }}
            className="absolute top-4 left-4 hidden items-center gap-2 rounded-full border bg-card/85 py-1.5 pr-3.5 pl-2 text-sm shadow-lg backdrop-blur md:flex"
          >
            <span className="grid size-6 place-items-center rounded-full bg-gradient-brand text-white">
              <ShieldCheck className="size-3.5" />
            </span>
            Konversi file, <span className="text-gradient font-medium">tanpa upload.</span>
          </button>
        )}

        {/* Bottom bar: the conversation, the tool in reach, or how to play. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
          {talkTool ? (
            <Dialog
              key={talkTool.slug}
              tool={talkTool}
              color={colorFor(talkTool)}
              onOpen={() => open(talkTool.slug)}
              onClose={() => setTalking(null)}
            />
          ) : nearTool ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setTalking(nearTool.slug)
              }}
              className="pointer-events-auto flex items-center gap-3 rounded-2xl border bg-card/95 py-2 pr-4 pl-2 shadow-xl shadow-brand-2/15 backdrop-blur"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-gradient-brand text-white">
                <nearTool.icon className="size-[18px]" />
              </span>
              <span className="text-left">
                <span className="block text-sm font-semibold">Ngobrol dengan {nearTool.title}</span>
                <span className="block text-xs text-muted-foreground">Tanya dia bisa bantu apa</span>
              </span>
              <kbd className="ml-1 hidden rounded-md border border-b-[3px] bg-muted px-2 py-0.5 font-mono text-xs pointer-fine:block">
                E
              </kbd>
            </button>
          ) : (
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border bg-card/85 px-4 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
              <span className="hidden items-center gap-1.5 pointer-fine:flex">
                <Key>W</Key>
                <Key>A</Key>
                <Key>S</Key>
                <Key>D</Key>
                atau panah untuk jalan
              </span>
              <span className="hidden items-center gap-1.5 pointer-fine:flex">
                <Key>Shift</Key> lari
              </span>
              <span className="hidden items-center gap-1.5 pointer-fine:flex">
                <Key>E</Key> ngobrol
              </span>
              <span className="pointer-fine:hidden">Ketuk tanah untuk jalan, ketuk tokoh untuk ngobrol</span>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function Key({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-b-2 bg-muted px-1.5 font-mono text-[10px] text-foreground">{children}</kbd>
  )
}
