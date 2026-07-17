import { useRef } from "react"
import type { InputHTMLAttributes } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { filterNumeric, filterNumber } from "@/domain"

export const ALLOWED_KEYS = new Set([
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

export interface NumericInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string
  onChange: (value: string) => void
  allowDecimal?: boolean
}

export function NumericInput({ value, onChange, allowDecimal, className, ...props }: NumericInputProps) {
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
        if (allowDecimal && (e.key === "." || e.key === "。")) return
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
