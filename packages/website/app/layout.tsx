import type { Metadata } from 'next'
import { Fjalla_One } from 'next/font/google'
import './globals.css'

const fjallaOne = Fjalla_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-fjalla',
})

export const metadata: Metadata = {
  title: 'ScanCorrect - Fix Your Film Photos\' Metadata Instantly',
  description: 'A desktop application for film photographers to easily fix camera metadata in scanned film images.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={fjallaOne.variable}>{children}</body>
    </html>
  )
}