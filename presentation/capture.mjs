// จับภาพหน้าจอจริงทุกหน้า → presentation/shots/
// ใช้ Edge ของเครื่อง (playwright-core, ไม่ต้องโหลด browser เพิ่ม)
// ต้องรัน dev server ก่อน: VITE_MOCK=1 npm run dev  แล้ว  node presentation/capture.mjs http://localhost:5274
//
// แยก 2 บัญชี:
//   admin      — มุมมองโรงพยาบาล (หน้าหลักเป็น dashboard การลงเวลา ตรงกับสไลด์)
//   superadmin — เมนูจัดการระบบส่วนกลาง
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] || 'http://localhost:5274'
const OUT = new URL('./public/shots/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', headless: true })

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })
  return ctx.newPage()
}
const wait = (page, ms) => page.waitForTimeout(ms)
const shot = async (page, name) => { await page.screenshot({ path: OUT + name }); console.log('✓', name) }
// เมนู "ระบบดีไซน์" มีเฉพาะตอน dev — ไม่เอาเข้ารูปนำเสนอ
const hideDev = (page) => page.evaluate(() => {
  document.querySelectorAll('aside button').forEach((b) => { if (b.textContent.includes('ระบบดีไซน์')) b.remove() })
})

async function login(page, username, { shotLogin = false } = {}) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await wait(page, 1500)
  const skip = page.getByRole('button', { name: 'ข้าม' })
  if (await skip.isVisible().catch(() => false)) { await skip.click(); await wait(page, 1200) }
  await wait(page, 800)
  if (shotLogin) await shot(page, 'login.png')
  await page.getByRole('tab', { name: /ผู้ดูแลระบบ/ }).click()
  await wait(page, 600)
  await page.getByPlaceholder('เช่น somchai@hospital.go.th').fill(username)
  await page.getByPlaceholder('กรอกรหัสผ่าน').first().fill('demo1234')
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click()
  await wait(page, 2500)
  await hideDev(page)
}

async function nav(page, label, file, ms) {
  const btn = page.locator('aside').getByRole('button', { name: label, exact: true }).first()
  if (!(await btn.isVisible().catch(() => false))) { console.log('✗ ไม่เจอเมนู:', label); return }
  await btn.click()
  await wait(page, ms)
  // เมนูส่วนกลางติดหน้ายืนยันรหัสผ่าน (SuperGate) ครั้งแรกของ session — กรอกผ่านเลย
  const pw = page.getByPlaceholder('รหัสผ่านของคุณ')
  if (await pw.isVisible().catch(() => false)) {
    await pw.fill('demo1234')
    await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click()
    await wait(page, 1500)
  }
  await shot(page, file)
}

// ── รอบ 1: admin (มุมมองโรงพยาบาล) ──
const pa = await newPage()
await login(pa, 'admin', { shotLogin: true })
for (const [label, file, ms] of [
  ['หน้าหลัก', 'overview.png', 2200],
  ['ลงทะเบียนใบหน้า', 'face.png', 1500],
  ['การลงเวลาของพนักงาน', 'attendance.png', 1500],
  ['รายชื่อพนักงาน', 'rp-person.png', 1500],
  ['รายแผนก', 'rp-dept.png', 1800],
  ['รายเวร', 'rp-shift.png', 1800],
  ['รายงานสถิติการเข้า - ออกงาน', 'rp-late.png', 1800],
  ['ตั้งค่าแอปสแกน', 'settings.png', 1200],
  ['จุดลงเวลา', 'locations.png', 3000],       // แผนที่โหลดช้า
  ['คู่มือการใช้งาน', 'help.png', 1200],
  ['การแสดงผล', 'display.png', 1200],
]) await nav(pa, label, file, ms)

// 2 ธีมเด่น — ตั้ง localStorage แล้วรีเฟรช (ค้างที่หน้าการแสดงผล -> กลับหน้าหลักก่อน)
await nav(pa, 'หน้าหลัก', '_tmp.png', 1500)
for (const [theme, file] of [['hosxp', 'theme-hosxp.png'], ['glass', 'theme-glass.png']]) {
  await pa.evaluate((t) => localStorage.setItem('facehub_theme', t), theme)
  await pa.reload({ waitUntil: 'networkidle' })
  await wait(pa, 2500)
  await hideDev(pa)
  await shot(pa, file)
}
await pa.evaluate(() => localStorage.setItem('facehub_theme', 'light'))

// มือถือ — ก๊อป session เดิมเข้า context ใหม่
const sess = await pa.evaluate(() => localStorage.getItem('facecheck_session_v3'))
const mctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
})
await mctx.addInitScript((s) => { if (s) localStorage.setItem('facecheck_session_v3', s) }, sess)
const mp = await mctx.newPage()
await mp.goto(BASE, { waitUntil: 'networkidle' })
await mp.waitForTimeout(2500)
await mp.screenshot({ path: OUT + 'responsive.png' })
console.log('✓ responsive.png')

// ── รอบ 2: superadmin (เมนูส่วนกลาง) ──
const ps = await newPage()
await login(ps, 'superadmin')
for (const [label, file, ms] of [
  ['อนุมัติโรงพยาบาล', 'sys-approve.png', 1200],
  ['จัดการโรงพยาบาล', 'sys-hospitals.png', 1200],
  ['ผู้ใช้และสิทธิ์', 'sys-users.png', 1200],
  ['ประวัติการจัดการ', 'sys-audit.png', 1200],
  ['สถานะระบบ', 'health.png', 1200],
]) await nav(ps, label, file, ms)

// ── หน้า public: ขอลงทะเบียนโรงพยาบาล ──
await ps.goto(BASE + '/hospital-request', { waitUntil: 'networkidle' })
await wait(ps, 1500)
await shot(ps, 'hospital-request.png')

await browser.close()
console.log('เสร็จ — รูปอยู่ที่ presentation/public/shots/')
