// ตรวจสไลด์ต่ออายุ (#8) — เปิดหน้าใหม่ต่อภาพ (hash เดิมไม่ re-init state)
import { chromium } from 'playwright-core'

const BASE = process.argv[2] || 'http://localhost:5399'
const OUT = process.argv[3] || '/private/tmp/claude-501/-Users-joeos-BMS-FaceEnroll/a23087be-a0e2-4382-8229-7a5f7fc8d678/scratchpad/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } })

for (let step = 0; step <= 3; step++) {
  const page = await ctx.newPage()
  await page.goto(`${BASE}/#8`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  for (let i = 0; i < step; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900) }
  await page.screenshot({ path: `${OUT}_r${step}.png` })
  console.log('✓', `_r${step}.png`)
  await page.close()
}
await browser.close()
