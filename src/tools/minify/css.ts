import { minify } from 'csso'

export function minifyCss(code: string) {
  return minify(code, { comments: 'exclamation' }).css
}

