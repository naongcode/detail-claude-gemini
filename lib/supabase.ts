import { createClient } from '@supabase/supabase-js'
import { ProjectMeta, ProductBrief, ResearchOutput, PageDesign } from './types'

// ── 클라이언트 ────────────────────────────────────────────────────────────────

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  return createClient(url, key)
}

// ── 스토리지 경로 헬퍼 ────────────────────────────────────────────────────────

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

// ── DB: 프로젝트 CRUD ─────────────────────────────────────────────────────────

type DataField = 'brief' | 'research' | 'page_design' | 'html_page'

export async function listProjects(): Promise<ProjectMeta[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, created_at, updated_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export async function createProject(id: string, name: string): Promise<void> {
  const supabase = getClient()
  const now = new Date().toISOString()
  const { error } = await supabase.from('projects').insert({
    id,
    name,
    created_at: now,
    updated_at: now,
  })
  if (error) throw error
}

export async function renameProject(pid: string, name: string): Promise<void> {
  const supabase = getClient()
  const { error } = await supabase
    .from('projects')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', pid)
  if (error) throw error
}

export async function deleteProject(pid: string): Promise<void> {
  const supabase = getClient()

  // Storage 파일 전체 삭제
  const { data: files } = await supabase.storage.from(BUCKET).list(pid, { limit: 1000 })
  if (files && files.length > 0) {
    // 하위 폴더(photos, sections)도 삭제
    for (const folder of ['photos', 'sections']) {
      const { data: sub } = await supabase.storage.from(BUCKET).list(`${pid}/${folder}`, { limit: 1000 })
      if (sub && sub.length > 0) {
        await supabase.storage.from(BUCKET).remove(sub.map((f) => `${pid}/${folder}/${f.name}`))
      }
    }
    // final.png
    await supabase.storage.from(BUCKET).remove([`${pid}/final.png`])
  }

  // DB 행 삭제
  const { error } = await supabase.from('projects').delete().eq('id', pid)
  if (error) throw error
}

// ── DB: JSON 데이터 읽기/쓰기 ─────────────────────────────────────────────────

export async function loadProjectData<T>(pid: string, field: DataField): Promise<T | null> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('projects')
    .select(field)
    .eq('id', pid)
    .single()
  if (error || !data) return null
  const value = (data as Record<string, unknown>)[field]
  return value ? (value as T) : null
}

export async function saveProjectData(pid: string, field: DataField, value: unknown): Promise<void> {
  const supabase = getClient()
  const { error } = await supabase
    .from('projects')
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq('id', pid)
  if (error) throw error
}

export async function getProjectName(pid: string): Promise<string | null> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('projects')
    .select('name')
    .eq('id', pid)
    .single()
  if (error || !data) return null
  return (data as { name: string }).name
}

export async function getProjectRow(pid: string): Promise<{
  brief: ProductBrief | null
  research: ResearchOutput | null
  page_design: PageDesign | null
  html_page: string | null
} | null> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('projects')
    .select('brief, research, page_design, html_page')
    .eq('id', pid)
    .single()
  if (error || !data) return null
  return data as {
    brief: ProductBrief | null
    research: ResearchOutput | null
    page_design: PageDesign | null
    html_page: string | null
  }
}

// ── Storage: 제품 사진 ─────────────────────────────────────────────────────────

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

// ── Storage: 섹션 이미지 ──────────────────────────────────────────────────────

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
  const { data, error } = await supabase.storage.from(BUCKET).list(`${pid}/sections`, { limit: 100 })
  if (error || !data) return []
  return data.map((f) => f.name.replace('.png', '')).sort()
}

// ── Storage: 최종 PNG ─────────────────────────────────────────────────────────

export async function uploadFinalPng(pid: string, buffer: Buffer): Promise<string> {
  const supabase = getClient()
  const { error } = await supabase.storage.from(BUCKET).upload(`${pid}/final.png`, buffer, {
    contentType: 'image/png',
    upsert: true,
  })
  if (error) throw error
  return getPublicUrl(pid, 'final')
}

export async function downloadFinalPng(pid: string): Promise<Buffer | null> {
  const supabase = getClient()
  const { data, error } = await supabase.storage.from(BUCKET).download(`${pid}/final.png`)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

export async function hasFinalPng(pid: string): Promise<boolean> {
  const supabase = getClient()
  const { data } = await supabase.storage.from(BUCKET).list(pid, { search: 'final.png' })
  return (data ?? []).some((f) => f.name === 'final.png')
}
