import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
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
import { toPng } from "html-to-image"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

/* ===================== 常量 ===================== */
const MIN_BASE = 100
const MAX_BASE = 1000000
const MIN_RATE = 5
const MAX_RATE = 12
const MONTHS_RANGE = [12, 13, 14, 15, 16, 17, 18]
const STORAGE_KEY = "salary-negotiator-v3"
const LEGACY_STORAGE_KEY = "salary-negotiator-v2"
const SITE_URL = "https://g1968712236-create.github.io/salary-negotiator/"
const BRAND_NAME = "Offer薪资速算器"

/* ===================== 类型 ===================== */
interface SocialInsurance {
  enabled: boolean
  city?: string
  base: number
  baseManuallySet?: boolean
  pension: { company: number; personal: number }
  medical: { company: number; personal: number }
  unemployment: { company: number; personal: number }
  injury: { company: number; personal: number }
}

interface SalaryData {
  monthlyBase: number
  months: number
  providentBase: number
  personalRate: number
  companyRate: number
  deduction: number
  monthlyExpense: number
  equity: string
  signingBonus: string
  socialInsurance: SocialInsurance
}

interface SavedOffer {
  id: string
  name: string
  data: SalaryData
}

interface Scenario {
  id: string
  name: string
  data: SalaryData
  role: "current" | "expected" | "offer"
}

interface TaxBracket {
  limit: number
  rate: number
  deduction: number
}

type TabKey = "scenario" | "diff" | "lookup" | "tax"
type BgMode = "flow" | "rain" | "solid"
type BgColor = "#050510" | "#0a0a1a" | "#111122" | "#1a0a14"

interface CitySocialInsurancePreset {
  name: string
  minBase: number
  maxBase: number
  pension: { company: number; personal: number }
  medical: { company: number; personal: number }
  unemployment: { company: number; personal: number }
  injury: { company: number; personal: number }
}

/* ===================== 社保预设（2025.7 - 2026.6 公开口径，仅供参考） ===================== */
const CITY_PRESETS: Record<string, CitySocialInsurancePreset> = {
  beijing: {
    name: "北京",
    minBase: 7162,
    maxBase: 35811,
    pension: { company: 16, personal: 8 },
    medical: { company: 9.8, personal: 2 },
    unemployment: { company: 0.5, personal: 0.5 },
    injury: { company: 0.2, personal: 0 },
  },
  shanghai: {
    name: "上海",
    minBase: 7460,
    maxBase: 37302,
    pension: { company: 16, personal: 8 },
    medical: { company: 10, personal: 2 },
    unemployment: { company: 0.5, personal: 0.5 },
    injury: { company: 0.2, personal: 0 },
  },
  guangzhou: {
    name: "广州",
    minBase: 5500,
    maxBase: 27549,
    pension: { company: 16, personal: 8 },
    medical: { company: 6, personal: 2 },
    unemployment: { company: 0.8, personal: 0.2 },
    injury: { company: 0.2, personal: 0 },
  },
  shenzhen: {
    name: "深圳",
    minBase: 4492,
    maxBase: 27549,
    pension: { company: 16, personal: 8 },
    medical: { company: 6, personal: 2 },
    unemployment: { company: 0.7, personal: 0.3 },
    injury: { company: 0.2, personal: 0 },
  },
  hangzhou: {
    name: "杭州",
    minBase: 4812,
    maxBase: 24930,
    pension: { company: 14, personal: 8 },
    medical: { company: 9.5, personal: 2 },
    unemployment: { company: 0.5, personal: 0.5 },
    injury: { company: 0.2, personal: 0 },
  },
}

/* ===================== 工具函数 ===================== */
const formatMoney = (n: number) => `¥${n.toLocaleString()}`
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const uid = () => Math.random().toString(36).slice(2, 10)

