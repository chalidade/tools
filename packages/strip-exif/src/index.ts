// The headless API. The source lives with the site (src/tools/strip-exif/exif.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { readExif, stripMetadata } from '@chalidade/strip-exif'
//   const bytes = new Uint8Array(await file.arrayBuffer())
//   readExif(bytes).gps                  // { lat, lon, altitude } when the photo has a location
//   stripMetadata(bytes)                 // the same picture without EXIF/XMP/IPTC, bit for bit

export {
  readExif,
  stripMetadata,
  stripJpeg,
  stripPng,
  stripWebp,
  sniff,
  formatCoords,
  textMap,
  type ExifInfo,
  type ExifField,
} from '@/tools/strip-exif/exif'
