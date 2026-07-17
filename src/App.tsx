import { useEffect, useState } from "react"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { NumericInput } from "@/components/forms/NumericInput"
import { BaseInputSlider } from "@/components/forms/BaseInputSlider"
import { RateSlider } from "@/components/forms/RateSlider"
import { MonthsSelector } from "@/components/forms/MonthsSelector"
import { ProvidentBaseInput } from "@/components/forms/ProvidentBaseInput"
import { DeductionInput } from "@/components/forms/DeductionInput"
import { ExpenseInput } from "@/components/forms/ExpenseInput"
import { ExtraModules } from "@/components/forms/ExtraModules"
import { Background } from "@/components/Background"
import { ExportReport } from "@/components/ExportReport"
import { MultiOfferDiffView } from "@/components/MultiOfferDiffView"
import { SalaryChart } from "@/components/SalaryChart"
import { SalarySummary } from "@/components/SalarySummary"
import { SalaryTable } from "@/components/SalaryTable"
import { SocialInsuranceEditor } from "@/components/SocialInsuranceEditor"
import { TaxBracketsTab } from "@/components/TaxBracketsEditor"
import { useBackground } from "@/hooks/use-background"
import { useSalaryStore } from "@/hooks/use-salary-store"
import { BRAND_NAME, CITY_PRESETS, clamp, formatMoney, type SalaryData, type Scenario, type TabKey } from "@/domain"

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("scenario")
  const {
    scenarios,
    activeScenarioId,
    activeScenario,
    increasePercent,
    expectedAnnualPackage,
    currentSummary,
    annualBrackets,
    bonusBrackets,
    setActiveScenarioId,
    setIncreasePercent,
    setAnnualBrackets,
    setBonusBrackets,
    updateScenario,
    addScenario,
    removeScenario,
    renameScenario,
  } = useSalaryStore()

  const { bgMode, bgColor, bgColors, cycleBgMode, setBgColor } = useBackground()

  const [increaseInput, setIncreaseInput] = useState(String(increasePercent))
  useEffect(() => {
    setIncreaseInput(String(increasePercent))
  }, [increasePercent])

  const tabs: { key: TabKey; label: string }[] = [
    { key: "scenario", label: "方案管理" },
    { key: "diff", label: "待遇综合对比" },
    { key: "lookup", label: "年包速查" },
    { key: "tax", label: "税率表" },
  ]

  const scenarioForm = (scenario: Scenario) => {
    const data = scenario.data
    const setData = (updater: (data: SalaryData) => SalaryData) => updateScenario(scenario.id, updater)

    const handleMonthlyBaseChange = (v: number) => {
      setData((prev) => {
        const next: SalaryData = { ...prev, monthlyBase: v }
        if (
          next.socialInsurance.enabled &&
          next.socialInsurance.city &&
          !next.socialInsurance.baseManuallySet
        ) {
          const presetKey = Object.keys(CITY_PRESETS).find(
            (k) => CITY_PRESETS[k].name === next.socialInsurance.city
          )
          if (presetKey) {
            const preset = CITY_PRESETS[presetKey]
            next.socialInsurance = {
              ...next.socialInsurance,
              base: clamp(v, preset.minBase, preset.maxBase),
            }
          }
        }
        return next
      })
      if (scenario.role === "expected" && currentSummary.annualTotalPackage > 0) {
        const newAnnual =
          v * data.months + Number(data.equity || 0) + Number(data.signingBonus || 0)
        const pct = ((newAnnual / currentSummary.annualTotalPackage) - 1) * 100
        setIncreasePercent(pct)
      }
    }

    return (
      <div className="cyber-panel space-y-4 p-4">
        <h3 className="text-xs font-medium text-accent">{scenario.name} 待遇汇总</h3>
        <BaseInputSlider
          value={data.monthlyBase}
          onChange={handleMonthlyBaseChange}
          label="月Base（元/月）"
          data-testid={scenario.role === 'expected' ? 'expected-monthly-base-input' : undefined}
        />
        <MonthsSelector
          value={data.months}
          onChange={(v) => setData((prev) => ({ ...prev, months: v }))}
        />
        <ProvidentBaseInput
          value={data.providentBase}
          onChange={(v) => setData((prev) => ({ ...prev, providentBase: v }))}
          placeholder={String(data.monthlyBase)}
        />
        <RateSlider
          value={data.personalRate}
          onChange={(v) => setData((prev) => ({ ...prev, personalRate: v }))}
          label="个人缴纳比例"
        />
        <RateSlider
          value={data.companyRate}
          onChange={(v) => setData((prev) => ({ ...prev, companyRate: v }))}
          label="公司缴纳比例"
        />
        <SocialInsuranceEditor
          value={data.socialInsurance}
          onChange={(v) => setData((prev) => ({ ...prev, socialInsurance: v }))}
          defaultBase={data.monthlyBase}
        />
        <DeductionInput
          value={data.deduction}
          onChange={(v) => setData((prev) => ({ ...prev, deduction: v }))}
        />
        <ExpenseInput
          value={data.monthlyExpense}
          onChange={(v) => setData((prev) => ({ ...prev, monthlyExpense: v }))}
        />
        <ExtraModules
          equity={data.equity}
          onEquityChange={(v) => setData((prev) => ({ ...prev, equity: v }))}
          signingBonus={data.signingBonus}
          onSigningBonusChange={(v) => setData((prev) => ({ ...prev, signingBonus: v }))}
        />
        <SalarySummary
          data={data}
          label={`${scenario.name} 年包汇总`}
          annualBrackets={annualBrackets}
          bonusBrackets={bonusBrackets}
        />
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "scenario":
        return (
          <div className="animate-in">
            <div className="sticky top-[5.75rem] z-30">
              <div className="cyber-panel space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-accent">方案列表</span>
                  <button
                    onClick={addScenario}
                    className="rounded-md border border-accent/20 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/10"
                  >
                    + 新增 Offer
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {scenarios.map((s) => {
                    const canDelete =
                      s.role === "offer" && scenarios.filter((x) => x.role === "offer").length > 1
                    return (
                      <div
                        key={s.id}
                        data-testid={`scenario-chip-${s.role}`}
                        onClick={() => setActiveScenarioId(s.id)}
                        className={cn(
                          "group flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-all",
                          activeScenarioId === s.id
                            ? "border-accent/30 bg-accent/10 text-accent"
                            : "border-white/[0.05] bg-black/20 text-dim hover:border-accent/15"
                        )}
                      >
                        <input
                          value={s.name}
                          onChange={(e) => renameScenario(s.id, e.target.value)}
                          className={cn(
                            "w-20 bg-transparent text-xs outline-none",
                            activeScenarioId === s.id ? "text-accent" : "text-dim group-hover:text-foreground"
                          )}
                        />
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeScenario(s.id)
                            }}
                            className="ml-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-[10px] leading-none text-subtle transition-colors hover:bg-danger/10 hover:text-danger"
                            title="删除该方案"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              {activeScenario?.role === "expected" && (
                <div className="cyber-panel p-4">
                  <div className="mb-3 text-xs text-dim">期望年包涨幅</div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-foreground">
                      当前年包 {formatMoney(currentSummary.annualTotalPackage)} → 期望年包{" "}
                      <span className="text-accent">{formatMoney(expectedAnnualPackage)}</span>
                    </span>
                    <NumericInput
                      value={increaseInput}
                      onChange={(v) => {
                        setIncreaseInput(v)
                      }}
                      allowDecimal
                      data-testid="expected-increase-input"
                      onBlur={() => {
                        if (increaseInput === "") {
                          setIncreasePercent(0)
                          setIncreaseInput("0")
                          return
                        }
                        const num = Number(increaseInput)
                        if (Number.isNaN(num)) {
                          setIncreaseInput(String(increasePercent))
                          return
                        }
                        const committed = Math.max(0, Math.min(100, num))
                        setIncreasePercent(committed)
                        setIncreaseInput(String(committed))
                      }}
                      className="w-20 text-accent"
                    />
                  </div>
                  <Slider
                    value={[Math.round(increasePercent)]}
                    onValueChange={(v) => setIncreasePercent(v[0])}
                    min={0}
                    max={100}
                    step={1}
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-subtle">
                    <span>0%</span>
                    <span>{increasePercent.toFixed(2)}%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}

              {activeScenario && scenarioForm(activeScenario)}
            </div>
          </div>
        )
      case "diff":
        return (
          <div className="animate-in space-y-4">
            <ExportReport
              scenarios={scenarios}
              annualBrackets={annualBrackets}
              bonusBrackets={bonusBrackets}
            />
            <SalaryChart
              scenarios={scenarios}
              annualBrackets={annualBrackets}
              bonusBrackets={bonusBrackets}
            />
            <MultiOfferDiffView
              scenarios={scenarios}
              annualBrackets={annualBrackets}
              bonusBrackets={bonusBrackets}
            />
          </div>
        )
      case "lookup":
        return (
          <div className="animate-in space-y-4">
            <SalaryTable />
          </div>
        )
      case "tax":
        return (
          <div className="animate-in space-y-4">
            <TaxBracketsTab
              annualBrackets={annualBrackets}
              onAnnualChange={setAnnualBrackets}
              bonusBrackets={bonusBrackets}
              onBonusChange={setBonusBrackets}
            />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="relative min-h-screen">
      <Background mode={bgMode} color={bgColor} />
      <div className="cyber-grid fixed inset-0 -z-[5] opacity-30" />

      <header className="sticky top-0 z-50 flex h-11 items-center justify-between border-b border-accent/10 bg-base/85 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-accent">◈</span>
          <span className="text-xs font-medium tracking-widest text-accent">{BRAND_NAME}</span>
        </div>
        <button
          onClick={cycleBgMode}
          className="text-subtle transition-colors hover:text-dim"
          title="切换背景"
        >
          ◑
        </button>
      </header>

      <main className="mx-auto max-w-[1152px] px-4 pb-24 pt-6 sm:px-6">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-medium text-accent neon-cyan">{BRAND_NAME}</h1>
          <p className="mt-1 text-xs text-subtle">快速对比不同 Base、薪数、公积金与社保方案</p>
        </div>

        <nav className="sticky top-11 z-40 mb-6 overflow-x-auto rounded-xl border border-accent/10 bg-base-2/80 p-1 backdrop-blur-sm">
          <div className="flex min-w-max gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "rounded-lg px-4 py-2.5 text-xs transition-all",
                  activeTab === t.key
                    ? "tab-active"
                    : "text-subtle hover:bg-accent/[0.02] hover:text-dim"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <section>{renderTabContent()}</section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-accent/10 bg-base/85 px-4 py-2 text-center text-[10px] text-subtle backdrop-blur-md">
        <div className="mx-auto flex max-w-[1152px] flex-col items-center justify-between gap-2 sm:flex-row">
          <span>{BRAND_NAME} · 数据仅供参考，具体以劳动合同和当地政策为准</span>
          {bgMode === "solid" && (
            <div className="flex items-center gap-2">
              <span>背景色：</span>
              {bgColors.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setBgColor(c.key)}
                  className={cn(
                    "h-4 w-4 rounded-full border border-white/10 transition-transform",
                    bgColor === c.key ? "scale-110 ring-1 ring-accent" : ""
                  )}
                  style={{ backgroundColor: c.key }}
                  title={c.label}
                />
              ))}
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}
