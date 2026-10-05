import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'myADMIN · Cockpit',
  description: 'Leitstand von NeXify AI',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
