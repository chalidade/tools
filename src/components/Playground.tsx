import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowDown, DoorOpen, Gamepad2, ShieldCheck, Stamp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOOLS, categoryText, toolText } from '@/tools/registry'
import { getLang, useLang, useT } from '@/lib/i18n'
import { Dialog } from '@/components/playground/Dialog'
import { CALLS, TOWN_GREETINGS, TOWN_LINES, nameFor } from '@/components/playground/dialog'
import { lookFor } from '@/components/playground/Person'
import { RoomScenery, TownScenery } from '@/components/playground/Scenery'
import {
  GRASS_TILE,
  buildScenes,
  collide,
  findPath,
  placeName,
  type Door,
  type Point,
  type SceneId,
} from '@/components/playground/scenes'
import { CHATS, RESIDENTS, homeOf, uniformFor } from '@/components/playground/residents'
import { Dog, Keeper, Player, Townsperson } from '@/components/playground/Sprites'

/*
 * The home page is a small walkable town. Each category is a house; walk into
 * its door and inside, every tool of that category is a person (its keeper)
 * who explains what the tool does and offers to open it. Everything is laid
 * out from the registry, so a new tool shows up here with no extra work.
 *
 * Keys: WASD/arrows walk, Shift runs, E/Enter talks or goes through a door;
 * walking into a door (up into a house, down onto the mat) does too. On touch,
 * tap the ground to walk, a house to go in, a keeper to go talk to it.
 *
 * The loop mutates transforms on refs every frame and only touches React state
 * when something the UI shows changes (scene, who is in reach, the dialog,
 * stamps). The plain ToolGrid below stays the accessible way in — the world is
 * aria-hidden and has no tab stops.
 */

const WALK = 230
const RUN = 410
const PLAYER_R = 15
const NPC_R = 13
const REACH = 66
const DOOR_REACH = 36
const CALL_RANGE = 240

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

/** Keeper shirts, in tool order — neighbours in a house never match. */
const KEEPER_SHIRTS = ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#a855f7', '#eab308', '#ec4899', '#14b8a6', '#64748b']
const FACTS = [
  ['Gratis', 'Free'],
  ['Tanpa akun', 'No account'],
  ['Jalan di perangkatmu', 'Runs on your device'],
  ['Kode di GitHub', 'Code on GitHub'],
] as const

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

/** The intro floats over the map from md up; only there does playing tuck it away (on phones it sits above the map, and hiding it would shift the page). */
const floatingIntro = () => matchMedia('(min-width: 768px)').matches

/** Where the player stood when a tool was opened — back on the home page, they're still there. */
let saved: { scene: SceneId; pos: Point } | null = null

const VISITED_KEY = 'tools:visited'
function readVisited() {
  try {
    const raw = JSON.parse(localStorage.getItem(VISITED_KEY) ?? '[]')
    return new Set<string>(Array.isArray(raw) ? raw : [])
  } catch {
    return new Set<string>()
  }
}

interface Walker {
  home: Point
  /** Which side of them we see: front, back or profile. */
  dir: 'up' | 'down' | 'side'
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
  const scenes = useMemo(buildScenes, [])
  const town = scenes.town.kind === 'town' ? scenes.town : null
  const t = useT()
  const lang = useLang()
  /** "Masuk Perpustakaan · Dari PDF" / "Enter Library · From PDF", or "Exit". */
  const doorLabel = (door: Door) => {
    if (door.dir === 'down') return t('Keluar', 'Exit')
    const house = town?.houses.find((h) => h.id === door.to)
    if (!house) return door.label
    return `${t('Masuk', 'Enter')} ${placeName(house.style, lang)} · ${categoryText(house.id, lang).title}`
  }
  // Each keeper: a name, a look, and the uniform of the building it works in.
  const people = useMemo(() => {
    const style = new Map(town?.houses.flatMap((h) => h.tools.map((t, i) => [t.slug, uniformFor(h.style, i)] as const)))
    return new Map(
      TOOLS.map((t, i) => [
        t.slug,
        {
          name: nameFor(t, i),
          look: lookFor(t.slug, { shirt: KEEPER_SHIRTS[i % KEEPER_SHIRTS.length], ...style.get(t.slug) }),
        },
      ]),
    )
  }, [town])
  const townsfolk = useMemo(() => RESIDENTS.map((r) => lookFor(r.name, r.look)), [])

