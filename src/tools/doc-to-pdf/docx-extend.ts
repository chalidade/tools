// docx-preview skips several ways Word places pictures, so they vanished from
// the preview and the PDF:
//   - floating pictures ("in front of text" / "behind text", wrapNone) were
//     dropped into the text flow, often onto another page, instead of sitting
//     where Word puts them — e.g. every page of a PDF turned into Word, whose
//     page picture is anchored to the page behind the text;
//   - text frames (w:framePr) positioned on the page were flowed as ordinary
//     paragraphs;
//   - grouped pictures, drawing canvases and shapes filled with a picture were
//     not rendered at all (it only reads a lone pic:pic);
//   - a "next page" section break did not start a new page unless the page
//     size changed, so whole sections (and their pictures) ran together and
//     were cut at arbitrary heights.
// The parser has no hooks, so its methods are wrapped once on the prototype.
// What the wrappers learn travels to the DOM as a class name and is laid out
// after rendering by `placeFloating`, once real sizes can be measured.

type ParserProto = Record<string, (...args: never[]) => unknown>
type Parsed = { type: string; children?: Parsed[]; cssStyle?: Record<string, string>; className?: string; [k: string]: unknown }

const EMU_PER_PT = 12700
const PX_PER_PT = 96 / 72

interface Pos {
  /** Word's relativeFrom / hAnchor / vAnchor. */
  relative: string
  align?: string
  /** pt from the reference edge. */
  offset: number
}

export interface Placement {
  kind: 'anchor' | 'frame'
  h: Pos
  v: Pos
  /** pt; undefined lets a frame take its content's width. */
  width?: number
  height?: number
  exactHeight?: boolean
  behind?: boolean
  /** Frames: paragraphs in a row with the same key share one frame. */
  key?: string
}

const kids = (el: Element | null | undefined) => (el ? Array.from(el.children) : [])
const child = (el: Element | null | undefined, name: string) => kids(el).find((c) => c.localName === name) ?? null
const attr = (el: Element | null | undefined, name: string) => {
  if (!el) return null
  for (const a of Array.from(el.attributes)) if (a.localName === name) return a.value
  return null
}
const num = (v: string | null, fallback = 0) => {
  const n = v == null ? NaN : parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}
const on = (v: string | null) => v === '1' || v === 'true' || v === 'on'
const hasDescendant = (el: Element, name: string) => el.getElementsByTagNameNS('*', name).length > 0

function placements(parser: object): Placement[] {
  const p = parser as { toowlPlacements?: Placement[] }
  return (p.toowlPlacements ??= [])
}

function mark(parser: object, target: { className?: string }, info: Placement) {
  const list = placements(parser)
  target.className = [target.className, 'toowl-place', `toowl-place-${list.length}`].filter(Boolean).join(' ')
  list.push(info)
}

function anchorPlacement(node: Element): Placement | null {
  const wrap = kids(node).find((c) => c.localName.startsWith('wrap'))?.localName ?? 'wrapNone'
  // Wrapped pictures stay in the flow, where docx-preview floats them.
  if (wrap !== 'wrapNone') return null
  const extent = child(node, 'extent')
  const pos = (name: string): Pos => {
    if (on(attr(node, 'simplePos'))) {
      const sp = child(node, 'simplePos')
      return { relative: 'page', offset: num(attr(sp, name === 'positionH' ? 'x' : 'y')) / EMU_PER_PT }
    }
    const el = child(node, name)
    const align = child(el, 'align')?.textContent?.trim()
    return {
      relative: attr(el, 'relativeFrom') ?? (name === 'positionH' ? 'column' : 'paragraph'),
      align: align || undefined,
      offset: num(child(el, 'posOffset')?.textContent ?? null) / EMU_PER_PT,
    }
  }
  return {
    kind: 'anchor',
    h: pos('positionH'),
    v: pos('positionV'),
    width: num(attr(extent, 'cx')) / EMU_PER_PT,
    height: num(attr(extent, 'cy')) / EMU_PER_PT,
    behind: on(attr(node, 'behindDoc')),
  }
}

