import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import { listProjects, deleteProject } from '@/lib/projects'

export async function DELETE() {
  let user
  try {
    user = await requireAuth()
  } catch {
    return unauthorizedResponse()
  }

  try {
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. 프로젝트 Storage 파일 삭제 (DB는 soft delete)
    const projects = await listProjects(user.id)
    for (const p of projects) {
      await deleteProject(p.id)
    }

    // 2. Supabase Auth 계정 삭제
    const { error } = await serviceClient.auth.admin.deleteUser(user.id)
    if (error) throw error

    return NextResponse.json({ deleted: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
