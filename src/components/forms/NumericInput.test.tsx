import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NumericInput } from './NumericInput'

describe('NumericInput', () => {
  it('filters non-digit characters for integer-only input', () => {
    const onChange = vi.fn()
    render(<NumericInput value="1000" onChange={onChange} />)

    const input = screen.getByDisplayValue('1000')
    fireEvent.change(input, { target: { value: 'abc123.45' } })

    expect(onChange).toHaveBeenCalledWith('12345')
  })

  it('allows decimal point when allowDecimal is true', () => {
    const onChange = vi.fn()
    render(<NumericInput value="30" onChange={onChange} allowDecimal />)

    const input = screen.getByDisplayValue('30')
    fireEvent.change(input, { target: { value: '30.5' } })

    expect(onChange).toHaveBeenCalledWith('30.5')
  })

  it('keeps at most one decimal point', () => {
    const onChange = vi.fn()
    render(<NumericInput value="12.3" onChange={onChange} allowDecimal />)

    const input = screen.getByDisplayValue('12.3')
    fireEvent.change(input, { target: { value: '12.3.4' } })

    expect(onChange).toHaveBeenCalledWith('12.34')
  })

  it('converts Chinese full-stop to decimal point', () => {
    const onChange = vi.fn()
    render(<NumericInput value="" onChange={onChange} allowDecimal />)

    const input = screen.getByDisplayValue('')
    fireEvent.change(input, { target: { value: '30。5' } })

    expect(onChange).toHaveBeenCalledWith('30.5')
  })

  it('filters pasted text through the same filter', () => {
    const onChange = vi.fn()
    render(<NumericInput value="1000" onChange={onChange} allowDecimal />)

    const input = screen.getByDisplayValue('1000')
    fireEvent.paste(input, {
      clipboardData: {
        getData: () => 'abc2.5kg',
      },
    })

    expect(onChange).toHaveBeenCalledWith('10002.5')
  })
})
