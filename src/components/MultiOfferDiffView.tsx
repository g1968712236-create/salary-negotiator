import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { calcSummary, defaultCurrent, formatMoney, type SalaryData, type Scenario, type Summary, type TaxBracket } from "@/domain"

interface DiffRow {
  label: string
  key: keyof Summary | "monthlyBase" | "months" | "socialBase"
  format?: "money" | "number" | "month" | "percent"
  highlight?: boolean
}

const DIFF_ROWS: DiffRow[] = [
  { label: "月Base", key: "monthlyBase", format: "money" },
  { label: "薪数", key: "months", format: "month" },
  { label: "现金年总收入", key: "annualCash", format: "money" },
  { label: "年公积金总额", key: "annualProvidentTotal", format: "money" },
  { label: "年社保个人", key: "annualSocialPersonal", format: "money" },
  { label: "年社保公司", key: "annualSocialCompany", format: "money" },
  { label: "股权/期权", key: "equityNum", format: "money" },
  { label: "签字费", key: "signingNum", format: "money" },
  { label: "年包总额", key: "annualTotalPackage", format: "money", highlight: true },
  { label: "税后收入", key: "annualTotalAfterTax", format: "money" },
  { label: "净收入", key: "netIncome", format: "money", highlight: true },
]

function formatDiffValue(value: number, format?: string) {
  if (format === "money") return formatMoney(value)
  if (format === "month") return `${value}薪`
  return value.toLocaleString()
}

export function MultiOfferDiffView({
  scenarios,
  annualBrackets,
  bonusBrackets,
}: {
  scenarios: Scenario[]
  annualBrackets: TaxBracket[]
  bonusBrackets: TaxBracket[]
}) {
  const currentScenario = scenarios.find((s) => s.role === "current") || scenarios[0]
  const compareScenarios = scenarios.filter((s) => s.id !== currentScenario?.id)

  const currentSummary = useMemo(
    () => calcSummary(currentScenario?.data || defaultCurrent(), annualBrackets, bonusBrackets),
    [currentScenario, annualBrackets, bonusBrackets]
  )
  const scenarioSummaries = useMemo(
    () =>
      compareScenarios.map((s) => ({
        ...s,
        summary: calcSummary(s.data, annualBrackets, bonusBrackets),
      })),
    [compareScenarios, annualBrackets, bonusBrackets]
  )

  const getValue = (row: DiffRow, data: SalaryData, summary: Summary) => {
    if (row.key === "monthlyBase") return data.monthlyBase
    if (row.key === "months") return data.months
    return summary[row.key as keyof Summary] as number
  }

  const relPct = (base: number, value: number) => {
    if (base === 0) return value === 0 ? "0%" : "+∞%"
    const p = ((value - base) / base) * 100
    const sign = p > 0 ? "+" : ""
    return `${sign}${p.toFixed(1)}%`
  }

  const state = (base: number, value: number): "up" | "down" | "flat" => {
    if (value > base) return "up"
    if (value < base) return "down"
    return "flat"
  }

  const stateClass = (s: "up" | "down" | "flat") => {
    if (s === "up") return "text-danger neon-red"
    if (s === "down") return "text-success neon-green"
    return "text-subtle"
  }

  const columns = [
    { label: currentScenario?.name ?? "当前岗位", data: currentScenario?.data || defaultCurrent(), summary: currentSummary, name: currentScenario?.name ?? "当前岗位", isBase: true },
    ...scenarioSummaries.map((s) => ({
      label: s.name,
      data: s.data,
      summary: s.summary,
      name: s.name,
      isBase: false,
    })),
  ]

  return (
    <div className="cyber-panel p-4">
      <div className="mb-3 text-xs text-dim">以当前岗位为基数的多方案对比</div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[600px] text-xs">
          <thead>
            <tr className="border-b border-accent/10 text-subtle">
              <th className="py-2 text-left font-medium">指标</th>
              {columns.map((c) => (
                <th key={c.name} className="px-2 py-2 text-center font-medium">
                  {c.name}
                </th>
              ))}
              {columns.slice(1).map((c) => (
                <th key={`${c.name}-diff`} className="px-2 py-2 text-center font-medium text-subtle">
                  {c.name}涨幅
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIFF_ROWS.map((row) => {
              const baseValue = getValue(row, currentScenario?.data || defaultCurrent(), currentSummary)
              return (
                <tr
                  key={row.label}
                  className={cn(
                    "border-b border-white/[0.03]",
                    row.highlight ? "bg-accent/[0.03]" : ""
                  )}
                >
                  <td className={cn("py-2 pr-2", row.highlight ? "text-accent" : "text-dim")}>
                    {row.label}
                  </td>
                  {columns.map((c) => (
                    <td key={c.name} className="px-2 py-2 text-center text-foreground">
                      {formatDiffValue(getValue(row, c.data, c.summary), row.format)}
                    </td>
                  ))}
                  {columns.slice(1).map((c) => {
                    const val = getValue(row, c.data, c.summary)
                    const st = state(baseValue, val)
                    return (
                      <td key={`${c.name}-diff`} className={cn("px-2 py-2 text-center", stateClass(st))}>
                        {relPct(baseValue, val)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {DIFF_ROWS.map((row) => {
          const baseValue = getValue(row, currentScenario?.data || defaultCurrent(), currentSummary)
          return (
            <div
              key={row.label}
              className={cn(
                "rounded-lg border p-3",
                row.highlight
                  ? "border-accent/25 bg-accent/[0.03]"
                  : "border-white/[0.05] bg-black/20"
              )}
            >
              <div
                className={cn(
                  "mb-2 text-xs font-medium",
                  row.highlight ? "text-accent" : "text-dim"
                )}
              >
                {row.label}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-subtle truncate max-w-[80px]">{currentScenario?.name ?? "当前岗位"}</span>
                  <span className="text-foreground">{formatDiffValue(baseValue, row.format)}</span>
                </div>
                {scenarioSummaries.map((s) => {
                  const val = getValue(row, s.data, s.summary)
                  return (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <span className="text-subtle truncate max-w-[80px]">{s.name}</span>
                      <div className="text-right">
                        <span className="text-foreground">{formatDiffValue(val, row.format)}</span>
                        <span className={cn("ml-2", stateClass(state(baseValue, val)))}>
                          {relPct(baseValue, val)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-subtle">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-danger shadow-[0_0_4px_rgba(255,51,102,0.5)]" />
          涨
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-success shadow-[0_0_4px_rgba(0,255,136,0.5)]" />
          跌
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-subtle" />
          平
        </span>
      </div>
    </div>
  )
}
