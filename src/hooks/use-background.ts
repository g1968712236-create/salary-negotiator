import { useEffect, useState } from "react"
import { loadBackgroundPreference, saveBackgroundPreference } from "@/data"
import type { BgColor, BgMode } from "@/domain"

const BG_MODES: { key: BgMode; label: string }[] = [
  { key: "flow", label: "丝绸流场" },
  { key: "rain", label: "雨落寒窗" },
  { key: "solid", label: "纯色" },
]

const BG_COLORS: { key: BgColor; label: string }[] = [
  { key: "#050510", label: "深空" },
  { key: "#0a0a1a", label: "暗夜" },
  { key: "#111122", label: "靛蓝" },
  { key: "#1a0a14", label: "暮紫" },
]

export function useBackground() {
  const [bgMode, setBgMode] = useState<BgMode>("flow")
  const [bgColor, setBgColor] = useState<BgColor>("#050510")

  useEffect(() => {
    const saved = loadBackgroundPreference()
    if (saved) {
      if (saved.mode) setBgMode(saved.mode)
      if (saved.color) setBgColor(saved.color)
    }
  }, [])

  useEffect(() => {
    saveBackgroundPreference({ mode: bgMode, color: bgColor })
  }, [bgMode, bgColor])

  const cycleBgMode = () => {
    const idx = BG_MODES.findIndex((m) => m.key === bgMode)
    setBgMode(BG_MODES[(idx + 1) % BG_MODES.length].key)
  }

  return {
    bgMode,
    bgColor,
    bgModes: BG_MODES,
    bgColors: BG_COLORS,
    setBgMode,
    setBgColor,
    cycleBgMode,
  }
}
