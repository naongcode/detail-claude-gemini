import { createClient } from '@supabase/supabase-js'

// 브라우저 전용 Supabase 클라이언트 (anon key)
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const BUCKET = 'project-assets'

export async function uploadPhotoFromBrowser(
  pid: string,
  file: File
): Promise<string> {
  const filename = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
  const filePath = `${pid}/photos/${filename}`

  const { error } = await supabaseBrowser.storage
    .from(BUCKET)
    .upload(filePath, file, { contentType: file.type, upsert: true })

  if (error) throw new Error(`업로드 실패: ${error.message}`)

  const { data } = supabaseBrowser.storage.from(BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}
