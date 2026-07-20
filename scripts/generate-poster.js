import { chromium } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.resolve(__dirname, '..')
const inputFile = path.resolve(projectRoot, 'public/xiaohongshu-poster-dark.html')
const outputFile = path.resolve(projectRoot, 'public/xiaohongshu-poster-dark.png')

async function generate() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`file://${inputFile}`, { waitUntil: 'networkidle' })
  const poster = await page.locator('.poster')
  await poster.screenshot({ path: outputFile, type: 'png' })
  await browser.close()
  console.log(`Generated: ${outputFile}`)
}

generate().catch((err) => {
  console.error(err)
  process.exit(1)
})