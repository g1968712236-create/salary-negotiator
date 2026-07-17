import { NumericInput } from "./NumericInput"

export interface DeductionInputProps {
  value: number
  onChange: (value: number) => void
}

export function DeductionInput({ value, onChange }: DeductionInputProps) {
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
