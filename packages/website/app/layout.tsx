import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Film EXIF Editor - Fix Your Film Photos\' Metadata Instantly',
  description: 'A beautiful desktop application for film photographers to easily fix camera metadata in scanned film images. No external dependencies required.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}