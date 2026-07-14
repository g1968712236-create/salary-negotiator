import React, { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

/* ===================== 常量 ===================== */
const MIN_BASE = 100
const MAX_BASE = 1000000
const MIN_RATE = 5
const MAX_RATE = 12
const MONTHS_RANGE = [12, 13, 14, 15, 16, 17, 18]

/* ===================== 类型 ===================== */
interface SalaryData {
  monthlyBase: number
  months: number
  providentBase: number
  personalRate: number
  companyRate: number
  deduction: number
  equity: string
  signingBonus: string
}

type TabKey = "expected" | "offer" | "diff" | "lookup" | "tax"
type BgMode = "flow" | "rain" | "solid"
type BgColor = "#050510" | "#0a0a1a" | "#111122" | "#1a0a14"

/* ===================== 工具函数 ===================== */
const formatMoney = (n: number) => `¥${n.toLocaleString()}`
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

interface TaxBracket {
  limit: number
  rate: number
  deduction: number
}

const DEFAULT_ANNUAL_TAX_BRACKETS: TaxBracket[] = [
  { limit: 36000, rate: 0.03, deduction: 0 },
  { limit: 144000, rate: 0.1, deduction: 2520 },
  { limit: 300000, rate: 0.2, deduction: 16920 },
  { limit: 420000, rate: 0.25, deduction: 31920 },
  { limit: 660000, rate: 0.3, deduction: 52920 },
  { limit: 960000, rate: 0.35, deduction: 85920 },
  { limit: Infinity, rate: 0.45, deduction: 181920 },
]

const DEFAULT_BONUS_TAX_BRACKETS: TaxBracket[] = [
  { limit: 3000, rate: 0.03, deduction: 0 },
  { limit: 12000, rate: 0.1, deduction: 210 },
  { limit: 25000, rate: 0.2, deduction: 1410 },
  { limit: 35000, rate: 0.25, deduction: 2660 },
  { limit: 55000, rate: 0.3, deduction: 4410 },
  { limit: 80000, rate: 0.35, deduction: 7160 },
  { limit: Infinity, rate: 0.45, deduction: 15160 },
]

function calcAnnualTax(taxableIncome: number, brackets: TaxBracket[]): number {
  if (taxableIncome <= 0) return 0
  const bracket = brackets.find((b) => taxableIncome <= b.limit) || brackets[brackets.length - 1]
  return Math.max(0, taxableIncome * bracket.rate - bracket.deduction)
}

function calcBonusTax(bonus: number, brackets: TaxBracket[]): number {
  if (bonus <= 0) return 0
  const monthlyAvg = bonus / 12
  const bracket = brackets.find((b) => monthlyAvg <= b.limit) || brackets[brackets.length - 1]
  return Math.max(0, bonus * bracket.rate - bracket.deduction)
}

interface Summary {
  annualCash: number
  monthlyPersonal: number
  monthlyCompany: number
  annualProvidentTotal: number
  equityNum: number
  signingNum: number
  annualTotalPackage: number
  monthlyAvg: number
  annualSalaryAfterTax: number
  annualBonusAfterTax: number
  annualTotalAfterTax: number
}

function calcSummary(
  data: SalaryData,
  annualBrackets: TaxBracket[],
  bonusBrackets: TaxBracket[]
): Summary {
  const annualCash = data.monthlyBase * data.months
  const monthlyPersonal = Math.round((data.providentBase * data.personalRate) / 100)
  const monthlyCompany = Math.round((data.providentBase * data.companyRate) / 100)
  const annualProvidentTotal = (monthlyPersonal + monthlyCompany) * 12
  const equityNum = data.equity === "" ? 0 : Number(data.equity)
  const signingNum = data.signingBonus === "" ? 0 : Number(data.signingBonus)
  const annualTotalPackage = annualCash + equityNum + signingNum
  const monthlyAvg = Math.round(annualTotalPackage / 12)

  const annualSalary = data.monthlyBase * 12
  const annualBonus = Math.max(0, annualCash - annualSalary)
  const annualDeduction = data.deduction * 12
  const annualPersonalProvident = monthlyPersonal * 12
  const taxableIncome = Math.max(0, annualSalary - 60000 - annualPersonalProvident - annualDeduction)
  const annualSalaryTax = calcAnnualTax(taxableIncome, annualBrackets)
  const annualSalaryAfterTax = annualSalary - annualSalaryTax
  const annualBonusTax = calcBonusTax(annualBonus, bonusBrackets)
  const annualBonusAfterTax = annualBonus - annualBonusTax
  const annualTotalAfterTax = annualSalaryAfterTax + annualBonusAfterTax + equityNum + signingNum

  return {
    annualCash,
    monthlyPersonal,
    monthlyCompany,
    annualProvidentTotal,
    equityNum,
    signingNum,
    annualTotalPackage,
    monthlyAvg,
    annualSalaryAfterTax,
    annualBonusAfterTax,
    annualTotalAfterTax,
  }
}

const filterNumeric = (value: string) => value.replace(/\D/g, "")
const filterNumber = (value: string) => {
  let seenDot = false
  return value
    .split("")
    .filter((ch) => {
      if (ch === ".") {
        if (seenDot) return false
        seenDot = true
        return true
      }
      return /^\d$/.test(ch)
    })
    .join("")
}

/* ===================== NumericInput ===================== */
const ALLOWED_KEYS = new Set([
  "Backspace",
  "Delete",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Tab",
  "Enter",
  "Escape",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "NumLock",
  "Insert",
  "ContextMenu",
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
])

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string
  onChange: (value: string) => void
  allowDecimal?: boolean
}

