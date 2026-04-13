/**
 * 렌더링 방식 비교 테스트 (4가지)
 * 실행: npx tsx scripts/test-render.ts
 *
 * 출력:
 *   out-original-no-img.png  — 기존코드 + 이미지 없음
 *   out-original-img.png     — 기존코드 + 이미지 있음
 *   out-method2-no-img.png   — 방식2   + 이미지 없음
 *   out-method2-img.png      — 방식2   + 이미지 있음
 */

import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const TEST_DIR = path.resolve('projects/버셀테스트')
const HTML_SRC = path.join(TEST_DIR, 'html.json')
const SECTION_IDS = ['hero', 'pain_point', 'product', 'material', 'usage', 'transformation', 'testimonial', 'cta']
const LAUNCH_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files', '--disable-gpu']

function buildHtml(withImages: boolean): string {
  let html = fs.readFileSync(HTML_SRC, 'utf-8')

  if (withImages) {
    for (const id of SECTION_IDS) {
      const imgPath = path.join(TEST_DIR, `${id}.png`)
      if (fs.existsSync(imgPath)) {
        html = html.replaceAll(`__GEN_${id}__`, `file:///${imgPath.replace(/\\/g, '/')}`)
      }
    }
  }
  // withImages=false 면 플레이스홀더 그대로 → 이미지 깨진 상태

  const outHtml = path.join(TEST_DIR, `test-${withImages ? 'img' : 'no-img'}.html`)
  fs.writeFileSync(outHtml, html, 'utf-8')
  return outHtml
}

async function capture(
  htmlPath: string,
  outPath: string,
  useSetViewport: boolean   // true = 기존코드, false = method2
) {
  const browser = await puppeteer.launch({ headless: true, args: LAUNCH_ARGS })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 750, height: 1000 })
    await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0', timeout: 60000 })
    const fullHeight = await page.evaluate(() => document.body.scrollHeight)
    console.log(`  scrollHeight: ${fullHeight}px`)

    if (useSetViewport) {
      // 기존 코드: setViewport(fullHeight) + fullPage:true
      await page.setViewport({ width: 750, height: fullHeight })
      await page.screenshot({ path: outPath as `${string}.png`, fullPage: true })
    } else {
      // 방식2: setViewport 유지 + fullPage:true만
      await page.screenshot({ path: outPath as `${string}.png`, fullPage: true })
    }
    console.log(`  → ${path.basename(outPath)}`)
  } finally {
    await browser.close()
  }
}

async function main() {
  if (!fs.existsSync(HTML_SRC)) {
    console.error('HTML 파일 없음:', HTML_SRC)
    process.exit(1)
  }

  const htmlNoImg = buildHtml(false)
  const htmlImg   = buildHtml(true)

  console.log('\n[1/4] 기존코드 + 이미지 없음')
  await capture(htmlNoImg, path.join(TEST_DIR, 'out-original-no-img.png'), true)

  console.log('\n[2/4] 기존코드 + 이미지 있음')
  await capture(htmlImg, path.join(TEST_DIR, 'out-original-img.png'), true)

  console.log('\n[3/4] 방식2 + 이미지 없음')
  await capture(htmlNoImg, path.join(TEST_DIR, 'out-method2-no-img.png'), false)

  console.log('\n[4/4] 방식2 + 이미지 있음')
  await capture(htmlImg, path.join(TEST_DIR, 'out-method2-img.png'), false)

  console.log('\n완료.')
}

main().catch(console.error)
