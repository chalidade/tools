// rtf.js ships its EMF/WMF players as UMD bundles without typings for these paths.
declare module 'rtf.js/dist/EMFJS.bundle.js' {
  export class Renderer {
    constructor(data: ArrayBuffer)
    render(info: { width: string; height: string; wExt: number; hExt: number; xExt: number; yExt: number; mapMode: number }): SVGElement
  }
  export function loggingEnabled(on: boolean): void
}
declare module 'rtf.js/dist/WMFJS.bundle.js' {
  export class Renderer {
    constructor(data: ArrayBuffer)
    render(info: { width: string; height: string; xExt: number; yExt: number; mapMode: number }): SVGElement
  }
  export function loggingEnabled(on: boolean): void
}
