// Islamic inheritance (faraid) after the majority Sunni rules as taught in
// Indonesia (Syafi'i madhhab): fixed shares (furud), blocking (hajb),
// residuaries (asabah), proportional reduction ('aul) and return (radd).
// Exact fractions throughout; rupiah amounts are only computed at the end.
//
// Choices where the schools differ (stated in the UI as well):
// - A paternal grandfather blocks brothers and sisters, like the father
//   (Abu Bakr / Hanafi view, and the one most calculators use; the Syafi'i
//   muqasamah between grandfather and siblings is not modelled).
// - Musytarakah: full siblings who would get nothing share the uterine
//   siblings' third (Umar / Syafi'i).
// - Radd skips the spouse unless the spouse is the only heir, in which case
//   the rest goes to the spouse (common practice in Indonesia) instead of the
//   public treasury.
// - KHI's "ahli waris pengganti" (a predeceased child's children taking the
//   child's place, also through daughters) is not modelled.

export type Heir =
  | 'husband'
  | 'wife'
  | 'son'
  | 'daughter'
  | 'sonsSon'
  | 'sonsDaughter'
  | 'father'
  | 'mother'
  | 'grandfather'
  | 'grandmotherF'
  | 'grandmotherM'
  | 'fullBrother'
  | 'fullSister'
  | 'paternalBrother'
  | 'paternalSister'
  | 'maternalBrother'
  | 'maternalSister'
  | 'fullNephew'
  | 'paternalNephew'
  | 'fullUncle'
  | 'paternalUncle'
  | 'fullCousin'
  | 'paternalCousin'

export type Heirs = Partial<Record<Heir, number>>

// ---------------------------------------------------------------- fractions

