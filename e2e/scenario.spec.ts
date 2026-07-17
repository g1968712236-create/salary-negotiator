import { test, expect } from '@playwright/test'

test.describe('方案管理 - 期望涨幅反推月Base', () => {
  test('输入 25.5% 涨幅后，期望月 Base 自动更新', async ({ page }) => {
    await page.goto('/')

    // 切换到方案管理 Tab
    await page.getByRole('button', { name: '方案管理' }).click()

    // 点击"期望"方案
    await page.getByTestId('scenario-chip-expected').click()

    // 读取当前岗位年包，计算期望年包（只取“当前年包 ¥”后面的第一个数字）
    const currentPackageText = await page.locator('text=/当前年包 ¥/').textContent()
    const match = currentPackageText?.match(/当前年包 ¥([\d,]+)/)
    const currentPackage = Number(match?.[1]?.replace(/,/g, ''))
    expect(currentPackage).toBeGreaterThan(0)

    const expectedAnnualPackage = Math.round(currentPackage * 1.255)

    // 修改涨幅输入框
    const increaseInput = page.getByTestId('expected-increase-input')
    await increaseInput.fill('25.5')
    await increaseInput.blur()

    // 验证期望年包显示
    await expect(page.locator('text=/期望年包 ¥/')).toContainText(`¥${expectedAnnualPackage.toLocaleString()}`)

    // 验证期望月 Base 输入框已更新（值应大于 0）
    const baseInput = page.getByTestId('expected-monthly-base-input')
    await expect(baseInput).not.toHaveValue('')
    const baseValue = Number(await baseInput.inputValue())
    expect(baseValue).toBeGreaterThan(0)
  })
})
