const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3-pro-image-preview'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export async function generateSectionImage(
  prompt: string,
  width: number,
  height: number,
  productImages: Array<{ data: Buffer; mimeType: string }> = [],
  maxRetries = 3
): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')

  const parts: unknown[] = []

  // 제품 사진 inline_data로 추가
  for (const img of productImages) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data.toString('base64'),
      },
    })
  }

  // 텍스트 프롬프트
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
  const g = gcd(width, height)
  const ratioW = width / g
  const ratioH = height / g
  const orientation = width >= height ? 'landscape' : 'portrait'
  const aspectHint = `IMPORTANT: Generate this image in ${orientation} orientation with aspect ratio ${ratioW}:${ratioH} (${width}x${height} pixels). Do NOT generate a square or ${width >= height ? 'portrait' : 'landscape'} image.\n\n`

  const finalPrompt = productImages.length > 0
    ? `${aspectHint}${prompt}\n\n=== PRODUCT FIDELITY RULES (HIGHEST PRIORITY — OVERRIDES ALL ABOVE) ===\nReference product images have been provided above. You MUST reproduce the product with complete visual fidelity.\nRULE 1 — SHAPE & FORM: The product's exact shape, silhouette, structure, and physical form must be preserved. Do NOT redesign, replace, or reimagine the product. If the reference shows a specific pillow shape, reproduce that exact shape — do not substitute with a different type.\nRULE 2 — COLOR & FINISH: Reproduce the product's EXACT color, texture, and surface finish from the reference images. Do NOT reinterpret, lighten, darken, or shift the product color in any way.\nRULE 3 — SCENE ONLY: Any color, style, or material descriptions in the prompt text above apply ONLY to the background, scene, props, and environment — NEVER to the product itself.\nRULE 4 — NO SUBSTITUTION: Never substitute or replace the product with a similar-looking item. The product in the output must be visually identical to the reference images.`
    : `${aspectHint}${prompt}`
  parts.push({ text: finalPrompt })

  const requestBody = {
    contents: [{ parts }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(120000),
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

      let imageBase64: string | null = null
      for (const candidate of data.candidates ?? []) {
        for (const part of candidate.content?.parts ?? []) {
          if (part.inlineData?.data) { imageBase64 = part.inlineData.data; break }
        }
        if (imageBase64) break
      }

      if (!imageBase64) throw new Error('이미지가 생성되지 않았습니다 (빈 응답)')

      const imageBuffer = Buffer.from(imageBase64, 'base64')

      const sharp = (await import('sharp')).default
      const resized = await sharp(imageBuffer)
        .resize(width, height, { fit: 'fill' })
        .png()
        .toBuffer()

      return resized
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
