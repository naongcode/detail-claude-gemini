import { getClient } from './supabase-client'

export const BUCKET = 'project-assets'

// Supabase Storage는 ASCII만 허용 — 프로젝트 ID를 URL-safe base64로 인코딩
function toStorageKey(pid: string): string {
  return Buffer.from(pid).toString('base64url')
}

export function storagePath(pid: string, type: 'photo' | 'section' | 'final', filename?: string): string {
  const key = toStorageKey(pid)
  if (type === 'photo')   return `${key}/photos/${filename}`
  if (type === 'section') return `${key}/sections/${filename}`
  return `${key}/final.png`
}

export function getPublicUrl(pid: string, type: 'photo' | 'section' | 'final', filename?: string): string {
  const supabase = getClient()
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath(pid, type, filename))
  return data.publicUrl
}

// ── 제품 사진 ─────────────────────────────────────────────────────────────────

export async function uploadPhoto(
  pid: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const supabase = getClient()
  const path = storagePath(pid, 'photo', filename)
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: true,
  })
  if (error) throw error
  return getPublicUrl(pid, 'photo', filename)
}

export async function createSignedUploadUrl(pid: string, filename: string): Promise<{ signedUrl: string; token: string; path: string }> {
  const supabase = getClient()
  const filePath = storagePath(pid, 'photo', filename)
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(filePath, { upsert: true })
  if (error || !data) throw error ?? new Error('signed URL 생성 실패')
  return { signedUrl: data.signedUrl, token: data.token, path: data.path }
}

export async function listPhotos(pid: string): Promise<string[]> {
  const supabase = getClient()
  const key = toStorageKey(pid)
  const { data, error } = await supabase.storage.from(BUCKET).list(`${key}/photos`, { limit: 100 })
  if (error || !data) return []
  return data.map((f) => f.name).sort()
}

export async function deleteAllPhotos(pid: string): Promise<void> {
  const supabase = getClient()
  const key = toStorageKey(pid)
  const { data } = await supabase.storage.from(BUCKET).list(`${key}/photos`, { limit: 100 })
  if (!data || data.length === 0) return
  await supabase.storage.from(BUCKET).remove(data.map((f) => `${key}/photos/${f.name}`))
}

export async function downloadPhoto(pid: string, filename: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const supabase = getClient()
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath(pid, 'photo', filename))
  if (error || !data) return null
  const arrayBuffer = await data.arrayBuffer()
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
  return { buffer: Buffer.from(arrayBuffer), mimeType: mimeMap[ext] ?? 'image/jpeg' }
}

export async function getPhotoBuffers(pid: string): Promise<Array<{ data: Buffer; mimeType: string }>> {
  const filenames = await listPhotos(pid)
  const results: Array<{ data: Buffer; mimeType: string }> = []
  for (const filename of filenames) {
    const photo = await downloadPhoto(pid, filename)
    if (photo) results.push({ data: photo.buffer, mimeType: photo.mimeType })
  }
  return results
}

// ── 섹션 이미지 ───────────────────────────────────────────────────────────────

export async function uploadSection(pid: string, sectionId: string, buffer: Buffer): Promise<string> {
  const supabase = getClient()
  const path = storagePath(pid, 'section', `${sectionId}.png`)
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'image/png',
    upsert: true,
  })
  if (error) throw error
  return getPublicUrl(pid, 'section', `${sectionId}.png`)
}

export async function downloadSection(pid: string, sectionId: string): Promise<Buffer | null> {
  const supabase = getClient()
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath(pid, 'section', `${sectionId}.png`))
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

export async function listSections(pid: string): Promise<string[]> {
  const supabase = getClient()
  const key = toStorageKey(pid)
  const { data, error } = await supabase.storage.from(BUCKET).list(`${key}/sections`, { limit: 100 })
  if (error || !data) return []
  return data.map((f) => f.name.replace('.png', '')).sort()
}

// ── 최종 PNG ──────────────────────────────────────────────────────────────────

export async function uploadFinalPng(pid: string, buffer: Buffer): Promise<string> {
  const supabase = getClient()
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath(pid, 'final'), buffer, {
    contentType: 'image/png',
    upsert: true,
  })
  if (error) throw error
  return getPublicUrl(pid, 'final')
}

export async function downloadFinalPng(pid: string): Promise<Buffer | null> {
  const supabase = getClient()
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath(pid, 'final'))
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

export async function hasFinalPng(pid: string): Promise<boolean> {
  const supabase = getClient()
  const key = toStorageKey(pid)
  const { data } = await supabase.storage.from(BUCKET).list(key, { search: 'final.png' })
  return (data ?? []).some((f) => f.name === 'final.png')
}

// ── 프로젝트 삭제 시 Storage 정리 ─────────────────────────────────────────────

export async function deleteProjectFiles(pid: string): Promise<void> {
  const supabase = getClient()
  const key = toStorageKey(pid)
  for (const folder of ['photos', 'sections']) {
    const { data: sub } = await supabase.storage.from(BUCKET).list(`${key}/${folder}`, { limit: 1000 })
    if (sub && sub.length > 0) {
      await supabase.storage.from(BUCKET).remove(sub.map((f) => `${key}/${folder}/${f.name}`))
    }
  }
  await supabase.storage.from(BUCKET).remove([`${key}/final.png`])
}
