type Token = string | number

function tokenize(s: string): Token[] {
  return s
    .toLowerCase()
    .split(/(\d+)/)
    .filter(Boolean)
    .map((t) => (/^\d+$/.test(t) ? Number(t) : t))
}

export function naturalCompare(a: string, b: string): number {
  const ta = tokenize(a)
  const tb = tokenize(b)
  const len = Math.max(ta.length, tb.length)
  for (let i = 0; i < len; i++) {
    const x = ta[i]
    const y = tb[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (typeof x === 'number' && typeof y === 'number') {
      if (x !== y) return x - y
    } else {
      const c = String(x).localeCompare(String(y), 'ja', { sensitivity: 'base' })
      if (c !== 0) return c
    }
  }
  return 0
}

export function sortNodes<T extends { name: string }>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => naturalCompare(a.name, b.name))
}
