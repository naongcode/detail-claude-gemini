/**
 * 알림 테스트 스크립트
 * 실행: npx tsx scripts/test-notify.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

function escapeMarkdown(text: string) {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&')
}

function formatMeta(userId?: string) {
  const time = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  return userId ? `${time} · ${userId}` : time
}

const COLOR = { success: 0x57f287, error: 0xed4245, info: 0x5865f2 }

async function sendDiscord(message: string, status: 'success' | 'error' | 'info', userId?: string) {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) { console.log('[Discord] 환경변수 없음 — 스킵'); return }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{ description: message, color: COLOR[status], footer: { text: formatMeta(userId) } }],
    }),
  })
  console.log(`[Discord] ${res.status} ${res.statusText}`)
}

async function sendTelegram(message: string, status: 'success' | 'error' | 'info', userId?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) { console.log('[Telegram] 환경변수 없음 — 스킵'); return }

  const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : 'ℹ️'
  const text = `${icon} ${escapeMarkdown(message)}\n${escapeMarkdown(formatMeta(userId))}`

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2' }),
  })
  const json = await res.json()
  console.log(`[Telegram] ${res.status}`, json.ok ? 'ok' : json.description)
}

async function main() {
  console.log('=== 알림 테스트 ===\n')
  await sendDiscord('파이프라인 시작: "코카콜라 제로"', 'info', 'user-abc123')
  await sendTelegram('파이프라인 시작: "코카콜라 제로"', 'info', 'user-abc123')
  await sendDiscord('파이프라인 완료: "코카콜라 제로" (이미지 5개)', 'success', 'user-abc123')
  await sendTelegram('파이프라인 완료: "코카콜라 제로" (이미지 5개)', 'success', 'user-abc123')
  await sendDiscord('파이프라인 실패: Gemini API Rate limit exceeded', 'error', 'user-abc123')
  await sendTelegram('파이프라인 실패: Gemini API Rate limit exceeded', 'error', 'user-abc123')
  console.log('\n=== 완료 ===')
}

main().catch(console.error)
