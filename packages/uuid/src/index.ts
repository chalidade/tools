// The headless API. The source lives with the site (src/tools/uuid/uuid.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { uuidV7, generate } from '@chalidade/uuid'
//   uuidV7()                                                   // time-ordered id
//   generate({ version: 'v4', count: 5, upper: false, hyphens: true, braces: false })

export { uuidV4, uuidV7, generate, type UuidOptions } from '@/tools/uuid/uuid'
