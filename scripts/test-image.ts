/**
 * 이미지 1장 생성 + 750px 틀 렌더링 테스트
 *
 * 사용법:
 *   npm run test:image                          # 첫 번째 프로젝트, hero 이미지
 *   npm run test:image -- --project 몽글베개_테스트_20260409_140628
 *   npm run test:image -- --project 몽글베개_테스트_20260409_140628 --index 2
 */

import fs from 'fs'
import path from 'path'
import { generateSectionImage } from '../lib/gemini'
import { renderToPng } from '../lib/renderer'

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag: string) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : null
}

const PROJECTS_DIR = path.resolve('projects')
const projectArg = getArg('--project')
const imageIndex = parseInt(getArg('--index') ?? '0', 10)

// 프로젝트 자동 선택 (지정 없으면 마지막 수정된 프로젝트)
function resolveProject(): string {
  if (projectArg) {
    const p = path.join(PROJECTS_DIR, projectArg)
    if (!fs.existsSync(p)) throw new Error(`프로젝트 없음: ${projectArg}`)
    return p
  }
  const dirs = fs.readdirSync(PROJECTS_DIR)
    .map(name => ({ name, mtime: fs.statSync(path.join(PROJECTS_DIR, name)).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
  if (!dirs.length) throw new Error('projects/ 디렉토리가 비어 있습니다')
  return path.join(PROJECTS_DIR, dirs[0].name)
}

async function main() {
  const projectDir = resolveProject()
  const projectName = path.basename(projectDir)
  console.log(`\n📁 프로젝트: ${projectName}`)

  // page_design.json 읽기
  const designPath = path.join(projectDir, 'page_design.json')
  if (!fs.existsSync(designPath)) throw new Error('page_design.json 없음 — 파이프라인을 먼저 실행하세요')

  const design = JSON.parse(fs.readFileSync(designPath, 'utf-8'))
  const images: Array<{ id: string; prompt: string; width: number; height: number }> = design.images ?? []
  if (!images.length) throw new Error('이미지 요청이 없습니다')

  const img = images[imageIndex]
  if (!img) throw new Error(`index ${imageIndex} 없음 (총 ${images.length}개)`)

  console.log(`\n🎯 대상 이미지 [${imageIndex}/${images.length - 1}]`)
  console.log(`   id     : ${img.id}`)
  console.log(`   size   : ${img.width} × ${img.height}`)
  console.log(`   prompt : ${img.prompt.slice(0, 80)}...`)

  // 출력 경로
  const outDir = path.join(projectDir, 'test-output')
  fs.mkdirSync(outDir, { recursive: true })
  const imgPath = path.join(outDir, `${img.id}.png`)
  const htmlPath = path.join(outDir, 'preview.html')
  const pngPath = path.join(outDir, 'preview.png')

  // 제품 사진 버퍼로 읽기 (있으면 전달)
  const photosDir = path.join(projectDir, 'product_photos')
  const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
  const productPhotos: Array<{ data: Buffer; mimeType: string }> = fs.existsSync(photosDir)
    ? fs.readdirSync(photosDir)
        .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .map(f => {
          const ext = f.split('.').pop()?.toLowerCase() ?? ''
          return { data: fs.readFileSync(path.join(photosDir, f)), mimeType: mimeMap[ext] ?? 'image/jpeg' }
        })
    : []

  // 이미지 생성
  console.log('\n🔄 Gemini 이미지 생성 중...')
  const t0 = Date.now()
  const imgBuffer = await generateSectionImage(img.prompt, img.width, img.height, productPhotos)
  fs.writeFileSync(imgPath, imgBuffer)
  console.log(`✅ 생성 완료 (${((Date.now() - t0) / 1000).toFixed(1)}s) → ${imgPath}`)

  // 750px 틀 HTML 생성
  const fileUrl = `file:///${imgPath.replace(/\\/g, '/')}`
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #f5f5f5; font-family: 'Noto Sans KR', sans-serif; }
  .page { max-width: 750px; margin: 0 auto; background: #fff; }
  .section { padding: 40px 24px; }
  .label { font-size: 13px; color: #888; margin-bottom: 8px; font-weight: 600; letter-spacing: 0.05em; }
  .img-wrap { overflow: hidden; border-radius: 16px; margin-bottom: 12px; }
  img { width: 100%; height: auto; display: block; }
  .meta { font-size: 12px; color: #aaa; text-align: center; padding: 8px 0 24px; }
</style>
</head>
<body>
<div class="page">
  <div class="section">
    <div class="label">${img.id} — ${img.width} × ${img.height}px</div>
    <div class="img-wrap">
      <img src="${fileUrl}" alt="${img.id}">
    </div>
    <div class="meta">${img.prompt.slice(0, 100)}...</div>
  </div>
</div>
</body>
</html>`

  fs.writeFileSync(htmlPath, html, 'utf-8')

  // Puppeteer 렌더링
  console.log('\n🖥️  Puppeteer 렌더링 중...')
  const sectionBuffers: Record<string, Buffer> = { [img.id]: imgBuffer }
  const pngBuffer = await renderToPng(html, sectionBuffers)
  fs.writeFileSync(pngPath, pngBuffer)
  console.log(`✅ 렌더 완료 → ${pngPath}`)
  console.log('\n🎉 완료! 아래 파일을 확인하세요:')
  console.log(`   이미지  : ${imgPath}`)
  console.log(`   미리보기: ${pngPath}\n`)
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  process.exit(1)
})
