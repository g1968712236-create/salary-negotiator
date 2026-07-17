import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { calcSummary, formatMoney, type SalaryData, type TaxBracket } from "@/domain"

interface SalarySummaryProps {
  data: SalaryData
  label?: string
  annualBrackets: TaxBracket[]
  bonusBrackets: TaxBracket[]
}

export function SalarySummary({ data, label, annualBrackets, bonusBrackets }: SalarySummaryProps) {
  const s = useMemo(() => calcSummary(data, annualBrackets, bonusBrackets), [data, annualBrackets, bonusBrackets])
  return (
    <div className="space-y-3">
      {label && <h4 className="text-xs font-medium text-accent">{label}</h4>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="cyber-panel p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-subtle">现金年总收入</div>
          <div className="mt-1 text-sm text-foreground">{formatMoney(s.annualCash)}</div>
          <div className="mt-0.5 text-[9px] text-subtle">
            ¥{data.monthlyBase.toLocaleString()} x {data.months}薪
          </div>
        </div>
        <div className="cyber-panel p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-subtle">月公积金(个人)</div>
          <div className="mt-1 text-sm text-foreground">{s.monthlyPersonal.toLocaleString()}</div>
          <div className="mt-0.5 text-[9px] text-subtle">{data.personalRate}%</div>
        </div>
        <div className="cyber-panel p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-subtle">月公积金(公司)</div>
          <div className="mt-1 text-sm text-success">{s.monthlyCompany.toLocaleString()}</div>
          <div className="mt-0.5 text-[9px] text-subtle">{data.companyRate}%</div>
        </div>
        <div className="cyber-panel p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-subtle">年公积金总额</div>
          <div className="mt-1 text-sm text-foreground">{formatMoney(s.annualProvidentTotal)}</div>
          <div className="mt-0.5 text-[9px] text-subtle">月总额 x 12</div>
        </div>
        {data.socialInsurance.enabled && (
          <>
            <div className="cyber-panel p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-subtle">月社保(个人)</div>
              <div className="mt-1 text-sm text-foreground">{s.monthlySocialPersonal.toLocaleString()}</div>
              <div className="mt-0.5 text-[9px] text-subtle">{data.socialInsurance.city ?? "自定义"}</div>
            </div>
            <div className="cyber-panel p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-subtle">月社保(公司)</div>
              <div className="mt-1 text-sm text-success">{s.monthlySocialCompany.toLocaleString()}</div>
              <div className="mt-0.5 text-[9px] text-subtle">{data.socialInsurance.city ?? "自定义"}</div>
            </div>
            <div className="cyber-panel p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-subtle">年社保个人</div>
              <div className="mt-1 text-sm text-foreground">{formatMoney(s.annualSocialPersonal)}</div>
              <div className="mt-0.5 text-[9px] text-subtle">税前扣除</div>
            </div>
          </>
        )}
        <div className="cyber-panel p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-subtle">股权/期权激励</div>
          <div className={cn("mt-1 text-sm", s.equityNum > 0 ? "text-accent-tertiary" : "text-subtle")}>
            {s.equityNum > 0 ? formatMoney(s.equityNum) : "—"}
          </div>
          <div className="mt-0.5 text-[9px] text-subtle">
            {s.equityNum > 0 ? "已填写" : "未填写"}
          </div>
        </div>
        <div className="cyber-panel p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-subtle">签字费</div>
          <div className={cn("mt-1 text-sm", s.signingNum > 0 ? "text-accent-secondary" : "text-subtle")}>
            {s.signingNum > 0 ? formatMoney(s.signingNum) : "—"}
          </div>
          <div className="mt-0.5 text-[9px] text-subtle">
            {s.signingNum > 0 ? "已填写" : "未填写"}
          </div>
        </div>
        <div className="cyber-panel col-span-2 border-glow bg-black/60 p-3 sm:col-span-3">
          <div className="text-[9px] uppercase tracking-wider text-accent">年包总额</div>
          <div
            className="mt-1 text-lg font-bold text-accent"
            style={{
              textShadow:
                "0 0 8px rgba(0,240,255,0.9), 0 0 16px rgba(0,240,255,0.6), 0 0 28px rgba(0,240,255,0.3)",
            }}
          >
            {formatMoney(s.annualTotalPackage)}
          </div>
          <div
            className="mt-0.5 text-[10px] text-dim"
            style={{
              textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            }}
          >
            现金{formatMoney(s.annualCash)}
            {s.equityNum > 0 ? ` + 股权${formatMoney(s.equityNum)}` : ""}
            {s.signingNum > 0 ? ` + 签字费${formatMoney(s.signingNum)}` : ""}
            {" "}= 月均 {formatMoney(s.monthlyAvg)}
          </div>
        </div>
        <div className="cyber-panel col-span-2 p-3 sm:col-span-3">
          <div className="text-[9px] uppercase tracking-wider text-success">税后收入合计（工资+年终单独计税）</div>
          <div className="mt-1 text-lg font-bold text-success neon-green">
            {formatMoney(s.annualTotalAfterTax)}
          </div>
          <div className="mt-0.5 text-[10px] text-dim">
            税后工资{formatMoney(s.annualSalaryAfterTax)} + 税后年终{formatMoney(s.annualBonusAfterTax)}
            {s.equityNum > 0 ? ` + 股权${formatMoney(s.equityNum)}` : ""}
            {s.signingNum > 0 ? ` + 签字费${formatMoney(s.signingNum)}` : ""}
          </div>
        </div>
        <div className="cyber-panel p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-subtle">固定支出（年）</div>
          <div className="mt-1 text-sm text-dim">{formatMoney(s.annualExpense)}</div>
          <div className="mt-0.5 text-[9px] text-subtle">{data.monthlyExpense ? `${data.monthlyExpense.toLocaleString()}/月 x 12` : "未填写"}</div>
        </div>
        <div className="cyber-panel col-span-2 border-glow bg-black/60 p-3 sm:col-span-2">
          <div className="text-[9px] uppercase tracking-wider text-accent">净收入</div>
          <div className="mt-1 text-lg font-bold text-accent neon-cyan">{formatMoney(s.netIncome)}</div>
          <div className="mt-0.5 text-[10px] text-dim">税后收入 - 固定支出</div>
        </div>
      </div>
    </div>
  )
}
