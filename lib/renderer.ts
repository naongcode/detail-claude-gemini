import path from 'path'
import fs from 'fs'

const IS_VERCEL = !!process.env.VERCEL

export async function renderToPng(htmlFilePath: string, outputPath: string): Promise<void> {
  if (IS_VERCEL) {
    const chromium = (await import(/* webpackIgnore: true */ '@sparticuz/chromium')).default
    const puppeteer = (await import(/* webpackIgnore: true */ 'puppeteer-core')).default

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1200, height: 800 },
      executablePath: await chromium.executablePath(),
      headless: true,
    })

    try {
      const page = await browser.newPage()
      await page.setViewport({ width: 750, height: 1000 })
      const fileUrl = `file:///${htmlFilePath.replace(/\\/g, '/')}`
      await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 })
      const fullHeight = await page.evaluate(() => document.body.scrollHeight)
      await page.setViewport({ width: 750, height: fullHeight })
      await page.screenshot({ path: outputPath as `${string}.png`, fullPage: true })
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

      const outputDir = path.dirname(outputPath)
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

      const fileUrl = `file:///${htmlFilePath.replace(/\\/g, '/')}`
      await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 })
      const fullHeight = await page.evaluate(() => document.body.scrollHeight)
      await page.setViewport({ width: 750, height: fullHeight })
      await page.screenshot({ path: outputPath as `${string}.png`, fullPage: true })
    } finally {
      await browser.close()
    }
  }
}
