import { test, expect } from '@playwright/test'

test.describe('待遇综合对比', () => {
  test('渲染当前岗位与 Offer 对比表格', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '待遇综合对比' }).click()

    await expect(page.getByText('以当前岗位为基数的多方案对比')).toBeVisible()
    // 桌面端表格包含“期望涨幅”表头，导出隐藏表格没有
    const table = page.locator('table').filter({ hasText: '期望涨幅' })
    await expect(table).toBeVisible()
    await expect(table).toContainText('当前岗位')
    await expect(table).toContainText('Offer 1')

    // 关键指标行存在
    await expect(table).toContainText('年包总额')
    await expect(table).toContainText('税后收入')
    await expect(table).toContainText('净收入')
  })
})
