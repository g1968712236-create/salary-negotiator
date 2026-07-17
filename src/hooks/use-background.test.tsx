import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBackground } from './use-background'

describe('useBackground', () => {
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

  it('defaults to flow mode', () => {
    const { result } = renderHook(() => useBackground())
    expect(result.current.bgMode).toBe('flow')
  })

  it('cycles through background modes', () => {
    const { result } = renderHook(() => useBackground())
    act(() => {
      result.current.cycleBgMode()
    })
    expect(result.current.bgMode).toBe('rain')

    act(() => {
      result.current.cycleBgMode()
    })
    expect(result.current.bgMode).toBe('solid')

    act(() => {
      result.current.cycleBgMode()
    })
    expect(result.current.bgMode).toBe('flow')
  })

  it('saves preference to localStorage', () => {
    const { result } = renderHook(() => useBackground())
    act(() => {
      result.current.setBgColor('#0a0a1a')
      result.current.setBgMode('solid')
    })
    expect(storage['salary-negotiator-bg']).toContain('solid')
    expect(storage['salary-negotiator-bg']).toContain('#0a0a1a')
  })
})
