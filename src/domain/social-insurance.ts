/* ===================== 社保相关 ===================== */
import type { SocialInsurance } from "./types"

export const DEFAULT_SOCIAL_INSURANCE: SocialInsurance = {
  enabled: false,
  city: undefined,
  base: 0,
  baseManuallySet: false,
  pension: { company: 16, personal: 8 },
  medical: { company: 10, personal: 2 },
  unemployment: { company: 0.5, personal: 0.5 },
  injury: { company: 0.2, personal: 0 },
}
