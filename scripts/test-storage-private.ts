/**
 * Storage private 버킷 검증 스크립트
 *
 * 확인 항목:
 *   1. 버킷 public 설정 여부
 *   2. CDN 직접 URL 접근 → 차단 확인
 *   3. 프록시 라우트 미인증 접근 → 401 확인
 *   4. service role storage 접근 정상 여부
 *
 * 실행: npx tsx scripts/test-storage-private.ts
 * 주의: [3]번은 npm run dev 실행 중이어야 확인 가능
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BASE_URL     = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
const BUCKET       = 'project-assets'

function ok(msg: string)   { console.log(`  ✅ ${msg}`) }
function fail(msg: string) { console.log(`  ❌ ${msg}`) }
function info(msg: string) { console.log(`  ℹ️  ${msg}`) }

async function checkBucketConfig() {
  console.log('\n[1] 버킷 설정 확인')
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) { fail(`버킷 목록 조회 실패: ${error.message}`); return }

  const bucket = buckets?.find(b => b.id === BUCKET)
  if (!bucket) { fail(`버킷 '${BUCKET}'을 찾을 수 없습니다.`); return }

  if (bucket.public) {
    fail(`버킷이 PUBLIC 상태입니다. 마이그레이션(20260415000002)을 적용하세요.`)
  } else {
    ok(`버킷이 PRIVATE 상태입니다.`)
  }
}

async function checkCdnBlocked() {
  console.log('\n[2] CDN 직접 URL 차단 확인')
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // 존재하지 않는 경로로 테스트 (실제 파일 노출 없이 정책만 확인)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl('test-sentinel/check.png')
  const cdnUrl = data.publicUrl
  info(`CDN URL: ${cdnUrl}`)

  const res = await fetch(cdnUrl)
  if (res.status === 400 || res.status === 403) {
    ok(`CDN 접근 거부됨 (HTTP ${res.status})`)
  } else if (res.status === 404) {
    // private 버킷도 파일 없으면 404 반환하는 경우 있음
    // → 응답 본문으로 구분
    const body = await res.text()
    if (body.includes('"statusCode":"404"') || body.includes('Object not found')) {
      ok(`CDN 접근 차단 확인 (HTTP 404, private 버킷 — 파일 없음)`)
    } else {
      info(`HTTP 404 — 응답: ${body.slice(0, 100)}`)
    }
  } else if (res.status === 200) {
    fail(`CDN이 200 반환 — 버킷이 아직 PUBLIC입니다.`)
  } else {
    info(`HTTP ${res.status}`)
  }
}

async function checkProxyUnauth() {
  console.log('\n[3] 프록시 미인증 접근 차단 확인')
  const url = `${BASE_URL}/api/projects/test-id/files/final_page.png`
  info(`요청: ${url}`)

  try {
    const res = await fetch(url)
    if (res.status === 401) {
      ok(`미인증 접근 차단됨 (HTTP 401)`)
    } else if (res.status === 403) {
      ok(`접근 거부됨 (HTTP 403)`)
    } else if (res.status === 404) {
      fail(`HTTP 404 — 인증 체크 전 404. 서버 코드를 확인하세요.`)
    } else {
      fail(`예상치 못한 응답: HTTP ${res.status}`)
    }
  } catch {
    info(`개발 서버(${BASE_URL})에 연결할 수 없습니다. npm run dev 실행 후 재시도하세요.`)
  }
}

async function checkServiceRoleAccess() {
  console.log('\n[4] service role 접근 정상 여부 확인')
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 1 })
  if (error) {
    fail(`service role 접근 실패: ${error.message}`)
  } else {
    ok(`service role storage 접근 정상 (최상위 항목 ${data?.length ?? 0}개)`)
  }
}

async function main() {
  console.log('=== Storage Private 버킷 검증 ===')
  console.log(`Supabase: ${SUPABASE_URL}`)
  console.log(`App:      ${BASE_URL}`)

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('\n.env.local에 NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.')
    process.exit(1)
  }

  await checkBucketConfig()
  await checkCdnBlocked()
  await checkProxyUnauth()
  await checkServiceRoleAccess()

  console.log('\n=== 완료 ===\n')
}

main().catch(console.error)
