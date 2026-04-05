import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'Debater — AI Debate Arena',
  description:
    'Enter any topic and watch two AI champions argue simultaneously in real time. Vote on who wins.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-gray-950 text-white min-h-screen antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
