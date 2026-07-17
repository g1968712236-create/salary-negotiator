import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProvidentBaseInput } from './ProvidentBaseInput'

describe('ProvidentBaseInput', () => {
  it('shows empty when value is 0', () => {
    render(<ProvidentBaseInput value={0} onChange={vi.fn()} />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('')
  })

  it('displays non-zero value', () => {
    render(<ProvidentBaseInput value={25000} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('25000')).toBeInTheDocument()
  })

  it('calls onChange with numeric value', () => {
    const onChange = vi.fn()
    render(<ProvidentBaseInput value={25000} onChange={onChange} />)
    const input = screen.getByDisplayValue('25000')
    fireEvent.change(input, { target: { value: '30000' } })
    expect(onChange).toHaveBeenCalledWith(30000)
  })
})
