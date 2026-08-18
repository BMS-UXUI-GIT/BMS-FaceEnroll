// แคปกล่องต่ออายุทดลองใช้ (หน้ารายละเอียดรพ → แท็บตั้งค่า → ปุ่มต่ออายุ)
// รันจาก root โปรเจกต์: node presentation/capture-renew.mjs http://localhost:5274 <suffix "" | "-before">
import { chromium } from 'playwright-core'

const BASE = process.argv[2] || 'http://localhost:5274'
const SUF = process.argv[3] || ''
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
// เปิดโรงทดลองใช้ที่ใกล้หมดอายุ (แท็บแรกคือตั้งค่าอยู่แล้ว) → กดต่ออายุ
await page.locator('tbody tr', { hasText: 'ใกล้หมดอายุ' }).first().click()
await wait(1500)
await page.getByRole('button', { name: 'ต่ออายุ', exact: true }).first().click()
await wait(900)
// เวอร์ชันใหม่: เปิดปฏิทินให้เห็นในภาพด้วย (เวอร์ชันเก่าไม่มี trigger นี้)
const dp = page.locator('.dp-trigger')
if (await dp.isVisible().catch(() => false)) { await dp.click(); await wait(900) }
await page.screenshot({ path: OUT + `renew-dialog${SUF}.png` })
console.log('✓', `renew-dialog${SUF}.png`)
await browser.close()
