import { useEffect, useState } from "react"
import { NumericInput } from "@/components/forms/NumericInput"
import { CITY_PRESETS, clamp, type SocialInsurance } from "@/domain"

interface SocialInsuranceEditorProps {
  value: SocialInsurance
  onChange: (value: SocialInsurance) => void
  defaultBase: number
}

export function SocialInsuranceEditor({ value, onChange, defaultBase }: SocialInsuranceEditorProps) {
  const presetKeys = Object.keys(CITY_PRESETS)
  const activePreset = presetKeys.find((k) => CITY_PRESETS[k].name === value.city)
  const currentPreset = activePreset ? CITY_PRESETS[activePreset] : null

  const [baseInput, setBaseInput] = useState(String(value.base === 0 ? "" : value.base))

  useEffect(() => {
    setBaseInput(String(value.base === 0 ? "" : value.base))
  }, [value.base])

  const commitBase = (raw: string) => {
    if (raw === "") {
      setBaseInput(value.base === 0 ? "" : String(value.base))
      return
    }
    const num = Number(raw)
    if (currentPreset) {
      const clamped = clamp(num, currentPreset.minBase, currentPreset.maxBase)
      setBaseInput(String(clamped))
      onChange({ ...value, base: clamped, baseManuallySet: true })
    } else {
      setBaseInput(String(num))
      onChange({ ...value, base: num, baseManuallySet: true })
    }
  }

  const applyPreset = (key: string) => {
    if (key === "custom") {
      onChange({ ...value, city: "自定义", baseManuallySet: false })
      return
    }
    const p = CITY_PRESETS[key]
    const base = clamp(defaultBase, p.minBase, p.maxBase)
    onChange({
      ...value,
      enabled: true,
      city: p.name,
      base,
      baseManuallySet: false,
      pension: { ...p.pension },
      medical: { ...p.medical },
      unemployment: { ...p.unemployment },
      injury: { ...p.injury },
    })
  }

  const updateRate = (field: keyof SocialInsurance, side: "company" | "personal", v: number) => {
    onChange({
      ...value,
      [field]: { ...(value[field] as { company: number; personal: number }), [side]: v },
    })
  }

  return (
    <div className="cyber-panel space-y-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-accent">社保缴纳（五险）</span>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-dim">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
            className="accent-accent h-3.5 w-3.5"
          />
          扣除社保
        </label>
      </div>

      {value.enabled && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-xs text-dim">城市预设</span>
              <select
                value={activePreset ?? "custom"}
                onChange={(e) => applyPreset(e.target.value)}
                className="h-8 w-full rounded-md border border-accent/15 bg-black/40 px-2 text-xs text-accent"
              >
                <option value="custom">自定义</option>
                {presetKeys.map((k) => (
                  <option key={k} value={k}>
                    {CITY_PRESETS[k].name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-dim">社保缴纳基数（元/月）</span>
              <NumericInput
                value={baseInput}
                onChange={(v) => {
                  setBaseInput(v)
                  if (!currentPreset && v !== "") {
                    onChange({ ...value, base: Number(v) })
                  }
                }}
                onBlur={() => commitBase(baseInput)}
                className="text-accent"
                placeholder={String(defaultBase)}
              />
            </div>
          </div>
          {currentPreset && (
            <div className="text-[10px] text-subtle">
              {currentPreset.name}基数范围：¥{currentPreset.minBase.toLocaleString()} ~ ¥{currentPreset.maxBase.toLocaleString()}
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-[10px] text-subtle">
              <span>险种</span>
              <span className="text-right">单位比例</span>
              <span className="text-right">个人比例</span>
            </div>
            {[
              { key: "pension", label: "养老" },
              { key: "medical", label: "医疗（含生育）" },
              { key: "unemployment", label: "失业" },
              { key: "injury", label: "工伤" },
            ].map(({ key, label }) => (
              <div key={key} className="grid grid-cols-3 items-center gap-2">
                <span className="text-xs text-dim">{label}</span>
                <NumericInput
                  value={String((value[key as keyof SocialInsurance] as { company: number; personal: number }).company)}
                  onChange={(v) => updateRate(key as keyof SocialInsurance, "company", Number(v))}
                  allowDecimal
                  className="h-6 text-xs text-accent"
                />
                <NumericInput
                  value={String((value[key as keyof SocialInsurance] as { company: number; personal: number }).personal)}
                  onChange={(v) => updateRate(key as keyof SocialInsurance, "personal", Number(v))}
                  allowDecimal
                  className="h-6 text-xs text-accent"
                />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="text-[10px] text-subtle">
        社保数据仅供参考，具体以当地人社局最新政策为准。
      </div>
    </div>
  )
}
