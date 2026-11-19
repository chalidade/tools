// Lossless JPEG (ITU T.81 process 14, SOF3) encoder for DNG tiles: 16-bit
// samples, interleaved components, predictor 1 (the left neighbour), and an
// optimal Huffman table per tile built as in Annex K.2. This is the
// compression (TIFF 7) that DNG readers expect for integer raw data.

/** Encodes one tile. `samples` holds width × height × components values, row by row. */
export function encodeLosslessJpeg(samples: Uint16Array, width: number, height: number, components: number): Uint8Array<ArrayBuffer> {
  const n = width * height * components
  const ssss = new Uint8Array(n)
  const diffs = new Int32Array(n)
  const freq = new Uint32Array(17)
  const rowLen = width * components
  for (let y = 0; y < height; y++) {
    const row = y * rowLen
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < components; c++) {
        const i = row + x * components + c
        let pred: number
        if (x > 0) pred = samples[i - components]
        else if (y > 0) pred = samples[i - rowLen]
        else pred = 32768
        // Differences are taken modulo 2^16 into −32768…32767.
        let d = (samples[i] - pred) & 0xffff
        if (d >= 32768) d -= 65536
        const mag = d < 0 ? -d : d
        const s = mag === 0 ? 0 : 32 - Math.clz32(mag)
        diffs[i] = d
        ssss[i] = s
        freq[s]++
      }
    }
  }

  const { bits, values } = huffmanTable(freq)
  const code = new Uint32Array(17)
  const size = new Uint8Array(17)
  // Canonical codes in the order of the table (Annex C).
  let k = 0
  let next = 0
  for (let len = 1; len <= 16; len++) {
    for (let j = 0; j < bits[len]; j++) {
      code[values[k]] = next++
      size[values[k]] = len
      k++
    }
    next <<= 1
  }

  const out = new ByteWriter(n * 2 + 1024)
  out.bytes([0xff, 0xd8]) // SOI
  // DHT: one table (class 0, id 0) shared by all components.
  out.bytes([0xff, 0xc4])
  out.u16(2 + 1 + 16 + values.length)
  out.byte(0x00)
  for (let len = 1; len <= 16; len++) out.byte(bits[len])
  out.bytes(values)
  // SOF3: precision 16, size, components with 1×1 sampling.
  out.bytes([0xff, 0xc3])
  out.u16(8 + 3 * components)
  out.byte(16)
  out.u16(height)
  out.u16(width)
  out.byte(components)
  for (let c = 0; c < components; c++) out.bytes([c + 1, 0x11, 0])
  // SOS: all components, table 0, predictor 1, no point transform.
  out.bytes([0xff, 0xda])
  out.u16(6 + 2 * components)
  out.byte(components)
  for (let c = 0; c < components; c++) out.bytes([c + 1, 0x00])
  out.bytes([1, 0, 0])

  let acc = 0
  let accBits = 0
  const put = (value: number, len: number) => {
    // Never more than 16 bits at a time, so `acc` stays within 32 bits.
    acc = ((acc << len) | (value & ((1 << len) - 1))) >>> 0
    accBits += len
    while (accBits >= 8) {
      accBits -= 8
      const b = (acc >>> accBits) & 0xff
      out.byte(b)
      if (b === 0xff) out.byte(0x00)
    }
    acc &= (1 << accBits) - 1
  }
  for (let i = 0; i < n; i++) {
    const s = ssss[i]
    put(code[s], size[s])
    // Category 16 (a difference of exactly 32768) carries no extra bits.
    if (s > 0 && s < 16) {
      const d = diffs[i]
      put(d < 0 ? d - 1 : d, s)
    }
  }
  if (accBits > 0) put(0xff, 8 - accBits) // pad with 1s
  out.bytes([0xff, 0xd9]) // EOI
  return out.result()
}

/** Annex K.2: code lengths limited to 16 bits, no code of all 1s. */
function huffmanTable(freq: Uint32Array) {
  const symbols = 17
  const f = new Float64Array(symbols + 1)
  for (let i = 0; i < symbols; i++) f[i] = freq[i]
  f[symbols] = 1 // reserved symbol, keeps the all-ones code unused
  const codesize = new Int32Array(symbols + 1)
  const others = new Int32Array(symbols + 1).fill(-1)
  for (;;) {
    let v1 = -1
    let v2 = -1
    for (let i = 0; i <= symbols; i++) {
      if (f[i] === 0) continue
      if (v1 < 0 || f[i] <= f[v1]) {
        v2 = v1
        v1 = i
      } else if (v2 < 0 || f[i] <= f[v2]) v2 = i
    }
    if (v2 < 0) break
    f[v1] += f[v2]
    f[v2] = 0
    codesize[v1]++
    while (others[v1] >= 0) {
      v1 = others[v1]
      codesize[v1]++
    }
    others[v1] = v2
    codesize[v2]++
    while (others[v2] >= 0) {
      v2 = others[v2]
      codesize[v2]++
    }
  }
  const bits = new Int32Array(33)
  for (let i = 0; i <= symbols; i++) if (codesize[i]) bits[codesize[i]]++
  for (let i = 32; i > 16; i--) {
    while (bits[i] > 0) {
      let j = i - 2
      while (bits[j] === 0) j--
      bits[i] -= 2
      bits[i - 1]++
      bits[j + 1] += 2
      bits[j]--
    }
  }
  let longest = 16
  while (bits[longest] === 0) longest--
  bits[longest]-- // drop the reserved symbol
  const values: number[] = []
  for (let len = 1; len <= 32; len++) for (let i = 0; i < symbols; i++) if (codesize[i] === len) values.push(i)
  return { bits: Array.from(bits.subarray(0, 17)), values }
}

class ByteWriter {
  private buf: Uint8Array<ArrayBuffer>
  private pos = 0
  constructor(size: number) {
    this.buf = new Uint8Array(size)
  }
  private room(n: number) {
    if (this.pos + n <= this.buf.length) return
    const grown = new Uint8Array(Math.max(this.buf.length * 2, this.pos + n))
    grown.set(this.buf)
    this.buf = grown
  }
  byte(b: number) {
    this.room(1)
    this.buf[this.pos++] = b
  }
  bytes(list: ArrayLike<number>) {
    this.room(list.length)
    this.buf.set(list, this.pos)
    this.pos += list.length
  }
  u16(v: number) {
    this.byte(v >> 8)
    this.byte(v & 0xff)
  }
  result() {
    return this.buf.slice(0, this.pos)
  }
}
