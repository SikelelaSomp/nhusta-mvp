import Link from 'next/link'

export default function Welcome() {
  return (
    <main className="min-h-screen bg-brand text-cream flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-extrabold tracking-wide">NHUSTA</h1>
      <p className="mt-2 text-lg opacity-90">Human-centred learning through mathematics</p>
      <p className="mt-8 max-w-sm opacity-90">
        Grade 10 maths, learned through real life. Meet Nono, who will help you think it through.
      </p>
      <Link
        href="/login"
        className="mt-10 rounded-full bg-gold px-10 py-4 text-lg font-bold text-brand-dark shadow"
      >
        Start
      </Link>
    </main>
  )
}