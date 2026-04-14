import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,

  // 민감 데이터 필터링
  beforeSend(event) {
    if (event.message?.match(/API_KEY|SECRET|PASSWORD/i)) return null
    return event
  },
})
