// Letter templates: one entry per kind. Each declares its form fields and
// turns the answers into a Letter (plain data) that both the preview and the
// PDF/Word writers render. Letters are written in formal Indonesian.

export type Pair = [id: string, en: string]

export interface Field {
  key: string
  label: Pair
  kind?: 'text' | 'area' | 'date'
  placeholder?: string
  /** Shown only for these values of the template's "variant" field. */
  optional?: boolean
}

export type Block = { p: string } | { rows: [string, string][] }

export interface Letter {
  place: string
  /** yyyy-mm-dd */
  date: string
  /** Recipient lines ("Yth. …"). */
  to: string[]
  subject?: string
  title?: string
  opening: string
  blocks: Block[]
  closing: string
  /** Text above the signature ("Hormat saya,"). */
  signOff: string
  signer: string
  /** Extra signature line under the name, e.g. "Pemberi Kuasa". */
  signerRole?: string
}

export type Values = Record<string, string>

export interface Template {
  id: string
  name: Pair
  fields: Field[]
  build: (v: Values) => Letter
}

const v = (x: string | undefined, fallback = '…') => (x && x.trim() ? x.trim() : fallback)
const idDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00')
  return isNaN(+d) ? iso : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
/** "Senin, 3 Maret 2025" */
export const dayDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00')
  return isNaN(+d) ? v(iso) : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
const lines = (s: string) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)

const person = (v0: Values, p: string, nameKey = 'name'): [string, string][] => {
  const rows: [string, string][] = [['Nama', v(v0[nameKey])]]
  if (v0[p + 'Nik']?.trim()) rows.push(['NIK', v0[p + 'Nik'].trim()])
  if (v0[p + 'Job']?.trim()) rows.push(['Pekerjaan', v0[p + 'Job'].trim()])
  rows.push(['Alamat', v(v0[p + 'Address'])])
  return rows
}

const common = (v0: Values) => ({ place: v0.place ?? '', date: v0.date ?? '' })

const place: Field = { key: 'place', label: ['Kota', 'City'], placeholder: 'Jakarta' }
const date: Field = { key: 'date', label: ['Tanggal surat', 'Letter date'], kind: 'date' }

