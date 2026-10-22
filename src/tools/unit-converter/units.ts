export type CategoryId = 'length' | 'weight' | 'area' | 'volume' | 'temperature' | 'speed' | 'data'

export interface Unit {
  id: string
  /** [Indonesian, English] name. */
  name: [string, string]
  symbol: string
  /** How many base units one of this unit is (unused for temperature). */
  factor: number
}

export interface Category {
  id: CategoryId
  label: [string, string]
  units: Unit[]
}

const u = (id: string, id_: string, en: string, symbol: string, factor: number): Unit => ({ id, name: [id_, en], symbol, factor })

export const CATEGORIES: Category[] = [
  {
    id: 'length',
    label: ['Panjang', 'Length'],
    units: [
      u('mm', 'Milimeter', 'Millimeter', 'mm', 0.001),
      u('cm', 'Sentimeter', 'Centimeter', 'cm', 0.01),
      u('m', 'Meter', 'Meter', 'm', 1),
      u('km', 'Kilometer', 'Kilometer', 'km', 1000),
      u('in', 'Inci', 'Inch', 'in', 0.0254),
      u('ft', 'Kaki', 'Foot', 'ft', 0.3048),
      u('yd', 'Yard', 'Yard', 'yd', 0.9144),
      u('mi', 'Mil', 'Mile', 'mi', 1609.344),
      u('nmi', 'Mil laut', 'Nautical mile', 'nmi', 1852),
    ],
  },
  {
    id: 'weight',
    label: ['Berat', 'Weight'],
    units: [
      u('mg', 'Miligram', 'Milligram', 'mg', 0.000001),
      u('g', 'Gram', 'Gram', 'g', 0.001),
      u('ons', 'Ons (100 g)', 'Ons (100 g)', 'ons', 0.1),
      u('kg', 'Kilogram', 'Kilogram', 'kg', 1),
      u('kuintal', 'Kuintal (100 kg)', 'Quintal (100 kg)', 'kw', 100),
      u('ton', 'Ton', 'Metric ton', 't', 1000),
      u('oz', 'Ons (oz)', 'Ounce', 'oz', 0.028349523125),
      u('lb', 'Pon', 'Pound', 'lb', 0.45359237),
    ],
  },
  {
    id: 'area',
    label: ['Luas', 'Area'],
    units: [
      u('cm2', 'Sentimeter persegi', 'Square centimeter', 'cm²', 0.0001),
      u('m2', 'Meter persegi', 'Square meter', 'm²', 1),
      u('tumbak', 'Tumbak (14 m²)', 'Tumbak (14 m²)', 'tumbak', 14),
      u('are', 'Are (100 m²)', 'Are (100 m²)', 'are', 100),
      u('ha', 'Hektare', 'Hectare', 'ha', 10000),
      u('km2', 'Kilometer persegi', 'Square kilometer', 'km²', 1000000),
      u('ft2', 'Kaki persegi', 'Square foot', 'ft²', 0.09290304),
      u('acre', 'Acre', 'Acre', 'ac', 4046.8564224),
    ],
  },
  {
    id: 'volume',
    label: ['Volume', 'Volume'],
    units: [
      u('ml', 'Mililiter', 'Milliliter', 'mL', 0.001),
      u('l', 'Liter', 'Liter', 'L', 1),
      u('m3', 'Meter kubik', 'Cubic meter', 'm³', 1000),
      u('tsp', 'Sendok teh (US)', 'Teaspoon (US)', 'tsp', 0.00492892159375),
      u('tbsp', 'Sendok makan (US)', 'Tablespoon (US)', 'tbsp', 0.01478676478125),
      u('floz', 'Fluid ounce (US)', 'Fluid ounce (US)', 'fl oz', 0.0295735295625),
      u('cup', 'Cangkir (US)', 'Cup (US)', 'cup', 0.2365882365),
      u('gal', 'Galon (US)', 'Gallon (US)', 'gal', 3.785411784),
    ],
  },
  {
    id: 'temperature',
    label: ['Suhu', 'Temperature'],
    units: [
      u('c', 'Celsius', 'Celsius', '°C', 1),
      u('f', 'Fahrenheit', 'Fahrenheit', '°F', 1),
      u('k', 'Kelvin', 'Kelvin', 'K', 1),
      u('r', 'Reamur', 'Réaumur', '°Re', 1),
    ],
  },
  {
    id: 'speed',
    label: ['Kecepatan', 'Speed'],
    units: [
      u('ms', 'Meter/detik', 'Meter/second', 'm/s', 1),
      u('kmh', 'Kilometer/jam', 'Kilometer/hour', 'km/h', 1 / 3.6),
      u('mph', 'Mil/jam', 'Mile/hour', 'mph', 0.44704),
      u('kn', 'Knot', 'Knot', 'kn', 1852 / 3600),
      u('fts', 'Kaki/detik', 'Foot/second', 'ft/s', 0.3048),
    ],
  },
  {
    id: 'data',
    label: ['Data', 'Data'],
    units: [
      u('bit', 'Bit', 'Bit', 'bit', 0.125),
      u('B', 'Byte', 'Byte', 'B', 1),
      u('KB', 'Kilobyte (1.000 B)', 'Kilobyte (1,000 B)', 'KB', 1e3),
      u('MB', 'Megabyte', 'Megabyte', 'MB', 1e6),
      u('GB', 'Gigabyte', 'Gigabyte', 'GB', 1e9),
      u('TB', 'Terabyte', 'Terabyte', 'TB', 1e12),
      u('KiB', 'Kibibyte (1.024 B)', 'Kibibyte (1,024 B)', 'KiB', 1024),
      u('MiB', 'Mebibyte', 'Mebibyte', 'MiB', 1024 ** 2),
      u('GiB', 'Gibibyte', 'Gibibyte', 'GiB', 1024 ** 3),
      u('TiB', 'Tebibyte', 'Tebibyte', 'TiB', 1024 ** 4),
    ],
  },
]

const toCelsius: Record<string, (v: number) => number> = {
  c: (v) => v,
  f: (v) => ((v - 32) * 5) / 9,
  k: (v) => v - 273.15,
  r: (v) => (v * 5) / 4,
}
const fromCelsius: Record<string, (v: number) => number> = {
  c: (v) => v,
  f: (v) => (v * 9) / 5 + 32,
  k: (v) => v + 273.15,
  r: (v) => (v * 4) / 5,
}

export function convert(cat: Category, value: number, from: string, to: string): number {
  if (cat.id === 'temperature') return fromCelsius[to](toCelsius[from](value))
  const f = cat.units.find((x) => x.id === from)!
  const t = cat.units.find((x) => x.id === to)!
  return (value * f.factor) / t.factor
}

/** Parses "1.5", "1,5" and "-3"; Indonesian users type a decimal comma. */
export function parseNumber(s: string): number | null {
  const t = s.trim().replace(/\s/g, '')
  if (!/^[-+]?(\d+([.,]\d*)?|[.,]\d+)$/.test(t)) return null
  return Number(t.replace(',', '.'))
}

/** Up to 10 significant digits, no float noise, plain digits for ordinary sizes. */
export function formatResult(n: number, loc: string): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1e15 || abs < 1e-6) return n.toExponential(6).replace(/\.?0+e/, 'e')
  const rounded = Number(n.toPrecision(10))
  return rounded.toLocaleString(loc, { maximumFractionDigits: 12 })
}
