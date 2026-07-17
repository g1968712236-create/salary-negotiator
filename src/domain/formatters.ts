/* ===================== 工具函数 ===================== */

export const formatMoney = (n: number) => `¥${n.toLocaleString()}`
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
export const uid = () => Math.random().toString(36).slice(2, 10)

export const filterNumeric = (value: string) => value.replace(/\D/g, "")

export const filterNumber = (value: string) => {
  let seenDot = false
  return value
    .replace(/。/g, ".")
    .split("")
    .filter((ch) => {
      if (ch === ".") {
        if (seenDot) return false
        seenDot = true
        return true
      }
      return /^\d$/.test(ch)
    })
    .join("")
}

export const replacer = (_key: string, value: unknown) => {
  if (typeof value === "number" && !Number.isFinite(value)) return null
  return value
}

export const reviver = (_key: string, value: unknown) => {
  if (value === null) return Infinity
  return value
}

export const formatWan = (n: number) => {
  if (Math.abs(n) >= 10_000) return `${(n / 10_000).toFixed(1)}w`
  return n.toLocaleString()
}