export interface Frac {
  n: number
  d: number
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
export const lcm = (a: number, b: number) => (a / gcd(a, b)) * b
export const frac = (n: number, d = 1): Frac => {
  const g = gcd(n, d) || 1
  return { n: n / g, d: d / g }
}
const add = (a: Frac, b: Frac) => frac(a.n * b.d + b.n * a.d, a.d * b.d)
const sub = (a: Frac, b: Frac) => frac(a.n * b.d - b.n * a.d, a.d * b.d)
const mul = (a: Frac, b: Frac) => frac(a.n * b.n, a.d * b.d)
const div = (a: Frac, b: Frac) => frac(a.n * b.d, a.d * b.n)
const ZERO = frac(0)
const ONE = frac(1)
export const value = (f: Frac) => f.n / f.d
const cmp = (a: Frac, b: Frac) => a.n * b.d - b.n * a.d

// ---------------------------------------------------------------- result

export type Basis =
  /** A fixed share (fard). */
  | 'fard'
  /** Residuary only. */
  | 'asabah'
  /** Father/grandfather with only female descendants: 1/6 plus the residue. */
  | 'fard+asabah'

export interface Share {
  heir: Heir
  count: number
  basis: Basis
  /** The share before 'aul/radd, e.g. "1/8"; for residuaries "sisa" (the UI words it). */
  fard?: Frac
  /** Final share of the whole estate for the group. */
  total: Frac
  /** Final share per person. */
  each: Frac
  /** Why this share, as a rule id the UI turns into words. */
  rule: Rule
}

export type Rule =
  | 'spouse-no-child'
  | 'spouse-child'
  | 'father-son'
  | 'father-daughter'
  | 'mother-third'
  | 'mother-sixth'
  | 'mother-umariyya'
  | 'grandmother'
  | 'daughter-one'
  | 'daughters-two'
  | 'sons'
  | 'granddaughter-takmila'
  | 'with-brother'
  | 'with-daughter'
  | 'sister-one'
  | 'sisters-two'
  | 'paternal-sister-takmila'
  | 'maternal-one'
  | 'maternal-many'
  | 'musytarakah'
  | 'residuary'

export interface Blocked {
  heir: Heir
  count: number
  by: Heir[]
}

export interface FaraidResult {
  shares: Share[]
  blocked: Blocked[]
  /** Fixed shares added up to more than 1 and were scaled down; the original base and the raised one. */
  aul: { from: number; to: number } | null
  /** Left over with no residuary, returned to the fixed heirs. */
  radd: 'heirs' | 'spouse' | null
  /** Share nobody inherits (no heirs at all). */
  treasury: Frac
  /** Asal masalah: common denominator of the group shares. */
  base: number
  /** Tashih: common denominator of the per-person shares. */
  baseEach: number
}

/** Upper limit per heir: one husband, up to four wives, one of each parent/grandparent. */
export const MAX: Partial<Record<Heir, number>> = {
  husband: 1,
  wife: 4,
  father: 1,
  mother: 1,
  grandfather: 1,
  grandmotherF: 1,
  grandmotherM: 1,
}

/** Residuaries from nearest to farthest; the first group present takes the residue. Weight 2 for males with sisters. */
const RESIDUARY_CHAIN: { male: Heir; female?: Heir }[] = [
  { male: 'son', female: 'daughter' },
  { male: 'sonsSon', female: 'sonsDaughter' },
  { male: 'father' },
  { male: 'grandfather' },
  { male: 'fullBrother', female: 'fullSister' },
  { male: 'paternalBrother', female: 'paternalSister' },
  { male: 'fullNephew' },
  { male: 'paternalNephew' },
  { male: 'fullUncle' },
  { male: 'paternalUncle' },
  { male: 'fullCousin' },
  { male: 'paternalCousin' },
]

export function faraid(input: Heirs, deceased: 'male' | 'female'): FaraidResult {
  const c = (h: Heir) => {
    const n = Math.max(0, Math.floor(input[h] ?? 0))
    if (h === 'husband' && deceased === 'male') return 0
    if (h === 'wife' && deceased === 'female') return 0
    return Math.min(n, MAX[h] ?? 99)
  }
  const has = (h: Heir) => c(h) > 0

  const blocked = new Map<Heir, Heir[]>()
  const block = (h: Heir, by: Heir[]) => {
    const present = by.filter(has)
    if (has(h) && present.length && !blocked.has(h)) blocked.set(h, present)
    return present.length > 0
  }
  const alive = (h: Heir) => has(h) && !blocked.has(h)

  // ---- blocking (hajb hirman), nearest first so later checks see who is in.
  block('sonsSon', ['son'])
  block('sonsDaughter', ['son'])
  if (!has('sonsSon') && c('daughter') >= 2) block('sonsDaughter', ['daughter'])
  block('grandfather', ['father'])
  block('grandmotherM', ['mother'])
  block('grandmotherF', ['mother', 'father'])

  const maleDesc = alive('son') || alive('sonsSon')
  const femaleDesc = alive('daughter') || alive('sonsDaughter')
  const anyDesc = maleDesc || femaleDesc
  const maleAscBlockers: Heir[] = ['son', 'sonsSon', 'father', 'grandfather']

  block('fullBrother', maleAscBlockers)
  block('fullSister', maleAscBlockers)
  // A full sister next to daughters inherits as a residuary "with" them and then ranks like a full brother.
  const fullSisterWithDaughter = alive('fullSister') && !alive('fullBrother') && femaleDesc
  block('paternalBrother', [...maleAscBlockers, 'fullBrother'])
  block('paternalSister', [...maleAscBlockers, 'fullBrother'])
  if (fullSisterWithDaughter) {
    if (has('paternalBrother') && !blocked.has('paternalBrother')) blocked.set('paternalBrother', (['fullSister', 'daughter'] as Heir[]).filter(has))
    if (has('paternalSister') && !blocked.has('paternalSister')) blocked.set('paternalSister', (['fullSister', 'daughter'] as Heir[]).filter(has))
  }
  if (!alive('paternalBrother') && !femaleDesc && c('fullSister') >= 2 && alive('fullSister'))
    block('paternalSister', ['fullSister'])
  const uterineBlockers: Heir[] = ['son', 'daughter', 'sonsSon', 'sonsDaughter', 'father', 'grandfather']
  block('maternalBrother', uterineBlockers)
  block('maternalSister', uterineBlockers)

  // Farther male residuaries: blocked by any nearer male residuary (or a full/paternal sister acting as one).
  const far: Heir[] = ['fullNephew', 'paternalNephew', 'fullUncle', 'paternalUncle', 'fullCousin', 'paternalCousin']
  const nearMales: Heir[] = ['son', 'sonsSon', 'father', 'grandfather', 'fullBrother', 'paternalBrother']
  const paternalSisterWithDaughter = alive('paternalSister') && !alive('paternalBrother') && femaleDesc
  far.forEach((h, i) => {
    const by = [...nearMales, ...far.slice(0, i)].filter(alive)
    if (fullSisterWithDaughter) by.push('fullSister')
    else if (paternalSisterWithDaughter) by.push('paternalSister')
    block(h, by)
  })

  // ---- fixed shares
  const fard = new Map<Heir, { share: Frac; rule: Rule }>()
  const put = (h: Heir, share: Frac, rule: Rule) => alive(h) && fard.set(h, { share, rule })

  put('husband', anyDesc ? frac(1, 4) : frac(1, 2), anyDesc ? 'spouse-child' : 'spouse-no-child')
  put('wife', anyDesc ? frac(1, 8) : frac(1, 4), anyDesc ? 'spouse-child' : 'spouse-no-child')

  const fatherLike: Heir = alive('father') ? 'father' : 'grandfather'
  if (anyDesc) put(fatherLike, frac(1, 6), maleDesc ? 'father-son' : 'father-daughter')

  const siblings = ['fullBrother', 'fullSister', 'paternalBrother', 'paternalSister', 'maternalBrother', 'maternalSister'] as Heir[]
  // Siblings reduce the mother even when the father blocks them.
  const siblingCount = siblings.reduce((s, h) => s + c(h), 0)
  const spouse: Heir | null = alive('husband') ? 'husband' : alive('wife') ? 'wife' : null
  if (alive('mother')) {
    if (anyDesc || siblingCount >= 2) put('mother', frac(1, 6), 'mother-sixth')
    else if (spouse && alive('father')) {
      // Umariyyatain: a third of what is left after the spouse.
      put('mother', mul(frac(1, 3), sub(ONE, fard.get(spouse)!.share)), 'mother-umariyya')
    } else put('mother', frac(1, 3), 'mother-third')
  }
  const grannies = (['grandmotherF', 'grandmotherM'] as Heir[]).filter(alive)
  grannies.forEach((h) => put(h, frac(1, 6 * grannies.length), 'grandmother'))

  if (!alive('son')) {
    if (alive('daughter')) put('daughter', c('daughter') === 1 ? frac(1, 2) : frac(2, 3), c('daughter') === 1 ? 'daughter-one' : 'daughters-two')
    if (alive('sonsDaughter') && !alive('sonsSon')) {
      if (alive('daughter')) put('sonsDaughter', frac(1, 6), 'granddaughter-takmila')
      else put('sonsDaughter', c('sonsDaughter') === 1 ? frac(1, 2) : frac(2, 3), c('sonsDaughter') === 1 ? 'daughter-one' : 'daughters-two')
    }
  }

  if (alive('fullSister') && !alive('fullBrother') && !femaleDesc)
    put('fullSister', c('fullSister') === 1 ? frac(1, 2) : frac(2, 3), c('fullSister') === 1 ? 'sister-one' : 'sisters-two')
  if (alive('paternalSister') && !alive('paternalBrother') && !femaleDesc) {
    if (alive('fullSister')) put('paternalSister', frac(1, 6), 'paternal-sister-takmila')
    else put('paternalSister', c('paternalSister') === 1 ? frac(1, 2) : frac(2, 3), c('paternalSister') === 1 ? 'sister-one' : 'sisters-two')
  }

  const uterine = (['maternalBrother', 'maternalSister'] as Heir[]).filter(alive)
  const uterineHeads = uterine.reduce((s, h) => s + c(h), 0)
  // Uterine siblings share equally, men and women alike.
  uterine.forEach((h) =>
    put(h, mul(uterineHeads === 1 ? frac(1, 6) : frac(1, 3), frac(c(h), uterineHeads)), uterineHeads === 1 ? 'maternal-one' : 'maternal-many'),
  )

  // ---- residuary
  type Group = { heir: Heir; weight: number }[]
  let residuary: Group = []
  let residuaryRule: Rule = 'residuary'
  for (const { male, female } of RESIDUARY_CHAIN) {
    if (!alive(male)) continue
    if (male === 'grandfather' && alive('father')) continue
    residuary = [{ heir: male, weight: female && alive(female) ? 2 : 1 }]
    if (female && alive(female)) {
      residuary.push({ heir: female, weight: 1 })
      fard.delete(female)
    }
    residuaryRule = male === 'son' || male === 'sonsSon' ? 'sons' : female && alive(female) ? 'with-brother' : 'residuary'
    break
  }
  if (!residuary.length && fullSisterWithDaughter) {
    fard.delete('fullSister')
    residuary = [{ heir: 'fullSister', weight: 1 }]
    residuaryRule = 'with-daughter'
  } else if (!residuary.length && paternalSisterWithDaughter) {
    fard.delete('paternalSister')
    residuary = [{ heir: 'paternalSister', weight: 1 }]
    residuaryRule = 'with-daughter'
  }
  // A son inherits only as residuary, never alongside a fixed daughter share.
  if (residuary.some((r) => r.heir === 'son')) fard.delete('daughter')

  let fixedSum = [...fard.values()].reduce((s, f) => add(s, f.share), ZERO)
  const groupBase = () => [...fard.values()].reduce((m, f) => lcm(m, f.share.d), 1)

  const total = new Map<Heir, Frac>()
  const basis = new Map<Heir, Basis>()
  const rules = new Map<Heir, Rule>()
  fard.forEach((f, h) => {
    total.set(h, f.share)
    basis.set(h, 'fard')
    rules.set(h, f.rule)
  })

  let aul: FaraidResult['aul'] = null
  let radd: FaraidResult['radd'] = null
  let treasury = ZERO

  // Musytarakah: husband, mother/grandmother, 2+ uterine siblings and full brothers left with nothing.
  if (
    cmp(fixedSum, ONE) >= 0 &&
    residuary.some((r) => r.heir === 'fullBrother') &&
    alive('husband') &&
    uterineHeads >= 2 &&
    (alive('mother') || grannies.length > 0)
  ) {
    const heads = uterine.map((h) => ({ heir: h, n: c(h) }))
    residuary.forEach((r) => heads.push({ heir: r.heir, n: c(r.heir) }))
    const all = heads.reduce((s, h) => s + h.n, 0)
    heads.forEach(({ heir, n }) => {
      total.set(heir, mul(frac(1, 3), frac(n, all)))
      basis.set(heir, 'fard')
      rules.set(heir, 'musytarakah')
    })
    residuary = []
  }

  if (cmp(fixedSum, ONE) > 0) {
    // 'Aul: every fixed share shrinks in proportion; the residuary gets nothing.
    const from = groupBase()
    total.forEach((f, h) => total.set(h, div(f, fixedSum)))
    aul = { from, to: Math.round(from * value(fixedSum)) }
    residuary.forEach((r) => {
      if (!total.has(r.heir)) {
        total.set(r.heir, ZERO)
        basis.set(r.heir, 'asabah')
        rules.set(r.heir, residuaryRule)
      }
    })
    fixedSum = ONE
  } else if (residuary.length) {
    const rest = sub(ONE, fixedSum)
    const weights = residuary.reduce((s, r) => s + r.weight * c(r.heir), 0)
    residuary.forEach((r) => {
      const part = mul(rest, frac(r.weight * c(r.heir), weights))
      const had = total.get(r.heir)
      total.set(r.heir, had ? add(had, part) : part)
      basis.set(r.heir, had ? 'fard+asabah' : 'asabah')
      if (!had) rules.set(r.heir, residuaryRule)
    })
  } else if (cmp(fixedSum, ONE) < 0) {
    const rest = sub(ONE, fixedSum)
    const takers = [...total.keys()].filter((h) => h !== 'husband' && h !== 'wife')
    if (takers.length) {
      const base = takers.reduce((s, h) => add(s, total.get(h)!), ZERO)
      takers.forEach((h) => total.set(h, add(total.get(h)!, mul(rest, div(total.get(h)!, base)))))
      radd = 'heirs'
    } else if (spouse) {
      total.set(spouse, ONE)
      radd = 'spouse'
    } else treasury = rest
  }

  const ORDER: Heir[] = [
    'husband', 'wife', 'son', 'daughter', 'sonsSon', 'sonsDaughter', 'father', 'mother', 'grandfather', 'grandmotherF',
    'grandmotherM', 'fullBrother', 'fullSister', 'paternalBrother', 'paternalSister', 'maternalBrother', 'maternalSister',
    'fullNephew', 'paternalNephew', 'fullUncle', 'paternalUncle', 'fullCousin', 'paternalCousin',
  ]
  const shares: Share[] = ORDER.filter((h) => total.has(h)).map((h) => ({
    heir: h,
    count: c(h),
    basis: basis.get(h)!,
    fard: fard.get(h)?.share,
    total: total.get(h)!,
    each: div(total.get(h)!, frac(c(h))),
    rule: rules.get(h)!,
  }))
  const base = shares.reduce((m, s) => (s.total.n ? lcm(m, s.total.d) : m), 1)
  const baseEach = shares.reduce((m, s) => (s.each.n ? lcm(m, s.each.d) : m), 1)

  return {
    shares,
    blocked: ORDER.filter((h) => blocked.has(h)).map((h) => ({ heir: h, count: c(h), by: blocked.get(h)! })),
    aul,
    radd,
    treasury,
    base,
    baseEach,
  }
}

/** The estate left to divide: after funeral costs and debts, then bequests capped at a third. */
export function netEstate(estate: number, funeral: number, debts: number, bequest: number) {
  const afterDebts = Math.max(0, estate - funeral - debts)
  const cap = afterDebts / 3
  const allowed = Math.min(Math.max(0, bequest), cap)
  return { afterDebts, bequest: allowed, bequestCapped: bequest > cap, net: afterDebts - allowed }
}
