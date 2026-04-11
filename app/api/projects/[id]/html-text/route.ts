import { NextRequest, NextResponse } from 'next/server'
import { getProjectPaths } from '@/lib/projects'
import fs from 'fs'
import { load } from 'cheerio'

export interface TextBlock {
  eid: string
  tag: string
  text: string
  section: string   // section key
  multiline: boolean
}

const EDITABLE_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'p', 'li', 'button', 'a', 'td', 'th', 'span']
const MULTILINE_TAGS = new Set(['p', 'li', 'td', 'th'])
const SKIP_ANCESTORS = new Set(['script', 'style', 'noscript', 'head'])

function hasSkipAncestor($el: ReturnType<ReturnType<typeof load>>, $: ReturnType<typeof load>): boolean {
  let node = $el.parent()
  while (node.length) {
    const tag = node.prop('tagName')?.toLowerCase()
    if (tag && SKIP_ANCESTORS.has(tag)) return true
    node = node.parent()
  }
  return false
}

// Normalize a raw class/id to a clean section key
function normalizeSectionKey(raw: string): string {
  return raw
    .replace(/[-_]?(section|wrap|container|area|block|inner|outer|content|box)$/i, '')
    .replace(/-/g, '_')
    .toLowerCase()
    .replace(/^_+|_+$/g, '')
    || raw
}

// Find the section key.
// Priority: (1) nearest ancestor with id, (2) nearest <section>/<article> by index,
// (3) direct body child by id/class/index.
function getSectionKey($el: ReturnType<ReturnType<typeof load>>, $: ReturnType<typeof load>): string {
  // Pass 1: nearest ancestor with a meaningful id
  let node = $el.parent()
  while (node.length) {
    const tag = node.prop('tagName')?.toLowerCase()
    if (!tag || tag === 'body' || tag === 'html') break
    const id = node.attr('id')
    if (id) return normalizeSectionKey(id)
    node = node.parent()
  }

  // Pass 2: nearest <section> or <article> ancestor — use index among siblings
  node = $el.parent()
  while (node.length) {
    const tag = node.prop('tagName')?.toLowerCase()
    if (!tag || tag === 'body' || tag === 'html') break
    if (tag === 'section' || tag === 'article') {
      const id = node.attr('id')
      if (id) return normalizeSectionKey(id)
      // Count preceding section/article siblings for a stable unique key
      let idx = 0
      node.prevAll('section, article').each(() => { idx++ })
      return `sec_${idx}`
    }
    node = node.parent()
  }

  // Pass 3: direct child of <body> — use id or first meaningful class
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node = $el as any
  while (node.length) {
    const parentTag = node.parent().prop('tagName')?.toLowerCase()
    if (parentTag === 'body') {
      const id = node.attr('id')
      if (id) return normalizeSectionKey(id)
      const cls = node.attr('class')?.split(/\s+/).find(c => c.length > 2)
      if (cls) return normalizeSectionKey(cls)
      return `section_${node.index()}`
    }
    node = node.parent()
  }

  return 'etc'
}

// Extract image id from an <img src> value (placeholder or file path)
function extractImageId(src: string): string | null {
  const m1 = src.match(/__GEN_(.+?)__/)
  if (m1) return m1[1]
  const m2 = src.match(/[/\\]sections[/\\]([^/\\]+?)\.png/i)
  if (m2) return m2[1]
  return null
}

function extractBlocks(html: string): {
  html: string
  blocks: TextBlock[]
  sectionImages: Record<string, string>  // sectionKey → imageId
} {
  const $ = load(html)
  const blocks: TextBlock[] = []
  const sectionImages: Record<string, string> = {}
  let counter = 1

  // Pre-pass: map each section/article element to its image id
  $('section, article').each((_i, el) => {
    const $section = $(el)
    const key = getSectionKey($section, $)
    if (!sectionImages[key]) {
      const imgSrc = $section.find('img').first().attr('src') || ''
      const imgId = extractImageId(imgSrc)
      if (imgId) sectionImages[key] = imgId
    }
  })

  for (const tag of EDITABLE_TAGS) {
    $(tag).each((_i, el) => {
      const $el = $(el)
      if (hasSkipAncestor($el, $)) return

      const $clone = $el.clone()
      $clone.find('br').each((_i, br) => { $(br).replaceWith('\n') })
      const text = $clone.text().trim()
      if (!text || text.length < 2) return
      if (text.length > 400) return

      if (tag === 'span') {
        let hasDirect = false
        $el.contents().each((_i, n) => {
          if (n.type === 'text' && (n as { data?: string }).data?.trim()) hasDirect = true
        })
        if (!hasDirect) return
      }

      let eid = $el.attr('data-eid')
      if (!eid) {
        eid = String(counter++)
        $el.attr('data-eid', eid)
      } else {
        counter = Math.max(counter, parseInt(eid) + 1)
      }

      blocks.push({
        eid,
        tag,
        text,
        section: getSectionKey($el, $),
        multiline: MULTILINE_TAGS.has(tag) || text.length > 80,
      })
    })
  }

  return { html: $.html(), blocks, sectionImages }
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const p = getProjectPaths(id)

  if (!fs.existsSync(p.htmlPage)) {
    return NextResponse.json({ blocks: [] })
  }

  const html = fs.readFileSync(p.htmlPage, 'utf-8')
  const { html: taggedHtml, blocks, sectionImages } = extractBlocks(html)
  fs.writeFileSync(p.htmlPage, taggedHtml, 'utf-8')

  return NextResponse.json({ blocks, sectionImages })
}

// ─── PUT ─────────────────────────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const p = getProjectPaths(id)

  if (!fs.existsSync(p.htmlPage)) {
    return NextResponse.json({ error: 'page.html 없음' }, { status: 404 })
  }

  const updates = await req.json() as Array<{ eid: string; text: string }>

  const html = fs.readFileSync(p.htmlPage, 'utf-8')
  const $ = load(html)

  for (const { eid, text } of updates) {
    const $el = $(`[data-eid="${eid}"]`)
    if (!$el.length) continue

    const htmlContent = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')

    if ($el.children().length > 0) {
      $el.contents().each((_i, n) => {
        if (n.type === 'text') (n as { data: string }).data = ''
      })
      $el.prepend(htmlContent)
    } else {
      $el.html(htmlContent)
    }
  }

  fs.writeFileSync(p.htmlPage, $.html(), 'utf-8')

  try {
    const { renderToPng } = await import('@/lib/renderer')
    await renderToPng(p.htmlPage, p.finalPng)
    return NextResponse.json({ saved: true, rendered: true })
  } catch (err) {
    return NextResponse.json({ saved: true, rendered: false, renderError: String(err) })
  }
}
