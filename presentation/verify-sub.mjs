import { chromium } from 'playwright-core'
const OUT = '/private/tmp/claude-501/-Users-joeos-BMS-FaceEnroll/a23087be-a0e2-4382-8229-7a5f7fc8d678/scratchpad/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
const page = await ctx.newPage()
await page.goto('http://localhost:5399/#1', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
await page.getByRole('button', { name: /เริ่มนำเสนอ/ }).click()
await page.waitForTimeout(1500)
await page.screenshot({ path: OUT + '_s-cover.png' })
await page.waitForTimeout(22000)
await page.screenshot({ path: OUT + '_s-slide.png' })
console.log('done')
await browser.close()
