// What the Chrome extension sells, and where. Fill in after creating the
// product (see README.md → "Jualan"). While no store is filled in, Pro tools
// keep their daily free allowance and the upgrade screen says "coming soon".

export const PRO = {
  /** Shown on the upgrade screen, already formatted. */
  price: ['$3/bulan atau $24/tahun', '$3/month or $24/year'] as [string, string],
  /** Pro saves a free user gets each day, so they can try before buying. */
  freeSavesPerDay: 2,
  gumroad: {
    /** Product page (checkout). */
    url: 'https://chalidade.gumroad.com/l/toowl-chrome-pro',
    /** "toowl Pro for Chrome" product id(s): Content tab → "Use your product ID to verify licenses". */
    productIds: [] as string[],
    /** Other toowl products whose keys also open Pro (All-Access, Agency in src/lib/license.ts). */
    alsoAccept: ['ELk0YRYwJ-7ZGaKhrUqIlQ==', 'rdj0-UcEkOTIU9qvnjJHxg=='],
    /** A key used on more installs than this is refused (Gumroad counts each activation). */
    maxActivations: 5,
  },
  lemonSqueezy: {
    /** Checkout link (Products → Share). When set, the buy button goes here instead of Gumroad. */
    checkoutUrl: '',
    /** Settings → Stores. Keys from another store are refused. */
    storeId: 0,
    /** Product ids whose keys open Pro. Empty = any product in the store. The activation limit is set on the product. */
    productIds: [] as number[],
  },
}

export const gumroadIds = () => [...PRO.gumroad.productIds, ...PRO.gumroad.alsoAccept].filter(Boolean)
export const lemonOn = () => PRO.lemonSqueezy.storeId > 0
/** A key can be checked (some product is set up). */
export const canActivate = () => gumroadIds().length > 0 || lemonOn()
/** The Pro product itself is on sale. */
export const canBuy = () => !!PRO.lemonSqueezy.checkoutUrl || PRO.gumroad.productIds.length > 0
export const buyUrl = () => PRO.lemonSqueezy.checkoutUrl || `${PRO.gumroad.url}?wanted=true`
