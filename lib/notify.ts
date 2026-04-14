/**
 * Discord / Telegram 알림 유틸
 *
 * 환경변수:
 *   DISCORD_WEBHOOK_URL   — Discord Incoming Webhook URL
 *   TELEGRAM_BOT_TOKEN    — Telegram Bot API 토큰
 *   TELEGRAM_CHAT_ID      — 메시지를 보낼 채팅/채널 ID
 */

type NotifyPayload = {
  message: string
  status?: 'success' | 'error' | 'info'
  userId?: string
}

// ── Discord ─────────────────────────────────────────────────────────────────

const COLOR = { success: 0x57f287, error: 0xed4245, info: 0x5865f2 }

function formatMeta(payload: NotifyPayload) {
  const time = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  const parts = [time]
  if (payload.userId) parts.push(payload.userId)
  return parts.join(' · ')
}

async function sendDiscord(payload: NotifyPayload) {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) return

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        description: payload.message,
        color: COLOR[payload.status ?? 'info'],
        footer: { text: formatMeta(payload) },
      }],
    }),
  }).catch((err) => console.error('[notify] Discord error:', err))
}

// ── Telegram ─────────────────────────────────────────────────────────────────

async function sendTelegram(payload: NotifyPayload) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const icon = payload.status === 'success' ? '✅' : payload.status === 'error' ? '❌' : 'ℹ️'
  const text = `${icon} ${escapeMarkdown(payload.message)}\n${escapeMarkdown(formatMeta(payload))}`

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2' }),
  }).catch((err) => console.error('[notify] Telegram error:', err))
}

function escapeMarkdown(text: string) {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&')
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function notify(payload: NotifyPayload) {
  await Promise.allSettled([sendDiscord(payload), sendTelegram(payload)])
}
