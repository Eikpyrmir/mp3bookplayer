export interface AudioMeta {
  codec: string | null
  sampleRateHz: number | null
  bitrateKbps: number | null
  bytes: number
}

const HEADER_SIZE = 64 * 1024

const EXT_CODEC: Record<string, string> = {
  mp3: 'MP3',
  m4a: 'AAC',
  aac: 'AAC',
  flac: 'FLAC',
  ogg: 'OGG',
  oga: 'OGG',
  opus: 'Opus',
  wav: 'WAV',
}

const ASC_FREQ = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350]

const MP3_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  0: [11025, 12000, 8000],
}

const MP3_BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
const MP3_BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]

function le32(h: Uint8Array, o: number): number {
  return (h[o] | (h[o + 1] << 8) | (h[o + 2] << 16) | (h[o + 3] << 24)) >>> 0
}

function be32(h: Uint8Array, o: number): number {
  return ((h[o] << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) >>> 0
}

function fourcc(h: Uint8Array, o: number): string {
  return o + 4 <= h.length
    ? String.fromCharCode(h[o], h[o + 1], h[o + 2], h[o + 3])
    : ''
}

function extOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export async function readAudioHeader(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, Math.min(file.size, HEADER_SIZE)).arrayBuffer())
}

async function readAudioTail(file: File): Promise<Uint8Array> {
  const start = Math.max(0, file.size - HEADER_SIZE)
  return new Uint8Array(await file.slice(start, file.size).arrayBuffer())
}

function detect(h: Uint8Array): string {
  if (fourcc(h, 0) === 'RIFF') return 'wav'
  if (fourcc(h, 0) === 'fLaC') return 'flac'
  if (fourcc(h, 0) === 'OggS') return 'ogg'
  if (fourcc(h, 4) === 'ftyp') return 'm4a'
  if (h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33) return 'mp3'
  if (h[0] === 0xff && (h[1] & 0xe0) === 0xe0) return 'mp3'
  return ''
}

function parseWav(h: Uint8Array): { sampleRate: number; bitrateKbps: number } | null {
  let i = 12
  while (i + 8 <= h.length) {
    if (fourcc(h, i) === 'fmt ') {
      return {
        sampleRate: le32(h, i + 12),
        bitrateKbps: Math.round((le32(h, i + 16) * 8) / 1000),
      }
    }
    i += 8 + le32(h, i + 4)
  }
  return null
}

function parseFlac(h: Uint8Array): { sampleRate: number } | null {
  let i = 4
  while (i + 4 <= h.length) {
    const type = h[i] & 0x7f
    const len = (h[i + 1] << 16) | (h[i + 2] << 8) | h[i + 3]
    const p = i + 4
    if (type === 0 && p + 18 <= h.length) {
      return {
        sampleRate: (h[p + 10] << 12) | (h[p + 11] << 4) | (h[p + 12] >> 4),
      }
    }
    i = p + len
  }
  return null
}

function parseMp3(h: Uint8Array): { sampleRate: number; bitrateKbps: number } | null {
  let start = 0
  if (h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33) {
    const tagSize =
      ((h[6] & 0x7f) << 21) | ((h[7] & 0x7f) << 14) | ((h[8] & 0x7f) << 7) | (h[9] & 0x7f)
    start = 10 + tagSize
  }
  for (let i = start; i < h.length - 4; i++) {
    if (h[i] !== 0xff || (h[i + 1] & 0xe0) !== 0xe0) continue
    const version = (h[i + 1] >> 3) & 3
    const layer = (h[i + 1] >> 1) & 3
    if (version === 1 || layer !== 1) continue
    const bitrateIndex = (h[i + 2] >> 4) & 0xf
    const rateIndex = (h[i + 2] >> 2) & 3
    if (bitrateIndex === 0 || bitrateIndex > 14 || rateIndex === 3) continue
    const sampleRate = MP3_RATES[version]?.[rateIndex]
    const table = version === 3 ? MP3_BITRATES_V1_L3 : MP3_BITRATES_V2_L3
    const bitrateKbps = table[bitrateIndex]
    if (!sampleRate || !bitrateKbps) continue
    return { sampleRate, bitrateKbps }
  }
  return null
}

function parseOgg(h: Uint8Array): {
  sampleRate: number
  codec: string
} | null {
  const payload = 27 + h[26]
  if (payload + 16 > h.length) return null
  if (fourcc(h, payload) === 'Opus') {
    return { sampleRate: le32(h, payload + 12), codec: 'Opus' }
  }
  if (
    h[payload] === 0x01 &&
    h[payload + 1] === 0x76 &&
    h[payload + 2] === 0x6f &&
    h[payload + 3] === 0x72 &&
    h[payload + 4] === 0x62 &&
    h[payload + 5] === 0x69 &&
    h[payload + 6] === 0x73
  ) {
    return { sampleRate: le32(h, payload + 12), codec: 'Vorbis' }
  }
  return null
}

function boxSize(h: Uint8Array, i: number): number {
  if (i + 8 > h.length) return h.length - i
  const s = be32(h, i)
  if (s === 0 || s === 1) return h.length - i
  return s
}

