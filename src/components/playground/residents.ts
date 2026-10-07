import type { Lang } from '@/lib/i18n'
import type { Look } from './Person'
import type { BuildingStyle, Point, Town } from './scenes'

/*
 * Who lives in town and how they spend their day. Each resident has a look,
 * a way of moving and things they say; together they keep the town busy.
 */

export type Mode =
  /** Roams the whole town. */
  | 'wander'
  /** Ambles around a favourite spot. */
  | 'stroll'
  /** Stands at a spot, chatting with a partner. */
  | 'idle'

export interface Resident {
  name: string
  look: Partial<Look>
  mode: Mode
  speed: number
  /** Drawn smaller: a child. */
  scale?: number
  home?: 'plaza' | 'pond' | 'grass' | 'bench' | 'plaza-west'
  /** Coat color of the dog that follows this resident. */
  dog?: string
  /** Index of the resident they chat with (both should be `idle`). */
  partner?: number
  lines?: Record<Lang, string[]>
}

export const RESIDENTS: Resident[] = [
  {
    name: 'Pak Darto',
    look: { style: 'bald', hair: '#d4d4d8', outfit: 'vest', shirt: '#78716c', accent: '#fef3c7', glasses: true, cane: true, mustache: true, face: 'calm', hat: undefined },
    mode: 'stroll',
    speed: 26,
    home: 'bench',
    lines: {
      id: ['Dulu cetak file harus ke tukang fotokopi…', 'Duduk dulu ah, capek.', 'Anak muda sekarang enak, semua ada di browser.'],
      en: ['Back in my day, printing meant a trip to the copy shop…', 'Time for a sit-down.', 'Young folks have it easy — everything is in the browser.'],
    },
  },
  {
    name: 'Rara',
    look: { style: 'pigtails', outfit: 'dress', shirt: '#f472b6', accent: '#fef3c7', face: 'grin', hat: undefined },
    mode: 'wander',
    speed: 135,
    scale: 0.78,
    lines: { id: ['Kejar aku!', 'Wiii!', 'Aku tahu jalan pintas!'], en: ['Catch me!', 'Wheee!', 'I know a shortcut!'] },
  },
  {
    name: 'Bagas',
    look: { outfit: 'overall', shirt: '#16a34a', accent: '#fef9c3', pants: '#1e3a5f', hat: 'straw', hatColor: '#dc2626', face: 'happy' },
    mode: 'stroll',
    speed: 34,
    home: 'grass',
    lines: {
      id: ['Rumputnya tinggi, hati-hati.', 'Bunga-bunganya sudah mekar.', 'Panas ya hari ini.'],
      en: ['Mind the tall grass.', 'The flowers are in bloom.', 'Hot one today, huh?'],
    },
  },
  {
    name: 'Sari',
    look: {
      style: 'long',
      hair: '#26201f',
      outfit: 'explorer',
      shirt: '#e3d3a8',
      accent: '#8a6d3b',
      pants: '#8a6d3b',
      shorts: true,
      shoes: '#6b4423',
      hat: 'bucket',
      hatColor: '#b59a68',
      backpack: '#8a6d3b',
      face: 'smile',
    },
    mode: 'wander',
    speed: 62,
    dog: '#c58a4a',
    lines: { id: ['Ayo, Belang!', 'Jalan-jalan sore dulu.', 'Sudah mampir ke Studio?'], en: ['Come on, Spot!', 'Just an afternoon walk.', 'Been to the Studio yet?'] },
  },
  {
    name: 'Tono',
    look: {
      style: 'messy',
      hair: '#5a3622',
      outfit: 'flannel',
      shirt: '#b91c1c',
      accent: '#f8fafc',
      pants: '#3b5b8c',
      shoes: '#dc2626',
      backpack: '#374151',
      face: 'smile',
      hat: undefined,
      mustache: false,
    },
    mode: 'idle',
    speed: 0,
    home: 'plaza-west',
    partner: 5,
  },
  {
    name: 'Mira',
    look: { style: 'bob', outfit: 'tee', shirt: '#f97316', glasses: true, face: 'happy', hat: undefined },
    mode: 'idle',
    speed: 0,
    home: 'plaza-west',
    partner: 4,
  },
  {
    name: 'Kevin',
    look: {
      style: 'messy',
      hair: '#e8c25a',
      glasses: true,
      outfit: 'tee',
      print: true,
      shirt: '#2f4a7a',
      accent: '#93c5fd',
      pants: '#3b5b8c',
      shoes: '#dc2626',
      prop: 'skateboard',
      face: 'grin',
      hat: undefined,
      mustache: false,
    },
    mode: 'wander',
    speed: 80,
    scale: 0.86,
    lines: {
      id: ['Paspor-ku sudah banyak capnya!', 'Aku mau jadi developer!'],
      en: ['My passport has loads of stamps!', 'I want to be a developer!'],
    },
  },
  {
    name: 'Bu Wati',
    look: { style: 'bun', hair: '#a8a29e', outfit: 'apron', shirt: '#be123c', accent: '#fff1f2', face: 'smile', hat: undefined },
    mode: 'stroll',
    speed: 30,
    home: 'pond',
    lines: {
      id: ['Ikannya banyak di kolam ini.', 'Sudah makan, Nak?', 'Kolamnya jernih ya.'],
      en: ['Lots of fish in this pond.', 'Have you eaten, dear?', 'The water is so clear.'],
    },
  },
]

