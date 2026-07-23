import { Slider } from "@/components/ui/slider"
import { MIN_RATE, MAX_RATE } from "@/domain"

export interface RateSliderProps {
  value: number
  onChange: (value: number) => void
  label: string
  /** T3：滑块一次拖动/步进结束时触发（ANALYTICS.md §5-T3） */
  onCommit?: (value: number) => void
}

export function RateSlider({ value, onChange, label, onCommit }: RateSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-dim">{label}</span>
        <span className="text-xs text-accent">{value}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        onValueCommit={(v) => onCommit?.(v[0])}
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
