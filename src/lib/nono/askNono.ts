export type Msg = { role: 'user' | 'assistant'; content: string }

// the one place that talks to deepseek. key stays on the server.
export async function askNono(opts: { system: string; history: Msg[] }): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set')
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'

  const call = (extra: Record<string, unknown>) =>
    fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: opts.system }, ...opts.history],
        temperature: 0.4,
        max_tokens: 300,
        stream: false,
        ...extra,
      }),
      signal: AbortSignal.timeout(25000),
    })

  // ask for the fast non-thinking mode; if the api rejects that field, retry plain
  let res = await call({ thinking: { type: 'disabled' } })
  if (res.status === 400) res = await call({})
  if (!res.ok) throw new Error(`deepseek ${res.status}`)

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) throw new Error('empty reply')
  return text.trim()
}