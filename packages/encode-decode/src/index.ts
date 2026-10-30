// The headless API. The source lives with the site (src/tools/encode-decode/codec.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.

export {
  base64Encode,
  base64Decode,
  urlEncode,
  urlDecode,
  htmlEncode,
  htmlDecode,
  decodeJwt,
  type Mode,
  type Jwt,
} from '@/tools/encode-decode/codec'
