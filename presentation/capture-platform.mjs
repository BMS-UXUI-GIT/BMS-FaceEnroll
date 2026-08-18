// แคปหน้าหลักผู้ดูแลส่วนกลาง (PlatformOverview) + หน้าสถานะระบบ — ใช้ทำ before/after ของ changelog
// รันจาก root: node presentation/capture-platform.mjs <suffix เช่น "" หรือ "-before">
import { chromium } from 'playwright-core'

const SUF = process.argv[2] || ''
const BASE = 'http://localhost:5274'
const OUT = new URL('./public/shots/', import.meta.url).pathname

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
const wait = (ms) => page.waitForTimeout(ms)

await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await wait(2000)
const skip = page.getByRole('button', { name: 'ข้าม' })
if (await skip.isVisible().catch(() => false)) { await skip.click(); await wait(1200) }
await page.getByRole('tab', { name: /ผู้ดูแลระบบ/ }).click()
await wait(500)
await page.getByPlaceholder('เช่น somchai@hospital.go.th').fill('superadmin')
await page.getByPlaceholder('กรอกรหัสผ่าน').first().fill('demo1234')
await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click()
await wait(2500)
await page.evaluate(() => {
  document.querySelectorAll('aside button').forEach((b) => { if (b.textContent.includes('ระบบดีไซน์')) b.remove() })
})
await page.screenshot({ path: `${OUT}platform-overview${SUF}.png` })
console.log('✓ platform-overview' + SUF)

// หน้าสถานะระบบ (เลขเชื่อมต่อชุดเดียวกัน) — เฉพาะรอบ after
// (health-before.png ของ changelog ค้นหา/ตัวกรอง ต้องคงเดิม ห้ามทับ)
if (SUF) { await browser.close(); process.exit(0) }
await page.locator('aside').getByRole('button', { name: 'สถานะระบบ', exact: true }).first().click()
await wait(1200)
const pw = page.getByPlaceholder('รหัสผ่านของคุณ')
if (await pw.isVisible().catch(() => false)) {
  await pw.fill('demo1234')
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click()
  await wait(1500)
}
await page.screenshot({ path: `${OUT}health${SUF}.png` })
console.log('✓ health' + SUF)
await browser.close()