export const TEMPLATES: Template[] = [
  {
    id: 'lamaran',
    name: ['Surat lamaran kerja', 'Job application'],
    fields: [
      place,
      date,
      { key: 'hrd', label: ['Ditujukan kepada', 'Addressed to'], placeholder: 'HRD PT Maju Jaya' },
      { key: 'company', label: ['Alamat perusahaan', 'Company address'], kind: 'area' },
      { key: 'position', label: ['Posisi yang dilamar', 'Position'], placeholder: 'Staf Administrasi' },
      { key: 'source', label: ['Sumber lowongan (opsional)', 'Where you saw it (optional)'], placeholder: 'JobStreet', optional: true },
      { key: 'name', label: ['Nama lengkap', 'Full name'] },
      { key: 'ttl', label: ['Tempat, tanggal lahir', 'Place and date of birth'], placeholder: 'Bandung, 12 Mei 2000' },
      { key: 'education', label: ['Pendidikan terakhir', 'Latest education'], placeholder: 'S1 Manajemen, Universitas …' },
      { key: 'phone', label: ['No. telepon / email', 'Phone / email'] },
      { key: 'address', label: ['Alamat', 'Address'], kind: 'area' },
      { key: 'skills', label: ['Pengalaman / keunggulan (opsional)', 'Experience / strengths (optional)'], kind: 'area', optional: true },
      { key: 'attach', label: ['Lampiran, satu per baris', 'Attachments, one per line'], kind: 'area', placeholder: 'Daftar riwayat hidup\nFotokopi ijazah\nFotokopi KTP' },
    ],
    build: (x) => ({
      ...common(x),
      to: ['Yth. ' + v(x.hrd), ...lines(x.company ?? '')],
      subject: 'Lamaran Pekerjaan sebagai ' + v(x.position),
      opening: 'Dengan hormat,',
      blocks: [
        {
          p: `Berdasarkan informasi lowongan${x.source?.trim() ? ' yang saya peroleh dari ' + x.source.trim() : ''}, saya mengajukan diri untuk mengisi posisi ${v(x.position)} di perusahaan yang Bapak/Ibu pimpin. Adapun data diri saya:`,
        },
        { rows: [['Nama', v(x.name)], ['Tempat, tanggal lahir', v(x.ttl)], ['Pendidikan terakhir', v(x.education)], ['Alamat', v(x.address)], ['Telepon / email', v(x.phone)]] },
        ...(x.skills?.trim() ? [{ p: x.skills.trim() }] : []),
        ...(lines(x.attach ?? '').length
          ? [{ p: 'Sebagai bahan pertimbangan, saya lampirkan:\n' + lines(x.attach ?? '').map((a, i) => `${i + 1}. ${a}`).join('\n') }]
          : []),
        { p: 'Besar harapan saya untuk dapat diberi kesempatan wawancara agar dapat menjelaskan kemampuan saya lebih lanjut. Atas perhatian dan kesempatan yang Bapak/Ibu berikan, saya ucapkan terima kasih.' },
      ],
      closing: '',
      signOff: 'Hormat saya,',
      signer: v(x.name),
    }),
  },
  {
    id: 'izin',
    name: ['Surat izin tidak masuk', 'Absence letter'],
    fields: [
      place,
      date,
      { key: 'to', label: ['Ditujukan kepada', 'Addressed to'], placeholder: 'Bapak/Ibu Wali Kelas · HRD' },
      { key: 'name', label: ['Nama', 'Name'] },
      { key: 'idn', label: ['Kelas / jabatan', 'Class / position'], placeholder: 'Kelas X-2 · Staf Keuangan' },
      { key: 'reason', label: ['Alasan', 'Reason'], placeholder: 'sakit demam' },
      { key: 'from', label: ['Tanggal mulai', 'First day'], kind: 'date' },
      { key: 'until', label: ['Sampai tanggal (kosongkan bila sehari)', 'Last day (blank for one day)'], kind: 'date', optional: true },
      { key: 'note', label: ['Catatan (mis. surat dokter terlampir)', 'Note (e.g. doctor’s note attached)'], optional: true },
    ],
    build: (x) => {
      const span = x.until && x.until !== x.from ? `pada hari ${dayDate(x.from)} sampai dengan ${dayDate(x.until)}` : `pada hari ${dayDate(x.from)}`
      return {
        ...common(x),
        to: ['Yth. ' + v(x.to)],
        subject: 'Izin Tidak Masuk',
        opening: 'Dengan hormat,',
        blocks: [
          { p: 'Yang bertanda tangan di bawah ini:' },
          { rows: [['Nama', v(x.name)], ['Kelas / jabatan', v(x.idn)]] },
          { p: `Dengan ini memberitahukan bahwa saya tidak dapat hadir ${span} karena ${v(x.reason)}.${x.note?.trim() ? ' ' + x.note.trim() : ''}` },
          { p: 'Demikian surat izin ini saya sampaikan. Atas pengertian Bapak/Ibu, saya ucapkan terima kasih.' },
        ],
        closing: '',
        signOff: 'Hormat saya,',
        signer: v(x.name),
      }
    },
  },
  {
    id: 'kuasa',
    name: ['Surat kuasa', 'Power of attorney'],
    fields: [
      place,
      date,
      { key: 'name', label: ['Pemberi kuasa — nama', 'Principal — name'] },
      { key: 'giverNik', label: ['NIK pemberi kuasa', 'Principal ID number'], optional: true },
      { key: 'giverJob', label: ['Pekerjaan pemberi kuasa', 'Principal occupation'], optional: true },
      { key: 'giverAddress', label: ['Alamat pemberi kuasa', 'Principal address'], kind: 'area' },
      { key: 'agent', label: ['Penerima kuasa — nama', 'Attorney — name'] },
      { key: 'agentNik', label: ['NIK penerima kuasa', 'Attorney ID number'], optional: true },
      { key: 'agentJob', label: ['Pekerjaan penerima kuasa', 'Attorney occupation'], optional: true },
      { key: 'agentAddress', label: ['Alamat penerima kuasa', 'Attorney address'], kind: 'area' },
      { key: 'purpose', label: ['Untuk keperluan', 'Purpose'], kind: 'area', placeholder: 'mengambil BPKB sepeda motor … di kantor …' },
    ],
    build: (x) => ({
      ...common(x),
      to: [],
      title: 'SURAT KUASA',
      opening: 'Yang bertanda tangan di bawah ini:',
      blocks: [
        { rows: person(x, 'giver') },
        { p: 'Selanjutnya disebut sebagai PEMBERI KUASA. Dengan ini memberi kuasa kepada:' },
        { rows: person({ ...x, name: x.agent }, 'agent') },
        { p: 'Selanjutnya disebut sebagai PENERIMA KUASA.' },
        { p: `—————— KHUSUS ——————\nUntuk ${v(x.purpose)}.` },
        { p: 'Demikian surat kuasa ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya. Penerima kuasa tidak diperkenankan memindahkan kuasa ini kepada pihak lain.' },
      ],
      closing: '',
      signOff: '',
      signer: v(x.name),
      signerRole: 'Pemberi Kuasa (bermeterai)  ·  Penerima Kuasa: ' + v(x.agent),
    }),
  },
  {
    id: 'pernyataan',
    name: ['Surat pernyataan', 'Statement letter'],
    fields: [
      place,
      date,
      { key: 'name', label: ['Nama', 'Name'] },
      { key: 'giverNik', label: ['NIK', 'ID number'], optional: true },
      { key: 'giverJob', label: ['Pekerjaan', 'Occupation'], optional: true },
      { key: 'giverAddress', label: ['Alamat', 'Address'], kind: 'area' },
      { key: 'statement', label: ['Isi pernyataan', 'Statement'], kind: 'area', placeholder: 'Benar bahwa saya … dan tidak akan menuntut …' },
    ],
    build: (x) => ({
      ...common(x),
      to: [],
      title: 'SURAT PERNYATAAN',
      opening: 'Yang bertanda tangan di bawah ini:',
      blocks: [
        { rows: person(x, 'giver') },
        { p: 'Dengan ini menyatakan dengan sebenarnya bahwa:' },
        { p: v(x.statement) },
        { p: 'Demikian surat pernyataan ini saya buat dengan sebenar-benarnya tanpa paksaan dari pihak mana pun, dan saya bersedia menerima sanksi sesuai ketentuan yang berlaku apabila pernyataan ini tidak benar.' },
      ],
      closing: '',
      signOff: 'Yang membuat pernyataan,',
      signer: v(x.name),
      signerRole: '(bermeterai)',
    }),
  },
  {
    id: 'resign',
    name: ['Surat pengunduran diri', 'Resignation letter'],
    fields: [
      place,
      date,
      { key: 'to', label: ['Ditujukan kepada', 'Addressed to'], placeholder: 'HRD PT Maju Jaya' },
      { key: 'name', label: ['Nama', 'Name'] },
      { key: 'position', label: ['Jabatan', 'Position'] },
      { key: 'last', label: ['Hari kerja terakhir', 'Last working day'], kind: 'date' },
      { key: 'reason', label: ['Alasan (opsional)', 'Reason (optional)'], placeholder: 'ingin melanjutkan studi', optional: true },
    ],
    build: (x) => ({
      ...common(x),
      to: ['Yth. ' + v(x.to)],
      subject: 'Pengunduran Diri',
      opening: 'Dengan hormat,',
      blocks: [
        { p: `Saya yang bertanda tangan di bawah ini, ${v(x.name)}, jabatan ${v(x.position)}, bermaksud mengajukan pengunduran diri dari perusahaan${x.reason?.trim() ? ' karena ' + x.reason.trim() : ''}. Hari kerja terakhir saya adalah ${x.last ? dayDate(x.last) : '…'}.` },
        { p: 'Selama masa peralihan, saya akan menyelesaikan tanggung jawab saya dan membantu serah terima pekerjaan. Saya mengucapkan terima kasih atas kesempatan, bimbingan, dan kerja sama yang telah diberikan selama saya bekerja di sini, dan mohon maaf atas segala kekurangan.' },
      ],
      closing: '',
      signOff: 'Hormat saya,',
      signer: v(x.name),
    }),
  },
]

export const formattedDate = (l: Letter) => idDate(l.date)
export const headerLine = (l: Letter) => [l.place.trim(), formattedDate(l)].filter(Boolean).join(', ')
