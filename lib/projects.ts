import fs from 'fs'
import path from 'path'
import { ProjectMeta, ProjectStatus, PageDesign } from './types'
import { PHOTO_EXTS } from './constants'

export const PROJECTS_DIR = process.env.VERCEL
  ? path.join('/tmp', 'projects')
  : path.join(process.cwd(), 'projects')

export function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true })
  }
}

function slugify(text: string): string {
  return text
    .trim()
    .replace(/[^\w\s가-힣]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40) || 'project'
}

function newProjectId(name: string): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14)
    .replace(/(\d{8})(\d{6})/, '$1_$2')
  return `${slugify(name)}_${ts}`
}

export function listProjects(): ProjectMeta[] {
  ensureProjectsDir()
  const dirs = fs.readdirSync(PROJECTS_DIR)
  const projects: ProjectMeta[] = []

  for (const dir of dirs) {
    const dirPath = path.join(PROJECTS_DIR, dir)
    if (!fs.statSync(dirPath).isDirectory()) continue
    const metaPath = path.join(dirPath, 'meta.json')
    if (fs.existsSync(metaPath)) {
      try {
        projects.push({ ...JSON.parse(fs.readFileSync(metaPath, 'utf-8')), id: dir })
      } catch {
        projects.push({ id: dir, name: dir, createdAt: '', updatedAt: '' })
      }
    } else {
      projects.push({ id: dir, name: dir, createdAt: '', updatedAt: '' })
    }
  }

  projects.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  return projects
}

export function createProject(name: string): string {
  ensureProjectsDir()
  const pid = newProjectId(name)
  const projectDir = path.join(PROJECTS_DIR, pid)
  fs.mkdirSync(projectDir, { recursive: true })
  fs.mkdirSync(path.join(projectDir, 'sections'), { recursive: true })
  fs.mkdirSync(path.join(projectDir, 'product_photos'), { recursive: true })

  const now = new Date().toISOString()
  const meta: Omit<ProjectMeta, 'id'> = { name, createdAt: now, updatedAt: now }
  fs.writeFileSync(path.join(projectDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8')
  return pid
}

export function renameProject(pid: string, name: string): void {
  const p = getProjectPaths(pid)
  if (!fs.existsSync(p.meta)) return
  const meta = JSON.parse(fs.readFileSync(p.meta, 'utf-8'))
  meta.name = name
  meta.updatedAt = new Date().toISOString()
  fs.writeFileSync(p.meta, JSON.stringify(meta, null, 2), 'utf-8')
}

export function deleteProject(pid: string): void {
  const projectDir = path.join(PROJECTS_DIR, pid)
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
}

export function getProjectDir(pid: string): string {
  return path.join(PROJECTS_DIR, pid)
}

export function getProjectPaths(pid: string) {
  const base = path.join(PROJECTS_DIR, pid)
  return {
    base,
    sections:    path.join(base, 'sections'),
    photos:      path.join(base, 'product_photos'),
    brief:       path.join(base, 'structured_brief.json'),
    research:    path.join(base, 'research_output.json'),
    pageDesign:  path.join(base, 'page_design.json'),
    finalPng:    path.join(base, 'final_page.png'),
    htmlPage:    path.join(base, 'page.html'),
    meta:        path.join(base, 'meta.json'),
  }
}

export function getProjectStatus(pid: string): ProjectStatus {
  const p = getProjectPaths(pid)

  let photoCount = 0
  if (fs.existsSync(p.photos)) {
    photoCount = fs.readdirSync(p.photos)
      .filter((f) => PHOTO_EXTS.some((ext) => f.toLowerCase().endsWith(ext))).length
  }

  // page_design.json에서 이미지 목록 읽기
  let imageTotal = 0
  let imageGenerated = 0
  if (fs.existsSync(p.pageDesign)) {
    try {
      const design = JSON.parse(fs.readFileSync(p.pageDesign, 'utf-8')) as PageDesign
      imageTotal = design.images.length
      if (fs.existsSync(p.sections)) {
        imageGenerated = design.images.filter((img) =>
          fs.existsSync(path.join(p.sections, `${img.id}.png`))
        ).length
      }
    } catch (err) {
      console.warn(`[projects] page_design.json 파싱 실패 (${pid}):`, err)
    }
  }

  return {
    hasBrief:       fs.existsSync(p.brief),
    hasResearch:    fs.existsSync(p.research),
    hasPageDesign:  fs.existsSync(p.pageDesign),
    imageTotal,
    imageGenerated,
    photoCount,
    hasFinalPng:    fs.existsSync(p.finalPng),
  }
}

export function loadJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return null
  }
}

export function saveJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function getProductPhotoPaths(pid: string): string[] {
  const photosDir = path.join(PROJECTS_DIR, pid, 'product_photos')
  if (!fs.existsSync(photosDir)) return []
  return fs.readdirSync(photosDir)
    .filter((f) => PHOTO_EXTS.some((ext) => f.toLowerCase().endsWith(ext)))
    .sort()
    .map((f) => path.join(photosDir, f))
}
