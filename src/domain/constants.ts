/* ===================== 常量 ===================== */

export const MIN_BASE = 100
export const MAX_BASE = 1_000_000
export const MIN_RATE = 5
export const MAX_RATE = 12
export const MONTHS_RANGE = [12, 13, 14, 15, 16, 17, 18] as const

export const SITE_URL = "https://g1968712236-create.github.io/salary-negotiator/"
export const BRAND_NAME = "Offer薪资速算器"

/* ===================== 社保预设（2025.7 - 2026.6 公开口径，仅供参考） ===================== */
import type { CitySocialInsurancePreset } from "./types"

export const CITY_PRESETS: Record<string, CitySocialInsurancePreset> = {
  beijing: {
    name: "北京",
    minBase: 7162,
    maxBase: 35811,
    pension: { company: 16, personal: 8 },
    medical: { company: 9.8, personal: 2 },
    unemployment: { company: 0.5, personal: 0.5 },
    injury: { company: 0.2, personal: 0 },
  },
  shanghai: {
    name: "上海",
    minBase: 7460,
    maxBase: 37302,
    pension: { company: 16, personal: 8 },
    medical: { company: 10, personal: 2 },
    unemployment: { company: 0.5, personal: 0.5 },
    injury: { company: 0.2, personal: 0 },
  },
  guangzhou: {
    name: "广州",
    minBase: 5500,
    maxBase: 27549,
    pension: { company: 16, personal: 8 },
    medical: { company: 6, personal: 2 },
    unemployment: { company: 0.8, personal: 0.2 },
    injury: { company: 0.2, personal: 0 },
  },
  shenzhen: {
    name: "深圳",
    minBase: 4492,
    maxBase: 27549,
    pension: { company: 16, personal: 8 },
    medical: { company: 6, personal: 2 },
    unemployment: { company: 0.7, personal: 0.3 },
    injury: { company: 0.2, personal: 0 },
  },
  hangzhou: {
    name: "杭州",
    minBase: 4812,
    maxBase: 24930,
    pension: { company: 14, personal: 8 },
    medical: { company: 9.5, personal: 2 },
    unemployment: { company: 0.5, personal: 0.5 },
    injury: { company: 0.2, personal: 0 },
  },
}
