import { describe, it, expect } from 'vitest'
import { calcSummary, createSalaryData, defaultCurrent, defaultExpected } from './salary'
import { DEFAULT_SOCIAL_INSURANCE } from './social-insurance'
import { CITY_PRESETS, MAX_BASE, MIN_BASE, MONTHS_RANGE } from './constants'

describe('salary', () => {
  describe('createSalaryData', () => {
    it('creates salary data with defaults', () => {
      const data = createSalaryData(30000, 14, 25000, 12, 12, 0, 0)
      expect(data.monthlyBase).toBe(30000)
      expect(data.months).toBe(14)
      expect(data.providentBase).toBe(25000)
      expect(data.personalRate).toBe(12)
      expect(data.companyRate).toBe(12)
      expect(data.deduction).toBe(0)
      expect(data.monthlyExpense).toBe(0)
      expect(data.equity).toBe('')
      expect(data.signingBonus).toBe('')
      expect(data.socialInsurance).toEqual(DEFAULT_SOCIAL_INSURANCE)
    })

    it('falls back providentBase to monthlyBase when not positive', () => {
      const data = createSalaryData(30000, 14, 0, 12, 12, 0, 0)
      expect(data.providentBase).toBe(30000)
    })

    it('accepts equity and signing bonus', () => {
      const data = createSalaryData(30000, 14, 0, 12, 12, 0, 0, '50000', '30000')
      expect(data.equity).toBe('50000')
      expect(data.signingBonus).toBe('30000')
    })
  })

  describe('calcSummary', () => {
    it('calculates current scenario correctly without social insurance', () => {
      const data = createSalaryData(30000, 14, 25000, 12, 12, 0, 0)
      const summary = calcSummary(data)

      expect(summary.annualCash).toBe(420000)
      expect(summary.monthlyPersonal).toBe(3000)
      expect(summary.monthlyCompany).toBe(3000)
      expect(summary.annualProvidentTotal).toBe(72000)
      expect(summary.annualTotalPackage).toBe(420000)
      expect(summary.monthlyAvg).toBe(35000)
      expect(summary.annualSalaryAfterTax).toBe(324120)
      expect(summary.annualBonusAfterTax).toBe(54210)
      expect(summary.annualTotalAfterTax).toBe(378330)
      expect(summary.netIncome).toBe(378330)
      expect(summary.monthlySocialPersonal).toBe(0)
      expect(summary.monthlySocialCompany).toBe(0)
    })

    it('includes equity and signing bonus', () => {
      const data = createSalaryData(30000, 14, 25000, 12, 12, 0, 0, '50000', '30000')
      const summary = calcSummary(data)

      expect(summary.equityNum).toBe(50000)
      expect(summary.signingNum).toBe(30000)
      expect(summary.annualTotalPackage).toBe(500000)
      expect(summary.annualTotalAfterTax).toBe(458330)
    })

    it('subtracts annual expense from net income', () => {
      const data = createSalaryData(30000, 14, 25000, 12, 12, 0, 5000)
      const summary = calcSummary(data)

      expect(summary.annualExpense).toBe(60000)
      expect(summary.netIncome).toBe(318330)
    })

    it('applies deduction to taxable income', () => {
      const data = createSalaryData(30000, 14, 25000, 12, 12, 2000, 0)
      const summary = calcSummary(data)
      // annualDeduction = 24,000; taxableIncome = 264,000 - 24,000 = 240,000
      // tax = 240,000 * 0.2 - 16,920 = 31,080
      // annualSalaryAfterTax = 360,000 - 31,080 = 328,920
      expect(summary.annualSalaryAfterTax).toBe(328920)
    })
  })

  describe('defaults', () => {
    it('defaultCurrent uses providentBase 25000', () => {
      const data = defaultCurrent()
      expect(data.providentBase).toBe(25000)
      expect(data.monthlyBase).toBe(30000)
    })

    it('defaultExpected uses providentBase equal to monthlyBase', () => {
      const data = defaultExpected()
      expect(data.providentBase).toBe(30000)
    })
  })

  describe('boundary cases', () => {
    it('handles minimum monthlyBase', () => {
      const data = createSalaryData(MIN_BASE, 12, MIN_BASE, 12, 12, 0, 0)
      const summary = calcSummary(data)
      expect(summary.annualCash).toBe(MIN_BASE * 12)
      expect(summary.monthlyAvg).toBe(MIN_BASE)
    })

    it('handles maximum monthlyBase', () => {
      const data = createSalaryData(MAX_BASE, 12, MAX_BASE, 12, 12, 0, 0)
      const summary = calcSummary(data)
      expect(summary.annualCash).toBe(MAX_BASE * 12)
      // 高基数下税后收入应远小于税前，且数值有效
      expect(summary.annualTotalAfterTax).toBeGreaterThan(0)
      expect(summary.annualTotalAfterTax).toBeLessThan(summary.annualTotalPackage)
      expect(Number.isFinite(summary.annualTotalAfterTax)).toBe(true)
    })

    it('covers both ends of months range', () => {
      const minMonths = MONTHS_RANGE[0]
      const maxMonths = MONTHS_RANGE[MONTHS_RANGE.length - 1]
      const low = createSalaryData(30000, minMonths, 30000, 12, 12, 0, 0)
      const high = createSalaryData(30000, maxMonths, 30000, 12, 12, 0, 0)
      expect(calcSummary(low).annualCash).toBe(30000 * minMonths)
      expect(calcSummary(high).annualCash).toBe(30000 * maxMonths)
    })

    it('applies Beijing social insurance preset and clamps base within city bounds', () => {
      const beijing = {
        ...DEFAULT_SOCIAL_INSURANCE,
        enabled: true,
        city: CITY_PRESETS.beijing.name,
        baseManuallySet: false,
      }
      // 月薪 30K 落在 7162 ~ 35811 之间，社保基数应等于月薪
      const data = createSalaryData(30000, 14, 25000, 12, 12, 0, 0, '', '', beijing)
      expect(data.socialInsurance.base).toBe(30000)
      const summary = calcSummary(data)
      expect(summary.monthlySocialPersonal).toBeGreaterThan(0)
      expect(summary.monthlySocialCompany).toBeGreaterThan(0)
    })

    it('clamps social insurance base to city max when salary exceeds limit', () => {
      const beijing = {
        ...DEFAULT_SOCIAL_INSURANCE,
        enabled: true,
        city: CITY_PRESETS.beijing.name,
        baseManuallySet: false,
      }
      const data = createSalaryData(100000, 14, 25000, 12, 12, 0, 0, '', '', beijing)
      expect(data.socialInsurance.base).toBe(CITY_PRESETS.beijing.maxBase)
    })
  })
})
