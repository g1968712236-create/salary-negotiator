import { describe, it, expect } from 'vitest'
import { migrateFromV2 } from './migration'
import { defaultCurrent, defaultExpected } from '@/domain'

describe('migration', () => {
  it('fills in default current and expected for empty legacy data', () => {
    const result = migrateFromV2({})
    expect(result).not.toBeNull()
    expect(result!.scenarios).toHaveLength(2)
    expect(result!.scenarios[0].role).toBe('current')
    expect(result!.scenarios[1].role).toBe('expected')
  })

  it('migrates empty legacy with default current and expected', () => {
    const result = migrateFromV2({ current: defaultCurrent(), expected: defaultExpected() })
    expect(result).not.toBeNull()
    expect(result!.scenarios).toHaveLength(2)
    expect(result!.scenarios[0].role).toBe('current')
    expect(result!.scenarios[1].role).toBe('expected')
    expect(result!.increasePercent).toBe(20)
  })

  it('migrates legacy offers', () => {
    const offer = {
      id: 'offer-1',
      name: '旧 Offer',
      data: defaultCurrent(),
    }
    const result = migrateFromV2({
      current: defaultCurrent(),
      expected: defaultExpected(),
      offers: [offer],
      increasePercent: 30,
    })
    expect(result!.scenarios).toHaveLength(3)
    expect(result!.scenarios[2].role).toBe('offer')
    expect(result!.increasePercent).toBe(30)
  })
})
