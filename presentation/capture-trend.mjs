// แคปแถวกราฟหน้าหลัก (สถิติเข้า-ออก + แนวโน้มการมาสาย) — before/after ของ changelog
// รันจาก root: node presentation/capture-trend.mjs <suffix "" | "-before">
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
await page.getByPlaceholder('เช่น somchai@hospital.go.th').fill('admin')
await page.getByPlaceholder('กรอกรหัสผ่าน').first().fill('demo1234')
await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click()
await wait(2800)
await page.evaluate(() => {
  document.querySelectorAll('aside button').forEach((b) => { if (b.textContent.includes('ระบบดีไซน์')) b.remove() })
})
// เลื่อนให้แถวกราฟคู่ (ซ้าย = คอลัมน์ซ้อน ชื่อ "สถิติการเข้า-ออกงาน") อยู่กลางจอ
await page.getByText('สถิติการเข้า-ออกงาน', { exact: true }).first().scrollIntoViewIfNeeded()
await page.evaluate(() => document.querySelector('main')?.scrollBy(0, -80))
await wait(600)
await page.screenshot({ path: `${OUT}trend-chart${SUF}.png` })
console.log('✓ trend-chart' + SUF)
await browser.close()
