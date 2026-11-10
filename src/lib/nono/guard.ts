import { mark, type Kind } from '../marking/mark'

const FALLBACK =
  "I can't give you the answer, but let's take it one small step at a time. What does the question give you, and what is it asking for? Try writing those down first."

// turn latex fractions and roots into plain text so numbers can be compared
function flatten(text: string): string {
  return text
    .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '$1/$2')
    .replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)')
    .replace(/\\left|\\right|\\text|\\,|\\!/g, '')
    .replace(/[{}$]/g, '')
}

const TOKEN =
  /-?\d*\s*(?:sqrt\(\d+\)|\u221a\d+)(?:\s*\/\s*\d+)?|-?\d+(?:[.,]\d+)?(?:\s*\/\s*-?\d+)?/g

const squash = (s: string) => flatten(s).toLowerCase().replace(/\s+/g, '')

// checks Nono's reply for the final answer. numbers already in the question are ignored.
export function guardReply(
  reply: string,
  q: { kind: Kind; answer: string; accepted: string[]; prompt: string }
): { text: string; blocked: boolean } {
  const inPrompt = squash(q.prompt)
  const tokens = flatten(reply).match(TOKEN) ?? []
  for (const t of tokens) {
    const clean = t.replace(/\s+/g, '')
    if (!clean || inPrompt.includes(squash(clean))) continue
    if (mark(q.kind, clean, q.answer, q.accepted)) return { text: FALLBACK, blocked: true }
  }
  return { text: reply, blocked: false }
}