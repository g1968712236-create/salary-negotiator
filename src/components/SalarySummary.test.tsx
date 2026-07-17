import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SalarySummary } from './SalarySummary'
import { defaultCurrent, DEFAULT_ANNUAL_TAX_BRACKETS, DEFAULT_BONUS_TAX_BRACKETS } from '@/domain'

describe('SalarySummary', () => {
  it('renders key summary fields', () => {
    render(
      <SalarySummary
        data={defaultCurrent()}
        label="测试汇总"
        annualBrackets={DEFAULT_ANNUAL_TAX_BRACKETS}
        bonusBrackets={DEFAULT_BONUS_TAX_BRACKETS}
      />
    )
    expect(screen.getByText('测试汇总')).toBeInTheDocument()
    expect(screen.getByText('现金年总收入')).toBeInTheDocument()
    expect(screen.getByText('年包总额')).toBeInTheDocument()
    expect(screen.getByText('税后收入合计（工资+年终单独计税）')).toBeInTheDocument()
    expect(screen.getByText('净收入')).toBeInTheDocument()
  })
})
