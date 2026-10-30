// The headless API: mask editing on raw pixels, no UI. The source lives with
// the site (src/tools/remove-background/mask.ts), so the tool on
// chalidade.github.io/tools and this package are the same code.
//
//   import { floodRegion, applyRegion, refine, compose } from '@chalidade/remove-background'
//   const { data } = ctx.getImageData(0, 0, W, H)
//   const mask = new Uint8Array(W * H).fill(255)              // 255 = keep, 0 = removed
//   applyRegion(mask, floodRegion(data, W, H, 0, 0, 20), 'erase')
//   ctx.putImageData(new ImageData(compose(data, refine(mask, W, H, 1, 1), 'result'), W, H), 0, 0)

export {
  floodRegion,
  colorRegion,
  applyRegion,
  applyCoverage,
  stampBrush,
  strokeBrush,
  invert,
  refine,
  compose,
  type Action,
} from '@/tools/remove-background/mask'
