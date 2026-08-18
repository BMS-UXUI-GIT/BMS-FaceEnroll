// ตรวจโน้ตเดียว: node presentation/verify-one.mjs <hash> <presses> <out.png>
import { chromium } from 'playwright-core'
const [hash, presses, name] = process.argv.slice(2)
const OUT = '/private/tmp/claude-501/-Users-joeos-BMS-FaceEnroll/a23087be-a0e2-4382-8229-7a5f7fc8d678/scratchpad/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
const page = await ctx.newPage()
await page.goto(`http://localhost:5399/#${hash}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1400)
for (let i = 0; i < Number(presses); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900) }
await page.screenshot({ path: OUT + name })
console.log('✓', name)
await browser.close()
