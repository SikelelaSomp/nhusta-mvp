import { describe, it, expect } from 'vitest'
import { guardReply } from '../src/lib/nono/guard'

const q = {
  kind: 'algebra' as const,
  answer: '12/13',
  accepted: [] as string[],
  prompt: 'In that triangle, find sin D. D(-5,-12), E(-5,0), F(0,0)',
}

describe('guardReply', () => {
  it('lets a normal hint through', () => {
    const r = guardReply('Which side is opposite angle D, and which is the hypotenuse? Use SOH.', q)
    expect(r.blocked).toBe(false)
  })
  it('ignores numbers that are already in the question', () => {
    const r = guardReply('Side DE is 12 long and EF is 5 long. What is the hypotenuse?', q)
    expect(r.blocked).toBe(false)
  })
  it('blocks the plain final answer', () => {
    expect(guardReply('So sin D = 12/13.', q).blocked).toBe(true)
  })
  it('blocks the latex form', () => {
    expect(guardReply('That gives $\\sin D = \\frac{12}{13}$.', q).blocked).toBe(true)
  })
  it('blocks an equivalent fraction', () => {
    expect(guardReply('It works out to 24/26.', q).blocked).toBe(true)
  })
  it('blocks a decimal answer', () => {
    const n = { kind: 'numeric' as const, answer: '6.24', accepted: ['6.2', 'sqrt(39)'], prompt: 'Find h.' }
    expect(guardReply('So h is about 6.24 m.', n).blocked).toBe(true)
    expect(guardReply('Use $h = \\sqrt{39}$.', n).blocked).toBe(true)
    expect(guardReply('Use Pythagoras: h squared plus 25 equals 64.', n).blocked).toBe(false)
  })
})