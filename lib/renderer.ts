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
  // 임시 디렉토리 생성
  const tmpId = crypto.randomBytes(8).toString('hex')
  const tmpDir = path.join('/tmp', 'render', tmpId)
  const sectionsDir = path.join(tmpDir, 'sections')
  const htmlPath = path.join(tmpDir, 'page.html')
  const pngPath = path.join(tmpDir, 'output.png')

  fs.mkdirSync(sectionsDir, { recursive: true })

  // 섹션 이미지를 /tmp에 저장 후 HTML 플레이스홀더 교체
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
      const chromium = (await import(/* webpackIgnore: true */ '@sparticuz/chromium')).default
      const puppeteer = (await import(/* webpackIgnore: true */ 'puppeteer-core')).default

      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: 750, height: 1000 },
        executablePath: await chromium.executablePath(),
        headless: true,
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
    } else {
      const puppeteer = (await import('puppeteer')).default
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files'],
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
    // 임시 디렉토리 정리
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}
