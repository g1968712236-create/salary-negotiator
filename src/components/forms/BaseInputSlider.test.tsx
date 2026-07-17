import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BaseInputSlider } from './BaseInputSlider'
import { MAX_BASE, MIN_BASE } from '@/domain'

describe('BaseInputSlider', () => {
  it('commits normal value within range', () => {
    const onChange = vi.fn()
    render(<BaseInputSlider value={30000} onChange={onChange} label="月Base" />)

    const input = screen.getByDisplayValue('30000')
    fireEvent.change(input, { target: { value: '35000' } })
    expect(onChange).toHaveBeenCalledWith(35000)
  })

  it('does not commit value below min while typing', () => {
    const onChange = vi.fn()
    render(<BaseInputSlider value={30000} onChange={onChange} label="月Base" />)

    const input = screen.getByDisplayValue('30000')
    fireEvent.change(input, { target: { value: '50' } })
    // 输入过程中不提交
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clamps value below MIN_BASE on blur', () => {
    const onChange = vi.fn()
    render(<BaseInputSlider value={30000} onChange={onChange} label="月Base" />)

    const input = screen.getByDisplayValue('30000')
    fireEvent.change(input, { target: { value: '50' } })
    fireEvent.blur(input)

    expect(onChange).toHaveBeenCalledWith(MIN_BASE)
    expect(input).toHaveValue(String(MIN_BASE))
  })

  it('clamps value above MAX_BASE on blur', () => {
    const onChange = vi.fn()
    render(<BaseInputSlider value={30000} onChange={onChange} label="月Base" />)

    const input = screen.getByDisplayValue('30000')
    fireEvent.change(input, { target: { value: '2000000' } })
    fireEvent.blur(input)

    expect(onChange).toHaveBeenCalledWith(MAX_BASE)
    expect(input).toHaveValue(String(MAX_BASE))
  })

  it('restores original value when input is cleared and blurred', () => {
    const onChange = vi.fn()
    render(<BaseInputSlider value={30000} onChange={onChange} label="月Base" />)

    const input = screen.getByDisplayValue('30000')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)

    expect(input).toHaveValue('30000')
    expect(onChange).not.toHaveBeenCalled()
  })
})
