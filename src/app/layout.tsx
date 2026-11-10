export const metadata = { title: 'NHUSTA', description: 'Human-centred learning through mathematics' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}