import { NumericInput } from "./NumericInput"

export interface ProvidentBaseInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  label?: string
}

export function ProvidentBaseInput({ value, onChange, placeholder, label }: ProvidentBaseInputProps) {
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
