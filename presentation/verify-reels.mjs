// ตรวจโหมด reels — เปิดหน้าใหม่ต่อภาพ (hash เดิมไม่ re-init state)
import { chromium } from 'playwright-core'
const OUT = '/private/tmp/claude-501/-Users-joeos-BMS-FaceEnroll/a23087be-a0e2-4382-8229-7a5f7fc8d678/scratchpad/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
const shots = [['1', 0, '_v-cover.png'], ['8', 0, '_v-diff.png'], ['8', 2, '_v-zoom.png'], ['16', 0, '_v-normal.png']]
for (const [hash, presses, name] of shots) {
  const page = await ctx.newPage()
  await page.goto(`http://localhost:5399/#${hash}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1400)
  for (let i = 0; i < presses; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900) }
  await page.screenshot({ path: OUT + name })
  console.log('✓', name)
  await page.close()
}
await browser.close()
