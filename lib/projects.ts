import path from 'path'
import { ProjectMeta, ProjectStatus, PageDesign } from './types'
import * as sb from './supabase'

// ── /tmp 경로 (Puppeteer 렌더링용 임시 스크래치) ─────────────────────────────

export function getTmpDir(pid: string): string {
  return path.join('/tmp', 'projects', pid)
}

export function getTmpPaths(pid: string) {
  const base = getTmpDir(pid)
  return {
    base,
    sections: path.join(base, 'sections'),
    htmlPage: path.join(base, 'page.html'),
    finalPng: path.join(base, 'final_page.png'),
  }
}

// ── ID 생성 ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .trim()
    .replace(/[^\w\s가-힣]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40) || 'project'
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

export async function listProjects(): Promise<ProjectMeta[]> {
  return sb.listProjects()
}

export async function createProject(name: string): Promise<string> {
  const pid = newProjectId(name)
  await sb.createProject(pid, name)
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
