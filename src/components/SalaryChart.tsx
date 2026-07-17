import { useMemo } from "react"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { calcSummary, defaultCurrent, formatMoney, formatWan, type Scenario, type Summary, type TaxBracket } from "@/domain"

interface ChartDimension {
  key: keyof Summary | "monthlyBase"
  label: string
}

const CHART_DIMENSIONS: ChartDimension[] = [
  { key: "monthlyBase", label: "月Base" },
  { key: "annualCash", label: "现金年总收入" },
  { key: "annualProvidentTotal", label: "年公积金总额" },
  { key: "annualTotalPackage", label: "年包总额" },
  { key: "annualTotalAfterTax", label: "税后收入" },
  { key: "netIncome", label: "净收入" },
]

const CHART_COLORS = {
  current: "#00f0ff",
  expected: "#b829dd",
  offer: ["#ffcc00", "#ff00a0", "#00ff88", "#b829dd", "#ff3366"],
}

export function SalaryChart({
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

  const data = useMemo(() => {
    return CHART_DIMENSIONS.map((dim) => {
      const isBase = dim.key === "monthlyBase"
      const cur = isBase ? (currentScenario?.data.monthlyBase ?? 0) : Number(currentSummary[dim.key as keyof Summary])
      const result: Record<string, string | number> = {
        name: dim.label,
        [currentScenario?.name ?? "当前岗位"]: cur,
      }
      scenarioSummaries.forEach((s) => {
        const val = isBase ? s.data.monthlyBase : Number(s.summary[dim.key as keyof Summary])
        const growth = val - cur
        const growthPct = cur === 0 ? 0 : Number(((growth / cur) * 100).toFixed(1))
        result[`${s.name}`] = val
        result[`${s.name}涨幅`] = growthPct
        result[`${s.name}绝对涨幅`] = growth
      })
      return result
    })
  }, [currentSummary, scenarioSummaries, currentScenario])

  const currentName = currentScenario?.name ?? "当前岗位"

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: Array<{ color: string; name: string; value: number }>
    label?: string
  }) => {
    if (!active || !payload || payload.length === 0) return null

    const validPayload = payload.filter((p) => !p.name.includes("涨幅"))
    const currentPayload = validPayload.find((p) => p.name === currentName)
    const currentValue = Number(currentPayload?.value ?? 0)

    return (
      <div className="rounded-lg border border-accent/20 bg-[#0a0a1a]/95 p-3 shadow-[0_0_20px_rgba(0,240,255,0.1)] backdrop-blur-md">
        <div className="mb-2 text-xs font-semibold text-accent">{label}</div>
        <div className="space-y-2 text-[11px]">
          {validPayload.map((p) => {
            const value = Number(p.value)
            const isCurrent = p.name === currentName
            let growthPct: number | null = null
            let growthAbs: number | null = null
            if (!isCurrent && currentValue !== 0) {
              growthPct = ((value - currentValue) / currentValue) * 100
              growthAbs = value - currentValue
            }
            const growthColor = growthPct === null ? "" : growthPct >= 0 ? "text-danger" : "text-success"
            return (
              <div key={p.name}>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-dim">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    {p.name}
                  </span>
                  <span className="text-foreground">{formatMoney(value)}</span>
                </div>
                {growthPct !== null && growthAbs !== null && (
                  <div className="mt-0.5 flex justify-end gap-3 text-[10px]">
                    <span className={growthColor}>
                      {growthPct >= 0 ? "+" : ""}
                      {growthPct.toFixed(1)}%
                    </span>
                    <span className={growthColor}>
                      {growthAbs >= 0 ? "+" : "-"}
                      {formatMoney(Math.abs(growthAbs))}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="cyber-panel p-4">
      <div className="mb-3 text-xs text-dim">当前岗位 / 期望 / Offer 综合对比</div>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 32, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="rgba(0,240,255,0.08)" strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#8899aa", fontSize: 10 }}
              axisLine={{ stroke: "rgba(0,240,255,0.15)" }}
              tickLine={{ stroke: "rgba(0,240,255,0.1)" }}
            />
            <YAxis
              tick={{ fill: "#8899aa", fontSize: 10 }}
              axisLine={{ stroke: "rgba(0,240,255,0.15)" }}
              tickLine={{ stroke: "rgba(0,240,255,0.1)" }}
              tickFormatter={(v) => formatWan(Number(v))}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#8899aa" }} iconType="circle" />
            <Bar
              dataKey={currentScenario?.name ?? "当前岗位"}
              fill={CHART_COLORS.current}
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
            {scenarioSummaries.map((s, idx) => {
              const relKey = `${s.name}涨幅`
              const absKey = `${s.name}绝对涨幅`
              return (
                <Bar
                  key={s.id}
                  dataKey={s.name}
                  fill={CHART_COLORS.offer[idx % CHART_COLORS.offer.length]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                >
                  <LabelList
                    dataKey={relKey}
                    position="top"
                    content={(props: unknown) => {
                      const { x, y, value, payload } = props as {
                        x?: number
                        y?: number
                        value?: number
                        payload?: Record<string, unknown>
                      }
                      if (value === undefined || value === 0 || x === undefined || y === undefined || !payload) {
                        return null
                      }
                      const abs = payload[absKey] as number
                      const color = value >= 0 ? "#ff3366" : "#00ff88"
                      return (
                        <text x={x} y={y - 6} textAnchor="middle" fontSize={9} fill="#e0e8ff">
                          <tspan x={x} dy={0} fill={color} fontWeight={600}>
                            {value >= 0 ? "+" : ""}
                            {value.toFixed(1)}%
                          </tspan>
                          <tspan x={x} dy={11} fill={color}>
                            {abs >= 0 ? "+" : "-"}
                            {formatWan(Math.abs(abs))}
                          </tspan>
                        </text>
                      )
                    }}
                  />
                </Bar>
              )
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-subtle">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS.current }} />
          柱状图 = 金额
        </span>
      </div>
    </div>
  )
}
