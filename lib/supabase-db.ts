import { ProjectMeta, ProductBrief, ResearchOutput, PageDesign } from './types'
import { getClient } from './supabase-client'
import { deleteProjectFiles } from './supabase-storage'

// ── 프로젝트 CRUD ─────────────────────────────────────────────────────────────

type DataField = 'brief' | 'research' | 'page_design' | 'html_page'

export async function listProjects(userId: string): Promise<ProjectMeta[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, created_at, updated_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export async function createProject(id: string, name: string, userId: string): Promise<void> {
  const supabase = getClient()
  const now = new Date().toISOString()
  const { error } = await supabase.from('projects').insert({
    id,
    name,
    user_id: userId,
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
  await deleteProjectFiles(pid)
  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
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

export async function getProjectRegenInfo(pid: string): Promise<{ regenCount: number; regenLimit: number }> {
  const supabase = getClient()
  const { data } = await supabase
    .from('projects')
    .select('regen_count, regen_limit')
    .eq('id', pid)
    .single()
  return {
    regenCount: (data as { regen_count: number } | null)?.regen_count ?? 0,
    regenLimit: (data as { regen_limit: number } | null)?.regen_limit ?? 5,
  }
}

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

// ── pipeline_status ───────────────────────────────────────────────────────────

export interface PipelineStatus {
  stage: string
  completed: string[]
  failed?: string
  error?: string
}

export async function savePipelineStatus(pid: string, status: PipelineStatus | null): Promise<void> {
  const supabase = getClient()
  await supabase.from('projects').update({ pipeline_status: status }).eq('id', pid)
}

export async function loadPipelineStatus(pid: string): Promise<PipelineStatus | null> {
  const supabase = getClient()
  const { data } = await supabase.from('projects').select('pipeline_status').eq('id', pid).single()
  return (data as { pipeline_status: PipelineStatus | null } | null)?.pipeline_status ?? null
}

// ── project_versions ──────────────────────────────────────────────────────────

export interface ProjectVersion {
  id: number
  project_id: string
  version: number
  page_design: PageDesign | null
  final_png_path: string | null
  created_at: string
}

export async function saveProjectVersion(pid: string, pageDesign: PageDesign, finalPngPath: string): Promise<number> {
  const supabase = getClient()
  const { data: rows } = await supabase
    .from('project_versions')
    .select('version')
    .eq('project_id', pid)
    .order('version', { ascending: false })
    .limit(1)
  const nextVersion = rows && rows.length > 0 ? (rows[0] as { version: number }).version + 1 : 1
  await supabase.from('project_versions').insert({
    project_id: pid,
    version: nextVersion,
    page_design: pageDesign,
    final_png_path: finalPngPath,
  })
  return nextVersion
}

export async function listProjectVersions(pid: string): Promise<ProjectVersion[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('project_versions')
    .select('id, project_id, version, final_png_path, created_at')
    .eq('project_id', pid)
    .order('version', { ascending: false })
  if (error || !data) return []
  return data as ProjectVersion[]
}
