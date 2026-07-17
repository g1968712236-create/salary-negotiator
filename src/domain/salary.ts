/* ===================== 薪资核心计算 ===================== */
import type { SalaryData, Scenario, SocialInsurance, Summary, TaxBracket } from "./types"
import { clamp, uid } from "./formatters"
import { calcAnnualTax, calcBonusTax, DEFAULT_ANNUAL_TAX_BRACKETS, DEFAULT_BONUS_TAX_BRACKETS } from "./tax"
import { DEFAULT_SOCIAL_INSURANCE } from "./social-insurance"
import { CITY_PRESETS } from "./constants"

export function calcSummary(
  data: SalaryData,
  annualBrackets: TaxBracket[] = DEFAULT_ANNUAL_TAX_BRACKETS,
  bonusBrackets: TaxBracket[] = DEFAULT_BONUS_TAX_BRACKETS
): Summary {
  const annualCash = data.monthlyBase * data.months
  const monthlyPersonal = Math.round((data.providentBase * data.personalRate) / 100)
  const monthlyCompany = Math.round((data.providentBase * data.companyRate) / 100)
  const annualProvidentTotal = (monthlyPersonal + monthlyCompany) * 12
  const equityNum = data.equity === "" ? 0 : Number(data.equity)
  const signingNum = data.signingBonus === "" ? 0 : Number(data.signingBonus)
  const annualTotalPackage = annualCash + equityNum + signingNum
  const monthlyAvg = Math.round(annualTotalPackage / 12)

  // 社保
  const si = data.socialInsurance
  let monthlySocialPersonal = 0
  let monthlySocialCompany = 0
  if (si.enabled && si.base > 0) {
    monthlySocialPersonal = Math.round(
      (si.base * (si.pension.personal + si.medical.personal + si.unemployment.personal + si.injury.personal)) / 100
    )
    monthlySocialCompany = Math.round(
      (si.base * (si.pension.company + si.medical.company + si.unemployment.company + si.injury.company)) / 100
    )
  }
  const annualSocialPersonal = monthlySocialPersonal * 12
  const annualSocialCompany = monthlySocialCompany * 12

  // 个税
  const annualSalary = data.monthlyBase * 12
  const annualBonus = Math.max(0, annualCash - annualSalary)
  const annualDeduction = data.deduction * 12
  const annualPersonalProvident = monthlyPersonal * 12
  const taxableIncome = Math.max(
    0,
    annualSalary - 60000 - annualPersonalProvident - annualSocialPersonal - annualDeduction
  )
  const annualSalaryTax = calcAnnualTax(taxableIncome, annualBrackets)
  const annualSalaryAfterTax = annualSalary - annualSalaryTax - annualSocialPersonal
  const annualBonusTax = calcBonusTax(annualBonus, bonusBrackets)
  const annualBonusAfterTax = annualBonus - annualBonusTax
  const annualTotalAfterTax = annualSalaryAfterTax + annualBonusAfterTax + equityNum + signingNum
  const annualExpense = data.monthlyExpense * 12
  const netIncome = annualTotalAfterTax - annualExpense

  return {
    annualCash,
    monthlyPersonal,
    monthlyCompany,
    annualProvidentTotal,
    equityNum,
    signingNum,
    annualTotalPackage,
    monthlyAvg,
    annualSalaryAfterTax,
    annualBonusAfterTax,
    annualTotalAfterTax,
    annualExpense,
    netIncome,
    monthlySocialPersonal,
    monthlySocialCompany,
    annualSocialPersonal,
    annualSocialCompany,
  }
}

export function createSalaryData(
  monthlyBase: number,
  months: number,
  providentBase: number,
  personalRate: number,
  companyRate: number,
  deduction: number,
  monthlyExpense: number,
  equity = "",
  signingBonus = "",
  socialInsurance: SocialInsurance = DEFAULT_SOCIAL_INSURANCE
): SalaryData {
  const si = { ...socialInsurance }
  if (si.enabled && si.city && !si.baseManuallySet) {
    const presetKey = Object.keys(CITY_PRESETS).find((k) => CITY_PRESETS[k].name === si.city)
    if (presetKey) {
      const preset = CITY_PRESETS[presetKey]
      si.base = clamp(monthlyBase, preset.minBase, preset.maxBase)
    }
  }
  return {
    monthlyBase,
    months,
    providentBase: providentBase <= 0 ? monthlyBase : providentBase,
    personalRate,
    companyRate,
    deduction,
    monthlyExpense,
    equity,
    signingBonus,
    socialInsurance: si,
  }
}

export function defaultCurrent(): SalaryData {
  return createSalaryData(30000, 14, 25000, 12, 12, 0, 0)
}

export function defaultExpected(): SalaryData {
  return createSalaryData(30000, 14, 0, 12, 12, 0, 0)
}

export function defaultScenarios(): Scenario[] {
  return [
    { id: uid(), name: "当前岗位", role: "current", data: defaultCurrent() },
    { id: uid(), name: "期望", role: "expected", data: defaultExpected() },
    { id: uid(), name: "Offer 1", role: "offer", data: createSalaryData(35000, 15, 0, 12, 12, 0, 0) },
  ]
}
