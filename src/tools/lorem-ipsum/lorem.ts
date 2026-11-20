// Placeholder text. Latin from the classic Cicero passage; Indonesian from
// everyday words, so a layout can be judged with realistic word lengths.
const LATIN =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nunc pulvinar sapien vitae ligula morbi blandit cursus risus at ultrices mi tempus imperdiet nulla malesuada pellentesque elit eget gravida cum sociis natoque penatibus magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies leo integer feugiat scelerisque varius'.split(
    ' ',
  )

const INDONESIAN =
  'rumah jalan pagi kota sungai kopi pasar warung angin hujan sawah gunung laut kabar cerita teman kerja sekolah anak buku meja jendela lampu suara malam senja perahu kereta sepeda ladang kebun daun bunga hijau biru merah cerah tenang ramai sederhana hangat segar baru lama jauh dekat besar kecil tinggi panjang pendek indah bersih rapi mudah cepat pelan selalu kadang sudah belum masih akan sedang bisa ingin perlu harus boleh dan atau tetapi karena sehingga lalu kemudian sambil ketika bahwa untuk dengan dari ke di pada oleh tentang setiap semua banyak beberapa sedikit membuat membawa melihat mendengar menulis membaca berjalan bekerja belajar bermain berbagi menunggu menyimpan menanam memasak'.split(
    ' ',
  )

export type Unit = 'paragraphs' | 'sentences' | 'words'
export type Lang = 'latin' | 'id'

/** Small seeded generator, so "regenerate" changes the text but each render is stable. */
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

export function lorem({ unit, count, lang, classic, seed }: { unit: Unit; count: number; lang: Lang; classic: boolean; seed: number }) {
  const pool = lang === 'latin' ? LATIN : INDONESIAN
  const rand = rng(seed)
  const pick = (n: number) => rand() * n | 0
  const between = (lo: number, hi: number) => lo + pick(hi - lo + 1)
  const opening = lang === 'latin' ? 'Lorem ipsum dolor sit amet, consectetur adipiscing elit' : 'Pagi itu kota masih tenang, angin membawa kabar dari laut'
  let first = classic

  const words = (n: number) => Array.from({ length: n }, () => pool[pick(pool.length)])
  const sentence = () => {
    if (first) {
      first = false
      return opening + '.'
    }
    const w = words(between(6, 14))
    // A comma now and then, as real sentences have.
    if (w.length > 8 && rand() < 0.6) w[between(3, w.length - 4)] += ','
    const s = w.join(' ')
    return s.charAt(0).toUpperCase() + s.slice(1) + '.'
  }
  const paragraph = () => Array.from({ length: between(3, 6) }, sentence).join(' ')

  if (unit === 'words') {
    const list = classic ? [...opening.replace(',', '').toLowerCase().split(' '), ...words(count)].slice(0, count) : words(count)
    if (list.length) list[0] = list[0].charAt(0).toUpperCase() + list[0].slice(1)
    return [list.join(' ')]
  }
  if (unit === 'sentences') return [Array.from({ length: count }, sentence).join(' ')]
  return Array.from({ length: count }, paragraph)
}
