import { useCallback, useRef, useState } from "react"
import { toPng } from "html-to-image"
import { BRAND_NAME, calcSummary, defaultCurrent, formatMoney, SITE_URL, type SalaryData, type Scenario, type Summary, type TaxBracket } from "@/domain"

export function ExportReport({
  scenarios,
  annualBrackets,
  bonusBrackets,
}: {
  scenarios: Scenario[]
  annualBrackets: TaxBracket[]
  bonusBrackets: TaxBracket[]
}) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return
    setExporting(true)
    let clone: HTMLElement | null = null
    try {
      // 克隆到 body 并置为可见，避免 off-screen 元素在某些浏览器里无法被 html-to-image 捕获
      clone = exportRef.current.cloneNode(true) as HTMLElement
      clone.style.position = "fixed"
      clone.style.left = "0"
      clone.style.top = "0"
      clone.style.opacity = "1"
      clone.style.zIndex = "-1"
      clone.style.pointerEvents = "none"
      document.body.appendChild(clone)

      const dataUrl = await toPng(clone, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#050510",
      })

      const link = document.createElement("a")
      link.download = `offer对比_${new Date().toISOString().slice(0, 10)}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Export failed:", err)
      let message = "未知错误"
      if (err instanceof Error) {
        message = err.message
      } else if (err && typeof err === "object" && "type" in err) {
        message = `资源加载失败（${(err as Event).type}），请检查网络或二维码图片路径`
      } else {
        message = String(err)
      }
      alert(`导出失败：${message}`)
    } finally {
      if (clone && clone.parentNode) {
        document.body.removeChild(clone)
      }
      setExporting(false)
    }
  }, [])

  const currentScenario = scenarios.find((s) => s.role === "current") || scenarios[0]
  const compareScenarios = scenarios.filter((s) => s.id !== currentScenario?.id)

  const currentSummary = calcSummary(currentScenario?.data || defaultCurrent(), annualBrackets, bonusBrackets)
  const scenarioSummaries = compareScenarios.map((s) => ({
    ...s,
    summary: calcSummary(s.data, annualBrackets, bonusBrackets),
  }))

  const exportRows = [
    { label: "月Base", key: "monthlyBase", format: "money" },
    { label: "薪数", key: "months", format: "month" },
    { label: "年包总额", key: "annualTotalPackage", format: "money" },
    { label: "税后收入", key: "annualTotalAfterTax", format: "money" },
    { label: "净收入", key: "netIncome", format: "money" },
  ]

  const getValue = (row: typeof exportRows[0], data: SalaryData, summary: Summary) => {
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

  return (
    <div className="space-y-4">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full rounded-lg border border-accent/20 bg-accent/5 py-2.5 text-xs text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
      >
        {exporting ? "导出中..." : "导出对比图为 PNG"}
      </button>

      {/* Hidden export area */}
      <div
        ref={exportRef}
        className="absolute left-[-9999px] top-0 w-[720px] bg-[#050510] p-8"
        style={{ position: "fixed" }}
      >
        <div className="mb-6 text-center">
          <h2 className="text-xl font-medium text-accent neon-cyan">{BRAND_NAME}</h2>
          <p className="mt-1 text-xs text-subtle">待遇对比报告</p>
        </div>

        <div className="mb-6 overflow-hidden rounded-xl border border-accent/15 bg-[#0a0a1a]/80 p-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-accent/10 text-subtle">
                <th className="py-2 text-left">指标</th>
                <th className="px-2 py-2 text-center">{currentScenario?.name ?? "当前岗位"}</th>
                {scenarioSummaries.map((s) => (
                  <th key={s.id} className="px-2 py-2 text-center">{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exportRows.map((row) => {
                const baseValue = getValue(row, currentScenario?.data || defaultCurrent(), currentSummary)
                return (
                  <tr key={row.label} className="border-b border-white/[0.03]">
                    <td className="py-2 text-dim">{row.label}</td>
                    <td className="px-2 py-2 text-center text-foreground">
                      {row.format === "money"
                        ? formatMoney(baseValue)
                        : row.format === "month"
                          ? `${baseValue}薪`
                          : baseValue.toLocaleString()}
                    </td>
                    {scenarioSummaries.map((s) => {
                      const val = getValue(row, s.data, s.summary)
                      return (
                        <td key={s.id} className="px-2 py-2 text-center text-foreground">
                          {row.format === "money"
                            ? formatMoney(val)
                            : row.format === "month"
                              ? `${val}薪`
                              : val.toLocaleString()}
                          <br />
                          <span className="text-[10px] text-subtle">{relPct(baseValue, val)}</span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-accent/15 bg-[#0a0a1a]/80 p-4">
          <div className="text-xs text-subtle">
            <p className="text-foreground">{BRAND_NAME}</p>
            <p>{SITE_URL}</p>
            <p className="mt-1 text-[10px]">数据仅供参考，具体以劳动合同和当地政策为准</p>
          </div>
          <img src="./qr-code.png" alt="二维码" className="h-20 w-20" />
        </div>
      </div>
    </div>
  )
}
