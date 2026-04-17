/**
 * 재생성 차감 로직 테스트
 * charge_regen RPC를 직접 호출해서 무료권 → 구매권 순서로 차감되는지 확인
 *
 * 실행:
 *   npx tsx --env-file=.env.local scripts/test-regen-charge.ts
 *   npx tsx --env-file=.env.local scripts/test-regen-charge.ts --reset   # DB 원상복구 후 종료
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RESET_ONLY = process.argv.includes('--reset')

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function ok(msg: string) { console.log(`  ✅ ${msg}`) }
function fail(msg: string) { console.log(`  ❌ ${msg}`) }
function info(msg: string) { console.log(`  ℹ  ${msg}`) }
function section(title: string) { console.log(`\n── ${title} ${'─'.repeat(50 - title.length)}`) }

async function getState(userId: string, projectId: string) {
  const [{ data: credits }, { data: project }] = await Promise.all([
    supabase.from('user_credits').select('regen_tickets').eq('user_id', userId).single(),
    supabase.from('projects').select('regen_count, regen_limit').eq('id', projectId).single(),
  ])
  return {
    purchasedTickets: (credits as { regen_tickets: number } | null)?.regen_tickets ?? 0,
    regenCount:       (project as { regen_count: number } | null)?.regen_count ?? 0,
    regenLimit:       (project as { regen_limit: number } | null)?.regen_limit ?? 5,
  }
}

function freeLeft(s: ReturnType<typeof getState> extends Promise<infer T> ? T : never) {
  return Math.max(0, s.regenLimit - s.regenCount)
}

async function callChargeRegen(userId: string, projectId: string, count: number) {
  const { data, error } = await supabase.rpc('charge_regen', {
    p_user_id: userId,
    p_project_id: projectId,
    p_count: count,
  })
  return { data: data as { free_used: number; purchased_used: number } | null, error }
}

// ── 조회 ─────────────────────────────────────────────────────────────────────

async function pickTestTargets(): Promise<{ userId: string; projectId: string; projectName: string } | null> {
  // 최근 프로젝트 중 삭제되지 않은 것 선택
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, user_id, regen_count, regen_limit')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!projects?.length) { console.error('프로젝트 없음'); return null }
  const p = projects[0]
  return { userId: p.user_id, projectId: p.id, projectName: p.name }
}

// ── 초기화 (테스트 전 상태 저장 → 복구용) ────────────────────────────────────

interface Snapshot {
  userId: string
  projectId: string
  regenCount: number
  regenLimit: number
  purchasedTickets: number
}

async function saveSnapshot(userId: string, projectId: string): Promise<Snapshot> {
  const s = await getState(userId, projectId)
  return { userId, projectId, ...s }
}

async function restoreSnapshot(snap: Snapshot) {
  await Promise.all([
    supabase.from('projects').update({ regen_count: snap.regenCount, regen_limit: snap.regenLimit })
      .eq('id', snap.projectId),
    supabase.from('user_credits').update({ regen_tickets: snap.purchasedTickets })
      .eq('user_id', snap.userId),
  ])
  // 테스트 중 생긴 credit_transactions 행 제거 (reason이 regen_use_free / regen_use_purchased)
  await supabase
    .from('credit_transactions')
    .delete()
    .eq('user_id', snap.userId)
    .eq('project_id', snap.projectId)
    .in('reason', ['regen_use_free', 'regen_use_purchased', 'regen_use'])
}

async function forceState(userId: string, projectId: string, regenCount: number, regenLimit: number, purchased: number) {
  await Promise.all([
    supabase.from('projects').update({ regen_count: regenCount, regen_limit: regenLimit }).eq('id', projectId),
    supabase.from('user_credits').update({ regen_tickets: purchased }).eq('user_id', userId),
  ])
}

// ── 테스트 케이스 ─────────────────────────────────────────────────────────────

async function runTests(userId: string, projectId: string) {
  let passed = 0
  let failed = 0

  // 케이스 1: 무료권만 소모 (regen_count=0, limit=5, purchased=0 → 1장 차감)
  section('CASE 1: 무료권 1장 차감')
  await forceState(userId, projectId, 0, 5, 0)
  info('before: 무료 5장 남음, 구매권 0장')
  const r1 = await callChargeRegen(userId, projectId, 1)
  if (r1.error) { fail(`RPC 오류: ${r1.error.message}`); failed++ }
  else {
    const s = await getState(userId, projectId)
    if (r1.data!.free_used === 1 && r1.data!.purchased_used === 0 && freeLeft(s) === 4 && s.purchasedTickets === 0) {
      ok(`free_used=1, purchased_used=0 | 무료 남은장 4→OK`)
      passed++
    } else {
      fail(`기대: free_used=1 purchased_used=0 freeLeft=4 / 실제: free_used=${r1.data!.free_used} purchased_used=${r1.data!.purchased_used} freeLeft=${freeLeft(s)}`)
      failed++
    }
  }

  // 케이스 2: 무료권 다 쓰고 나서 구매권 소모
  section('CASE 2: 무료 소진 후 구매권 소모')
  await forceState(userId, projectId, 5, 5, 3)  // 무료 0장, 구매권 3장
  info('before: 무료 0장 남음, 구매권 3장')
  const r2 = await callChargeRegen(userId, projectId, 1)
  if (r2.error) { fail(`RPC 오류: ${r2.error.message}`); failed++ }
  else {
    const s = await getState(userId, projectId)
    if (r2.data!.free_used === 0 && r2.data!.purchased_used === 1 && s.purchasedTickets === 2) {
      ok(`free_used=0, purchased_used=1 | 구매권 3→2 OK`)
      passed++
    } else {
      fail(`기대: free_used=0 purchased_used=1 purchased=2 / 실제: free_used=${r2.data!.free_used} purchased_used=${r2.data!.purchased_used} purchased=${s.purchasedTickets}`)
      failed++
    }
  }

  // 케이스 3: 무료 일부 + 구매권 혼합 (무료 2장 남음, 구매권 2장, 3장 차감 요청)
  section('CASE 3: 무료 2장 + 구매권 1장 혼합 차감 (3장 요청)')
  await forceState(userId, projectId, 3, 5, 2)  // 무료 2장 남음, 구매권 2장
  info('before: 무료 2장 남음, 구매권 2장 → 3장 차감 요청')
  const r3 = await callChargeRegen(userId, projectId, 3)
  if (r3.error) { fail(`RPC 오류: ${r3.error.message}`); failed++ }
  else {
    const s = await getState(userId, projectId)
    if (r3.data!.free_used === 2 && r3.data!.purchased_used === 1 && freeLeft(s) === 0 && s.purchasedTickets === 1) {
      ok(`free_used=2, purchased_used=1 | 무료 소진, 구매권 2→1 OK`)
      passed++
    } else {
      fail(`기대: free_used=2 purchased_used=1 freeLeft=0 purchased=1 / 실제: free_used=${r3.data!.free_used} purchased_used=${r3.data!.purchased_used} freeLeft=${freeLeft(s)} purchased=${s.purchasedTickets}`)
      failed++
    }
  }

  // 케이스 4: 둘 다 없을 때 INSUFFICIENT_TICKETS 에러
  section('CASE 4: 재생성권 없음 → INSUFFICIENT_TICKETS 에러')
  await forceState(userId, projectId, 5, 5, 0)  // 무료 0장, 구매권 0장
  info('before: 무료 0장, 구매권 0장 → 차감 시 에러 기대')
  const r4 = await callChargeRegen(userId, projectId, 1)
  if (r4.error && r4.error.message.includes('INSUFFICIENT_TICKETS')) {
    ok(`INSUFFICIENT_TICKETS 에러 정상 발생`)
    passed++
  } else if (r4.error) {
    fail(`다른 오류: ${r4.error.message}`)
    failed++
  } else {
    fail(`에러가 발생해야 하는데 성공함: ${JSON.stringify(r4.data)}`)
    failed++
  }

  // 케이스 5: credit_transactions 로그가 올바르게 기록됐는지
  section('CASE 5: credit_transactions 로그 확인')
  await forceState(userId, projectId, 3, 5, 2)  // 무료 2장, 구매권 2장 → 3장 차감
  await callChargeRegen(userId, projectId, 3)
  const { data: txs } = await supabase
    .from('credit_transactions')
    .select('reason, delta')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .in('reason', ['regen_use_free', 'regen_use_purchased', 'regen_use'])
    .order('created_at', { ascending: false })
    .limit(5)

  const freeLog  = txs?.find(t => t.reason === 'regen_use_free')
  const paidLog  = txs?.find(t => t.reason === 'regen_use_purchased')
  const legacyLog = txs?.find(t => t.reason === 'regen_use')

  if (legacyLog) {
    fail(`구형 regen_use 레코드가 기록됨 (마이그레이션 20260415000006이 미적용된 상태)`)
    failed++
  } else if (freeLog && freeLog.delta === -2 && paidLog && paidLog.delta === -1) {
    ok(`regen_use_free(delta=-2) + regen_use_purchased(delta=-1) 로그 OK`)
    passed++
  } else {
    fail(`로그 불일치 — free: ${JSON.stringify(freeLog)} / paid: ${JSON.stringify(paidLog)}`)
    failed++
  }

  return { passed, failed }
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🧪 재생성 차감 로직 테스트\n')

  const targets = await pickTestTargets()
  if (!targets) process.exit(1)

  const { userId, projectId, projectName } = targets
  info(`프로젝트: ${projectName} (${projectId.slice(0, 8)}…)`)
  info(`유저:     ${userId.slice(0, 8)}…`)

  const snap = await saveSnapshot(userId, projectId)
  const initialState = await getState(userId, projectId)
  info(`초기 상태: 무료 ${freeLeft(initialState)}장 남음 (${initialState.regenCount}/${initialState.regenLimit}), 구매권 ${initialState.purchasedTickets}장`)

  if (RESET_ONLY) {
    section('RESET')
    await restoreSnapshot(snap)
    ok('DB 원상 복구 완료')
    return
  }

  let result = { passed: 0, failed: 0 }
  try {
    result = await runTests(userId, projectId)
  } finally {
    section('CLEANUP')
    await restoreSnapshot(snap)
    ok('DB 원상 복구 완료')
  }

  const total = result.passed + result.failed
  console.log(`\n${'═'.repeat(55)}`)
  console.log(`결과: ${result.passed}/${total} 통과 ${result.failed > 0 ? `(${result.failed}개 실패)` : '✅ 전체 통과'}`)
  console.log(`${'═'.repeat(55)}\n`)

  process.exit(result.failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('\n❌ 스크립트 오류:', err.message)
  process.exit(1)
})
