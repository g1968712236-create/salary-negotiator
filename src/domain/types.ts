/* ===================== 类型定义 ===================== */

export interface SocialInsurance {
  enabled: boolean
  city?: string
  base: number
  baseManuallySet?: boolean
  pension: { company: number; personal: number }
  medical: { company: number; personal: number }
  unemployment: { company: number; personal: number }
  injury: { company: number; personal: number }
}

export interface SalaryData {
  monthlyBase: number
  months: number
  providentBase: number
  personalRate: number
  companyRate: number
  deduction: number
  monthlyExpense: number
  equity: string
  signingBonus: string
  socialInsurance: SocialInsurance
}

export interface SavedOffer {
  id: string
  name: string
  data: SalaryData
}

export interface Scenario {
  id: string
  name: string
  data: SalaryData
  role: "current" | "expected" | "offer"
}

export interface TaxBracket {
  limit: number
  rate: number
  deduction: number
}

export interface CitySocialInsurancePreset {
  name: string
  minBase: number
  maxBase: number
  pension: { company: number; personal: number }
  medical: { company: number; personal: number }
  unemployment: { company: number; personal: number }
  injury: { company: number; personal: number }
}

export interface Summary {
  annualCash: number
  monthlyPersonal: number
  monthlyCompany: number
  annualProvidentTotal: number
  equityNum: number
  signingNum: number
  annualTotalPackage: number
  monthlyAvg: number
  annualSalaryAfterTax: number
  annualBonusAfterTax: number
  annualTotalAfterTax: number
  annualExpense: number
  netIncome: number
  monthlySocialPersonal: number
  monthlySocialCompany: number
  annualSocialPersonal: number
  annualSocialCompany: number
}

export type BgMode = "flow" | "rain" | "solid"
export type BgColor = "#050510" | "#0a0a1a" | "#111122" | "#1a0a14"

export type TabKey = "scenario" | "diff" | "lookup" | "tax"
