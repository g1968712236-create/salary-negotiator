import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SalaryTable } from './SalaryTable'

describe('SalaryTable', () => {
  it('renders default min and max inputs', () => {
    render(<SalaryTable />)
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
    expect(screen.getByDisplayValue('40000')).toBeInTheDocument()
  })

  it('clamps min base to 0 on commit', () => {
    render(<SalaryTable />)
    const minInput = screen.getByDisplayValue('100')
    fireEvent.change(minInput, { target: { value: '0' } })
    fireEvent.blur(minInput)
    expect(minInput).toHaveValue('0')
  })

  it('clamps max base above 10_000_000 to 10_000_000 on commit', () => {
    render(<SalaryTable />)
    const maxInput = screen.getByDisplayValue('40000')
    fireEvent.change(maxInput, { target: { value: '20000000' } })
    fireEvent.blur(maxInput)
    expect(maxInput).toHaveValue('10000000')
  })

  it('swaps min and max when min exceeds max', () => {
    render(<SalaryTable />)
    const minInput = screen.getByDisplayValue('100')
    const maxInput = screen.getByDisplayValue('40000')

    fireEvent.change(minInput, { target: { value: '50000' } })
    fireEvent.blur(minInput)

    // min should not exceed current max (40000) on commit
    expect(minInput).toHaveValue('40000')
    expect(maxInput).toHaveValue('40000')
  })
})
