import { useEffect, useRef, useState } from "react"
import { NumericInput } from "@/components/forms/NumericInput"
import { track, trackDebounced } from "@/lib/analytics"
import { CITY_PRESETS, clamp, type Scenario, type SocialInsurance } from "@/domain"

interface SocialInsuranceEditorProps {
  value: SocialInsurance
  onChange: (value: SocialInsurance) => void
  defaultBase: number
  /** 所属方案角色（埋点用，ANALYTICS.md §6） */
  scenarioRole?: Scenario["role"]
  /** offer 序号（埋点 offer_index；仅 role=offer 时传入） */
  offerIndex?: number
  /** 方案 ID（仅用作 T4 防抖 key，避免多个 offer 间相互覆盖，不上报） */
  scenarioId?: string
}

export function SocialInsuranceEditor({ value, onChange, defaultBase, scenarioRole, offerIndex, scenarioId }: SocialInsuranceEditorProps) {
  const presetKeys = Object.keys(CITY_PRESETS)
  const activePreset = presetKeys.find((k) => CITY_PRESETS[k].name === value.city)
  const currentPreset = activePreset ? CITY_PRESETS[activePreset] : null

  const [baseInput, setBaseInput] = useState(String(value.base === 0 ? "" : value.base))
  const focusBaseRef = useRef<number | null>(null)

  const offerIndexProp = offerIndex !== undefined ? { offer_index: offerIndex } : {}
  /** 防抖 key 前缀：优先用方案 ID，退化为角色 */
  const debouncePrefix = scenarioId ?? String(scenarioRole)

  useEffect(() => {
    setBaseInput(String(value.base === 0 ? "" : value.base))
  }, [value.base])

  const commitBase = (raw: string) => {
    if (raw === "") {
      setBaseInput(value.base === 0 ? "" : String(value.base))
      focusBaseRef.current = null
      return
    }
    const num = Number(raw)
    const committed = currentPreset ? clamp(num, currentPreset.minBase, currentPreset.maxBase) : num
    setBaseInput(String(committed))
    onChange({ ...value, base: committed, baseManuallySet: true })
    // E-007 si_base（T2）：值相对 focus 时发生变化才报，只报字段标识
    if (focusBaseRef.current !== null && committed !== focusBaseRef.current) {
      track("field_edited", {
        scenario_role: scenarioRole,
        ...offerIndexProp,
        field_key: "si_base",
        input_method: "keyboard",
        is_default: committed === defaultBase,
      })
    }
    focusBaseRef.current = null
  }

  const applyPreset = (key: string) => {
    // E-010 social_insurance_city_selected（T1）：只区分预设/自定义，不上报城市名
    track("social_insurance_city_selected", {
      scenario_role: scenarioRole,
      ...offerIndexProp,
      preset_kind: key === "custom" ? "custom" : "preset",
    })
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
    // E-007 si_rate（T4 防抖）：只报险种与单位/个人，不上报比例数值
    trackDebounced(`${debouncePrefix}:si_rate:${String(field)}:${side}`, "field_edited", {
      scenario_role: scenarioRole,
      ...offerIndexProp,
      field_key: "si_rate",
      input_method: "keyboard",
      si_type: String(field),
      si_side: side,
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
            onChange={(e) => {
              onChange({ ...value, enabled: e.target.checked })
              // E-009 social_insurance_toggled（T1）
              track("social_insurance_toggled", {
                scenario_role: scenarioRole,
                ...offerIndexProp,
                enabled: e.target.checked,
              })
            }}
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
