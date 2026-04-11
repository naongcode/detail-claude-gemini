import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { getProjectPaths, loadJson, saveJson } from '@/lib/projects'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const p = getProjectPaths(id)
    if (!fs.existsSync(p.brief)) return NextResponse.json(null)
    return NextResponse.json(loadJson(p.brief))
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await req.json()
    const p = getProjectPaths(id)
    saveJson(p.brief, body)
    return NextResponse.json({ saved: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
