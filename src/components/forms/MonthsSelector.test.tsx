import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MonthsSelector } from './MonthsSelector'

describe('MonthsSelector', () => {
  it('renders all month options', () => {
    render(<MonthsSelector value={14} onChange={vi.fn()} />)
    expect(screen.getByText('12薪')).toBeInTheDocument()
    expect(screen.getByText('18薪')).toBeInTheDocument()
  })

  it('calls onChange with selected month', () => {
    const onChange = vi.fn()
    render(<MonthsSelector value={14} onChange={onChange} />)

    fireEvent.click(screen.getByText('16薪'))
    expect(onChange).toHaveBeenCalledWith(16)
  })

  it('highlights current value', () => {
    render(<MonthsSelector value={14} onChange={vi.fn()} />)
    const active = screen.getByText('14薪')
    expect(active).toHaveClass('month-btn-active')
  })
})
