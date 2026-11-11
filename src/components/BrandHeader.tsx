import Link from 'next/link'

// Slim top bar: back link on the left, logo on the right, four-colour stripe underneath.
// Needs the logo saved as public/nhusta-logo.png
export default function BrandHeader({ back }: { back?: { href: string; label: string } }) {
  return (
    <header className="sticky top-0 z-20 bg-white shadow-sm">
      <div className="mx-auto flex max-w-md items-center justify-between px-5 py-2">
        {back ? (
          <Link href={back.href} className="py-2 text-sm font-semibold text-[var(--nh-purple)]">
            &larr; {back.label}
          </Link>
        ) : (
          <span />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nhusta-logo.png" alt="NHUSTA" className="h-12 w-12 object-contain" />
      </div>
      <div className="nh-stripe" />
    </header>
  )
}