/** What two chatting residents talk about: one line each, in turn. */
export const CHATS: Record<Lang, [string, string][]> = {
  id: [
    ['Mau ubah PDF jadi Word di mana, ya?', 'Di Perpustakaan, tanya penjaganya.'],
    ['Foto liburanku berat semua.', 'Ke Studio, ada yang bisa kompres.'],
    ['File kita beneran nggak di-upload?', 'Nggak, semuanya jalan di browser.'],
    ['JSON-ku berantakan…', 'Mampir ke Lab, ada yang bisa rapikan.'],
    ['PDF-nya mau kukunci.', 'Brankas tempatnya!'],
    ['Mau cetak laporan jadi PDF.', 'Percetakan di pojok sana.'],
    ['Butuh kalkulator.', 'Di Kantor ada, sekalian catatan.'],
  ],
  en: [
    ['Where do I turn a PDF into Word?', 'At the Library — ask the keeper.'],
    ['My holiday photos are huge.', 'Try the Studio, someone there compresses.'],
    ['Our files really never get uploaded?', 'Nope, it all runs in the browser.'],
    ['My JSON is a mess…', 'Stop by the Lab, they tidy it up.'],
    ['I need to lock this PDF.', 'The Vault is the place!'],
    ['I want my report as a PDF.', 'The Print Shop, just over there.'],
    ['I need a calculator.', "The Office has one — and notes too."],
  ],
}

/** Where a resident's favourite spot is in this town. */
export function homeOf(resident: Resident, town: Town, index: number): Point {
  const { plaza, pond, grass, benches } = town
  switch (resident.home) {
    case 'bench':
      return benches[0] ? { x: benches[0].x + benches[0].w / 2, y: benches[0].y + 40 } : { x: plaza.x - 120, y: plaza.y + 80 }
    case 'grass':
      return grass[0] ? { x: grass[0].x + grass[0].w / 2, y: grass[0].y + grass[0].h + 30 } : { x: plaza.x + 200, y: plaza.y }
    case 'pond':
      return { x: pond.x + pond.rx + 50, y: pond.y + 30 }
    case 'plaza-west':
      // A chatting pair stands side by side on the cobbles, facing each other.
      return { x: plaza.x - 96 + (index % 2) * 44, y: plaza.y + 44 }
    default:
      return { x: plaza.x, y: plaza.y + 90 }
  }
}

/** Keepers dress for where they work; alternate details keep neighbours apart. */
export function uniformFor(style: BuildingStyle, index: number): Partial<Look> {
  const odd = index % 2 === 1
  switch (style) {
    case 'shop':
      return { outfit: 'apron', accent: odd ? '#fef3c7' : '#e0f2fe', hat: odd ? 'cap' : undefined }
    case 'library':
      return { outfit: odd ? 'jacket' : 'vest', accent: '#fef3c7', glasses: !odd, hat: undefined }
    case 'vault':
      return { outfit: 'jacket', accent: '#f8fafc', hat: 'guard', hatColor: '#facc15' }
    case 'studio':
      return { outfit: odd ? 'tee' : 'hoodie', hat: odd ? 'beret' : undefined, hatColor: '#18181b' }
    case 'lab':
      return { outfit: 'labcoat', glasses: !odd, hat: odd ? 'hardhat' : undefined }
    case 'office':
      return { outfit: odd ? 'vest' : 'jacket', accent: '#f8fafc', glasses: odd, hat: undefined }
  }
}
