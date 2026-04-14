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
  // ── 1. 섹션 이미지를 base64 data URL로 인라인 ───────────────────────────────
  // file:// URL은 Vercel Chromium 샌드박스에서 차단됨
  // 대신 이미지를 base64로 변환해 HTML에 직접 삽입
  let finalHtml = html
  for (const [sectionId, buffer] of Object.entries(sections)) {
    const b64 = buffer.toString('base64')
    finalHtml = finalHtml.replaceAll(`__GEN_${sectionId}__`, `data:image/png;base64,${b64}`)
  }

  // ── 2. 임시 PNG 저장 경로만 준비 (HTML은 setContent로 주입) ─────────────────
  const tmpId = crypto.randomBytes(8).toString('hex')
  const tmpDir = path.join('/tmp', 'render', tmpId)
  const pngPath = path.join(tmpDir, 'output.png')
  fs.mkdirSync(tmpDir, { recursive: true })

  try {
    if (IS_VERCEL) {
      // ── 3a. Vercel: chromium-min + puppeteer-core ──────────────────────────
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
        await page.setViewport({ width: 750, height: 1000 })
        // file:// 대신 setContent로 HTML 직접 주입 — 파일시스템 접근 불필요
        await page.setContent(finalHtml, { waitUntil: 'networkidle0', timeout: 60000 })
        const fullHeight = await page.evaluate(() => document.body.scrollHeight)
        await page.setViewport({ width: 750, height: fullHeight })
        await page.screenshot({ path: pngPath as `${string}.png`, fullPage: true })
      } finally {
        await browser.close()
      }
    } else {
      // ── 3b. 로컬: puppeteer (Chromium 번들 포함) ───────────────────────────
      const puppeteer = (await import('puppeteer')).default
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      })
      try {
        const page = await browser.newPage()
        await page.setViewport({ width: 750, height: 1000 })
        await page.setContent(finalHtml, { waitUntil: 'networkidle0', timeout: 60000 })
        const fullHeight = await page.evaluate(() => document.body.scrollHeight)
        await page.setViewport({ width: 750, height: fullHeight })
        await page.screenshot({ path: pngPath as `${string}.png`, fullPage: true })
      } finally {
        await browser.close()
      }
    }

    return fs.readFileSync(pngPath)
  } finally {
    // ── 4. 임시 파일 정리 ─────────────────────────────────────────────────────
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}
