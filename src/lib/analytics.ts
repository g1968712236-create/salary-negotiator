/* ===================== PostHog 埋点（见 ANALYTICS.md v1.1） ===================== */
import posthog from "posthog-js"

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com"

const ANONYMOUS_ID_KEY = "sn_anonymous_id"
const FIRST_VISIT_DATE_KEY = "sn_first_visit_date"
/** 与 package.json 的 version 保持一致（ANALYTICS.md §3.2 app_version） */
const APP_VERSION = "0.0.0"
const DEBOUNCE_MS = 1500

let initialized = false

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function todayLocal(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function initAnalytics(): void {
  if (initialized) return
  if (!POSTHOG_KEY) return // 未配置 Key 时全部静默 no-op（ANALYTICS.md §11）

  // §3.1 匿名 ID
  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY)
  const isReturning = anonymousId !== null
  if (!anonymousId) {
    anonymousId = generateUuid()
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId)
  }

  // §3.2 首次访问日期
  let firstVisitDate = localStorage.getItem(FIRST_VISIT_DATE_KEY)
  if (!firstVisitDate) {
    firstVisitDate = todayLocal()
    localStorage.setItem(FIRST_VISIT_DATE_KEY, firstVisitDate)
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: false, // §8 必须禁用
    disable_session_recording: true, // §8 必须禁用
    // $pageview 保留 SDK 默认自动捕获（E-001）
  })
  posthog.identify(anonymousId)

  // §3.2 公共属性
  posthog.register({
    app_version: APP_VERSION,
    device_type: window.innerWidth < 768 ? "mobile" : "desktop",
    is_returning: isReturning,
    first_visit_date: firstVisitDate,
  })

  initialized = true

  // §5-T4 兜底 flush：页面进入后台时立即发送待发事件
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushDebounced()
  })
}

export function track(eventName: string, props?: Record<string, unknown>): void {
  if (!initialized) return
  posthog.capture(eventName, props)
}

interface PendingEvent {
  eventName: string
  props?: Record<string, unknown>
  timer: ReturnType<typeof setTimeout>
}

const pendingEvents = new Map<string, PendingEvent>()

/** §5-T4 防抖聚合：同 key 1.5 秒内合并，停止输入后上报一次 */
export function trackDebounced(
  key: string,
  eventName: string,
  props?: Record<string, unknown>
): void {
  if (!initialized) return
  const existing = pendingEvents.get(key)
  if (existing) clearTimeout(existing.timer)
  const timer = setTimeout(() => {
    pendingEvents.delete(key)
    track(eventName, props)
  }, DEBOUNCE_MS)
  pendingEvents.set(key, { eventName, props, timer })
}

/** 立即发送队列中全部待发的防抖事件（切 Tab / 切方案 / 页面后台时调用） */
export function flushDebounced(): void {
  for (const pending of pendingEvents.values()) {
    clearTimeout(pending.timer)
    track(pending.eventName, pending.props)
  }
  pendingEvents.clear()
}

/** §7 涨幅分桶（E-008 value_bucket），入参为百分比数值（如 25 表示 25%） */
export function increaseValueBucket(percent: number): string {
  if (percent <= 0) return "0"
  if (percent <= 10) return "0-10"
  if (percent <= 20) return "10-20"
  if (percent <= 30) return "20-30"
  if (percent <= 50) return "30-50"
  return "50+"
}
