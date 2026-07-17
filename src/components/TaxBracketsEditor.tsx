import { NumericInput } from "@/components/forms/NumericInput"
import { DEFAULT_ANNUAL_TAX_BRACKETS, DEFAULT_BONUS_TAX_BRACKETS, type TaxBracket } from "@/domain"

interface TaxBracketsEditorProps {
  title: string
  brackets: TaxBracket[]
  onChange: (brackets: TaxBracket[]) => void
  onReset: () => void
  rateUnit?: string
}

export function TaxBracketsEditor({ title, brackets, onChange, onReset, rateUnit = "%" }: TaxBracketsEditorProps) {
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

export function TaxBracketsTab({
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
