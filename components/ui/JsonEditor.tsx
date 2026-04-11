'use client'

import { useState, useEffect } from 'react'

interface Props {
  label: string
  value: unknown
  onSave: (data: unknown) => Promise<void>
  height?: string
}

export default function JsonEditor({ label, value, onSave, height = '400px' }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setText(value != null ? JSON.stringify(value, null, 2) : '')
  }, [value])

  const handleSave = async () => {
    setError(null)
    try {
      const parsed = JSON.parse(text)
      setSaving(true)
      await onSave(parsed)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(`JSON 형식 오류: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <button
          onClick={handleSave}
          disabled={saving || !text.trim()}
          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40'
          }`}
        >
          {saved ? '✓ 저장됨' : saving ? '저장 중...' : '저장'}
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setError(null) }}
        className="w-full font-mono text-xs p-4 bg-slate-900 text-emerald-300 resize-none focus:outline-none"
        style={{ height }}
        spellCheck={false}
      />
      {error && (
        <div className="px-4 py-2.5 bg-red-50 border-t border-red-200 text-xs text-red-600">
          {error}
        </div>
      )}
    </div>
  )
}
