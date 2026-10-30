// The headless API. The source lives with the site (src/tools/color-picker/color.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.

export {
  toHex,
  toHsl,
  fromHsl,
  toHsv,
  toCmyk,
  toOklch,
  colorScale,
  SCALE_STEPS,
  luminance,
  contrast,
  formats,
  parseColor,
  extractPalette,
  type RGB,
} from '@/tools/color-picker/color'
