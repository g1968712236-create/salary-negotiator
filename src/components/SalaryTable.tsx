import { useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { NumericInput } from "@/components/forms/NumericInput"
import { cn } from "@/lib/utils"
import { formatMoney, MIN_BASE, MONTHS_RANGE } from "@/domain"

export function SalaryTable() {
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
