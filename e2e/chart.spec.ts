import { test, expect } from '@playwright/test'

test.describe('待遇综合对比图表', () => {
  test('hover 柱状图显示涨幅 Tooltip', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '待遇综合对比' }).click()

    // 等待主图表渲染（role=application 的是主图表区域，其余是图例小图标）
    const chart = page.getByRole('application')
    await expect(chart).toBeVisible()

    // Recharts 在不同版本下使用 path 或 rect 渲染柱子，兼容两种选择器
    const bars = page.locator('.recharts-bar-rectangles path, .recharts-bar-rectangles rect, .recharts-bar rect')
    await expect(bars.first()).toBeVisible()

    // hover 最后一根柱子（通常属于 Offer/期望）
    await bars.last().hover()

    // 验证 Tooltip 出现并包含涨幅信息
    const tooltip = page.locator('.recharts-tooltip-wrapper')
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toContainText('%')
  })
})
