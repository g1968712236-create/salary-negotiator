import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeductionInput } from './DeductionInput'

describe('DeductionInput', () => {
  it('shows empty when value is 0', () => {
    render(<DeductionInput value={0} onChange={vi.fn()} />)
    const input = screen.getByPlaceholderText('0')
    expect(input).toHaveValue('')
  })

  it('calls onChange with numeric value', () => {
    const onChange = vi.fn()
    render(<DeductionInput value={0} onChange={onChange} />)
    const input = screen.getByPlaceholderText('0')
    fireEvent.change(input, { target: { value: '2000' } })
    expect(onChange).toHaveBeenCalledWith(2000)
  })
})