const DEFAULT_SOCIAL_INSURANCE: SocialInsurance = {
  enabled: false,
  city: undefined,
  base: 0,
  baseManuallySet: false,
  pension: { company: 16, personal: 8 },
  medical: { company: 10, personal: 2 },
  unemployment: { company: 0.5, personal: 0.5 },
  injury: { company: 0.2, personal: 0 },
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
  annualExpense: number
  netIncome: number
  monthlySocialPersonal: number
  monthlySocialCompany: number
  annualSocialPersonal: number
  annualSocialCompany: number
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

  // 社保
  const si = data.socialInsurance
  let monthlySocialPersonal = 0
  let monthlySocialCompany = 0
  if (si.enabled && si.base > 0) {
    monthlySocialPersonal = Math.round(
      (si.base * (si.pension.personal + si.medical.personal + si.unemployment.personal + si.injury.personal)) / 100
    )
    monthlySocialCompany = Math.round(
      (si.base * (si.pension.company + si.medical.company + si.unemployment.company + si.injury.company)) / 100
    )
  }
  const annualSocialPersonal = monthlySocialPersonal * 12
  const annualSocialCompany = monthlySocialCompany * 12

  // 个税
  const annualSalary = data.monthlyBase * 12
  const annualBonus = Math.max(0, annualCash - annualSalary)
  const annualDeduction = data.deduction * 12
  const annualPersonalProvident = monthlyPersonal * 12
  const taxableIncome = Math.max(
    0,
    annualSalary - 60000 - annualPersonalProvident - annualSocialPersonal - annualDeduction
  )
  const annualSalaryTax = calcAnnualTax(taxableIncome, annualBrackets)
  const annualSalaryAfterTax = annualSalary - annualSalaryTax - annualSocialPersonal
  const annualBonusTax = calcBonusTax(annualBonus, bonusBrackets)
  const annualBonusAfterTax = annualBonus - annualBonusTax
  const annualTotalAfterTax = annualSalaryAfterTax + annualBonusAfterTax + equityNum + signingNum
  const annualExpense = data.monthlyExpense * 12
  const netIncome = annualTotalAfterTax - annualExpense

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
    annualExpense,
    netIncome,
    monthlySocialPersonal,
    monthlySocialCompany,
    annualSocialPersonal,
    annualSocialCompany,
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

  const sliderMin = Math.max(MIN_BASE, Math.round(value * 0.5 / 1000) * 1000)
  const sliderMax = Math.min(MAX_BASE, Math.round(value * 1.5 / 1000) * 1000)

  return (
    <div className="space-y-2">
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
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={sliderMin}
        max={sliderMax}
        step={1000}
      />
      <div className="flex justify-between text-[10px] text-subtle">
        <span>¥{sliderMin.toLocaleString()}</span>
        <span>¥{sliderMax.toLocaleString()}</span>
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

/* ===================== ExpenseInput ===================== */
interface ExpenseInputProps {
  value: number
  onChange: (value: number) => void
}

function ExpenseInput({ value, onChange }: ExpenseInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-dim">固定支出合计（元/月）</span>
        <span className="text-[10px] text-subtle">房租/通勤/餐饮等</span>
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

/* ===================== SocialInsuranceEditor ===================== */
interface SocialInsuranceEditorProps {
  value: SocialInsurance
  onChange: (value: SocialInsurance) => void
  defaultBase: number
}

function SocialInsuranceEditor({ value, onChange, defaultBase }: SocialInsuranceEditorProps) {
  const presetKeys = Object.keys(CITY_PRESETS)
  const activePreset = presetKeys.find((k) => CITY_PRESETS[k].name === value.city)
  const currentPreset = activePreset ? CITY_PRESETS[activePreset] : null

  const [baseInput, setBaseInput] = useState(String(value.base === 0 ? "" : value.base))

  useEffect(() => {
    setBaseInput(String(value.base === 0 ? "" : value.base))
  }, [value.base])

  const commitBase = (raw: string) => {
    if (raw === "") {
      setBaseInput(value.base === 0 ? "" : String(value.base))
      return
    }
    const num = Number(raw)
    if (currentPreset) {
      const clamped = clamp(num, currentPreset.minBase, currentPreset.maxBase)
      setBaseInput(String(clamped))
      onChange({ ...value, base: clamped, baseManuallySet: true })
    } else {
      setBaseInput(String(num))
      onChange({ ...value, base: num, baseManuallySet: true })
    }
  }

  const applyPreset = (key: string) => {
    if (key === "custom") {
      onChange({ ...value, city: "自定义", baseManuallySet: false })
      return
    }
    const p = CITY_PRESETS[key]
    const base = clamp(defaultBase, p.minBase, p.maxBase)
    onChange({
      ...value,
      enabled: true,
      city: p.name,
      base,
      baseManuallySet: false,
      pension: { ...p.pension },
      medical: { ...p.medical },
      unemployment: { ...p.unemployment },
      injury: { ...p.injury },
    })
  }

  const updateRate = (field: keyof SocialInsurance, side: "company" | "personal", v: number) => {
    onChange({
      ...value,
      [field]: { ...(value[field] as { company: number; personal: number }), [side]: v },
    })
  }

  return (
    <div className="cyber-panel space-y-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-accent">社保缴纳（五险）</span>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-dim">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
            className="accent-accent h-3.5 w-3.5"
          />
          计入社保
        </label>
      </div>

      {value.enabled && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-xs text-dim">城市预设</span>
              <select
                value={activePreset ?? "custom"}
                onChange={(e) => applyPreset(e.target.value)}
                className="h-8 w-full rounded-md border border-accent/15 bg-black/40 px-2 text-xs text-accent"
              >
                <option value="custom">自定义</option>
                {presetKeys.map((k) => (
                  <option key={k} value={k}>
                    {CITY_PRESETS[k].name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-dim">社保缴纳基数（元/月）</span>
              <NumericInput
                value={baseInput}
                onChange={(v) => {
                  setBaseInput(v)
                  if (!currentPreset && v !== "") {
                    onChange({ ...value, base: Number(v) })
                  }
                }}
                onBlur={() => commitBase(baseInput)}
                className="text-accent"
                placeholder={String(defaultBase)}
              />
            </div>
          </div>
          {currentPreset && (
            <div className="text-[10px] text-subtle">
              {currentPreset.name}基数范围：¥{currentPreset.minBase.toLocaleString()} ~ ¥{currentPreset.maxBase.toLocaleString()}
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-[10px] text-subtle">
              <span>险种</span>
              <span className="text-right">单位比例</span>
              <span className="text-right">个人比例</span>
            </div>
            {[
              { key: "pension", label: "养老" },
              { key: "medical", label: "医疗（含生育）" },
              { key: "unemployment", label: "失业" },
              { key: "injury", label: "工伤" },
            ].map(({ key, label }) => (
              <div key={key} className="grid grid-cols-3 items-center gap-2">
                <span className="text-xs text-dim">{label}</span>
                <NumericInput
                  value={String((value[key as keyof SocialInsurance] as { company: number; personal: number }).company)}
                  onChange={(v) => updateRate(key as keyof SocialInsurance, "company", Number(v))}
                  allowDecimal
                  className="h-6 text-xs text-accent"
                />
                <NumericInput
                  value={String((value[key as keyof SocialInsurance] as { company: number; personal: number }).personal)}
                  onChange={(v) => updateRate(key as keyof SocialInsurance, "personal", Number(v))}
                  allowDecimal
                  className="h-6 text-xs text-accent"
                />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="text-[10px] text-subtle">
        社保数据仅供参考，具体以当地人社局最新政策为准。
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

/* ===================== MultiOfferDiffView ===================== */
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

function MultiOfferDiffView({
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

/* ===================== SalaryChart ===================== */
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
  growth: "#00ff88",
}

function formatWan(n: number) {
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(1)}w`
  return n.toLocaleString()
}

function SalaryChart({
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
        result[`${s.name}`] = val
        result[`${s.name}涨幅`] = cur === 0 ? 0 : Number((((val - cur) / cur) * 100).toFixed(1))
      })
      return result
    })
  }, [currentSummary, scenarioSummaries, currentScenario])

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

    return (
      <div className="rounded-lg border border-accent/20 bg-[#0a0a1a]/95 p-3 shadow-[0_0_20px_rgba(0,240,255,0.1)] backdrop-blur-md">
        <div className="mb-2 text-xs font-semibold text-accent">{label}</div>
        <div className="space-y-1.5 text-[11px]">
          {payload
            .filter((p) => !p.name.includes("涨幅"))
            .map((p) => (
              <div key={p.name} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-dim">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                  {p.name}
                </span>
                <span className="text-foreground">{formatMoney(Number(p.value))}</span>
              </div>
            ))}
          <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
            {payload
              .filter((p) => p.name.includes("涨幅"))
              .map((p) => {
                const growth = Number(p.value)
                return (
                  <div key={p.name} className="flex items-center justify-between gap-4">
                    <span className="text-subtle">{p.name.replace("涨幅", "")} vs 当前</span>
                    <span className={growth >= 0 ? "text-danger" : "text-success"}>
                      {growth >= 0 ? "+" : ""}
                      {growth.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cyber-panel p-4">
      <div className="mb-3 text-xs text-dim">当前岗位 / 期望 / Offer 综合对比</div>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="rgba(0,240,255,0.08)" strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#8899aa", fontSize: 10 }}
              axisLine={{ stroke: "rgba(0,240,255,0.15)" }}
              tickLine={{ stroke: "rgba(0,240,255,0.1)" }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: "#8899aa", fontSize: 10 }}
              axisLine={{ stroke: "rgba(0,240,255,0.15)" }}
              tickLine={{ stroke: "rgba(0,240,255,0.1)" }}
              tickFormatter={(v) => formatWan(Number(v))}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "#8899aa", fontSize: 10 }}
              axisLine={{ stroke: "rgba(0,255,136,0.2)" }}
              tickLine={{ stroke: "rgba(0,255,136,0.1)" }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#8899aa" }} iconType="circle" />
            <Bar
              yAxisId="left"
              dataKey={currentScenario?.name ?? "当前岗位"}
              fill={CHART_COLORS.current}
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
            {scenarioSummaries.map((s, idx) => (
              <Bar
                key={s.id}
                yAxisId="left"
                dataKey={s.name}
                fill={CHART_COLORS.offer[idx % CHART_COLORS.offer.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
            ))}
            {scenarioSummaries.map((s, idx) => (
              <Line
                key={s.id}
                yAxisId="right"
                type="monotone"
                dataKey={`${s.name}涨幅`}
                stroke={CHART_COLORS.offer[idx % CHART_COLORS.offer.length]}
                strokeWidth={2}
                dot={{ r: 2, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-subtle">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS.current }} />
          柱状图 = 金额
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS.growth }} />
          折线图 = 相对当前涨幅
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
      <div className="overflow-x-auto">
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
      </div>
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

      {/* Desktop editor */}
      <div className="hidden min-w-[400px] md:block">
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

      {/* Mobile editor */}
      <div className="space-y-2 md:hidden">
        {brackets.map((b, i) => (
          <div key={i} className="rounded-lg border border-white/[0.05] bg-black/20 p-3 text-xs">
            <div className="mb-2 text-subtle">第 {i + 1} 级</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-subtle">收入上限</span>
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
              <div className="space-y-1">
                <span className="text-[10px] text-subtle">税率 ({rateUnit})</span>
                <NumericInput
                  value={String(Math.round(b.rate * 10000) / 100)}
                  onChange={(v) => update(i, "rate", Number(v || 0) / 100)}
                  allowDecimal
                  className="h-6 text-accent"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <span className="text-[10px] text-subtle">速算扣除数</span>
                <NumericInput
                  value={String(b.deduction)}
                  onChange={(v) => update(i, "deduction", Number(v || 0))}
                  className="h-6 text-accent"
                />
              </div>
            </div>
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

/* ===================== ExportReport ===================== */
function ExportReport({
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
      const message = err instanceof Error ? err.message : String(err)
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
          <img src="/qr-code.png" alt="二维码" crossOrigin="anonymous" className="h-20 w-20" />
        </div>
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
  monthlyExpense: number,
  equity = "",
  signingBonus = "",
  socialInsurance: SocialInsurance = DEFAULT_SOCIAL_INSURANCE
): SalaryData {
  const si = { ...socialInsurance }
  if (si.enabled && si.city && !si.baseManuallySet) {
    const presetKey = Object.keys(CITY_PRESETS).find((k) => CITY_PRESETS[k].name === si.city)
    if (presetKey) {
      const preset = CITY_PRESETS[presetKey]
      si.base = clamp(monthlyBase, preset.minBase, preset.maxBase)
    }
  }
  return {
    monthlyBase,
    months,
    providentBase: providentBase <= 0 ? monthlyBase : providentBase,
    personalRate,
    companyRate,
    deduction,
    monthlyExpense,
    equity,
    signingBonus,
    socialInsurance: si,
  }
}

function defaultCurrent(): SalaryData {
  return createSalaryData(30000, 14, 25000, 12, 12, 0, 0)
}

function defaultExpected(): SalaryData {
  return createSalaryData(30000, 14, 0, 12, 12, 0, 0)
}

function defaultScenarios(): Scenario[] {
  return [
    { id: uid(), name: "当前岗位", role: "current", data: defaultCurrent() },
    { id: uid(), name: "期望", role: "expected", data: defaultExpected() },
    { id: uid(), name: "Offer 1", role: "offer", data: createSalaryData(35000, 15, 0, 12, 12, 0, 0) },
  ]
}

const replacer = (_key: string, value: unknown) => {
  if (typeof value === "number" && !Number.isFinite(value)) return null
  return value
}

const reviver = (_key: string, value: unknown) => {
  if (value === null) return Infinity
  return value
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("scenario")
  const [bgMode, setBgMode] = useState<BgMode>("flow")
  const [bgColor, setBgColor] = useState<BgColor>("#050510")

  const [scenarios, setScenarios] = useState<Scenario[]>(defaultScenarios())
  const [activeScenarioId, setActiveScenarioId] = useState<string>("")
  const [increasePercent, setIncreasePercent] = useState(20)

  const [annualBrackets, setAnnualBrackets] = useState<TaxBracket[]>(DEFAULT_ANNUAL_TAX_BRACKETS)
  const [bonusBrackets, setBonusBrackets] = useState<TaxBracket[]>(DEFAULT_BONUS_TAX_BRACKETS)

  const [loaded, setLoaded] = useState(false)

  /* localStorage 加载 */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved, reviver)
        if (Array.isArray(parsed.scenarios) && parsed.scenarios.length > 0) {
          setScenarios(parsed.scenarios)
          setActiveScenarioId(parsed.activeScenarioId || parsed.scenarios[0].id)
        }
        if (typeof parsed.increasePercent === "number") setIncreasePercent(parsed.increasePercent)
        if (parsed.annualBrackets) setAnnualBrackets(parsed.annualBrackets)
        if (parsed.bonusBrackets) setBonusBrackets(parsed.bonusBrackets)
        if (parsed.bgMode) setBgMode(parsed.bgMode)
        if (parsed.bgColor) setBgColor(parsed.bgColor)
      } else {
        /* 迁移旧版数据 */
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
        if (legacy) {
          const parsedLegacy = JSON.parse(legacy, reviver)
          const migrated: Scenario[] = [
            { id: uid(), name: "当前岗位", role: "current", data: parsedLegacy.current || defaultCurrent() },
            { id: uid(), name: "期望", role: "expected", data: parsedLegacy.expected || defaultExpected() },
            ...(parsedLegacy.offers || []).map((o: SavedOffer) => ({ ...o, role: "offer" as const })),
          ].filter((s) => s.data)
          if (migrated.length > 0) {
            setScenarios(migrated)
            setActiveScenarioId(migrated[0].id)
            if (typeof parsedLegacy.increasePercent === "number") setIncreasePercent(parsedLegacy.increasePercent)
            if (parsedLegacy.annualBrackets) setAnnualBrackets(parsedLegacy.annualBrackets)
            if (parsedLegacy.bonusBrackets) setBonusBrackets(parsedLegacy.bonusBrackets)
            if (parsedLegacy.bgMode) setBgMode(parsedLegacy.bgMode)
            if (parsedLegacy.bgColor) setBgColor(parsedLegacy.bgColor)
          }
        }
      }
    } catch {
      // ignore
    }
    setLoaded(true)
  }, [])

  /* localStorage 自动保存 */
  useEffect(() => {
    if (!loaded) return
    const data = {
      scenarios,
      activeScenarioId,
      increasePercent,
      annualBrackets,
      bonusBrackets,
      bgMode,
      bgColor,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data, replacer))
  }, [scenarios, activeScenarioId, increasePercent, annualBrackets, bonusBrackets, bgMode, bgColor, loaded])

  /* 背景偏好单独保存（兼容旧逻辑） */
  useEffect(() => {
    try {
      localStorage.setItem(
        "salary-negotiator-bg",
        JSON.stringify({ mode: bgMode, color: bgColor })
      )
    } catch {
      // ignore
    }
  }, [bgMode, bgColor])

  /* 派生数据 */
  const currentScenario = useMemo(
    () => scenarios.find((s) => s.role === "current") || scenarios[0],
    [scenarios]
  )
  const expectedScenario = useMemo(
    () => scenarios.find((s) => s.role === "expected"),
    [scenarios]
  )
  const activeScenario = useMemo(
    () => scenarios.find((s) => s.id === activeScenarioId) || scenarios[0],
    [scenarios, activeScenarioId]
  )

  const currentSummary = useMemo(
    () => calcSummary(currentScenario?.data || defaultCurrent(), annualBrackets, bonusBrackets),
    [currentScenario, annualBrackets, bonusBrackets]
  )

  const expectedAnnualPackage = useMemo(() => {
    return Math.round(currentSummary.annualTotalPackage * (1 + increasePercent / 100))
  }, [currentSummary.annualTotalPackage, increasePercent])

  const updateScenario = useCallback(
    (id: string, updater: (data: SalaryData) => SalaryData) => {
      setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, data: updater(s.data) } : s)))
    },
    []
  )

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

  const addScenario = () => {
    const offerCount = scenarios.filter((s) => s.role === "offer").length
    const newScenario: Scenario = {
      id: uid(),
      name: `Offer ${offerCount + 1}`,
      role: "offer",
      data: createSalaryData(35000, 15, 0, 12, 12, 0, 0),
    }
    setScenarios((prev) => [...prev, newScenario])
    setActiveScenarioId(newScenario.id)
  }

  const removeScenario = (id: string) => {
    const scenario = scenarios.find((s) => s.id === id)
    if (!scenario || scenario.role !== "offer") return
    setScenarios((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (activeScenarioId === id && next.length > 0) {
        setActiveScenarioId(next[0].id)
      }
      return next
    })
  }

  const renameScenario = (id: string, name: string) => {
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)))
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "scenario", label: "方案管理" },
    { key: "diff", label: "待遇综合对比" },
    { key: "lookup", label: "年包速查" },
    { key: "tax", label: "税率表" },
  ]

  const tabContent = () => {
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
                    value={increasePercent.toFixed(2)}
                    onChange={(v) => {
                      const num = Number(v)
                      if (v === "" || (num >= 0 && num <= 100)) {
                        setIncreasePercent(num)
                      }
                    }}
                    onBlur={() => {
                      const committed = Math.max(0, Math.min(100, increasePercent))
                      setIncreasePercent(committed)
                    }}
                    allowDecimal
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

        <section>{tabContent()}</section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-accent/10 bg-base/85 px-4 py-2 text-center text-[10px] text-subtle backdrop-blur-md">
        <div className="mx-auto flex max-w-[1152px] flex-col items-center justify-between gap-2 sm:flex-row">
          <span>{BRAND_NAME} · 数据仅供参考，具体以劳动合同和当地政策为准</span>
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
