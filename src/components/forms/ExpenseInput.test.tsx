import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExpenseInput } from './ExpenseInput'

describe('ExpenseInput', () => {
  it('shows empty when value is 0', () => {
    render(<ExpenseInput value={0} onChange={vi.fn()} />)
    const input = screen.getByPlaceholderText('0')
    expect(input).toHaveValue('')
  })

  it('calls onChange with numeric value', () => {
    const onChange = vi.fn()
    render(<ExpenseInput value={0} onChange={onChange} />)
    const input = screen.getByPlaceholderText('0')
    fireEvent.change(input, { target: { value: '5000' } })
    expect(onChange).toHaveBeenCalledWith(5000)
  })
})
