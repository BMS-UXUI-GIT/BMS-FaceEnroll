// แคปภาพ "หลัง" ของอัปเดต 20 ส.ค. 69 — หน้าหลัก / ลงเวลา / รายแผนก / รายงานสถิติเข้า-ออก / รายบุคคล
// รันจาก root: node presentation/capture-0820.mjs [ชื่อฉาก...]  (ไม่ใส่ = แคปทุกฉาก)
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:5274'
const OUT = new URL('./public/shots/', import.meta.url).pathname
const only = process.argv.slice(2)
const want = (n) => only.length === 0 || only.includes(n)

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
await wait(2500)
// ซ่อนเมนู dev ออกจากภาพ
await page.evaluate(() => {
  document.querySelectorAll('aside button').forEach((b) => { if (b.textContent.includes('ระบบดีไซน์')) b.remove() })
})

const nav = async (label) => {
  await page.locator('aside').getByRole('button', { name: label, exact: true }).first().click()
  await wait(2200)
}
const shot = async (name) => {
  // เมาส์ค้างบนกราฟ = tooltip ลอยบังภาพ — จอดไว้มุมบนซ้ายก่อนกดชัตเตอร์เสมอ
  await page.mouse.move(4, 4)
  await wait(500)
  await page.screenshot({ path: `${OUT}${name}.png` })
  console.log('✓', name)
}

/** ตั้งช่วงวันที่ผ่านชิป "ช่วงวันที่" — ใช้ปุ่ม preset ในปฏิทิน ("7 วัน" / "30 วัน") */
const setRange = async (label) => {
  await page.locator('.chip', { hasText: 'ช่วงวันที่' }).first().click()
  await wait(800)
  await page.locator('.dp-presets button', { hasText: label }).first().click()
  await wait(2200)
}

if (want('overview')) {
  await nav('หน้าหลัก')
  await setRange('7 วัน')
  await shot('overview-io-mirror')
}

if (want('overview-summary')) {
  // เลื่อนลงไปที่แผงสรุปการสแกนเข้า-ออก
  await page.evaluate(() => {
    const p = [...document.querySelectorAll('main *')].find((n) => n.textContent?.trim() === 'สรุปการสแกนเข้า-ออก')
    p?.closest('section, div')?.scrollIntoView({ block: 'center' })
  })
  await wait(1200)
  await shot('overview-io-summary')
}

if (want('attendance')) {
  await nav('การลงเวลาของพนักงาน')
  await wait(1200)
  await shot('attendance-gps-left')
}

if (want('dept')) {
  await nav('รายแผนก')
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('main table')].pop()
    t?.scrollIntoView({ block: 'center' })
  })
  await wait(1200)
  await shot('dept-cols-pct')
}

if (want('late')) {
  await nav('รายงานสถิติการเข้า - ออกงาน')
  await setRange('7 วัน')
  await wait(1500)
  await shot('late-grouped-date')
  const byPerson = page.getByRole('button', { name: /เรียงตามคน/ })
  if (await byPerson.isVisible().catch(() => false)) {
    await byPerson.click(); await wait(1500)
    await shot('late-grouped-person')
  }
}

if (want('person')) {
  await nav('รายชื่อพนักงาน')
  await wait(1500)
  await page.locator('main tbody tr').first().click()
  await wait(2500)
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('main *')].find((n) => n.textContent?.trim() === 'สถิติการเข้า-ออกงานแยกตามสัปดาห์')
    h?.scrollIntoView({ block: 'center' })
  })
  await wait(1500)
  await shot('person-week-chart')
}

await browser.close()
