import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadSalaryState, saveSalaryState, loadBackgroundPreference, saveBackgroundPreference } from './storage'
import { defaultScenarios } from '@/domain'

describe('storage', () => {
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

  it('returns null when storage is empty', () => {
    expect(loadSalaryState()).toBeNull()
  })

  it('loads valid v3 state', () => {
    const scenarios = defaultScenarios()
    saveSalaryState({
      scenarios,
      activeScenarioId: scenarios[0].id,
      increasePercent: 25,
      annualBrackets: [],
      bonusBrackets: [],
    })
    const loaded = loadSalaryState()
    expect(loaded).not.toBeNull()
    expect(loaded!.increasePercent).toBe(25)
    expect(loaded!.scenarios).toHaveLength(3)
  })

  it('serializes and restores Infinity values', () => {
    const scenarios = defaultScenarios()
    saveSalaryState({
      scenarios,
      activeScenarioId: scenarios[0].id,
      increasePercent: 20,
      annualBrackets: [{ limit: Infinity, rate: 0.45, deduction: 0 }],
      bonusBrackets: [],
    })
    const loaded = loadSalaryState()
    expect(loaded!.annualBrackets[0].limit).toBe(Infinity)
  })

  it('returns null for corrupted JSON', () => {
    storage['salary-negotiator-v3'] = 'not-json'
    expect(loadSalaryState()).toBeNull()
  })

  it('loads background preference', () => {
    saveBackgroundPreference({ mode: 'solid', color: '#0a0a1a' })
    const loaded = loadBackgroundPreference()
    expect(loaded).toEqual({ mode: 'solid', color: '#0a0a1a' })
  })
})
