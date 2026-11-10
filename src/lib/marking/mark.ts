import { create, all } from 'mathjs'

// locked-down mathjs: learners type into this, so switch off anything that can do more than sums
const math = create(all)
const evaluateSafe = math.evaluate
math.import(
  {
    import: () => { throw new Error('disabled') },
    createUnit: () => { throw new Error('disabled') },
    evaluate: () => { throw new Error('disabled') },
    parse: () => { throw new Error('disabled') },
    simplify: () => { throw new Error('disabled') },
    derivative: () => { throw new Error('disabled') },
  },
  { override: true }
)

export type Kind = 'numeric' | 'algebra' | 'mcq'

function normalise(raw: string, numeric: boolean): string {
  let s = raw
    .trim()
    .toLowerCase()
    .replace(/[\u2212\u2013\u2014]/g, '-') // minus and dash variants
    .replace(/\u00d7/g, '*')
    .replace(/\u00f7/g, '/')
    .replace(/\u03c0/g, 'pi')
    .replace(/\u221a\s*\(/g, 'sqrt(')
    .replace(/\u221a\s*([0-9.]+)/g, 'sqrt($1)')
    .replace(/\u00b0|degrees?|deg/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (numeric) {
    s = s.replace(/(\d),(\d)/g, '$1.$2') // decimal comma (South African style)
    s = s.replace(/\s*(metres?|meters?|m)$/, '') // trailing unit
  }
  // 2sqrt(3) and 2pi -> 2*sqrt(3), 2*pi
  s = s.replace(/(\d|\))\s*(sqrt|pi)/g, '$1*$2')
  return s.trim()
}

function toNumber(raw: string, numeric: boolean): number | null {
  const s = normalise(raw, numeric)
  if (!s || s.length > 40) return null
  if (!/^[0-9a-z+\-*/^().\s]+$/.test(s)) return null
  const words = s.match(/[a-z]+/g) ?? []
  if (words.some(w => w !== 'sqrt' && w !== 'pi')) return null
  try {
    const v = evaluateSafe(s)
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

// how close a decimal answer must be: "6.24" allows a little more than half of 0.01
function tolerance(candidate: string): number {
  const m = candidate.trim().match(/^-?\d*\.(\d+)$/)
  return m ? 0.6 * Math.pow(10, -m[1].length) : 1e-9
}

export function mark(kind: Kind, response: string, answer: string, accepted: string[] = []): boolean {
  const candidates = [answer, ...accepted]

  if (kind === 'mcq') {
    const r = response.trim().toLowerCase()
    return candidates.some(c => c.trim().toLowerCase() === r)
  }

  const r = toNumber(response, kind === 'numeric')
  if (r === null) return false

  return candidates.some(c => {
    const v = toNumber(c, false)
    if (v === null) return false
    const tol = kind === 'numeric' ? tolerance(c) : 1e-9
    return Math.abs(r - v) <= tol
  })
}