function findBox(h: Uint8Array, start: number, end: number, type: string): number {
  let i = start
  while (i + 8 <= end) {
    if (fourcc(h, i + 4) === type) return i
    i += boxSize(h, i)
  }
  return -1
}

function descriptorLengthBytes(h: Uint8Array, i: number): number {
  let n = 0
  while (n < 4 && i + n < h.length && h[i + n] & 0x80) n++
  return n + 1
}

function parseAudioSpecificConfig(h: Uint8Array, i: number): number | null {
  if (i + 2 > h.length) return null
  let bitPos = i * 8
  const read = (n: number): number => {
    let v = 0
    for (let k = 0; k < n; k++) {
      const bit = bitPos++
      const byte = h[bit >> 3]
      if (byte === undefined) return v
      v = (v << 1) | ((byte >> (7 - (bit & 7))) & 1)
    }
    return v
  }
  let aot = read(5)
  if (aot === 31) aot = 32 + read(6)
  const freqIndex = read(4)
  if (freqIndex === 15) return read(24)
  return ASC_FREQ[freqIndex] ?? null
}

function parseM4a(h: Uint8Array): { sampleRate: number | null; bitrateKbps: number | null } | null {
  try {
    const moov = findBox(h, 0, h.length, 'moov')
    if (moov === -1) return null
    const moovEnd = Math.min(h.length, moov + boxSize(h, moov))
    const trak = findBox(h, moov + 8, moovEnd, 'trak')
    if (trak === -1) return null
    const trakEnd = Math.min(moovEnd, trak + boxSize(h, trak))
    const mdia = findBox(h, trak + 8, trakEnd, 'mdia')
    if (mdia === -1) return null
    const mdiaEnd = Math.min(trakEnd, mdia + boxSize(h, mdia))
    const hdlr = findBox(h, mdia + 8, mdiaEnd, 'hdlr')
    if (hdlr === -1 || fourcc(h, hdlr + 16) !== 'soun') return null
    const minf = findBox(h, mdia + 8, mdiaEnd, 'minf')
    if (minf === -1) return null
    const minfEnd = Math.min(mdiaEnd, minf + boxSize(h, minf))
    const stbl = findBox(h, minf + 8, minfEnd, 'stbl')
    if (stbl === -1) return null
    const stblEnd = Math.min(minfEnd, stbl + boxSize(h, stbl))
    const stsd = findBox(h, stbl + 8, stblEnd, 'stsd')
    if (stsd === -1) return null
    const entryOff = stsd + 16
    if (entryOff + 8 > h.length) return null
    const entryEnd = Math.min(h.length, entryOff + boxSize(h, entryOff))
    const esds = findBox(h, entryOff + 36, entryEnd, 'esds')
    if (esds === -1) return null

    let i = esds + 12
    if (h[i] !== 0x03) return null
    i += 1 + descriptorLengthBytes(h, i + 1)
    i += 3
    if (h[i] !== 0x04) return null
    i += 1 + descriptorLengthBytes(h, i + 1)
    const avgBitrate = be32(h, i + 9)
    i += 13
    if (h[i] !== 0x05) return null
    i += 1 + descriptorLengthBytes(h, i + 1)
    const sampleRate = parseAudioSpecificConfig(h, i)
    return {
      sampleRate,
      bitrateKbps: avgBitrate > 0 ? Math.round(avgBitrate / 1000) : null,
    }
  } catch {
    return null
  }
}

export async function parseAudioMeta(name: string, file: File): Promise<AudioMeta> {
  const fallbackCodec = EXT_CODEC[extOf(name)] ?? null
  const front = await readAudioHeader(file)
  const type = detect(front)
  let codec = fallbackCodec
  let sampleRateHz: number | null = null
  let bitrateKbps: number | null = null

  switch (type) {
    case 'wav': {
      const r = parseWav(front)
      if (r) {
        codec = 'WAV'
        sampleRateHz = r.sampleRate
        bitrateKbps = r.bitrateKbps
      }
      break
    }
    case 'flac': {
      const r = parseFlac(front)
      if (r) {
        codec = 'FLAC'
        sampleRateHz = r.sampleRate
      }
      break
    }
    case 'mp3': {
      const r = parseMp3(front)
      if (r) {
        codec = 'MP3'
        sampleRateHz = r.sampleRate
        bitrateKbps = r.bitrateKbps
      }
      break
    }
    case 'ogg': {
      const r = parseOgg(front)
      if (r) {
        codec = r.codec
        sampleRateHz = r.sampleRate
      }
      break
    }
    case 'm4a': {
      codec = fallbackCodec ?? 'AAC'
      let r = parseM4a(front)
      if (!r) r = parseM4a(await readAudioTail(file))
      if (r) {
        sampleRateHz = r.sampleRate
        bitrateKbps = r.bitrateKbps
      }
      break
    }
    default:
      break
  }

  return { codec, sampleRateHz, bitrateKbps, bytes: file.size }
}
