import { useEffect, useRef, useState } from "react"
import { Slider } from "@/components/ui/slider"
import { NumericInput } from "./NumericInput"
import { clamp, MIN_BASE, MAX_BASE } from "@/domain"

export interface BaseInputSliderProps {
  value: number
  onChange: (value: number) => void
  label: string
  /** T3：滑块一次拖动/步进结束时触发（ANALYTICS.md §5-T3） */
  onCommit?: (value: number) => void
  /** T2：键盘输入 blur 提交且值相对 focus 时发生变化才触发（ANALYTICS.md §5-T2） */
  onKeyboardCommit?: (value: number) => void
  'data-testid'?: string
}

export function BaseInputSlider({ value, onChange, label, onCommit, onKeyboardCommit, 'data-testid': dataTestId }: BaseInputSliderProps) {
  const [inputValue, setInputValue] = useState(String(value))
  const focusValueRef = useRef<number | null>(null)

  useEffect(() => {
    setInputValue(String(value))
  }, [value])

  const commit = (raw: string) => {
    if (raw === "") {
      setInputValue(String(value))
      focusValueRef.current = null
      return
    }
    const num = clamp(Number(raw), MIN_BASE, MAX_BASE)
    setInputValue(String(num))
    onChange(num)
    if (focusValueRef.current !== null && num !== focusValueRef.current) {
      onKeyboardCommit?.(num)
    }
    focusValueRef.current = null
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
          onFocus={() => {
            focusValueRef.current = value
          }}
          className="w-28 text-accent"
          placeholder="100"
          data-testid={dataTestId}
        />
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        onValueCommit={(v) => onCommit?.(v[0])}
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
