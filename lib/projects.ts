import { ProjectMeta, ProjectStatus, PageDesign } from './types'
import * as sb from './supabase'

// ── ID 생성 ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 20) || 'project'
}

export function newProjectId(name: string): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14)
    .replace(/(\d{8})(\d{6})/, '$1_$2')
  return `${slugify(name)}_${ts}`
}

// ── 프로젝트 CRUD (async) ─────────────────────────────────────────────────────

export async function listProjects(userId: string): Promise<ProjectMeta[]> {
  return sb.listProjects(userId)
}

export async function createProject(name: string, userId: string): Promise<string> {
  const pid = newProjectId(name)
  await sb.createProject(pid, name, userId)
  return pid
}

export async function renameProject(pid: string, name: string): Promise<void> {
  return sb.renameProject(pid, name)
}

export async function deleteProject(pid: string): Promise<void> {
  return sb.deleteProject(pid)
}

// ── 프로젝트 상태 ─────────────────────────────────────────────────────────────

export async function getProjectStatus(pid: string): Promise<ProjectStatus> {
  const [row, photoNames, sectionNames, finalExists] = await Promise.all([
    sb.loadProjectData<PageDesign>(pid, 'page_design'),
    sb.listPhotos(pid),
    sb.listSections(pid),
    sb.hasFinalPng(pid),
  ])

  let imageTotal = 0
  let imageGenerated = 0

  if (row) {
    imageTotal = row.images.length
    imageGenerated = row.images.filter((img) => sectionNames.includes(img.id)).length
  }

  return {
    hasBrief:      !!(await sb.loadProjectData(pid, 'brief')),
    hasResearch:   !!(await sb.loadProjectData(pid, 'research')),
    hasPageDesign: !!row,
    imageTotal,
    imageGenerated,
    photoCount:    photoNames.length,
    hasFinalPng:   finalExists,
  }
}

// ── 데이터 읽기/쓰기 (DB JSON 컬럼) ──────────────────────────────────────────

export { loadProjectData, saveProjectData, getProjectRow } from './supabase'

// ── 사진 ─────────────────────────────────────────────────────────────────────

export { listPhotos, uploadPhoto, deleteAllPhotos, getPhotoBuffers } from './supabase'
