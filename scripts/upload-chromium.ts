/**
 * 일회성 스크립트: @sparticuz/chromium bin 파일을 Supabase Storage에 업로드
 * 실행: npx tsx --env-file=.env.local scripts/upload-chromium.ts
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const BUCKET = 'project-assets'
const STORAGE_PATH = 'chromium/chromium-pack.tar'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(url, key)

  const binDir = path.resolve('node_modules/@sparticuz/chromium/bin')
  const tarPath = path.resolve('node_modules/@sparticuz/chromium/chromium-pack.tar')

  if (!fs.existsSync(binDir)) {
    console.error('bin 디렉토리 없음:', binDir)
    process.exit(1)
  }

  const files = fs.readdirSync(binDir)
  console.log('bin 파일:', files)

  // 시스템 tar로 pack.tar 생성
  console.log('tar 생성 중...')
  execSync(`tar -cf "${tarPath}" -C "${binDir}" ${files.join(' ')}`)
  const tarSize = fs.statSync(tarPath).size
  console.log(`tar 완료: ${(tarSize / 1024 / 1024).toFixed(1)}MB`)

  // Supabase에 업로드
  console.log('Supabase 업로드 중...')
  const buffer = fs.readFileSync(tarPath)
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(STORAGE_PATH, buffer, {
      contentType: 'application/x-tar',
      upsert: true,
    })

  fs.unlinkSync(tarPath)

  if (error) {
    console.error('업로드 실패:', error.message)
    process.exit(1)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(STORAGE_PATH)
  console.log('\n✅ 업로드 완료!')
  console.log('URL:', data.publicUrl)
  console.log('\n아래 환경변수를 .env.local과 Vercel에 추가하세요:')
  console.log(`CHROMIUM_PACK_URL=${data.publicUrl}`)
}

main()
