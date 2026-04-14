'use client'

import { useState } from 'react'

interface Props {
  src: string | null
  alt: string
  aspectRatio?: string  // e.g. '2/1' for section cards in ResultTab
}

export default function SectionImage({ src, alt, aspectRatio }: Props) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  if (!src) {
    return (
      <div className="min-h-32 flex items-center justify-center bg-slate-50 text-slate-300 text-xs">
        이미지 없음
      </div>
    )
  }

  return (
    <div
      className="relative bg-slate-100 w-full"
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {status === 'loading' && (
        <div className={`${aspectRatio ? 'absolute inset-0' : 'min-h-32'} flex items-center justify-center`}>
          {aspectRatio
            ? <div className="text-slate-400 text-xs animate-pulse">로딩 중...</div>
            : <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
          }
        </div>
      )}
      {status === 'error' && (
        <div className={`${aspectRatio ? 'absolute inset-0' : 'min-h-32'} flex items-center justify-center text-slate-300 text-xs`}>
          미생성
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`w-full ${aspectRatio ? 'h-full object-cover' : 'h-auto block'} transition-opacity ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  )
}
