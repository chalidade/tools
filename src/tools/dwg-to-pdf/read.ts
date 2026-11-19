// Reads a DWG or DXF file in the browser with LibreDWG compiled to
// WebAssembly (@mlightcad/libredwg-web). The 7.8 MB wasm is bundled with the
// site and fetched only when this tool reads its first file.

import type { DwgDatabase, LibreDwgEx } from '@mlightcad/libredwg-web'

export class UnreadableCadError extends Error {}

let lib: Promise<{ dwg: LibreDwgEx; DWG: number; DXF: number }> | null = null

function load() {
  lib ??= import('@mlightcad/libredwg-web')
    .then(async (m) => ({ dwg: await m.LibreDwg.create(), DWG: m.Dwg_File_Type.DWG, DXF: m.Dwg_File_Type.DXF }))
    .catch((e) => {
      lib = null
      throw e
    })
  return lib
}

/** DWG files start with "AC10xx"; anything else is treated as DXF. */
const isDwg = (bytes: Uint8Array) => bytes[0] === 0x41 && bytes[1] === 0x43 && bytes[2] === 0x31

export async function readCad(file: File): Promise<{ db: DwgDatabase; version: string; dxf: boolean }> {
  const { dwg, DWG, DXF } = await load()
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const kind = isDwg(bytes) ? DWG : DXF
  let ptr: number | undefined
  try {
    ptr = dwg.dwg_read_data(kind === DWG ? buffer : cleanDxf(buffer), kind)
  } catch {
    throw new UnreadableCadError()
  }
  if (!ptr) throw new UnreadableCadError()
  try {
    const db = dwg.convert(ptr)
    if (!db?.entities) throw new UnreadableCadError()
    const version = kind === DWG ? new TextDecoder().decode(bytes.slice(0, 6)) : 'DXF'
    return { db, version, dxf: kind === DXF }
  } catch {
    throw new UnreadableCadError()
  } finally {
    dwg.dwg_free(ptr)
  }
}

/**
 * AutoCAD 2018+ appends an "Embedded Object" block to each MTEXT in a DXF,
 * repeating group codes 10/11/40… that LibreDWG's importer then reads as the
 * text's position, direction and height. The block is optional, so drop it.
 * Binary DXF is passed through untouched.
 */
function cleanDxf(buffer: ArrayBuffer): ArrayBuffer | string {
  const head = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(22, buffer.byteLength)))
  if (head.startsWith('AutoCAD Binary DXF')) return buffer
  const text = new TextDecoder().decode(buffer)
  if (!text.includes('Embedded Object')) return buffer
  const lines = text.split(/\r?\n/)
  const out: string[] = []
  for (let i = 0; i < lines.length; i += 2) {
    if (lines[i].trim() === '101' && lines[i + 1]?.trim() === 'Embedded Object') {
      while (i + 2 < lines.length && lines[i + 2].trim() !== '0') i += 2
      continue
    }
    out.push(lines[i], lines[i + 1] ?? '')
  }
  return out.join('\n')
}

/** "AC1032" → "AutoCAD 2018". */
export function versionName(code: string) {
  const names: Record<string, string> = {
    AC1009: 'R12',
    AC1012: 'R13',
    AC1014: 'R14',
    AC1015: '2000',
    AC1018: '2004',
    AC1021: '2007',
    AC1024: '2010',
    AC1027: '2013',
    AC1032: '2018',
  }
  return code === 'DXF' ? 'DXF' : names[code] ? `DWG ${names[code]}` : 'DWG'
}
