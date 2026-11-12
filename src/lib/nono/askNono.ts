export type Msg = { role: 'user' | 'assistant'; content: string }

// the one place that talks to gemini. key stays on the server.
export async function askNono(opts: { system: string; history: Msg[] }): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

  const call = (generationConfig: Record<string, unknown>) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: opts.history.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: 0.4, maxOutputTokens: 400, ...generationConfig },
      }),
      signal: AbortSignal.timeout(25000),
    })

  // ask for no hidden thinking so the token limit isn't eaten; if the api rejects that field, retry plain
  let res = await call({ thinkingConfig: { thinkingBudget: 0 } })
  if (res.status === 400) res = await call({})
  if (!res.ok) throw new Error(`gemini ${res.status}`)

  const data = await res.json()
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? '')
    .join('')
  if (!text.trim()) throw new Error('empty reply')
  return text.trim()
}