  const viewportRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)
  const fadeRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const viewRef = useRef<SVGRectElement>(null)
  const walkerEls = useRef<(HTMLDivElement | null)[]>([])
  const walkerBubbles = useRef<(HTMLSpanElement | null)[]>([])
  const dogEls = useRef(new Map<number, HTMLDivElement | null>())
  const dogs = useRef(new Map<number, { x: number; y: number; face: number }>())
  const grassEls = useRef<(HTMLDivElement | null)[]>([])
  const rustled = useRef('')
  const chat = useRef({ next: 4, line: 0, reply: -1 })
  const keeperEls = useRef(new Map<string, HTMLDivElement | null>())
  const keeperBubbles = useRef(new Map<string, HTMLSpanElement | null>())
  const keeperState = useRef(new Map(TOOLS.map((t) => [t.slug, { face: 1, next: 1 + Math.random() * 6, talk: 0 }])))

  const start = saved ?? { scene: 'town' as SceneId, pos: scenes.town.spawn }
  const [sceneId, setSceneId] = useState<SceneId>(start.scene)
  const sceneRef = useRef(scenes[start.scene])
  const scene = scenes[sceneId]

  const keys = useRef(new Set<string>())
  const active = useRef(false)
  const moving = useRef(false)
  const target = useRef<{ path: Point[]; talk?: string; door?: Door; stuck: number } | null>(null)
  const nearRef = useRef<string | null>(null)
  const doorRef = useRef<Door | null>(null)
  const talkingRef = useRef<string | null>(null)
  const game = useRef({
    pos: { ...start.pos },
    vel: { x: 0, y: 0 },
    face: 1,
    dir: 'down' as 'up' | 'down' | 'side',
    cam: { x: 0, y: 0 },
    snap: true,
    scale: 1,
    puff: 0,
  })
  const walkers = useRef<Walker[]>([])
  if (!walkers.current.length) {
    const t = scenes.town
    walkers.current = RESIDENTS.map((r, i) => {
      const home = t.kind === 'town' ? homeOf(r, t, i) : t.spawn
      const p =
        r.mode === 'wander'
          ? { x: 200 + Math.random() * (t.width - 400), y: 200 + Math.random() * (t.height - 400) }
          : { ...home }
      if (r.mode !== 'idle') collide(p, NPC_R, t)
      if (r.dog) dogs.current.set(i, { x: p.x - 30, y: p.y + 4, face: 1 })
      return {
        home,
        ...p,
        dir: (r.mode === 'idle' ? 'side' : 'down') as Walker['dir'],
        tx: p.x,
        ty: p.y,
        wait: Math.random() * 2,
        speed: r.speed,
        face: r.partner !== undefined ? (r.partner > i ? 1 : -1) : 1,
        talk: 0,
        next: 3 + i * 2 + Math.random() * 6,
        greeted: false,
        stuck: 0,
      }
    })
  }

  const [near, setNear] = useState<string | null>(null)
  const [nearDoor, setNearDoor] = useState<Door | null>(null)
  const [visited, setVisited] = useState(readVisited)
  // Coming back from a tool, the player is mid-game: keep the intro out of the way.
  const [introOpen, setIntroOpen] = useState(() => !saved || !floatingIntro())
  const [talking, setTalking] = useState<string | null>(null)
  talkingRef.current = talking

  const open = useCallback(
    (slug: string) => {
      saved = { scene: sceneRef.current.id, pos: { ...game.current.pos } }
      // Written straight away: the hash change unmounts this page before a state update would land.
      const next = readVisited().add(slug)
      try {
        localStorage.setItem(VISITED_KEY, JSON.stringify([...next]))
      } catch {
        // Private mode: stamps just won't persist.
      }
      setVisited(next)
      window.location.hash = `#/${slug}`
    },
    [],
  )

  /** Fade out, move the player through `door` into its scene, fade back in. */
  const go = useCallback(
    (door: Door) => {
      if (moving.current) return
      moving.current = true
      keys.current.clear()
      target.current = null
      if (floatingIntro()) setIntroOpen(false)
      const fade = fadeRef.current
      const swap = () => {
        const g = game.current
        sceneRef.current = scenes[door.to]
        g.pos = { ...door.spawn }
        g.vel = { x: 0, y: 0 }
        g.dir = door.dir
        g.snap = true
        nearRef.current = null
        doorRef.current = null
        setNear(null)
        setNearDoor(null)
        setSceneId(door.to)
        fade?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, fill: 'forwards' })
        moving.current = false
      }
      if (!fade || matchMedia('(prefers-reduced-motion: reduce)').matches) swap()
      else fade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: 'forwards' }).onfinish = swap
    },
    [scenes],
  )

  // Keyboard. Only while the world is on screen, so arrows still scroll the rest of the page.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // While a conversation is open the Dialog owns the keyboard.
      if (!active.current || talkingRef.current || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      const dir = KEYMAP[e.code]
      if (dir) {
        keys.current.add(dir)
        if (dir !== 'run') {
          e.preventDefault()
          if (floatingIntro()) setIntroOpen(false)
        }
        return
      }
      if ((e.code === 'KeyE' || e.key === 'Enter' || e.code === 'Space') && !isControl(e.target)) {
        if (nearRef.current) {
          e.preventDefault()
          keys.current.clear()
          setTalking(nearRef.current)
        } else if (doorRef.current) {
          e.preventDefault()
          go(doorRef.current)
        }
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
  }, [go])

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
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    const g = game.current

    const puff = (x: number, y: number) => {
      const el = document.createElement('span')
      el.className = 'pointer-events-none absolute size-3 rounded-full bg-white/50'
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
      const scene = sceneRef.current

      g.scale = vp.clientWidth < 640 ? 0.8 : 1
      const vw = vp.clientWidth / g.scale
      const vh = vp.clientHeight / g.scale

      // --- Player input: keys win over a click target; nothing moves mid-dialog or mid-door.
      const k = keys.current
      let ix = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0)
      let iy = (k.has('down') ? 1 : 0) - (k.has('up') ? 1 : 0)
      let speed = k.has('run') ? RUN : WALK
      if (talkingRef.current || moving.current) {
        ix = iy = 0
        target.current = null
      }
      const t = target.current
      if (ix || iy) target.current = null
      else if (t) {
        // Follow the waypoints; the last one is the destination.
        let p = t.path[0]
        while (t.path.length > 1 && Math.hypot(p.x - g.pos.x, p.y - g.pos.y) < 12) p = (t.path.shift(), t.path[0])
        const dx = p.x - g.pos.x
        const dy = p.y - g.pos.y
        const d = Math.hypot(dx, dy)
        const left = t.path.reduce((sum, q, i) => sum + (i ? Math.hypot(q.x - t.path[i - 1].x, q.y - t.path[i - 1].y) : d), 0)
        if (d < 6 && t.path.length === 1 && !t.door) target.current = null
        else if (d >= 6) {
          ix = dx / d
          iy = dy / d
          speed = left > 280 ? RUN : WALK
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
      collide(g.pos, PLAYER_R, scene)
      if (scene.kind === 'town') {
        for (const n of walkers.current) {
          const dx = g.pos.x - n.x
          const dy = g.pos.y - n.y
          const d = Math.hypot(dx, dy) || 0.001
          if (d < PLAYER_R + NPC_R) {
            g.pos.x = n.x + (dx / d) * (PLAYER_R + NPC_R)
            g.pos.y = n.y + (dy / d) * (PLAYER_R + NPC_R)
          }
        }
      }

      // A click target that can't be reached (a tree in the way) is given up.
      const moved = Math.hypot(g.pos.x - before.x, g.pos.y - before.y)
      if (target.current) {
        target.current.stuck = moved < 0.4 ? target.current.stuck + dt : 0
        if (target.current.stuck > 0.5) target.current = null
      }

      const vel = Math.hypot(g.vel.x, g.vel.y)
      const walking = vel > 25 && moved > 0.2
      if (Math.abs(g.vel.x) > 20) g.face = Math.sign(g.vel.x)
      if (walking) g.dir = Math.abs(g.vel.y) > Math.abs(g.vel.x) * 1.1 ? (g.vel.y < 0 ? 'up' : 'down') : 'side'

      if (walking && vel > RUN * 0.8) {
        g.puff -= dt
        if (g.puff <= 0) {
          g.puff = 0.07
          puff(g.pos.x, g.pos.y)
        }
      }

      // --- Doors: walk into one (or arrive at a clicked house) to go through.
      let door: Door | null = null
      for (const d of scene.doors) if (Math.hypot(g.pos.x - d.at.x, g.pos.y - d.at.y) < DOOR_REACH) door = d
      if (door !== doorRef.current) {
        doorRef.current = door
        setNearDoor(door)
      }
      if (door && !moving.current && !talkingRef.current) {
        const pushing = door.dir === 'up' ? iy < -0.5 : iy > 0.5
        if (pushing || target.current?.door === door) go(door)
      }

      // --- Keepers: who is within reach; they turn to watch the player and call out.
      let best: string | null = null
      let bestD = REACH
      for (const keeper of scene.keepers) {
        const slug = keeper.tool.slug
        const ks = keeperState.current.get(slug)!
        const d = Math.hypot(g.pos.x - keeper.home.x, g.pos.y - keeper.home.y)
        if (d < bestD) {
          bestD = d
          best = slug
        }
        if (Math.abs(g.pos.x - keeper.home.x) > 6) ks.face = Math.sign(g.pos.x - keeper.home.x)
        const bubble = keeperBubbles.current.get(slug)
        ks.next -= dt
        if (bubble && ks.next <= 0 && d > REACH && d < CALL_RANGE && !talkingRef.current) {
          ks.next = 8 + Math.random() * 10
          ks.talk = 2
          bubble.textContent = pick(CALLS[getLang()])
          bubble.dataset.show = ''
        }
        if (ks.talk > 0) {
          ks.talk -= dt
          if (ks.talk <= 0 || d < REACH) {
            ks.talk = 0
            if (bubble) delete bubble.dataset.show
          }
        }
        const flip = keeperEls.current.get(slug)?.querySelector<HTMLElement>('.pg-flip')
        if (flip) flip.style.transform = `scaleX(${ks.face})`
      }
      if (best !== nearRef.current) {
        nearRef.current = best
        setNear(best)
      }
      if (best && target.current?.talk === best) {
        target.current = null
        setTalking(best)
      }

      // --- Townsfolk: wander, stroll or stand chatting; greet the player and talk to themselves.
      if (scene.kind === 'town') {
        // Tall grass rustles where the player steps into it.
        let spot = ''
        scene.grass.forEach((patch, pi) => {
          if (g.pos.x < patch.x || g.pos.y < patch.y || g.pos.x >= patch.x + patch.w || g.pos.y >= patch.y + patch.h) return
          const cols = patch.w / GRASS_TILE
          spot = `${pi}:${Math.floor((g.pos.y - patch.y) / GRASS_TILE) * cols + Math.floor((g.pos.x - patch.x) / GRASS_TILE)}`
        })
        if (spot !== rustled.current) {
          rustled.current = spot
          const [pi, ti] = spot.split(':').map(Number)
          const tile = spot ? grassEls.current[pi]?.children[ti] : undefined
          tile?.animate(
            [{ transform: 'none' }, { transform: 'rotate(-12deg) scaleY(0.85)' }, { transform: 'rotate(10deg)' }, { transform: 'none' }],
            { duration: 380, easing: 'ease-out' },
          )
        }

        // The chatting pair take turns.
        const say = (i: number, text: string, seconds: number) => {
          const b = walkerBubbles.current[i]
          const n = walkers.current[i]
          if (!b || !n) return
          b.textContent = text
          b.dataset.show = ''
          n.talk = seconds
        }
        const c = chat.current
        c.next -= dt
        const pairA = RESIDENTS.findIndex((r) => r.partner !== undefined)
        if (pairA >= 0 && c.next <= 0) {
          const pairB = RESIDENTS[pairA].partner!
          if (c.reply < 0) {
            const chats = CHATS[getLang()]
            say(pairA, chats[c.line % chats.length][0], 2.6)
            c.reply = pairB
            c.next = 2.4
          } else {
            const chats = CHATS[getLang()]
            say(c.reply, chats[c.line % chats.length][1], 2.6)
            c.reply = -1
            c.line++
            c.next = 7 + Math.random() * 6
          }
        }

        walkers.current.forEach((n, i) => {
          const r = RESIDENTS[i]
          const toPlayer = Math.hypot(g.pos.x - n.x, g.pos.y - n.y)

          let mx = 0
          if (toPlayer < 80) {
            // Turn to face the visitor.
            n.face = Math.sign(g.pos.x - n.x) || n.face
            n.dir = 'down'
            if (!n.greeted) {
              n.greeted = true
              say(i, pick(TOWN_GREETINGS[getLang()]), 2.2)
            }
          } else {
            if (toPlayer > 160) n.greeted = false
            if (r.mode === 'idle') {
              const other = r.partner !== undefined ? walkers.current[r.partner] : undefined
              if (other) n.face = Math.sign(other.x - n.x) || n.face
              n.dir = 'side'
            } else if (n.wait > 0) n.wait -= dt
            else {
              const dx = n.tx - n.x
              const dy = n.ty - n.y
              const d = Math.hypot(dx, dy)
              if (d < 4 || n.stuck > 0.8) {
                // Children barely stop; everyone else pauses to look around.
                n.wait = r.speed > 100 ? Math.random() * 0.6 : 1 + Math.random() * 3
                n.stuck = 0
                const from = r.mode === 'stroll' ? n.home : n
                const reach = r.mode === 'stroll' ? 180 : 520
                n.tx = Math.min(Math.max(from.x + (Math.random() - 0.5) * reach * 2, 60), scene.width - 60)
                n.ty = Math.min(Math.max(from.y + (Math.random() - 0.5) * reach * 1.4, 80), scene.height - 60)
              } else {
                const ox = n.x
                const oy = n.y
                n.x += (dx / d) * n.speed * dt
                n.y += (dy / d) * n.speed * dt
                collide(n, NPC_R, scene)
                mx = Math.hypot(n.x - ox, n.y - oy)
                n.stuck = mx < n.speed * dt * 0.3 ? n.stuck + dt : 0
                if (Math.abs(dx) > 2) n.face = Math.sign(dx)
                n.dir = Math.abs(dy) > Math.abs(dx) * 1.1 ? (dy < 0 ? 'up' : 'down') : 'side'
              }
            }
          }

          n.next -= dt
          if (n.next <= 0 && r.mode !== 'idle') {
            n.next = 8 + Math.random() * 12
            if (toPlayer < 700) say(i, pick((r.lines ?? TOWN_LINES)[getLang()]), 3)
          }
          if (n.talk > 0) {
            n.talk -= dt
            if (n.talk <= 0) delete walkerBubbles.current[i]?.dataset.show
          }

          const el = walkerEls.current[i]
          if (!el) return
          el.style.transform = `translate3d(${n.x - 22}px, ${n.y - 60}px, 0)`
          el.style.zIndex = String(Math.round(n.y))
          if (mx > 0.1) el.dataset.walking = ''
          else delete el.dataset.walking
          // Standing still they turn to face us, unless they're mid-conversation.
          el.dataset.dir = mx > 0.1 || r.mode === 'idle' || toPlayer < 80 ? n.dir : 'down'
          const flip = el.querySelector<HTMLElement>('.pg-flip')
          if (flip) flip.style.transform = `scaleX(${n.dir === 'side' ? n.face : 1})`

          // A dog trots a step behind its owner.
          const dog = dogs.current.get(i)
          const dogEl = dogEls.current.get(i)
          if (dog && dogEl) {
            const tx = n.x - n.face * 30
            const ty = n.y + 6
            const dd = Math.hypot(tx - dog.x, ty - dog.y)
            let moving = false
            if (dd > 10) {
              const step = Math.min(dd, Math.max(n.speed * 1.3, 90) * dt)
              dog.x += ((tx - dog.x) / dd) * step
              dog.y += ((ty - dog.y) / dd) * step
              moving = true
              if (Math.abs(tx - dog.x) > 2) dog.face = Math.sign(tx - dog.x)
            } else dog.face = n.face
            dogEl.style.transform = `translate3d(${dog.x - 20}px, ${dog.y - 30}px, 0)`
            dogEl.style.zIndex = String(Math.round(dog.y))
            if (moving) dogEl.dataset.walking = ''
            else delete dogEl.dataset.walking
            const dogFlip = dogEl.querySelector<HTMLElement>('.pg-flip')
            if (dogFlip) dogFlip.style.transform = `scaleX(${dog.face})`
          }
        })
      }

      // --- Camera follows, clamped to the scene (centred when the scene is smaller).
      const fit = (pos: number, view: number, size: number) =>
        size <= view ? (size - view) / 2 : Math.min(Math.max(pos - view / 2, 0), size - view)
      const cx = fit(g.pos.x, vw, scene.width)
      const cy = fit(g.pos.y - 20, vh, scene.height)
      const follow = g.snap || first || reduceMotion ? 1 : 1 - Math.exp(-dt * 6)
      g.snap = false
      g.cam.x += (cx - g.cam.x) * follow
      g.cam.y += (cy - g.cam.y) * follow
      worldEl.style.transform = `translate3d(${-g.cam.x * g.scale}px, ${-g.cam.y * g.scale}px, 0) scale(${g.scale})`

      // --- Player sprite.
      playerEl.style.transform = `translate3d(${g.pos.x - 22}px, ${g.pos.y - 60}px, 0)`
      playerEl.style.zIndex = String(Math.round(g.pos.y))
      playerEl.dataset.dir = g.dir
      if (walking) playerEl.dataset.walking = ''
      else delete playerEl.dataset.walking
      if (walking && vel > RUN * 0.8) playerEl.dataset.running = ''
      else delete playerEl.dataset.running
      if (flipEl) flipEl.style.transform = `scaleX(${g.dir === 'side' ? g.face : 1})`

      dotRef.current?.setAttribute('cx', String(g.pos.x))
      dotRef.current?.setAttribute('cy', String(g.pos.y))
      const view = viewRef.current
      if (view) {
        view.setAttribute('x', String(Math.max(0, g.cam.x)))
        view.setAttribute('y', String(Math.max(0, g.cam.y)))
        view.setAttribute('width', String(Math.min(vw, scene.width)))
        view.setAttribute('height', String(Math.min(vh, scene.height)))
      }
      first = false
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [go])

  const toWorld = (e: MouseEvent) => {
    const r = viewportRef.current!.getBoundingClientRect()
    const { cam, scale } = game.current
    return { x: (e.clientX - r.left) / scale + cam.x, y: (e.clientY - r.top) / scale + cam.y }
  }

  const walkTo = (point: Point, intent: { talk?: string; door?: Door } = {}) => {
    if (talkingRef.current || moving.current) return
    const path = findPath(sceneRef.current, game.current.pos, point, PLAYER_R)
    if (!path) return
    target.current = { path, ...intent, stuck: 0 }
    if (floatingIntro()) setIntroOpen(false)
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
  const talkPerson = talking ? people.get(talking) : undefined

  return (
    <section aria-label="Beranda" className="relative isolate">
      {/* Intro: above the world on phones, floating over it from md up. */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className={cn(
          'relative px-5 pt-10 pb-7 sm:px-6 md:absolute md:top-6 md:left-6 md:z-20 md:w-[27rem] md:rounded-3xl md:border md:bg-card/85 md:p-7 md:shadow-2xl md:shadow-brand-2/10 md:backdrop-blur-xl',
          !introOpen && 'hidden',
        )}
      >
        <button
          type="button"
          onClick={() => setIntroOpen(false)}
          aria-label={t('Sembunyikan', 'Hide')}
          className="absolute top-6 right-4 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground md:top-4"
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
          {t('100% diproses di browser', '100% processed in your browser')}
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="mt-5 text-[2.4rem] leading-[1.04] font-semibold tracking-[-0.035em] text-balance sm:text-5xl md:text-[2.7rem]"
        >
          {t('Semua tools,', 'Every tool,')}
          <br />
          <span className="text-gradient">{t('langsung di browser.', 'right in your browser.')}</span>
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-4 leading-relaxed text-muted-foreground text-pretty">
          {t(
            'Kumpulan tools gratis untuk dokumen, PDF, gambar, video, audio, sampai data developer — semuanya jalan di perangkatmu. Masuki tiap bangunan dan tanya penjaganya bisa bantu apa.',
            'Free tools for documents, PDFs, images, video, audio and developer data — all running on your device. Step into each building and ask its keepers what they can do.',
          )}
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
            {t('Mulai jalan', 'Start exploring')}
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
            {t(`Lihat daftar ${TOOLS.length} tools`, `See all ${TOOLS.length} tools`)}
            <ArrowDown className="size-4" />
          </a>
        </motion.div>
        <motion.ul
          variants={fadeUp}
          className="mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground"
        >
          {FACTS.map((fact) => (
            <li key={fact[0]} className="flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-gradient-brand" />
              {t(fact[0], fact[1])}
            </li>
          ))}
        </motion.ul>
      </motion.div>

      <div
        ref={viewportRef}
        onClick={(e) => walkTo(toWorld(e))}
        className={cn(
          'relative h-[62vh] min-h-[400px] touch-pan-y overflow-clip border-y select-none md:h-[calc(100dvh-4rem)] md:max-h-[880px] md:min-h-[560px]',
          scene.kind === 'room' ? 'bg-[#0b0a0f]' : 'pg-grass',
        )}
      >
        <p className="sr-only">
          {t(
            'Peta interaktif berisi semua tools: tiap kategori adalah bangunan, dan di dalamnya tiap tool dijaga seorang tokoh. Gerakkan karakter dengan tombol panah atau WASD, masuk lewat pintu, dan tekan E di dekat tokoh untuk mengobrol. Daftar biasa ada di bawah.',
            'An interactive map of every tool: each category is a building, and inside each tool has a keeper. Move with the arrow keys or WASD, walk through doors, and press E next to someone to talk. The plain list is below.',
          )}
        </p>

        <div
          ref={worldRef}
          aria-hidden
          className="absolute top-0 left-0 origin-top-left will-change-transform"
          style={{ width: scene.width, height: scene.height }}
        >
          {scene.kind === 'town' && town ? (
            <TownScenery
              town={town}
              grassRef={(i, el) => {
                grassEls.current[i] = el
              }}
              visited={visited}
              nearHouse={nearDoor?.to ?? null}
              onHouse={(id) => {
                const door = town.doors.find((d) => d.to === id)
                if (!door) return
                if (nearDoor === door) go(door)
                else walkTo(door.at, { door })
              }}
            />
          ) : scene.kind === 'room' ? (
            <RoomScenery room={scene} />
          ) : null}

          {scene.keepers.map((keeper) => {
            const slug = keeper.tool.slug
            const person = people.get(slug)!
            return (
              <Keeper
                key={slug}
                ref={(el) => {
                  keeperEls.current.set(slug, el)
                }}
                bubbleRef={(el) => {
                  keeperBubbles.current.set(slug, el)
                }}
                keeper={keeper}
                name={person.name}
                look={person.look}
                near={near === slug}
                talking={talking === slug}
                visited={visited.has(slug)}
                onClick={() => (near === slug ? setTalking(slug) : walkTo(keeper.front, { talk: slug }))}
              />
            )
          })}

          {scene.kind === 'town' &&
            townsfolk.map((look, i) => (
              <Townsperson
                key={i}
                scale={RESIDENTS[i].scale}
                ref={(el) => {
                  walkerEls.current[i] = el
                }}
                bubbleRef={(el) => {
                  walkerBubbles.current[i] = el
                }}
                look={look}
              />
            ))}

          {scene.kind === 'town' &&
            RESIDENTS.map(
              (r, i) =>
                r.dog && (
                  <Dog
                    key={`dog-${i}`}
                    coat={r.dog}
                    ref={(el) => {
                      dogEls.current.set(i, el)
                    }}
                  />
                ),
            )}

          <Player ref={playerRef} />

          <div
            ref={markerRef}
            className="pointer-events-none absolute size-6 rounded-full border-2 border-white opacity-0"
            style={{ zIndex: 1 }}
          />

        </div>

        {/* Soft fade at the edges of the view, and the black of a doorway transition. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_20px_rgb(0_0_0/0.35)]" />
        <div ref={fadeRef} aria-hidden className="pointer-events-none absolute inset-0 z-30 bg-black opacity-0" />

        {/* HUD: minimap (town) + stamp count. */}
        <div
          aria-hidden
          className="absolute top-4 right-4 hidden w-44 rounded-2xl border bg-card/85 p-2.5 shadow-lg backdrop-blur sm:block"
          onClick={(e) => e.stopPropagation()}
        >
          {scene.kind === 'town' && town ? (
            <svg viewBox={`0 0 ${town.width} ${town.height}`} className="mb-2 block w-full">
              <rect width={town.width} height={town.height} rx={60} className="fill-[#8cc66d] dark:fill-[#1d3324]" />
              {town.paths.map((d, i) => (
                <path key={i} d={d} strokeWidth={60} strokeLinecap="round" fill="none" className="stroke-[#e8d7a8] dark:stroke-[#4a4234]" />
              ))}
              <ellipse cx={town.pond.x} cy={town.pond.y} rx={town.pond.rx} ry={town.pond.ry} className="fill-[#5fb3e0] dark:fill-[#183f5c]" />
              {town.houses.map((h) => (
                <rect
                  key={h.id}
                  x={h.rect.x}
                  y={h.rect.y}
                  width={h.rect.w}
                  height={h.rect.h}
                  rx={30}
                  style={{ fill: h.accent }}
                />
              ))}
              <rect ref={viewRef} rx={30} className="fill-none stroke-white/70" strokeWidth={14} />
              <circle ref={dotRef} r={40} className="fill-white stroke-black/60" strokeWidth={12} />
            </svg>
          ) : scene.kind === 'room' ? (
            <p className="mb-2 flex items-center gap-1.5 px-0.5 text-xs font-medium">
              <span className="size-2.5 rounded-full" style={{ background: scene.house.accent }} />
              {placeName(scene.house.style, lang)} · {categoryText(scene.house.id, lang).title}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2 px-0.5 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Stamp className="size-3.5" />
              {t('Paspor', 'Passport')}
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
            className="absolute top-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border bg-card/85 py-1.5 pr-3.5 pl-2 text-xs shadow-lg backdrop-blur sm:top-4 sm:left-4 sm:text-sm"
          >
            <span className="grid size-6 place-items-center rounded-full bg-gradient-brand text-white">
              <ShieldCheck className="size-3.5" />
            </span>
            {t('Semua tools,', 'Every tool,')}{' '}
            <span className="text-gradient font-medium">{t('langsung di browser.', 'right in your browser.')}</span>
          </button>
        )}

        {/* Bottom bar: the conversation, what's in reach, or how to play. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
          {talkTool && talkPerson ? (
            <Dialog
              key={talkTool.slug}
              tool={talkTool}
              name={talkPerson.name}
              look={talkPerson.look}
              onOpen={() => open(talkTool.slug)}
              onClose={() => setTalking(null)}
            />
          ) : nearTool ? (
            <Prompt
              onClick={() => setTalking(nearTool.slug)}
              icon={<nearTool.icon className="size-[18px]" />}
              title={t(`Ngobrol dengan ${people.get(nearTool.slug)?.name}`, `Talk to ${people.get(nearTool.slug)?.name}`)}
              subtitle={t(`Penjaga ${toolText(nearTool, lang).title}`, `Keeper of ${toolText(nearTool, lang).title}`)}
            />
          ) : nearDoor ? (
            <Prompt
              onClick={() => go(nearDoor)}
              icon={<DoorOpen className="size-[18px]" />}
              title={doorLabel(nearDoor)}
              subtitle={
                nearDoor.dir === 'up'
                  ? t('Lihat siapa saja yang ada di dalam', "See who's inside")
                  : t('Kembali ke kota', 'Back to town')
              }
            />
          ) : (
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border bg-card/85 px-4 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
              <span className="hidden items-center gap-1.5 pointer-fine:flex">
                <Key>W</Key>
                <Key>A</Key>
                <Key>S</Key>
                <Key>D</Key>
                {t('atau panah untuk jalan', 'or arrows to walk')}
              </span>
              <span className="hidden items-center gap-1.5 pointer-fine:flex">
                <Key>Shift</Key> {t('lari', 'run')}
              </span>
              <span className="hidden items-center gap-1.5 pointer-fine:flex">
                <Key>E</Key> {scene.kind === 'town' ? t('masuk / ngobrol', 'enter / talk') : t('ngobrol', 'talk')}
              </span>
              <span className="pointer-fine:hidden">
                {scene.kind === 'town'
                  ? t('Ketuk tanah untuk jalan, ketuk bangunan untuk masuk', 'Tap the ground to walk, tap a building to go in')
                  : t('Ketuk tokoh untuk ngobrol', 'Tap someone to talk')}
              </span>
              {scene.kind === 'room' && <span>· {t('injak keset di bawah untuk keluar', 'step on the mat below to leave')}</span>}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function Prompt({
  onClick,
  icon,
  title,
  subtitle,
}: {
  onClick: () => void
  icon: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="pointer-events-auto flex items-center gap-3 rounded-2xl border bg-card/95 py-2 pr-4 pl-2 shadow-xl shadow-brand-2/15 backdrop-blur"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-brand text-white">{icon}</span>
      <span className="text-left">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <kbd className="ml-1 hidden rounded-md border border-b-[3px] bg-muted px-2 py-0.5 font-mono text-xs pointer-fine:block">
        E
      </kbd>
    </button>
  )
}

function Key({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-b-2 bg-muted px-1.5 font-mono text-[10px] text-foreground">{children}</kbd>
  )
}
