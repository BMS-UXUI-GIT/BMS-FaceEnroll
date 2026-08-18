// แคปหน้าหลัก (admin) แท็บ "การเข้า/ออกงานล่าสุด" — ใช้ทำ before/after ของ changelog
// รันจาก root: node presentation/capture-recent.mjs <suffix "" | "-before">
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
await wait(2500)
await page.evaluate(() => {
  document.querySelectorAll('aside button').forEach((b) => { if (b.textContent.includes('ระบบดีไซน์')) b.remove() })
})
await page.getByRole('button', { name: 'การเข้า/ออกงานล่าสุด' }).first().click()
await wait(1500)
await page.screenshot({ path: `${OUT}recent-tab${SUF}.png` })
console.log('✓ recent-tab' + SUF)
await browser.close()
