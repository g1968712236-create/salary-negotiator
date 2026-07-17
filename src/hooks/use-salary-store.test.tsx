import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSalaryStore } from './use-salary-store'

describe('useSalaryStore', () => {
  let storage: Record<string, string> = {}

  beforeEach(() => {
    storage = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value
      },
      removeItem: (key: string) => {
        delete storage[key]
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('initializes with default scenarios', () => {
    const { result } = renderHook(() => useSalaryStore())
    expect(result.current.scenarios).toHaveLength(3)
    expect(result.current.scenarios[0].role).toBe('current')
    expect(result.current.scenarios[1].role).toBe('expected')
    expect(result.current.scenarios[2].role).toBe('offer')
  })

  it('adds a new offer scenario', () => {
    const { result } = renderHook(() => useSalaryStore())
    act(() => {
      result.current.addScenario()
    })
    expect(result.current.scenarios).toHaveLength(4)
    expect(result.current.scenarios[3].role).toBe('offer')
    expect(result.current.scenarios[3].name).toBe('Offer 2')
  })

  it('removes an offer scenario', () => {
    const { result } = renderHook(() => useSalaryStore())
    const offerId = result.current.scenarios[2].id
    act(() => {
      result.current.removeScenario(offerId)
    })
    expect(result.current.scenarios.find((s) => s.id === offerId)).toBeUndefined()
  })

  it('does not remove current or expected scenario', () => {
    const { result } = renderHook(() => useSalaryStore())
    const currentId = result.current.scenarios[0].id
    act(() => {
      result.current.removeScenario(currentId)
    })
    expect(result.current.scenarios).toHaveLength(3)
  })

  it('renames a scenario', () => {
    const { result } = renderHook(() => useSalaryStore())
    const id = result.current.scenarios[0].id
    act(() => {
      result.current.renameScenario(id, '新公司')
    })
    expect(result.current.scenarios[0].name).toBe('新公司')
  })

  it('calculates expected annual package based on current package and increase percent', () => {
    const { result } = renderHook(() => useSalaryStore())
    act(() => {
      result.current.setIncreasePercent(20)
    })
    const currentPackage = result.current.currentSummary.annualTotalPackage
    expect(result.current.expectedAnnualPackage).toBe(Math.round(currentPackage * 1.2))
  })

  it('updates scenario data', () => {
    const { result } = renderHook(() => useSalaryStore())
    const id = result.current.scenarios[0].id
    act(() => {
      result.current.updateScenario(id, (data) => ({ ...data, monthlyBase: 50000 }))
    })
    expect(result.current.scenarios[0].data.monthlyBase).toBe(50000)
  })
})
