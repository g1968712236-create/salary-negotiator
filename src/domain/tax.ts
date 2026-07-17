/* ===================== 个税计算 ===================== */
import type { TaxBracket } from "./types"

export const DEFAULT_ANNUAL_TAX_BRACKETS: TaxBracket[] = [
  { limit: 36000, rate: 0.03, deduction: 0 },
  { limit: 144000, rate: 0.1, deduction: 2520 },
  { limit: 300000, rate: 0.2, deduction: 16920 },
  { limit: 420000, rate: 0.25, deduction: 31920 },
  { limit: 660000, rate: 0.3, deduction: 52920 },
  { limit: 960000, rate: 0.35, deduction: 85920 },
  { limit: Infinity, rate: 0.45, deduction: 181920 },
]

export const DEFAULT_BONUS_TAX_BRACKETS: TaxBracket[] = [
  { limit: 3000, rate: 0.03, deduction: 0 },
  { limit: 12000, rate: 0.1, deduction: 210 },
  { limit: 25000, rate: 0.2, deduction: 1410 },
  { limit: 35000, rate: 0.25, deduction: 2660 },
  { limit: 55000, rate: 0.3, deduction: 4410 },
  { limit: 80000, rate: 0.35, deduction: 7160 },
  { limit: Infinity, rate: 0.45, deduction: 15160 },
]

export function calcAnnualTax(taxableIncome: number, brackets: TaxBracket[]): number {
  if (taxableIncome <= 0) return 0
  const bracket = brackets.find((b) => taxableIncome <= b.limit) || brackets[brackets.length - 1]
  return Math.max(0, taxableIncome * bracket.rate - bracket.deduction)
}

export function calcBonusTax(bonus: number, brackets: TaxBracket[]): number {
  if (bonus <= 0) return 0
  const monthlyAvg = bonus / 12
  const bracket = brackets.find((b) => monthlyAvg <= b.limit) || brackets[brackets.length - 1]
  return Math.max(0, bonus * bracket.rate - bracket.deduction)
}
