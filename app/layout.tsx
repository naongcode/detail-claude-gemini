import type { Metadata } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: '상세페이지 자동 생성기',
  description: '제품 정보를 입력하면 AI가 13개 섹션의 고전환 상세페이지를 자동 생성합니다.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