function framePlacement(fp: Element): Placement | null {
  // Only frames that float free of the text; others keep docx-preview's flow.
  if (attr(fp, 'dropCap') && attr(fp, 'dropCap') !== 'none') return null
  const wrap = attr(fp, 'wrap')
  if (wrap !== 'none' && wrap !== 'through') return null
  const twips = (name: string) => num(attr(fp, name)) / 20
  const hRule = attr(fp, 'hRule')
  return {
    kind: 'frame',
    key: Array.from(fp.attributes, (a) => `${a.localName}=${a.value}`).sort().join(';'),
    h: { relative: attr(fp, 'hAnchor') ?? 'column', align: attr(fp, 'xAlign') ?? undefined, offset: twips('x') },
    v: { relative: attr(fp, 'vAnchor') ?? 'margin', align: attr(fp, 'yAlign') ?? undefined, offset: twips('y') },
    width: attr(fp, 'w') ? twips('w') : undefined,
    height: attr(fp, 'h') && hRule !== 'auto' ? twips('h') : undefined,
    exactHeight: hRule === 'exact',
  }
}

/** The sectPr of the section after the one `p` ends. */
function nextSectPr(p: Element) {
  for (let n = p.nextElementSibling; n; n = n.nextElementSibling) {
    if (n.localName === 'sectPr') return n
    if (n.localName === 'p') {
      const s = child(child(n, 'pPr'), 'sectPr')
      if (s) return s
    }
  }
  return null
}

function dropLeadingRenderedBreak(p: Parsed) {
  for (const run of p.children ?? []) {
    const list = run.children ?? []
    for (let i = 0; i < list.length; i++) {
      const c = list[i]
      if (c.type === 'break' && c.break === 'lastRenderedPageBreak') {
        list.splice(i, 1)
        return
      }
      if (c.type === 'text' && String(c.text ?? '').trim()) return
      if (c.type === 'drawing' || c.type === 'tab') return
    }
  }
}

/** Maps a shape's own coordinates (EMU) to pt inside the drawing's box. */
interface Space {
  sx: number
  sy: number
  tx: number
  ty: number
}

function xfrmOf(el: Element) {
  const spPr = kids(el).find((c) => c.localName === 'spPr' || c.localName === 'grpSpPr')
  const xfrm = child(spPr, 'xfrm')
  const pair = (name: string, a: string, b: string) => {
    const e = child(xfrm, name)
    return [num(attr(e, a)), num(attr(e, b))]
  }
  return {
    xfrm,
    off: pair('off', 'x', 'y'),
    ext: pair('ext', 'cx', 'cy'),
    chOff: pair('chOff', 'x', 'y'),
    chExt: pair('chExt', 'cx', 'cy'),
    rot: num(attr(xfrm, 'rot')) / 60000,
  }
}

function boxStyle(el: Element, space: Space) {
  const { off, ext } = xfrmOf(el)
  const pt = (v: number) => `${v.toFixed(2)}pt`
  return {
    position: 'absolute',
    left: pt(off[0] * space.sx + space.tx),
    top: pt(off[1] * space.sy + space.ty),
    width: pt(ext[0] * space.sx),
    height: pt(ext[1] * space.sy),
  }
}

const ROUND: Record<string, string> = { ellipse: '50%', roundRect: '16%', flowChartAlternateProcess: '16%' }

