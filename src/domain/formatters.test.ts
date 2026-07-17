import { describe, it, expect } from 'vitest'
import {
  formatMoney,
  clamp,
  uid,
  filterNumeric,
  filterNumber,
  replacer,
  reviver,
  formatWan,
} from './formatters'

describe('formatters', () => {
  describe('formatMoney', () => {
    it('formats number as CNY with locale string', () => {
      expect(formatMoney(1234567)).toBe('¥1,234,567')
      expect(formatMoney(0)).toBe('¥0')
    })
  })

  describe('clamp', () => {
    it('clamps value between min and max', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-1, 0, 10)).toBe(0)
      expect(clamp(11, 0, 10)).toBe(10)
    })
  })

  describe('uid', () => {
    it('returns an 8-character string', () => {
      expect(uid()).toHaveLength(8)
      expect(uid()).not.toBe(uid())
    })
  })

  describe('filterNumeric', () => {
    it('removes non-digit characters', () => {
      expect(filterNumeric('abc123.45')).toBe('12345')
      expect(filterNumeric('¥ 30,000')).toBe('30000')
    })
  })

  describe('filterNumber', () => {
    it('keeps digits and at most one decimal point', () => {
      expect(filterNumber('12.34')).toBe('12.34')
      expect(filterNumber('12.34.56')).toBe('12.3456')
    })

    it('converts Chinese full-stop to decimal point', () => {
      expect(filterNumber('30。5')).toBe('30.5')
    })

    it('removes non-numeric characters except dot', () => {
      expect(filterNumber('¥ 30,000.5')).toBe('30000.5')
    })

    it('returns empty string for empty input', () => {
      expect(filterNumber('')).toBe('')
      expect(filterNumeric('')).toBe('')
    })
  })

  describe('replacer / reviver', () => {
    it('serializes Infinity to null and restores it', () => {
      const json = JSON.stringify({ value: Infinity }, replacer)
      expect(json).toBe('{"value":null}')
      const parsed = JSON.parse(json, reviver)
      expect(parsed.value).toBe(Infinity)
    })
  })

  describe('formatWan', () => {
    it('formats large numbers as wan', () => {
      expect(formatWan(15000)).toBe('1.5w')
      expect(formatWan(10000)).toBe('1.0w')
    })

    it('keeps small numbers as locale string', () => {
      expect(formatWan(9999)).toBe('9,999')
    })
  })
})
