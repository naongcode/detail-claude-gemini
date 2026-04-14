'use client'

import { useState, useEffect } from 'react'

interface Props {
  projectId: string
  onStatusChange: () => void
}

export default function PhotoUpload({ projectId, onStatusChange }: Props) {
  const [photoList, setPhotoList] = useState<string[]>([])
  const [photoSaving, setPhotoSaving] = useState(false)

  useEffect(() => { fetchPhotos() }, [projectId])

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/photos`)
      if (res.ok) { const data = await res.json(); setPhotoList(data) }
    } catch (e) { console.error('사진 목록 로드 실패:', e) }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setPhotoSaving(true)
    try {
      await Promise.all(Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(`/api/projects/${projectId}/photos`, {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? '업로드 실패')
        }
      }))
      await fetchPhotos()
      onStatusChange()
    } catch (e) {
      alert(`업로드 실패: ${String(e)}`)
    } finally {
      setPhotoSaving(false)
    }
  }

  const handleDelete = async () => {
    const res = await fetch(`/api/projects/${projectId}/photos`, { method: 'DELETE' })
    if (res.ok) { await fetchPhotos(); onStatusChange() }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div>
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <span>📷</span>제품사진 업로드
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">Gemini가 실제 제품을 참조하여 이미지를 생성합니다 (선택)</p>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <label className={`cursor-pointer text-sm px-4 py-2 rounded-xl font-medium border transition-colors ${photoSaving ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
          {photoSaving ? '업로드 중...' : '📁 사진 선택'}
          <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple disabled={photoSaving} onChange={(e) => handleUpload(e.target.files)} className="hidden" />
        </label>
        <button
          onClick={handleDelete}
          disabled={photoList.length === 0}
          className="text-sm text-red-500 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 disabled:opacity-40 transition-colors"
        >
          모두 삭제
        </button>
      </div>
      {photoList.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {photoList.map((name) => (
            <span key={name} className="flex items-center gap-1 bg-green-50 text-green-700 text-xs px-3 py-1.5 rounded-full border border-green-200">
              📷 {name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
