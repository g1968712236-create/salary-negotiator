import { cn } from "@/lib/utils"
import { MONTHS_RANGE } from "@/domain"

export interface MonthsSelectorProps {
  value: number
  onChange: (value: number) => void
}

export function MonthsSelector({ value, onChange }: MonthsSelectorProps) {
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
