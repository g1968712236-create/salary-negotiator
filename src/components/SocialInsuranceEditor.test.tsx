import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SocialInsuranceEditor } from './SocialInsuranceEditor'
import { DEFAULT_SOCIAL_INSURANCE, CITY_PRESETS } from '@/domain'

describe('SocialInsuranceEditor', () => {
  it('hides detail editor when disabled', () => {
    render(
      <SocialInsuranceEditor
        value={{ ...DEFAULT_SOCIAL_INSURANCE, enabled: false }}
        onChange={vi.fn()}
        defaultBase={30000}
      />
    )
    expect(screen.queryByText('城市预设')).not.toBeInTheDocument()
  })

  it('enables social insurance and shows editor', () => {
    const onChange = vi.fn()
    render(
      <SocialInsuranceEditor
        value={{ ...DEFAULT_SOCIAL_INSURANCE, enabled: false }}
        onChange={onChange}
        defaultBase={30000}
      />
    )
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
  })

  it('applies Beijing preset and clamps base within city bounds', () => {
    const onChange = vi.fn()
    render(
      <SocialInsuranceEditor
        value={{ ...DEFAULT_SOCIAL_INSURANCE, enabled: true }}
        onChange={onChange}
        defaultBase={30000}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'beijing' } })

    const expectedBase = 30000 // within Beijing 7162 ~ 35811
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        city: CITY_PRESETS.beijing.name,
        base: expectedBase,
        baseManuallySet: false,
        pension: CITY_PRESETS.beijing.pension,
      })
    )
  })

  it('clamps manual base to city max on blur', () => {
    const onChange = vi.fn()
    render(
      <SocialInsuranceEditor
        value={{
          ...DEFAULT_SOCIAL_INSURANCE,
          enabled: true,
          city: CITY_PRESETS.beijing.name,
        }}
        onChange={onChange}
        defaultBase={30000}
      />
    )
    const baseInput = screen.getByPlaceholderText('30000')
    fireEvent.change(baseInput, { target: { value: '100000' } })
    fireEvent.blur(baseInput)

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        base: CITY_PRESETS.beijing.maxBase,
        baseManuallySet: true,
      })
    )
  })

  it('updates insurance rate', () => {
    const onChange = vi.fn()
    render(
      <SocialInsuranceEditor
        value={{ ...DEFAULT_SOCIAL_INSURANCE, enabled: true }}
        onChange={onChange}
        defaultBase={30000}
      />
    )
    const personalPensionInputs = screen.getAllByDisplayValue('8')
    fireEvent.change(personalPensionInputs[0], { target: { value: '10' } })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pension: expect.objectContaining({ personal: 10 }),
      })
    )
  })
})
