import { describe, it, expect } from 'vitest'
import { mark } from '../src/lib/marking/mark'

describe('numeric', () => {
  it('whole numbers', () => {
    expect(mark('numeric', '13', '13')).toBe(true)
    expect(mark('numeric', '13 m', '13')).toBe(true)
    expect(mark('numeric', '13.0', '13')).toBe(true)
    expect(mark('numeric', '12', '13')).toBe(false)
  })
  it('two decimal places with accepted alternatives', () => {
    const acc = ['6.2', 'sqrt(39)']
    expect(mark('numeric', '6.24', '6.24', acc)).toBe(true)
    expect(mark('numeric', '6,24', '6.24', acc)).toBe(true)
    expect(mark('numeric', '6.245', '6.24', acc)).toBe(true)
    expect(mark('numeric', 'sqrt(39)', '6.24', acc)).toBe(true)
    expect(mark('numeric', '6.2', '6.24', acc)).toBe(true)
    expect(mark('numeric', '6.3', '6.24', acc)).toBe(false)
    expect(mark('numeric', '6.25', '6.24', ['sqrt(39)'])).toBe(false)
  })
  it('angles with a degree sign', () => {
    expect(mark('numeric', '51.32°', '51.32', ['51.3'])).toBe(true)
    expect(mark('numeric', '51.32 degrees', '51.32', ['51.3'])).toBe(true)
    expect(mark('numeric', '52', '51.32', ['51.3'])).toBe(false)
  })
})

describe('algebra (exact values)', () => {
  it('fractions', () => {
    expect(mark('algebra', '12/13', '12/13')).toBe(true)
    expect(mark('algebra', '24/26', '12/13')).toBe(true)
    expect(mark('algebra', '13/12', '12/13')).toBe(false)
    expect(mark('algebra', '0.92', '12/13')).toBe(false)
  })
  it('negatives', () => {
    expect(mark('algebra', '-12/5', '-12/5')).toBe(true)
    expect(mark('algebra', '12/-5', '-12/5')).toBe(true)
    expect(mark('algebra', '\u221212/5', '-12/5')).toBe(true)
    expect(mark('algebra', '12/5', '-12/5')).toBe(false)
  })
  it('surds', () => {
    const acc = ['-2*sqrt(3)/3']
    expect(mark('algebra', '-2/sqrt(3)', '-2/sqrt(3)', acc)).toBe(true)
    expect(mark('algebra', '-2sqrt(3)/3', '-2/sqrt(3)', acc)).toBe(true)
    expect(mark('algebra', '-2\u221a3/3', '-2/sqrt(3)', acc)).toBe(true)
    expect(mark('algebra', '2/sqrt(3)', '-2/sqrt(3)', acc)).toBe(false)
  })
})

describe('bad input is just wrong', () => {
  it('rejects junk and anything that is not maths', () => {
    expect(mark('algebra', '', '12/13')).toBe(false)
    expect(mark('algebra', 'abc', '12/13')).toBe(false)
    expect(mark('algebra', 'sqrt(-1)', '12/13')).toBe(false)
    expect(mark('algebra', 'process.exit()', '12/13')).toBe(false)
    expect(mark('algebra', 'import("x")', '12/13')).toBe(false)
    expect(mark('numeric', 'x'.repeat(100), '13')).toBe(false)
  })
})

describe('mcq', () => {
  it('matches the option id', () => {
    expect(mark('mcq', ' B ', 'b')).toBe(true)
    expect(mark('mcq', 'a', 'b')).toBe(false)
  })
})