function NumericInput({ value, onChange, allowDecimal, className, ...props }: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const filter = allowDecimal ? filterNumber : filterNumeric
  return (
    <Input
      ref={inputRef}
      inputMode={allowDecimal ? "decimal" : "numeric"}
      value={value}
      onKeyDown={(e) => {
        if (e.ctrlKey || e.metaKey) return
        if (ALLOWED_KEYS.has(e.key)) return
        if (/^\d$/.test(e.key)) return
        if (allowDecimal && e.key === ".") return
        e.preventDefault()
      }}
      onPaste={(e) => {
        e.preventDefault()
        const paste = e.clipboardData.getData("text")
        const digits = filter(paste)
        const input = e.currentTarget
        const start = input.selectionStart ?? value.length
        const end = input.selectionEnd ?? value.length
        onChange(value.slice(0, start) + digits + value.slice(end))
      }}
      onChange={(e) => onChange(filter(e.target.value))}
      className={cn("text-right", className)}
      {...props}
    />
  )
}

/* ===================== BaseInputSlider ===================== */
interface BaseInputSliderProps {
  value: number
  onChange: (value: number) => void
  label: string
}

function BaseInputSlider({ value, onChange, label }: BaseInputSliderProps) {
  const [inputValue, setInputValue] = useState(String(value))

  useEffect(() => {
    setInputValue(String(value))
  }, [value])

  const commit = (raw: string) => {
    if (raw === "") {
      setInputValue(String(value))
      return
    }
    const num = clamp(Number(raw), MIN_BASE, MAX_BASE)
    setInputValue(String(num))
    onChange(num)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-dim">{label}</span>
        <NumericInput
          value={inputValue}
          onChange={(v) => {
            setInputValue(v)
            const num = Number(v)
            if (v !== "" && num >= MIN_BASE && num <= MAX_BASE) {
              onChange(num)
            }
          }}
          onBlur={() => commit(inputValue)}
          className="w-28 text-accent"
          placeholder="100"
        />
      </div>
      <div className="text-right text-[10px] text-subtle">
        最小 ¥{MIN_BASE.toLocaleString()}
      </div>
    </div>
  )
}

/* ===================== RateSlider ===================== */
interface RateSliderProps {
  value: number
  onChange: (value: number) => void
  label: string
}

function RateSlider({ value, onChange, label }: RateSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-dim">{label}</span>
        <span className="text-xs text-accent">{value}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={MIN_RATE}
        max={MAX_RATE}
        step={1}
      />
      <div className="flex justify-between text-[10px] text-subtle">
        <span>{MIN_RATE}%</span>
        <span>{MAX_RATE}%</span>
      </div>
    </div>
  )
}

/* ===================== MonthsSelector ===================== */
interface MonthsSelectorProps {
  value: number
  onChange: (value: number) => void
}

function MonthsSelector({ value, onChange }: MonthsSelectorProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs text-dim">薪数</span>
      <div className="flex flex-wrap gap-1.5">
        {MONTHS_RANGE.map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs transition-all",
              value === m ? "month-btn-active" : "month-btn hover:border-accent/15 hover:text-dim"
            )}
          >
            {m}薪
          </button>
        ))}
      </div>
    </div>
  )
}

/* ===================== ProvidentBaseInput ===================== */
interface ProvidentBaseInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  label?: string
}

function ProvidentBaseInput({ value, onChange, placeholder, label }: ProvidentBaseInputProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs text-dim">{label ?? "公积金缴纳基数（元/月）"}</span>
      <NumericInput
        value={value === 0 ? "" : String(value)}
        onChange={(v) => onChange(Number(v))}
        className="text-accent"
        placeholder={placeholder}
      />
    </div>
  )
}

/* ===================== DeductionInput ===================== */
interface DeductionInputProps {
  value: number
  onChange: (value: number) => void
}

function DeductionInput({ value, onChange }: DeductionInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-dim">专项附加扣除（元/月）</span>
        <span className="text-[10px] text-subtle">起征点 5000/月已内置</span>
      </div>
      <NumericInput
        value={value === 0 ? "" : String(value)}
        onChange={(v) => onChange(Number(v))}
        className="text-accent"
        placeholder="0"
      />
    </div>
  )
}

/* ===================== ExtraModules ===================== */
interface ExtraModulesProps {
  equity: string
  onEquityChange: (value: string) => void
  signingBonus: string
  onSigningBonusChange: (value: string) => void
}

function ExtraModules({ equity, onEquityChange, signingBonus, onSigningBonusChange }: ExtraModulesProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-dim">股权/期权激励（元）</span>
          <span className="text-[10px] text-subtle">不填视为0</span>
        </div>
        <NumericInput
          value={equity}
          onChange={onEquityChange}
          className="text-accent-tertiary"
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-dim">签字费（元）</span>
          <span className="text-[10px] text-subtle">不填视为0</span>
        </div>
        <NumericInput
          value={signingBonus}
          onChange={onSigningBonusChange}
          className="text-accent-secondary"
          placeholder="0"
        />
      </div>
    </div>
  )
}