export function patchParser(proto: ParserProto) {
  if ((proto as { toowlPatched?: boolean }).toowlPatched) return
  const { parseDrawingWrapper, parseGraphic, parseParagraph, parseParagraphProperties, checkAlternateContent, parsePicture, parseBodyElements } = proto
  // Leave docx-preview alone if a future version renamed what we wrap.
  if (![parseDrawingWrapper, parseGraphic, parseParagraph, parseParagraphProperties, checkAlternateContent, parsePicture, parseBodyElements].every((f) => typeof f === 'function')) return
  ;(proto as { toowlPatched?: boolean }).toowlPatched = true

  type Self = Record<string, (...args: unknown[]) => unknown>

  proto.parseDrawingWrapper = function (this: Self, node: Element) {
    const result = parseDrawingWrapper.call(this, node as never) as Parsed
    const info = node.localName === 'anchor' ? anchorPlacement(node) : null
    if (info && result) mark(this, result, info)
    return result
  } as never

  // A section starts on a new page unless it is "continuous" (its own w:type,
  // read from the next sectPr: Word stores a section's settings at its end).
  // docx-preview ignores that unless the page size changes; give the last
  // paragraph before such a section a page break, which it does honour. Word
  // may also have recorded where that page began (lastRenderedPageBreak) at
  // the start of the next paragraph; drop it so the break is not counted twice.
  proto.parseParagraph = function (this: Self & { toowlAfterSection?: boolean }, node: Element) {
    const result = parseParagraph.call(this, node as never) as Parsed & { sectionProps?: unknown }
    if (this.toowlAfterSection) {
      this.toowlAfterSection = false
      dropLeadingRenderedBreak(result)
    }
    if (result?.sectionProps) {
      const type = attr(child(nextSectPr(node), 'type'), 'val')
      if (type !== 'continuous' && type !== 'nextColumn') {
        ;(result.children ??= []).push({ type: 'run', children: [{ type: 'break', break: 'page' }] })
        this.toowlAfterSection = true
      }
    }
    return result
  } as never

  proto.parseParagraphProperties = function (this: Self, elem: Element, paragraph: Parsed) {
    parseParagraphProperties.call(this, elem as never, paragraph as never)
    const fp = child(elem, 'framePr')
    const info = fp && framePlacement(fp)
    if (info) mark(this, paragraph, info)
  } as never

  // Word stores groups and canvases twice: as DrawingML (Choice) and as a VML
  // fallback. docx-preview always takes the fallback, and draws VML groups
  // empty, so take the DrawingML when it holds a group, a canvas or a picture
  // fill this file now renders.
  proto.checkAlternateContent = function (this: Self, elem: Element) {
    if (elem?.localName === 'AlternateContent') {
      const drawing = child(child(elem, 'Choice'), 'drawing')
      const data = drawing?.getElementsByTagNameNS('*', 'graphicData')[0]
      const shape = kids(data)[0]
      if (
        shape &&
        (shape.localName === 'wgp' ||
          shape.localName === 'wpc' ||
          (shape.localName === 'wsp' && hasDescendant(shape, 'blip') && !hasDescendant(shape, 'txbx')))
      )
        return drawing
    }
    return checkAlternateContent.call(this, elem as never)
  } as never

  const self = (p: Self) => ({
    picture: (el: Element, space: Space) => {
      const img = parsePicture.call(p, el as never) as Parsed
      img.cssStyle = { ...img.cssStyle, ...boxStyle(el, space) }
      return img
    },
    shape: (el: Element, space: Space): Parsed | null => {
      const spPr = child(el, 'spPr')
      const blip = child(child(spPr, 'blipFill'), 'blip')
      const box = boxStyle(el, space)
      const radius = ROUND[attr(child(spPr, 'prstGeom'), 'prst') ?? '']
      const parts: Parsed[] = []
      const embed = attr(blip, 'embed')
      if (embed) {
        parts.push({
          type: 'image',
          src: embed,
          cssStyle: { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', 'object-fit': 'fill', ...(radius ? { 'border-radius': radius } : {}) },
        })
      }
      const txbx = child(child(el, 'txbx'), 'txbxContent')
      if (txbx) {
        parts.push({
          type: 'drawing',
          className: 'toowl-shape-text',
          children: parseBodyElements.call(p, txbx as never) as Parsed[],
          cssStyle: { width: '100%', height: '100%' },
        })
      }
      if (!parts.length) return null
      return { type: 'drawing', className: 'toowl-shape', children: parts, cssStyle: box }
    },
  })

  function walk(p: Self, el: Element, space: Space, out: Parsed[]) {
    const make = self(p)
    for (const c of kids(el)) {
      switch (c.localName) {
        case 'pic': {
          out.push(make.picture(c, space))
          break
        }
        case 'wsp': {
          const s = make.shape(c, space)
          if (s) out.push(s)
          break
        }
        case 'grpSp': {
          const g = xfrmOf(c)
          const kx = g.chExt[0] ? g.ext[0] / g.chExt[0] : 1
          const ky = g.chExt[1] ? g.ext[1] / g.chExt[1] : 1
          walk(
            p,
            c,
            {
              sx: space.sx * kx,
              sy: space.sy * ky,
              tx: space.tx + (g.off[0] - g.chOff[0] * kx) * space.sx,
              ty: space.ty + (g.off[1] - g.chOff[1] * ky) * space.sy,
            },
            out,
          )
          break
        }
      }
    }
  }

  proto.parseGraphic = function (this: Self, elem: Element) {
    const result = parseGraphic.call(this, elem as never)
    if (result) return result
    const data = child(elem, 'graphicData')
    const first = kids(data)[0]
    if (!first) return null
    const children: Parsed[] = []
    const unit = 1 / EMU_PER_PT
    if (first.localName === 'wgp') {
      // Children are in the group's child space; map it onto the group's box.
      const g = xfrmOf(first)
      const kx = g.chExt[0] ? g.ext[0] / g.chExt[0] : 1
      const ky = g.chExt[1] ? g.ext[1] / g.chExt[1] : 1
      walk(this, first, { sx: kx * unit, sy: ky * unit, tx: -g.chOff[0] * kx * unit, ty: -g.chOff[1] * ky * unit }, children)
    } else if (first.localName === 'wpc') {
      walk(this, first, { sx: unit, sy: unit, tx: 0, ty: 0 }, children)
    } else if (first.localName === 'wsp') {
      const s = self(this).shape(first, { sx: unit, sy: unit, tx: 0, ty: 0 })
      if (s) s.cssStyle = { ...s.cssStyle, left: '0', top: '0', width: '100%', height: '100%' }
      if (s) children.push(s)
    }
    if (!children.length) return null
    return { type: 'drawing', className: 'toowl-group', children, cssStyle: { width: '100%', height: '100%' } }
  } as never
}

/** CSS for what the patched parser produces. */
export const EXTEND_CSS = `
.toowl-group { display: block !important; }
.toowl-shape { position: absolute !important; display: block !important; overflow: hidden; }
.toowl-shape-text { position: relative !important; display: block !important; text-indent: 0; padding: 3.6pt 7.2pt; box-sizing: border-box; }
.toowl-group img { position: absolute; }
`

/** Page height in CSS px — the section's min-height is the Word page size. */
export function pageHeight(section: HTMLElement) {
  return parseFloat(getComputedStyle(section).minHeight) || section.offsetHeight
}

function resolve(pos: Pos, start: number, end: number, size: number) {
  switch (pos.align) {
    case 'left':
    case 'top':
    case 'inside':
      return start
    case 'center':
      return start + (end - start - size) / 2
    case 'right':
    case 'bottom':
    case 'outside':
      return end - size
    default:
      return start + pos.offset * PX_PER_PT
  }
}

/**
 * Moves floating pictures and frames to where Word draws them, relative to
 * their page. Must run while the document is laid out (attached, not hidden).
 * Each item is measured after the ones before it have left the flow, so its
 * paragraph sits where it will end up.
 */
export function placeFloating(body: HTMLElement, list: Placement[]) {
  const done = new Set<Element>()
  for (const el of Array.from(body.querySelectorAll<HTMLElement>('.toowl-place'))) {
    if (done.has(el)) continue
    const index = Array.from(el.classList).map((c) => /^toowl-place-(\d+)$/.exec(c)?.[1]).find(Boolean)
    const info = index != null ? list[Number(index)] : undefined
    const section = el.closest<HTMLElement>('section.docx')
    if (!info || !section) continue

    const rect = section.getBoundingClientRect()
    const scale = rect.width / section.offsetWidth || 1
    const css = getComputedStyle(section)
    const padL = parseFloat(css.paddingLeft) || 0
    const padR = parseFloat(css.paddingRight) || 0
    const padT = parseFloat(css.paddingTop) || 0
    const padB = parseFloat(css.paddingBottom) || 0
    const W = section.offsetWidth
    const H = pageHeight(section)

    let box: HTMLElement
    let flowEl: HTMLElement
    if (info.kind === 'frame') {
      // Gather the run of paragraphs that share this frame into one box.
      box = document.createElement('div')
      const group = [el]
      for (let n = el.nextElementSibling; n instanceof HTMLElement && n.classList.contains('toowl-place'); n = n.nextElementSibling) {
        const i = Array.from(n.classList).map((c) => /^toowl-place-(\d+)$/.exec(c)?.[1]).find(Boolean)
        if (i == null || list[Number(i)]?.key !== info.key) break
        group.push(n)
      }
      el.before(box)
      flowEl = box
      for (const p of group) {
        done.add(p)
        box.appendChild(p)
      }
      box.style.width = info.width ? `${info.width * PX_PER_PT}px` : 'max-content'
      if (info.height) box.style[info.exactHeight ? 'height' : 'minHeight'] = `${info.height * PX_PER_PT}px`
      if (info.exactHeight) box.style.overflow = 'hidden'
    } else {
      box = el
      flowEl = el.closest<HTMLElement>('p') ?? el
    }

    const r = flowEl.getBoundingClientRect()
    const top = (r.top - rect.top) / scale
    const left = (r.left - rect.left) / scale
    const pageTop = Math.max(0, Math.floor(top / H)) * H

    const w = info.width != null ? info.width * PX_PER_PT : box.offsetWidth
    const h = info.height != null ? info.height * PX_PER_PT : box.offsetHeight

    const hRef: Record<string, [number, number]> = {
      page: [0, W],
      leftMargin: [0, padL],
      insideMargin: [0, padL],
      rightMargin: [W - padR, W],
      outsideMargin: [W - padR, W],
      character: [left, W - padR],
    }
    const vRef: Record<string, [number, number]> = {
      page: [pageTop, pageTop + H],
      margin: [pageTop + padT, pageTop + H - padB],
      topMargin: [pageTop, pageTop + padT],
      insideMargin: [pageTop, pageTop + padT],
      bottomMargin: [pageTop + H - padB, pageTop + H],
      outsideMargin: [pageTop + H - padB, pageTop + H],
    }
    const [h0, h1] = hRef[info.h.relative] ?? [padL, W - padR] // margin, column, text
    const [v0, v1] = vRef[info.v.relative] ?? [top, top + h] // paragraph, line, text
    const x = resolve(info.h, h0, h1, w)
    const y = resolve(info.v, v0, v1, h)

    section.appendChild(box)
    box.classList.add('toowl-abs')
    Object.assign(box.style, {
      position: 'absolute',
      display: 'block',
      margin: '0',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: info.behind ? '-1' : '2',
    })
    if (info.kind === 'anchor') Object.assign(box.style, { width: `${w}px`, height: `${h}px` })
    // A stacking context of its own keeps "behind text" pictures above the
    // white page yet under its text; the print copy shifts by the top margin.
    section.style.zIndex = '0'
    section.style.setProperty('--toowl-pad', `${padT}px`)
    // In print a one-page section is held to one page: a picture reaching its
    // edge must not spill a sliver onto an extra sheet.
    if (section.offsetHeight <= H + 1) {
      section.classList.add('toowl-one-page')
      section.style.setProperty('--toowl-body', `${H - padT - padB}px`)
    }
  }
}
