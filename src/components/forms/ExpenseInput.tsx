import { NumericInput } from "./NumericInput"

export interface ExpenseInputProps {
  value: number
  onChange: (value: number) => void
}

export function ExpenseInput({ value, onChange }: ExpenseInputProps) {
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
