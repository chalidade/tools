// Device frames drawn from plain shapes (no brand artwork), around a screenshot.
export type Frame = 'browser' | 'phone' | 'laptop' | 'none'
export type Ratio = 'auto' | '16:9' | '4:3' | '1:1' | '4:5' | '9:16'

export interface Scene {
  frame: Frame
  dark: boolean
  /** Solid colour, or a two-stop gradient "a,b". */
  background: string
  backgroundImage: CanvasImageSource | null
  backgroundSize: { width: number; height: number } | null
  transparent: boolean
  shadow: boolean
  /** Space around the device, as a share of its larger side. */
  padding: number
  ratio: Ratio
  url: string
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** The device's outer size and where the screenshot sits in it, for a shot of w × h. */
function layout(frame: Frame, w: number, h: number) {
  const u = Math.max(w, h) / 1000
  switch (frame) {
    case 'browser': {
      const bar = Math.round(Math.max(36, 52 * u))
      return { u, outer: { w, h: h + bar }, screen: { x: 0, y: bar, w, h }, bar }
    }
    case 'phone': {
      const bezel = Math.round(Math.max(10, 0.035 * Math.min(w, h * 0.6)))
      return { u, outer: { w: w + bezel * 2, h: h + bezel * 2 }, screen: { x: bezel, y: bezel, w, h }, bar: bezel }
    }
    case 'laptop': {
      const side = Math.round(Math.max(10, 0.025 * w))
      const top = Math.round(side * 1.4)
      const lidW = w + side * 2
      const base = Math.round(lidW * 0.035)
      const extra = Math.round(lidW * 0.08)
      return { u, outer: { w: lidW + extra * 2, h: h + top + side + base }, screen: { x: extra + side, y: top, w, h }, bar: side, base, extra, top }
    }
    default:
      return { u, outer: { w, h }, screen: { x: 0, y: 0, w, h }, bar: 0 }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, b: Box, r: number | number[]) {
  ctx.beginPath()
  ctx.roundRect(b.x, b.y, b.w, b.h, r)
}

/** Fits an image like CSS background-size: cover. */
function cover(ctx: CanvasRenderingContext2D, img: CanvasImageSource, iw: number, ih: number, w: number, h: number) {
  const s = Math.max(w / iw, h / ih)
  ctx.drawImage(img, (w - iw * s) / 2, (h - ih * s) / 2, iw * s, ih * s)
}

export const RATIOS: Record<Exclude<Ratio, 'auto'>, number> = { '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1, '4:5': 4 / 5, '9:16': 9 / 16 }

/** Draws the whole picture: background, shadow, device, screenshot. */
export function drawMockup(canvas: HTMLCanvasElement, shot: CanvasImageSource, sw: number, sh: number, scene: Scene) {
  const L = layout(scene.frame, sw, sh)
  const pad = Math.round(Math.max(L.outer.w, L.outer.h) * scene.padding)
  let W = L.outer.w + pad * 2
  let H = L.outer.h + pad * 2
  if (scene.ratio !== 'auto') {
    const r = RATIOS[scene.ratio]
    if (W / H > r) H = Math.round(W / r)
    else W = Math.round(H * r)
  }
  // Keep the canvas inside what browsers can allocate.
  const scale = Math.min(1, 8000 / Math.max(W, H))
  canvas.width = Math.round(W * scale)
  canvas.height = Math.round(H * scale)
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, W, H)

  if (!scene.transparent) {
    if (scene.backgroundImage && scene.backgroundSize) cover(ctx, scene.backgroundImage, scene.backgroundSize.width, scene.backgroundSize.height, W, H)
    else {
      const [a, b] = scene.background.split(',')
      if (b) {
        const g = ctx.createLinearGradient(0, 0, W, H)
        g.addColorStop(0, a)
        g.addColorStop(1, b)
        ctx.fillStyle = g
      } else ctx.fillStyle = a
      ctx.fillRect(0, 0, W, H)
    }
  }

  const ox = Math.round((W - L.outer.w) / 2)
  const oy = Math.round((H - L.outer.h) / 2)
  const u = L.u
  const body = scene.dark ? '#1c1c1f' : '#e8e8ec'
  const edge = scene.dark ? '#2e2e33' : '#cfcfd6'
  const shadowOn = () => {
    if (!scene.shadow) return
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 80 * u
    ctx.shadowOffsetY = 28 * u
  }
  const shadowOff = () => {
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
  }
  const screen = { x: ox + L.screen.x, y: oy + L.screen.y, w: sw, h: sh }

  if (scene.frame === 'browser') {
    const r = 14 * u + 4
    const outer = { x: ox, y: oy, w: L.outer.w, h: L.outer.h }
    shadowOn()
    ctx.fillStyle = scene.dark ? '#26262a' : '#f2f2f5'
    roundRect(ctx, outer, r)
    ctx.fill()
    shadowOff()
    const bar = L.bar
    const dot = bar * 0.12
    ;['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.arc(ox + bar * 0.6 + i * dot * 3.2, oy + bar / 2, dot, 0, Math.PI * 2)
      ctx.fill()
    })
    const pillW = Math.min(L.outer.w * 0.5, L.outer.w - bar * 4)
    const pill = { x: ox + (L.outer.w - pillW) / 2, y: oy + bar * 0.22, w: pillW, h: bar * 0.56 }
    ctx.fillStyle = scene.dark ? '#36363c' : '#ffffff'
    roundRect(ctx, pill, pill.h / 2)
    ctx.fill()
    if (scene.url) {
      ctx.fillStyle = scene.dark ? '#a1a1aa' : '#52525b'
      ctx.font = `${Math.round(pill.h * 0.5)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(scene.url, pill.x + pill.w / 2, pill.y + pill.h / 2, pill.w - pill.h)
    }
    ctx.save()
    roundRect(ctx, screen, [0, 0, r, r])
    ctx.clip()
    ctx.drawImage(shot, screen.x, screen.y, sw, sh)
    ctx.restore()
  } else if (scene.frame === 'phone') {
    const bezel = L.bar
    const inner = Math.min(sw, sh) * 0.09
    const outer = { x: ox, y: oy, w: L.outer.w, h: L.outer.h }
    shadowOn()
    ctx.fillStyle = edge
    roundRect(ctx, outer, inner + bezel)
    ctx.fill()
    shadowOff()
    ctx.fillStyle = '#0b0b0c'
    roundRect(ctx, { x: ox + bezel * 0.25, y: oy + bezel * 0.25, w: L.outer.w - bezel * 0.5, h: L.outer.h - bezel * 0.5 }, inner + bezel * 0.75)
    ctx.fill()
    ctx.save()
    roundRect(ctx, screen, inner)
    ctx.clip()
    ctx.drawImage(shot, screen.x, screen.y, sw, sh)
    ctx.restore()
    // A camera pill near the top of a portrait screen.
    if (sh > sw) {
      const pw = sw * 0.28
      const ph = pw * 0.29
      ctx.fillStyle = '#0b0b0c'
      roundRect(ctx, { x: screen.x + (sw - pw) / 2, y: screen.y + ph * 0.5, w: pw, h: ph }, ph / 2)
      ctx.fill()
    }
  } else if (scene.frame === 'laptop') {
    const side = L.bar
    const extra = L.extra!
    const base = L.base!
    const lid = { x: ox + extra, y: oy, w: sw + side * 2, h: sh + L.top! + side }
    shadowOn()
    ctx.fillStyle = '#0b0b0c'
    roundRect(ctx, lid, [side * 1.2, side * 1.2, 0, 0])
    ctx.fill()
    // Base: a wide slab with a thumb notch.
    const baseBox = { x: ox, y: lid.y + lid.h, w: L.outer.w, h: base }
    ctx.fillStyle = body
    roundRect(ctx, baseBox, [0, 0, base * 0.9, base * 0.9])
    ctx.fill()
    shadowOff()
    ctx.fillStyle = edge
    const notchW = L.outer.w * 0.14
    roundRect(ctx, { x: ox + (L.outer.w - notchW) / 2, y: baseBox.y, w: notchW, h: base * 0.38 }, [0, 0, base * 0.3, base * 0.3])
    ctx.fill()
    ctx.fillStyle = '#26262a'
    ctx.beginPath()
    ctx.arc(lid.x + lid.w / 2, oy + L.top! / 2, Math.max(2, side * 0.12), 0, Math.PI * 2)
    ctx.fill()
    ctx.drawImage(shot, screen.x, screen.y, sw, sh)
  } else {
    const r = 12 * u + 4
    shadowOn()
    ctx.fillStyle = '#000'
    roundRect(ctx, screen, r)
    ctx.fill()
    shadowOff()
    ctx.save()
    roundRect(ctx, screen, r)
    ctx.clip()
    ctx.drawImage(shot, screen.x, screen.y, sw, sh)
    ctx.restore()
  }
}
