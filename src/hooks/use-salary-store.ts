import { useCallback, useEffect, useMemo, useState } from "react"
import type { SalaryData, Scenario, TaxBracket } from "@/domain"
import {
  calcSummary,
  clamp,
  createSalaryData,
  DEFAULT_ANNUAL_TAX_BRACKETS,
  DEFAULT_BONUS_TAX_BRACKETS,
  defaultScenarios,
  MAX_BASE,
  MIN_BASE,
  uid,
} from "@/domain"
import { loadSalaryState, saveSalaryState } from "@/data"

export function useSalaryStore() {
  const [scenarios, setScenarios] = useState<Scenario[]>(defaultScenarios())
  const [activeScenarioId, setActiveScenarioId] = useState<string>("")
  const [increasePercent, setIncreasePercent] = useState(20)
  const [annualBrackets, setAnnualBrackets] = useState<TaxBracket[]>(DEFAULT_ANNUAL_TAX_BRACKETS)
  const [bonusBrackets, setBonusBrackets] = useState<TaxBracket[]>(DEFAULT_BONUS_TAX_BRACKETS)
  const [loaded, setLoaded] = useState(false)

  /* localStorage 加载 */
  useEffect(() => {
    const saved = loadSalaryState()
    if (saved) {
      if (saved.scenarios?.length > 0) {
        setScenarios(saved.scenarios)
        setActiveScenarioId(saved.activeScenarioId || saved.scenarios[0].id)
      }
      if (typeof saved.increasePercent === "number") setIncreasePercent(saved.increasePercent)
      if (saved.annualBrackets?.length) setAnnualBrackets(saved.annualBrackets)
      if (saved.bonusBrackets?.length) setBonusBrackets(saved.bonusBrackets)
    }
    setLoaded(true)
  }, [])

  /* localStorage 自动保存 */
  useEffect(() => {
    if (!loaded) return
    saveSalaryState({
      scenarios,
      activeScenarioId,
      increasePercent,
      annualBrackets,
      bonusBrackets,
    })
  }, [scenarios, activeScenarioId, increasePercent, annualBrackets, bonusBrackets, loaded])

  /* 派生数据 */
  const currentScenario = useMemo(
    () => scenarios.find((s) => s.role === "current") || scenarios[0],
    [scenarios]
  )
  const expectedScenario = useMemo(() => scenarios.find((s) => s.role === "expected"), [scenarios])
  const activeScenario = useMemo(
    () => scenarios.find((s) => s.id === activeScenarioId) || scenarios[0],
    [scenarios, activeScenarioId]
  )

  const currentSummary = useMemo(
    () => calcSummary(currentScenario?.data || defaultScenarios()[0].data, annualBrackets, bonusBrackets),
    [currentScenario, annualBrackets, bonusBrackets]
  )

  const expectedAnnualPackage = useMemo(() => {
    return Math.round(currentSummary.annualTotalPackage * (1 + increasePercent / 100))
  }, [currentSummary.annualTotalPackage, increasePercent])

  const updateScenario = useCallback((id: string, updater: (data: SalaryData) => SalaryData) => {
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, data: updater(s.data) } : s)))
  }, [])

  /* 当当前岗位或涨幅变化时，反推期望月Base */
  useEffect(() => {
    if (!expectedScenario) return
    const expected = expectedScenario.data
    const equityNum = expected.equity === "" ? 0 : Number(expected.equity)
    const signingNum = expected.signingBonus === "" ? 0 : Number(expected.signingBonus)
    const base =
      expected.months > 0
        ? Math.round((expectedAnnualPackage - equityNum - signingNum) / expected.months)
        : 0
    const clamped = clamp(base, MIN_BASE, MAX_BASE)
    if (clamped !== expected.monthlyBase) {
      updateScenario(expectedScenario.id, (d) => ({ ...d, monthlyBase: clamped }))
    }
  }, [expectedAnnualPackage, expectedScenario, updateScenario])

  const addScenario = useCallback(() => {
    setScenarios((prev) => {
      const offerCount = prev.filter((s) => s.role === "offer").length
      const newScenario: Scenario = {
        id: uid(),
        name: `Offer ${offerCount + 1}`,
        role: "offer",
        data: createSalaryData(35000, 15, 0, 12, 12, 0, 0),
      }
      setActiveScenarioId(newScenario.id)
      return [...prev, newScenario]
    })
  }, [])

  const removeScenario = useCallback((id: string) => {
    setScenarios((prev) => {
      const scenario = prev.find((s) => s.id === id)
      if (!scenario || scenario.role !== "offer") return prev
      const next = prev.filter((s) => s.id !== id)
      if (activeScenarioId === id && next.length > 0) {
        setActiveScenarioId(next[0].id)
      }
      return next
    })
  }, [activeScenarioId])

  const renameScenario = useCallback((id: string, name: string) => {
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)))
  }, [])

  return {
    scenarios,
    activeScenarioId,
    activeScenario,
    currentScenario,
    expectedScenario,
    increasePercent,
    expectedAnnualPackage,
    currentSummary,
    annualBrackets,
    bonusBrackets,
    loaded,
    setActiveScenarioId,
    setIncreasePercent,
    setAnnualBrackets,
    setBonusBrackets,
    updateScenario,
    addScenario,
    removeScenario,
    renameScenario,
  }
}
