import { NumericInput } from "./NumericInput"

export interface ExtraModulesProps {
  equity: string
  onEquityChange: (value: string) => void
  signingBonus: string
  onSigningBonusChange: (value: string) => void
}

export function ExtraModules({ equity, onEquityChange, signingBonus, onSigningBonusChange }: ExtraModulesProps) {
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
