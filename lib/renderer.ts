import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const IS_VERCEL = !!process.env.VERCEL

/**
 * html: 완성된 HTML 문자열 (__GEN_{id}__ 플레이스홀더가 교체된 상태)
 * sections: { [sectionId]: Buffer } — 이미지 버퍼
 * 반환: 렌더링된 PNG Buffer
 */
export async function renderToPng(
  html: string,
  sections: Record<string, Buffer>
): Promise<Buffer> {
  // ── 1. 임시 디렉토리 생성 ───────────────────────────────────────────────────
  // 동시 요청 충돌 방지용 랜덤 ID로 분리
  const tmpId = crypto.randomBytes(8).toString('hex')
  const tmpDir = path.join('/tmp', 'render', tmpId)
  const sectionsDir = path.join(tmpDir, 'sections')
  const htmlPath = path.join(tmpDir, 'page.html')
  const pngPath = path.join(tmpDir, 'output.png')

  fs.mkdirSync(sectionsDir, { recursive: true })

  // ── 2. 섹션 이미지 → /tmp 저장 후 플레이스홀더 교체 ────────────────────────
  // Puppeteer는 file:// URL만 접근 가능 → Supabase URL 직접 사용 불가
  // __GEN_hero__ 같은 플레이스홀더를 file:///tmp/.../hero.png 로 교체
  let finalHtml = html
  for (const [sectionId, buffer] of Object.entries(sections)) {
    const imgPath = path.join(sectionsDir, `${sectionId}.png`)
    fs.writeFileSync(imgPath, buffer)
    const fileUrl = `file:///${imgPath.replace(/\\/g, '/')}`
    finalHtml = finalHtml.replaceAll(`__GEN_${sectionId}__`, fileUrl)
  }
  fs.writeFileSync(htmlPath, finalHtml, 'utf-8')

  try {
    if (IS_VERCEL) {
      // ── 3a. Vercel: chromium-min + puppeteer-core ──────────────────────────
      // @sparticuz/chromium-min → 바이너리 없음, 실행 시 URL에서 다운로드
      // 콜드 스타트 시 ~수십초 소요 (워밍업 후엔 /tmp 캐시 재사용)
      const chromium = (await import('@sparticuz/chromium-min')).default
      const puppeteer = (await import('puppeteer-core')).default

      const browser = await puppeteer.launch({
        args: [...chromium.args, '--disable-gpu'],
        defaultViewport: { width: 750, height: 1000 },
        executablePath: await chromium.executablePath(
          'https://github.com/Sparticuz/chromium/releases/download/v147.0.0/chromium-v147.0.0-pack.x64.tar'
        ),
        headless: true,
      })
      try {
        const page = await browser.newPage()

        // ── 4. 초기 뷰포트: 750×1000 ────────────────────────────────────────
        // 실제 페이지는 훨씬 길지만 일단 임시값으로 로드
        await page.setViewport({ width: 750, height: 1000 })
        await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0', timeout: 60000 })

        // ── 5. 전체 높이 측정 후 뷰포트 재설정 ─────────────────────────────
        // ⚠️ 핵심 문제 지점:
        //   setViewport(fullHeight) 직후 fullPage:true 로 캡처하면
        //   Puppeteer가 내부적으로 스크롤 높이를 재계산하는 타이밍에
        //   레이아웃이 미확정 상태라 페이지가 2배로 캡처될 수 있음
        const fullHeight = await page.evaluate(() => document.body.scrollHeight)
        await page.setViewport({ width: 750, height: fullHeight })
        await page.screenshot({ path: pngPath as `${string}.png`, fullPage: true })
      } finally {
        await browser.close()
      }
    } else {
      // ── 3b. 로컬: puppeteer (Chromium 번들 포함) ───────────────────────────
      // --allow-file-access-from-files: file:// URL에서 이미지 로드 허용 (필수)
      const puppeteer = (await import('puppeteer')).default
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
      })
      try {
        const page = await browser.newPage()
        await page.setViewport({ width: 750, height: 1000 })
        await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0', timeout: 60000 })
        const fullHeight = await page.evaluate(() => document.body.scrollHeight)
        await page.setViewport({ width: 750, height: fullHeight })
        await page.screenshot({ path: pngPath as `${string}.png`, fullPage: true })
      } finally {
        await browser.close()
      }
    }

    return fs.readFileSync(pngPath)
  } finally {
    // ── 7. 임시 파일 정리 ─────────────────────────────────────────────────────
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}
