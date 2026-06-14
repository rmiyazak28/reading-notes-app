// src/app/layout.tsx

import type { Metadata } from 'next'
import { Geist, Geist_Mono, Source_Serif_4 } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif" })

export const metadata: Metadata = {
  title: 'memoLake - 読書記録管理',
  description: '思考・引用・感想を湖のように蓄積する、静かで集中できる個人用読書記録アプリ',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable}`}>
      <body className="font-sans antialiased min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        {children}
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}