/* ===================== SalarySummary ===================== */
interface SalarySummaryProps {
  data: SalaryData
  label?: string
  annualBrackets: TaxBracket[]
  bonusBrackets: TaxBracket[]
}

function SalarySummary({ data, label, annualBrackets, bonusBrackets }: SalarySummaryProps) {
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
      </div>
    </div>
  )
}

/* ===================== DiffView ===================== */
interface DiffItem {
  label: string
  expected: string
  offer: string
  abs: string
  rel: string
  state: "up" | "down" | "flat"
  highlight?: boolean
}

function DiffView({
  baseline,
  offer,
  title,
  baselineLabel,
  annualBrackets,
  bonusBrackets,
}: {
  baseline: SalaryData
  offer: SalaryData
  title: string
  baselineLabel: string
  annualBrackets: TaxBracket[]
  bonusBrackets: TaxBracket[]
}) {
  const e = useMemo(() => calcSummary(baseline, annualBrackets, bonusBrackets), [baseline, annualBrackets, bonusBrackets])
  const o = useMemo(() => calcSummary(offer, annualBrackets, bonusBrackets), [offer, annualBrackets, bonusBrackets])

  const diff = (a: number, b: number): DiffItem["state"] => {
    if (b > a) return "up"
    if (b < a) return "down"
    return "flat"
  }

  const relPct = (a: number, b: number) => {
    if (a === 0) return b === 0 ? "0%" : "+∞%"
    const p = ((b - a) / a) * 100
    const sign = p > 0 ? "+" : ""
    return `${sign}${p.toFixed(1)}%`
  }

  const items: DiffItem[] = [
    {
      label: "月Base",
      expected: formatMoney(baseline.monthlyBase),
      offer: formatMoney(offer.monthlyBase),
      abs: `${offer.monthlyBase >= baseline.monthlyBase ? "+" : ""}${formatMoney(offer.monthlyBase - baseline.monthlyBase).replace("¥", "")}`,
      rel: relPct(baseline.monthlyBase, offer.monthlyBase),
      state: diff(baseline.monthlyBase, offer.monthlyBase),
    },
    {
      label: "薪数",
      expected: `${baseline.months}薪`,
      offer: `${offer.months}薪`,
      abs: `${offer.months >= baseline.months ? "+" : ""}${offer.months - baseline.months}薪`,
      rel: relPct(baseline.months, offer.months),
      state: diff(baseline.months, offer.months),
    },
    {
      label: "现金年总收入",
      expected: formatMoney(e.annualCash),
      offer: formatMoney(o.annualCash),
      abs: `${o.annualCash >= e.annualCash ? "+" : ""}${formatMoney(o.annualCash - e.annualCash).replace("¥", "")}`,
      rel: relPct(e.annualCash, o.annualCash),
      state: diff(e.annualCash, o.annualCash),
    },
    {
      label: "月公积金(个人)",
      expected: e.monthlyPersonal.toLocaleString(),
      offer: o.monthlyPersonal.toLocaleString(),
      abs: `${o.monthlyPersonal >= e.monthlyPersonal ? "+" : ""}${(o.monthlyPersonal - e.monthlyPersonal).toLocaleString()}`,
      rel: relPct(e.monthlyPersonal, o.monthlyPersonal),
      state: diff(e.monthlyPersonal, o.monthlyPersonal),
    },
    {
      label: "月公积金(公司)",
      expected: e.monthlyCompany.toLocaleString(),
      offer: o.monthlyCompany.toLocaleString(),
      abs: `${o.monthlyCompany >= e.monthlyCompany ? "+" : ""}${(o.monthlyCompany - e.monthlyCompany).toLocaleString()}`,
      rel: relPct(e.monthlyCompany, o.monthlyCompany),
      state: diff(e.monthlyCompany, o.monthlyCompany),
    },
    {
      label: "年公积金总额",
      expected: e.annualProvidentTotal.toLocaleString(),
      offer: o.annualProvidentTotal.toLocaleString(),
      abs: `${o.annualProvidentTotal >= e.annualProvidentTotal ? "+" : ""}${(o.annualProvidentTotal - e.annualProvidentTotal).toLocaleString()}`,
      rel: relPct(e.annualProvidentTotal, o.annualProvidentTotal),
      state: diff(e.annualProvidentTotal, o.annualProvidentTotal),
    },
    {
      label: "股权/期权",
      expected: e.equityNum > 0 ? formatMoney(e.equityNum) : "—",
      offer: o.equityNum > 0 ? formatMoney(o.equityNum) : "—",
      abs: `${o.equityNum >= e.equityNum ? "+" : ""}${formatMoney(o.equityNum - e.equityNum).replace("¥", "")}`,
      rel: relPct(e.equityNum, o.equityNum),
      state: diff(e.equityNum, o.equityNum),
    },
    {
      label: "签字费",
      expected: e.signingNum > 0 ? formatMoney(e.signingNum) : "—",
      offer: o.signingNum > 0 ? formatMoney(o.signingNum) : "—",
      abs: `${o.signingNum >= e.signingNum ? "+" : ""}${formatMoney(o.signingNum - e.signingNum).replace("¥", "")}`,
      rel: relPct(e.signingNum, o.signingNum),
      state: diff(e.signingNum, o.signingNum),
    },
    {
      label: "年包总额",
      expected: formatMoney(e.annualTotalPackage),
      offer: formatMoney(o.annualTotalPackage),
      abs: `${o.annualTotalPackage >= e.annualTotalPackage ? "+" : ""}${formatMoney(o.annualTotalPackage - e.annualTotalPackage).replace("¥", "")}`,
      rel: relPct(e.annualTotalPackage, o.annualTotalPackage),
      state: diff(e.annualTotalPackage, o.annualTotalPackage),
      highlight: true,
    },
  ]

  const stateClass = (state: DiffItem["state"]) => {
    if (state === "up") return "text-danger neon-red"
    if (state === "down") return "text-success neon-green"
    return "text-subtle"
  }

  return (
    <div className="cyber-panel p-4">
      <div className="mb-3 text-xs text-dim">{title}</div>
      <div className="min-w-[560px]">
        <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-2 border-b border-accent/10 pb-2 text-[10px] text-subtle">
          <span>项目</span>
          <span className="text-center">{baselineLabel}</span>
          <span className="text-center">Offer</span>
          <span className="text-center">绝对差</span>
          <span className="text-center">相对差</span>
        </div>
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-2 rounded px-1 py-2 text-xs",
              item.highlight ? "bg-accent/[0.03]" : "even:bg-accent/[0.02]"
            )}
          >
            <span className={cn(item.highlight ? "text-accent" : "text-dim")}>{item.label}</span>
            <span className="text-center text-dim">{item.expected}</span>
            <span className={cn("text-center", item.highlight ? "text-foreground" : "text-foreground")}>
              {item.offer}
            </span>
            <span className={cn("text-center", stateClass(item.state))}>{item.abs}</span>
            <span className={cn("text-center", stateClass(item.state))}>{item.rel}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-[10px] text-subtle">
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

