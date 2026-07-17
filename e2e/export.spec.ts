import { test, expect } from '@playwright/test'

test.describe('导出对比图', () => {
  test('点击导出按钮后进入导出状态并恢复', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '待遇综合对比' }).click()

    const exportBtn = page.getByRole('button', { name: '导出对比图为 PNG' })
    await expect(exportBtn).toBeVisible()

    // 监听下载事件
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      exportBtn.click(),
    ])

    // 验证触发下载
    expect(download.suggestedFilename()).toMatch(/offer对比_\d{4}-\d{2}-\d{2}\.png/)

    // 按钮恢复可点击
    await expect(exportBtn).toBeEnabled()
  })
})
