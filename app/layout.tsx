import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Parliament App',
  description: 'Ask questions and get analysis from AI parliament members',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
