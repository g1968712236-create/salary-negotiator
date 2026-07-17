import type { SavedOffer, Scenario, TaxBracket } from "@/domain"
import { uid } from "@/domain"
import { defaultCurrent, defaultExpected } from "@/domain"

export interface LegacyV2State {
  current?: ReturnType<typeof defaultCurrent>
  expected?: ReturnType<typeof defaultExpected>
  offers?: SavedOffer[]
  increasePercent?: number
  annualBrackets?: TaxBracket[]
  bonusBrackets?: TaxBracket[]
  bgMode?: string
  bgColor?: string
}

export function migrateFromV2(legacy: LegacyV2State): {
  scenarios: Scenario[]
  activeScenarioId: string
  increasePercent: number
  annualBrackets?: TaxBracket[]
  bonusBrackets?: TaxBracket[]
} | null {
  const migrated: Scenario[] = [
    { id: uid(), name: "当前岗位", role: "current" as const, data: legacy.current || defaultCurrent() },
    { id: uid(), name: "期望", role: "expected" as const, data: legacy.expected || defaultExpected() },
    ...(legacy.offers || []).map((o) => ({ ...o, role: "offer" as const })),
  ].filter((s) => s.data)

  if (migrated.length === 0) return null

  return {
    scenarios: migrated,
    activeScenarioId: migrated[0].id,
    increasePercent: typeof legacy.increasePercent === "number" ? legacy.increasePercent : 20,
    annualBrackets: legacy.annualBrackets,
    bonusBrackets: legacy.bonusBrackets,
  }
}
