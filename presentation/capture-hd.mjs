// แคปหน้าจัดการรพ → รายละเอียด → แท็บผู้ใช้ (ใช้ทำ before/after ของ changelog)
// รันจาก root โปรเจกต์: node presentation/capture-hd.mjs http://localhost:5274 <ชื่อไฟล์.png>
import { chromium } from 'playwright-core'

const BASE = process.argv[2] || 'http://localhost:5274'
const NAME = process.argv[3] || 'hospital-detail.png'
const OUT = new URL('./public/shots/', import.meta.url).pathname

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
const wait = (ms) => page.waitForTimeout(ms)

await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await wait(1500)
const skip = page.getByRole('button', { name: 'ข้าม' })
if (await skip.isVisible().catch(() => false)) { await skip.click(); await wait(1200) }
await page.getByRole('tab', { name: /ผู้ดูแลระบบ/ }).click()
await wait(600)
await page.getByPlaceholder('เช่น somchai@hospital.go.th').fill('superadmin')
await page.getByPlaceholder('กรอกรหัสผ่าน').first().fill('demo1234')
await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click()
await wait(2500)
await page.evaluate(() => {
  document.querySelectorAll('aside button').forEach((b) => { if (b.textContent.includes('ระบบดีไซน์')) b.remove() })
})

await page.locator('aside').getByRole('button', { name: 'จัดการโรงพยาบาล', exact: true }).first().click()
await wait(1200)
const pw = page.getByPlaceholder('รหัสผ่านของคุณ')
if (await pw.isVisible().catch(() => false)) {
  await pw.fill('demo1234')
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click()
  await wait(1500)
}
// เปิดรายละเอียดโรงแรก
await page.locator('tbody tr').first().click()
await wait(1500)
await page.getByRole('button', { name: 'ผู้ใช้', exact: true }).first().click()
await wait(1200)
// hover แถวแรกให้เห็นสถานะกดได้ (โค้ดใหม่มี row-hover)
const row = page.locator('tbody tr').first()
if (await row.isVisible().catch(() => false)) await row.hover()
await wait(400)
await page.screenshot({ path: OUT + NAME })
console.log('✓', NAME)
await browser.close()
