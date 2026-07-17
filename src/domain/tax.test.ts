import { describe, it, expect } from 'vitest'
import { calcAnnualTax, calcBonusTax, DEFAULT_ANNUAL_TAX_BRACKETS, DEFAULT_BONUS_TAX_BRACKETS } from './tax'

describe('tax', () => {
  describe('calcAnnualTax', () => {
    it('returns 0 for non-positive taxable income', () => {
      expect(calcAnnualTax(0, DEFAULT_ANNUAL_TAX_BRACKETS)).toBe(0)
      expect(calcAnnualTax(-1000, DEFAULT_ANNUAL_TAX_BRACKETS)).toBe(0)
    })

    it('calculates tax for the first bracket', () => {
      // 36,000 * 0.03 - 0 = 1080
      expect(calcAnnualTax(36000, DEFAULT_ANNUAL_TAX_BRACKETS)).toBe(1080)
    })

    it('calculates tax for the second bracket', () => {
      // 144,000 * 0.1 - 2,520 = 11,880
      expect(calcAnnualTax(144000, DEFAULT_ANNUAL_TAX_BRACKETS)).toBe(11880)
    })

    it('calculates tax for an arbitrary bracket', () => {
      // 264,000 * 0.2 - 16,920 = 35,880
      expect(calcAnnualTax(264000, DEFAULT_ANNUAL_TAX_BRACKETS)).toBe(35880)
    })
  })

  describe('calcBonusTax', () => {
    it('returns 0 for non-positive bonus', () => {
      expect(calcBonusTax(0, DEFAULT_BONUS_TAX_BRACKETS)).toBe(0)
      expect(calcBonusTax(-1000, DEFAULT_BONUS_TAX_BRACKETS)).toBe(0)
    })

    it('calculates tax for the first bracket', () => {
      // 36,000 / 12 = 3,000 -> 3% bracket
      // 36,000 * 0.03 - 0 = 1,080
      expect(calcBonusTax(36000, DEFAULT_BONUS_TAX_BRACKETS)).toBe(1080)
    })

    it('calculates tax based on monthly average bonus', () => {
      // 60,000 / 12 = 5,000 -> 10% bracket (3,000 < avg <= 12,000)
      // 60,000 * 0.1 - 210 = 5,790
      expect(calcBonusTax(60000, DEFAULT_BONUS_TAX_BRACKETS)).toBe(5790)
    })

    it('handles very large bonus in top bracket', () => {
      // 1,200,000 / 12 = 100,000 -> 45% bracket (avg > 80,000)
      // 1,200,000 * 0.45 - 15,160 = 524,840
      expect(calcBonusTax(1200000, DEFAULT_BONUS_TAX_BRACKETS)).toBe(524840)
    })

    it('handles exact bracket boundary values', () => {
      // monthly avg exactly 3,000 -> first bracket
      expect(calcBonusTax(36000, DEFAULT_BONUS_TAX_BRACKETS)).toBe(1080)
      // monthly avg exactly 12,000 -> second bracket
      expect(calcBonusTax(144000, DEFAULT_BONUS_TAX_BRACKETS)).toBe(14190)
    })
  })
})
