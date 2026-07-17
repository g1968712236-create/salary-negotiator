import type { Scenario, TaxBracket } from "@/domain"
import { replacer, reviver } from "@/domain"
import { STORAGE_KEY, LEGACY_STORAGE_KEY, BACKGROUND_STORAGE_KEY } from "./keys"
import { migrateFromV2 } from "./migration"

export interface PersistedState {
  scenarios: Scenario[]
  activeScenarioId: string
  increasePercent: number
  annualBrackets: TaxBracket[]
  bonusBrackets: TaxBracket[]
}

export interface BackgroundPreference {
  mode: "flow" | "rain" | "solid"
  color: "#050510" | "#0a0a1a" | "#111122" | "#1a0a14"
}

export function loadSalaryState(): PersistedState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved, reviver) as Partial<PersistedState>
      if (Array.isArray(parsed.scenarios) && parsed.scenarios.length > 0) {
        return {
          scenarios: parsed.scenarios,
          activeScenarioId: parsed.activeScenarioId || parsed.scenarios[0].id,
          increasePercent: typeof parsed.increasePercent === "number" ? parsed.increasePercent : 20,
          annualBrackets: parsed.annualBrackets || [],
          bonusBrackets: parsed.bonusBrackets || [],
        }
      }
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      const parsedLegacy = JSON.parse(legacy, reviver)
      const migrated = migrateFromV2(parsedLegacy)
      if (migrated) return { annualBrackets: [], bonusBrackets: [], ...migrated }
    }
  } catch {
    // ignore
  }
  return null
}

export function saveSalaryState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state, replacer))
  } catch {
    // ignore
  }
}

export function loadBackgroundPreference(): BackgroundPreference | null {
  try {
    const saved = localStorage.getItem(BACKGROUND_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved) as BackgroundPreference
    }
  } catch {
    // ignore
  }
  return null
}

export function saveBackgroundPreference(pref: BackgroundPreference): void {
  try {
    localStorage.setItem(BACKGROUND_STORAGE_KEY, JSON.stringify(pref))
  } catch {
    // ignore
  }
}
