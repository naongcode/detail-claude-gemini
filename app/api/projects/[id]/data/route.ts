import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getProjectPaths, loadJson, saveJson } from '@/lib/projects'
import { PageDesign } from '@/lib/types'

type DataKey = 'research' | 'pageDesign'

const DATA_KEY_MAP: Record<DataKey, keyof ReturnType<typeof getProjectPaths>> = {
  research: 'research',
  pageDesign: 'pageDesign',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const key = req.nextUrl.searchParams.get('key') as DataKey | null

  try {
    const p = getProjectPaths(id)

    if (key && DATA_KEY_MAP[key]) {
      const filePath = p[DATA_KEY_MAP[key]] as string
      if (!fs.existsSync(filePath)) return NextResponse.json(null)
      return NextResponse.json(loadJson(filePath))
    }

    // Return all data files
    const result: Record<string, unknown> = {}
    for (const [k, pathKey] of Object.entries(DATA_KEY_MAP)) {
      const filePath = p[pathKey as keyof typeof p] as string
      result[k] = fs.existsSync(filePath) ? loadJson(filePath) : null
    }
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const key = req.nextUrl.searchParams.get('key') as DataKey | null

  try {
    if (!key || !DATA_KEY_MAP[key]) {
      return NextResponse.json({ error: '유효한 key가 필요합니다 (research|pageDesign)' }, { status: 400 })
    }

    const body = await req.json()
    const p = getProjectPaths(id)
    const filePath = p[DATA_KEY_MAP[key]] as string
    saveJson(filePath, body)

    // pageDesign 저장 시 page.html 재조립 + Puppeteer 재렌더
    if (key === 'pageDesign') {
      const pageDesign = body as PageDesign
      let html = pageDesign.html
      for (const imgReq of pageDesign.images) {
        const imgPath = path.join(p.sections, `${imgReq.id}.png`)
        if (fs.existsSync(imgPath)) {
          const fileUrl = `file:///${imgPath.replace(/\\/g, '/')}`
          html = html.replaceAll(`__GEN_${imgReq.id}__`, fileUrl)
        }
      }
      fs.writeFileSync(p.htmlPage, html, 'utf-8')

      try {
        const { renderToPng } = await import('@/lib/renderer')
        await renderToPng(p.htmlPage, p.finalPng)
        return NextResponse.json({ saved: true, rendered: true })
      } catch (renderErr) {
        return NextResponse.json({ saved: true, rendered: false, renderError: String(renderErr) })
      }
    }

    return NextResponse.json({ saved: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