/* ===================== SalaryTable ===================== */
function SalaryTable() {
  const [minBaseInput, setMinBaseInput] = useState(String(MIN_BASE))
  const [maxBaseInput, setMaxBaseInput] = useState("40000")
  const [minBaseCommitted, setMinBaseCommitted] = useState(MIN_BASE)
  const [maxBaseCommitted, setMaxBaseCommitted] = useState(40000)

  const commitMin = (raw: string) => {
    if (raw === "") {
      setMinBaseInput(String(minBaseCommitted))
      return
    }
    const num = Math.max(0, Math.min(Number(raw), maxBaseCommitted))
    setMinBaseCommitted(num)
    setMinBaseInput(String(num))
  }

  const commitMax = (raw: string) => {
    if (raw === "") {
      setMaxBaseInput(String(maxBaseCommitted))
      return
    }
    const num = Math.max(minBaseCommitted, Math.min(Number(raw), 10000000))
    setMaxBaseCommitted(num)
    setMaxBaseInput(String(num))
  }

  const minBase = Math.min(minBaseCommitted, maxBaseCommitted)
  const maxBase = Math.max(minBaseCommitted, maxBaseCommitted)

  const bases = useMemo(() => {
    const arr: number[] = []
    for (let b = minBase; b <= maxBase && arr.length < 200; b += 1000) arr.push(b)
    return arr
  }, [minBase, maxBase])

  return (
    <div className="cyber-panel space-y-4 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-xs text-dim">最低月Base</span>
          <NumericInput
            value={minBaseInput}
            onChange={(v) => {
              setMinBaseInput(v)
              if (v !== "") {
                setMinBaseCommitted(Math.max(0, Math.min(Number(v), maxBaseCommitted)))
              }
            }}
            onBlur={() => commitMin(minBaseInput)}
            className="text-accent"
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-dim">最高月Base</span>
          <NumericInput
            value={maxBaseInput}
            onChange={(v) => {
              setMaxBaseInput(v)
              if (v !== "") {
                setMaxBaseCommitted(Math.max(minBaseCommitted, Math.min(Number(v), 10000000)))
              }
            }}
            onBlur={() => commitMax(maxBaseInput)}
            className="text-accent"
            placeholder="40000"
          />
        </div>
      </div>
      <div className="text-xs text-dim">
        月Base ¥{minBase.toLocaleString()} ~ ¥{maxBase.toLocaleString()}（步进1000）x 12~18薪
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">月Base \\ 薪数</TableHead>
            {MONTHS_RANGE.map((m) => (
              <TableHead key={m}>{m}薪</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bases.map((b) => (
            <TableRow key={b}>
              <TableCell className="text-left font-medium text-dim">
                ¥{b.toLocaleString()}
              </TableCell>
              {MONTHS_RANGE.map((m) => {
                const val = b * m
                const isHigh = m >= 16
                const isLow = m === 12
                return (
                  <TableCell
                    key={m}
                    className={cn(
                      "whitespace-nowrap",
                      isHigh ? "text-success neon-green" : isLow ? "text-subtle" : "text-dim"
                    )}
                  >
                    {formatMoney(val)}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-[10px] text-subtle">
        <span className="text-success">绿色</span> = 16薪及以上 &nbsp;&nbsp;
        <span className="text-subtle">灰色</span> = 12薪
      </p>
    </div>
  )
}

/* ===================== TaxBracketsEditor ===================== */
interface TaxBracketsEditorProps {
  title: string
  brackets: TaxBracket[]
  onChange: (brackets: TaxBracket[]) => void
  onReset: () => void
  rateUnit?: string
}

function TaxBracketsEditor({ title, brackets, onChange, onReset, rateUnit = "%" }: TaxBracketsEditorProps) {
  const update = (index: number, field: keyof TaxBracket, value: number) => {
    const next = brackets.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    onChange(next)
  }

  return (
    <div className="cyber-panel space-y-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-accent">{title}</span>
        <button
          onClick={onReset}
          className="rounded-md border border-accent/20 px-2 py-1 text-[10px] text-accent transition-colors hover:bg-accent/10"
        >
          恢复默认
        </button>
      </div>
      <div className="min-w-[400px]">
        <div className="grid grid-cols-[1fr_2fr_2fr_2fr] gap-2 border-b border-accent/10 pb-2 text-[10px] text-subtle">
          <span>级数</span>
          <span className="text-center">收入上限</span>
          <span className="text-center">税率 ({rateUnit})</span>
          <span className="text-center">速算扣除数</span>
        </div>
        {brackets.map((b, i) => (
          <div key={i} className="grid grid-cols-[1fr_2fr_2fr_2fr] gap-2 py-1 text-xs">
            <span className="text-dim">{i + 1}</span>
            <div className="text-center">
              {b.limit === Infinity ? (
                <span className="text-dim">以上</span>
              ) : (
                <NumericInput
                  value={String(b.limit)}
                  onChange={(v) => update(i, "limit", Number(v || 0))}
                  className="h-6 text-accent"
                />
              )}
            </div>
            <NumericInput
              value={String(Math.round(b.rate * 10000) / 100)}
              onChange={(v) => update(i, "rate", Number(v || 0) / 100)}
              allowDecimal
              className="h-6 text-accent"
            />
            <NumericInput
              value={String(b.deduction)}
              onChange={(v) => update(i, "deduction", Number(v || 0))}
              className="h-6 text-accent"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function TaxBracketsTab({
  annualBrackets,
  onAnnualChange,
  bonusBrackets,
  onBonusChange,
}: {
  annualBrackets: TaxBracket[]
  onAnnualChange: (brackets: TaxBracket[]) => void
  bonusBrackets: TaxBracket[]
  onBonusChange: (brackets: TaxBracket[]) => void
}) {
  return (
    <div className="animate-in space-y-4">
      <TaxBracketsEditor
        title="工资薪金综合所得 · 年度税率表"
        brackets={annualBrackets}
        onChange={onAnnualChange}
        onReset={() => onAnnualChange(DEFAULT_ANNUAL_TAX_BRACKETS.map((b) => ({ ...b })))}
      />
      <TaxBracketsEditor
        title="年终奖单独计税 · 月度税率表"
        brackets={bonusBrackets}
        onChange={onBonusChange}
        onReset={() => onBonusChange(DEFAULT_BONUS_TAX_BRACKETS.map((b) => ({ ...b })))}
      />
      <div className="text-[10px] text-subtle">
        修改税率表后，当前、期望、Offer 的税后收入会实时重算。恢复默认可回到中国个人所得税现行税率。
      </div>
    </div>
  )
}

/* ===================== 背景组件 ===================== */
function FlowField({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("webgl")
    if (!ctx) return
    const gl = ctx

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener("resize", resize)

    const vs = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `
    const fs = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 mouse = u_mouse / u_resolution.xy;
        float n = snoise(vec3(uv * 2.5, u_time * 0.12));
        float n2 = snoise(vec3(uv * 5.0 + mouse, u_time * 0.2));
        vec3 c1 = vec3(0.02, 0.02, 0.06);
        vec3 c2 = vec3(0.0, 0.55, 0.65);
        vec3 c3 = vec3(0.72, 0.16, 0.87);
        vec3 col = mix(c1, c2, smoothstep(-0.5, 1.0, n));
        col = mix(col, c3, smoothstep(0.3, 0.9, n2) * 0.25);
        gl_FragColor = vec4(col, 1.0);
      }
    `

    function createShader(type: number, source: string) {
      const s = gl.createShader(type)!
      gl.shaderSource(s, source)
      gl.compileShader(s)
      return s
    }
    function createProgram(vsSrc: string, fsSrc: string) {
      const p = gl.createProgram()!
      gl.attachShader(p, createShader(gl.VERTEX_SHADER, vsSrc))
      gl.attachShader(p, createShader(gl.FRAGMENT_SHADER, fsSrc))
      gl.linkProgram(p)
      return p
    }

    const program = createProgram(vs, fs)
    const positionLoc = gl.getAttribLocation(program, "position")
    const resolutionLoc = gl.getUniformLocation(program, "u_resolution")
    const timeLoc = gl.getUniformLocation(program, "u_time")
    const mouseLoc = gl.getUniformLocation(program, "u_mouse")

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )

    const mouse = { x: canvas.width / 2, y: canvas.height / 2 }
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = canvas.height - e.clientY
    }
    window.addEventListener("mousemove", onMove)

    let raf = 0
    const start = performance.now()
    const render = () => {
      const time = (performance.now() - start) / 1000
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(positionLoc)
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height)
      gl.uniform1f(timeLoc, time)
      gl.uniform2f(mouseLoc, mouse.x, mouse.y)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      raf = requestAnimationFrame(render)
    }
    render()

    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", onMove)
      cancelAnimationFrame(raf)
    }
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{ opacity: active ? 1 : 0 }}
    />
  )
}

function RainOnGlass({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    interface Drop {
      x: number
      y: number
      r: number
      speed: number
      len: number
    }
    const drops: Drop[] = []
    for (let i = 0; i < 80; i++) {
      drops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 4 + 2,
        len: Math.random() * 15 + 5,
      })
    }

    let raf = 0
    const draw = () => {
      ctx.fillStyle = "rgba(5, 5, 16, 0.35)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = "rgba(136, 153, 170, 0.25)"
      ctx.lineWidth = 1
      for (const d of drops) {
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x, d.y + d.len)
        ctx.stroke()
        d.y += d.speed
        if (d.y > canvas.height) {
          d.y = -d.len
          d.x = Math.random() * canvas.width
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(raf)
    }
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{ opacity: active ? 1 : 0 }}
    />
  )
}

function SolidBg({ color }: { color: BgColor }) {
  return (
    <div
      className="fixed inset-0 -z-10 h-full w-full transition-colors duration-500"
      style={{ backgroundColor: color }}
    />
  )
}

function Background({ mode, color }: { mode: BgMode; color: BgColor }) {
  return (
    <>
      <FlowField active={mode === "flow"} />
      <RainOnGlass active={mode === "rain"} />
      {mode === "solid" && <SolidBg color={color} />}
    </>
  )
}

/* ===================== App ===================== */
const BG_MODES: { key: BgMode; label: string }[] = [
  { key: "flow", label: "丝绸流场" },
  { key: "rain", label: "雨落寒窗" },
  { key: "solid", label: "纯色" },
]

const BG_COLORS: { key: BgColor; label: string }[] = [
  { key: "#050510", label: "深空" },
  { key: "#0a0a1a", label: "暗夜" },
  { key: "#111122", label: "靛蓝" },
  { key: "#1a0a14", label: "暮紫" },
]

function createSalaryData(
  monthlyBase: number,
  months: number,
  providentBase: number,
  personalRate: number,
  companyRate: number,
  deduction: number,
  equity = "",
  signingBonus = ""
): SalaryData {
  return {
    monthlyBase,
    months,
    providentBase: providentBase <= 0 ? monthlyBase : providentBase,
    personalRate,
    companyRate,
    deduction,
    equity,
    signingBonus,
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("expected")
  const [bgMode, setBgMode] = useState<BgMode>("flow")
  const [bgColor, setBgColor] = useState<BgColor>("#050510")

  /* 在职待遇 */
  const [currentBase, setCurrentBase] = useState(30000)
  const [currentMonths, setCurrentMonths] = useState(14)
  const [currentProvidentBase, setCurrentProvidentBase] = useState(25000)
  const [currentPersonalRate, setCurrentPersonalRate] = useState(12)
  const [currentCompanyRate, setCurrentCompanyRate] = useState(12)
  const [currentDeduction, setCurrentDeduction] = useState(0)
  const [currentEquity, setCurrentEquity] = useState("")
  const [currentSigning, setCurrentSigning] = useState("")

  /* 期望 */
  const [increaseInput, setIncreaseInput] = useState("20.00")
  const [increaseCommitted, setIncreaseCommitted] = useState(20)
  const increaseDisplay = increaseCommitted.toFixed(2)
  const [expectedBase, setExpectedBase] = useState(30000)
  const [expectedMonths, setExpectedMonths] = useState(14)
  const [expectedProvidentBase, setExpectedProvidentBase] = useState(0)
  const [expectedPersonalRate, setExpectedPersonalRate] = useState(12)
  const [expectedCompanyRate, setExpectedCompanyRate] = useState(12)
  const [expectedDeduction, setExpectedDeduction] = useState(0)
  const [expectedEquity, setExpectedEquity] = useState("")
  const [expectedSigning, setExpectedSigning] = useState("")

  /* Offer */
  const [offerBase, setOfferBase] = useState(35000)
  const [offerMonths, setOfferMonths] = useState(15)
  const [offerProvidentBase, setOfferProvidentBase] = useState(0)
  const [offerPersonalRate, setOfferPersonalRate] = useState(12)
  const [offerCompanyRate, setOfferCompanyRate] = useState(12)
  const [offerDeduction, setOfferDeduction] = useState(0)
  const [offerEquity, setOfferEquity] = useState("")
  const [offerSigning, setOfferSigning] = useState("")

  /* 税率表 */
  const [annualTaxBrackets, setAnnualTaxBrackets] = useState<TaxBracket[]>(DEFAULT_ANNUAL_TAX_BRACKETS)
  const [bonusTaxBrackets, setBonusTaxBrackets] = useState<TaxBracket[]>(DEFAULT_BONUS_TAX_BRACKETS)

  /* localStorage 背景偏好 */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("salary-negotiator-bg")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.mode) setBgMode(parsed.mode)
        if (parsed.color) setBgColor(parsed.color)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("salary-negotiator-bg", JSON.stringify({ mode: bgMode, color: bgColor }))
  }, [bgMode, bgColor])

  /* 期望年包计算 */
  const currentData = useMemo(
    () =>
      createSalaryData(
        currentBase,
        currentMonths,
        currentProvidentBase,
        currentPersonalRate,
        currentCompanyRate,
        currentDeduction,
        currentEquity,
        currentSigning
      ),
    [currentBase, currentMonths, currentProvidentBase, currentPersonalRate, currentCompanyRate, currentDeduction, currentEquity, currentSigning]
  )
  const currentSummary = useMemo(() => calcSummary(currentData, annualTaxBrackets, bonusTaxBrackets), [currentData, annualTaxBrackets, bonusTaxBrackets])

  const expectedAnnualPackage = useMemo(() => {
    return Math.round(currentSummary.annualTotalPackage * (1 + increaseCommitted / 100))
  }, [currentSummary.annualTotalPackage, increaseCommitted])

  const expectedData = useMemo(
    () =>
      createSalaryData(
        expectedBase,
        expectedMonths,
        expectedProvidentBase,
        expectedPersonalRate,
        expectedCompanyRate,
        expectedDeduction,
        expectedEquity,
        expectedSigning
      ),
    [
      expectedBase,
      expectedMonths,
      expectedProvidentBase,
      expectedPersonalRate,
      expectedCompanyRate,
      expectedDeduction,
      expectedEquity,
      expectedSigning,
    ]
  )

  const offerData = useMemo(
    () =>
      createSalaryData(
        offerBase,
        offerMonths,
        offerProvidentBase,
        offerPersonalRate,
        offerCompanyRate,
        offerDeduction,
        offerEquity,
        offerSigning
      ),
    [offerBase, offerMonths, offerProvidentBase, offerPersonalRate, offerCompanyRate, offerDeduction, offerEquity, offerSigning]
  )

  /* 当在职待遇或涨幅变化时，反推期望月Base */
  useEffect(() => {
    const equityNum = expectedEquity === "" ? 0 : Number(expectedEquity)
    const signingNum = expectedSigning === "" ? 0 : Number(expectedSigning)
    const base = expectedMonths > 0
      ? Math.round((expectedAnnualPackage - equityNum - signingNum) / expectedMonths)
      : 0
    setExpectedBase(clamp(base, MIN_BASE, MAX_BASE))
  }, [expectedAnnualPackage, expectedMonths, expectedEquity, expectedSigning])

  const tabs: { key: TabKey; label: string }[] = [
    { key: "expected", label: "期望方案" },
    { key: "offer", label: "Offer汇总" },
    { key: "diff", label: "对比分析" },
    { key: "lookup", label: "年包速查" },
    { key: "tax", label: "税率表" },
  ]

  const tabContent = () => {
    switch (activeTab) {
      case "expected":
        return (
          <div className="animate-in space-y-4">
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
                    const num = Number(v)
                    if (v === "" || (num >= 0 && num <= 100)) {
                      setIncreaseInput(v)
                      if (v !== "") {
                        setIncreaseCommitted(num)
                      }
                    }
                  }}
                  onBlur={() => {
                    const num = Number(increaseInput)
                    if (Number.isFinite(num)) {
                      const committed = Math.max(0, Math.min(100, num))
                      setIncreaseCommitted(committed)
                      setIncreaseInput(committed.toFixed(2))
                    }
                  }}
                  allowDecimal
                  className="w-20 text-accent"
                />
              </div>
              <Slider
                value={[increaseCommitted]}
                onValueChange={(v) => {
                  const num = v[0]
                  setIncreaseCommitted(num)
                  setIncreaseInput(num.toFixed(2))
                }}
                min={0}
                max={100}
                step={1}
              />
              <div className="mt-1 flex justify-between text-[10px] text-subtle">
                <span>0%</span>
                <span>{increaseDisplay}%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="cyber-panel space-y-4 p-4">
                <h3 className="text-xs font-medium text-dim">最近在职岗位待遇</h3>
                <BaseInputSlider
                  value={currentBase}
                  onChange={setCurrentBase}
                  label="月Base（元/月）"
                />
                <MonthsSelector value={currentMonths} onChange={setCurrentMonths} />
                <ProvidentBaseInput
                  value={currentProvidentBase}
                  onChange={setCurrentProvidentBase}
                  placeholder={String(currentBase)}
                />
                <RateSlider
                  value={currentPersonalRate}
                  onChange={setCurrentPersonalRate}
                  label="个人缴纳比例"
                />
                <RateSlider
                  value={currentCompanyRate}
                  onChange={setCurrentCompanyRate}
                  label="公司缴纳比例"
                />
                <DeductionInput value={currentDeduction} onChange={setCurrentDeduction} />
                <ExtraModules
                  equity={currentEquity}
                  onEquityChange={setCurrentEquity}
                  signingBonus={currentSigning}
                  onSigningBonusChange={setCurrentSigning}
                />
                <SalarySummary data={currentData} annualBrackets={annualTaxBrackets} bonusBrackets={bonusTaxBrackets} />
              </div>

              <div className="cyber-panel space-y-4 p-4">
                <h3 className="text-xs font-medium text-accent">期望年包</h3>
                <BaseInputSlider
                  value={expectedBase}
                  onChange={(v) => {
                    if (currentSummary.annualTotalPackage > 0) {
                      const newAnnual = v * expectedMonths + Number(expectedEquity || 0) + Number(expectedSigning || 0)
                      const pct = ((newAnnual / currentSummary.annualTotalPackage) - 1) * 100
                      setIncreaseCommitted(pct)
                      setIncreaseInput(pct.toFixed(2))
                    }
                  }}
                  label="期望月Base（元/月）"
                />
                <MonthsSelector value={expectedMonths} onChange={setExpectedMonths} />
                <ProvidentBaseInput
                  value={expectedProvidentBase}
                  onChange={setExpectedProvidentBase}
                  placeholder={String(expectedBase)}
                />
                <RateSlider
                  value={expectedPersonalRate}
                  onChange={setExpectedPersonalRate}
                  label="个人缴纳比例"
                />
                <RateSlider
                  value={expectedCompanyRate}
                  onChange={setExpectedCompanyRate}
                  label="公司缴纳比例"
                />
                <DeductionInput value={expectedDeduction} onChange={setExpectedDeduction} />
                <ExtraModules
                  equity={expectedEquity}
                  onEquityChange={setExpectedEquity}
                  signingBonus={expectedSigning}
                  onSigningBonusChange={setExpectedSigning}
                />
                <SalarySummary data={expectedData} label="期望年包汇总" annualBrackets={annualTaxBrackets} bonusBrackets={bonusTaxBrackets} />
              </div>
            </div>
          </div>
        )
      case "offer":
        return (
          <div className="animate-in space-y-4">
            <div className="cyber-panel space-y-4 p-4">
              <h3 className="text-xs font-medium text-accent">Offer 待遇汇总</h3>
              <BaseInputSlider value={offerBase} onChange={setOfferBase} label="月Base（元/月）" />
              <MonthsSelector value={offerMonths} onChange={setOfferMonths} />
              <ProvidentBaseInput
                value={offerProvidentBase}
                onChange={setOfferProvidentBase}
                placeholder={String(offerBase)}
              />
              <RateSlider value={offerPersonalRate} onChange={setOfferPersonalRate} label="个人缴纳比例" />
              <RateSlider value={offerCompanyRate} onChange={setOfferCompanyRate} label="公司缴纳比例" />
              <DeductionInput value={offerDeduction} onChange={setOfferDeduction} />
              <ExtraModules
                equity={offerEquity}
                onEquityChange={setOfferEquity}
                signingBonus={offerSigning}
                onSigningBonusChange={setOfferSigning}
              />
              <SalarySummary data={offerData} label="Offer 年包汇总" annualBrackets={annualTaxBrackets} bonusBrackets={bonusTaxBrackets} />
            </div>
          </div>
        )
      case "diff":
        return (
          <div className="animate-in space-y-4">
            <DiffView
              title="当前岗位 vs Offer 逐项对比"
              baselineLabel="当前"
              baseline={currentData}
              offer={offerData}
              annualBrackets={annualTaxBrackets}
              bonusBrackets={bonusTaxBrackets}
            />
            <DiffView
              title="期望 vs Offer 逐项对比"
              baselineLabel="期望"
              baseline={expectedData}
              offer={offerData}
              annualBrackets={annualTaxBrackets}
              bonusBrackets={bonusTaxBrackets}
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
              annualBrackets={annualTaxBrackets}
              onAnnualChange={setAnnualTaxBrackets}
              bonusBrackets={bonusTaxBrackets}
              onBonusChange={setBonusTaxBrackets}
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
          <span className="text-xs font-medium tracking-widest text-accent">谈薪助手</span>
        </div>
        <button
          onClick={() => {
            const idx = BG_MODES.findIndex((m) => m.key === bgMode)
            const next = BG_MODES[(idx + 1) % BG_MODES.length]
            setBgMode(next.key)
          }}
          className="text-subtle transition-colors hover:text-dim"
          title="切换背景"
        >
          ◑
        </button>
      </header>

      <main className="mx-auto max-w-[1152px] px-4 pb-24 pt-6 sm:px-6">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-medium text-accent neon-cyan">谈薪薪资计算器</h1>
          <p className="mt-1 text-xs text-subtle">快速对比不同 Base、薪数与公积金方案</p>
        </div>

        <nav className="mb-6 flex gap-1 rounded-xl border border-accent/10 bg-base-2/80 p-1 backdrop-blur-sm">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-xs transition-all",
                activeTab === t.key
                  ? "tab-active"
                  : "text-subtle hover:bg-accent/[0.02] hover:text-dim"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <section>{tabContent()}</section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-accent/10 bg-base/85 px-4 py-2 text-center text-[10px] text-subtle backdrop-blur-md">
        <div className="mx-auto flex max-w-[1152px] flex-col items-center justify-between gap-2 sm:flex-row">
          <span>谈薪助手 · 数据仅供参考，具体以劳动合同和当地政策为准</span>
          {bgMode === "solid" && (
            <div className="flex items-center gap-2">
              <span>背景色：</span>
              {BG_COLORS.map((c) => (
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
