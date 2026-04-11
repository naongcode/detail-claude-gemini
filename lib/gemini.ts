import fs from 'fs'
import path from 'path'

const MODEL = 'gemini-3-pro-image-preview'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export async function generateSectionImage(
  prompt: string,
  width: number,
  height: number,
  outputPath: string,
  productImagePaths: string[] = [],
  maxRetries = 3
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')

  // Build parts array
  const parts: unknown[] = []

  // Add product photos as inline_data if provided
  for (const imgPath of productImagePaths) {
    if (!fs.existsSync(imgPath)) continue
    const ext = path.extname(imgPath).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    }
    const mimeType = mimeMap[ext]
    if (!mimeType) continue
    const data = fs.readFileSync(imgPath)
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: data.toString('base64'),
      },
    })
  }

  // Add text prompt — append color-lock instruction at the END when product photos are provided
  // (terminal instructions take priority over earlier text in multimodal models)
  // Calculate aspect ratio for Gemini
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
  const g = gcd(width, height)
  const ratioW = width / g
  const ratioH = height / g
  const orientation = width >= height ? 'landscape' : 'portrait'
  const aspectHint = `IMPORTANT: Generate this image in ${orientation} orientation with aspect ratio ${ratioW}:${ratioH} (${width}x${height} pixels). Do NOT generate a square or ${width >= height ? 'portrait' : 'landscape'} image.\n\n`

  const finalPrompt = productImagePaths.length > 0
    ? `${aspectHint}${prompt}\n\n=== PRODUCT FIDELITY RULES (HIGHEST PRIORITY — OVERRIDES ALL ABOVE) ===\nReference product images have been provided above. You MUST reproduce the product with complete visual fidelity.\nRULE 1 — SHAPE & FORM: The product's exact shape, silhouette, structure, and physical form must be preserved. Do NOT redesign, replace, or reimagine the product. If the reference shows a specific pillow shape, reproduce that exact shape — do not substitute with a different type.\nRULE 2 — COLOR & FINISH: Reproduce the product's EXACT color, texture, and surface finish from the reference images. Do NOT reinterpret, lighten, darken, or shift the product color in any way.\nRULE 3 — SCENE ONLY: Any color, style, or material descriptions in the prompt text above apply ONLY to the background, scene, props, and environment — NEVER to the product itself.\nRULE 4 — NO SUBSTITUTION: Never substitute or replace the product with a similar-looking item. The product in the output must be visually identical to the reference images.`
    : `${aspectHint}${prompt}`
  parts.push({ text: finalPrompt })

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(120000), // 2 min timeout per request
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Gemini API 오류 ${response.status}: ${errText}`)
      }

      const data = await response.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { data: string; mimeType: string }
              text?: string
            }>
          }
        }>
      }

      // Extract image bytes from response
      let imageBase64: string | null = null
      const candidates = data.candidates || []
      for (const candidate of candidates) {
        const contentParts = candidate.content?.parts || []
        for (const part of contentParts) {
          if (part.inlineData?.data) {
            imageBase64 = part.inlineData.data
            break
          }
        }
        if (imageBase64) break
      }

      if (!imageBase64) {
        throw new Error('이미지가 생성되지 않았습니다 (빈 응답)')
      }

      // Decode base64 to buffer
      const imageBuffer = Buffer.from(imageBase64, 'base64')

      // Resize to exact dimensions using sharp
      const sharp = (await import('sharp')).default
      const resized = await sharp(imageBuffer)
        .resize(width, height, { fit: 'fill' })
        .png()
        .toBuffer()

      // Save to output path
      const dir = path.dirname(outputPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(outputPath, resized)

      return outputPath
    } catch (err) {
      lastError = err as Error
      if (attempt < maxRetries) {
        const waitMs = 5000 * attempt
        console.log(`[재시도] 시도 ${attempt}/${maxRetries} 실패: ${lastError.message} - ${waitMs}ms 후 재시도`)
        await new Promise((r) => setTimeout(r, waitMs))
      }
    }
  }

  throw new Error(`이미지 생성 실패 (${maxRetries}회 시도): ${lastError?.message}`)
}
