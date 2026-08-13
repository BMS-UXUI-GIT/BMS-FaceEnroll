import type { Role, Session } from './state'

// ── Mock login + ข้อมูลตัวอย่าง ─────────────────────────────────────────────
// ใช้ตอนยังไม่มี backend (attendance-api :8300) — ข้ามหน้า login ไปดู UI ได้
// เปิดได้ 2 ทาง:
//
//   1) VITE_MOCK=1  — ใช้ตอน dev ในเครื่อง (ใส่ใน .env.local)
//      บังคับคู่กับ import.meta.env.DEV -> เป็น false เสมอตอน `vite build`
//      bundler จึงตัดทิ้งทั้งก้อน ไม่มีทางหลุดขึ้น production
//
//   2) VITE_DEMO=1  — ใช้ตอน build เว็บ demo ขึ้น GitHub Pages เท่านั้น
//      อันนี้ "ตั้งใจ" ให้ mock ติดไปกับ bundle เพราะเว็บ demo ต้องเล่นได้โดยไม่มี backend
//      ตั้งไว้ที่เดียวคือ .github/workflows/deploy-pages.yml
//      -> `npm run build` ปกติไม่ได้ตั้ง flag นี้ ผลลัพธ์จึงยังสะอาดเหมือนเดิม
//
// ⚠️ ห้ามตั้ง VITE_DEMO=1 ตอน build ที่จะเอาขึ้น server จริง — จะทำให้ login ทะลุได้
// ทั้งสองโหมดทำงานในเบราว์เซอร์ล้วน ไม่ยิง/ไม่แก้/ไม่แตะ backend และไม่มีข้อมูลจริงใดๆ

const DEMO = import.meta.env.VITE_DEMO === '1'
export const MOCK = (import.meta.env.DEV && import.meta.env.VITE_MOCK === '1') || DEMO

// เครื่องมือของนักพัฒนา (หน้าระบบดีไซน์) — โผล่เฉพาะตอนรัน dev ในเครื่องเท่านั้น
// ทุก build (รวมเว็บ demo) = false -> ไม่มีเมนู ไม่มี route ไม่โผล่ในค้นหาทั้งระบบ
// และ vite.config.ts สลับ import ไปที่ไฟล์ stub ตอน build โค้ดจึงไม่ติดไปกับ bundle เลย
export const DEV_TOOLS = import.meta.env.DEV

const ROLES: Role[] = ['superadmin', 'bmsadmin', 'admin', 'user']

// โรงพยาบาลตัวอย่าง — ส่วนกลางเห็นหลายโรง, admin/user ถูกปักไว้โรงเดียว
const HOSPITALS = [
  { value: '10670', label: 'โรงพยาบาลสาธิต (Mock)' },
  { value: '10671', label: 'โรงพยาบาลทดสอบ 2 (Mock)' },
  { value: '10672', label: 'โรงพยาบาลทดสอบ 3 (Mock)' },
]

// แท็บสิทธิ์ทั้งหมดที่ NAV_TAB อ้างถึง (state.tsx) — superadmin เห็นครบ
const ALL_TABS = ['overview', 'face', 'attendance', 'settings', 'health', 'audit', 'approve', 'tenants', 'users', 'help']
// admin = โรงตัวเอง ไม่มีเมนูงานส่วนกลาง (approve/tenants/users)
const ADMIN_TABS = ['overview', 'face', 'attendance', 'settings', 'health', 'audit', 'help']
// user = ดูอย่างเดียว
const USER_TABS = ['overview', 'attendance', 'help']

function tabsFor(role: Role): string[] {
  if (role === 'superadmin' || role === 'bmsadmin') return ALL_TABS
  if (role === 'admin') return ADMIN_TABS
  return USER_TABS
}

// บุคลากรตัวอย่างสำหรับ login ผ่าน HOSxP — เลือกแบบคงที่จาก username (เข้าชื่อเดิมทุกครั้ง)
const STAFF = [
  { name: 'สมหญิง ใจดี', position: 'พยาบาลวิชาชีพชำนาญการ · อายุรกรรม' },
  { name: 'ณัฐพงษ์ ศรีสุข', position: 'นักวิชาการคอมพิวเตอร์ · ศูนย์คอมพิวเตอร์' },
  { name: 'พิมพ์ชนก วงศ์ทอง', position: 'เจ้าพนักงานธุรการชำนาญงาน · บริหารงานทั่วไป' },
  { name: 'ธนกร แสงเพชร', position: 'นายแพทย์ชำนาญการ · ศัลยกรรม' },
  { name: 'อรุณี พูลทรัพย์', position: 'เภสัชกรชำนาญการ · เภสัชกรรม' },
]
const pickStaff = (seed: string) => {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return STAFF[h % STAFF.length]
}

const LABEL: Record<Role, string> = {
  superadmin: 'ผู้ดูแลระบบสูงสุด (Mock)',
  bmsadmin: 'BMS Admin (Mock)',
  admin: 'ผู้ดูแลโรงพยาบาล (Mock)',
  user: 'ผู้ใช้งาน (Mock)',
}

// พิมพ์ username เป็นชื่อ role -> เข้าเป็น role นั้น (เช่น "admin", "user")
// พิมพ์อย่างอื่น -> superadmin (เห็นเมนูครบที่สุด)
function roleFrom(username: string): Role {
  const u = username.trim().toLowerCase()
  return (ROLES.find((r) => r === u) ?? 'superadmin') as Role
}

// บางหน้าเรียก fetch() ตรงๆ ไม่ผ่าน api.ts (หน้า login ค้นโรง, หน้าลงทะเบียนโรงพยาบาล)
// ดักที่ระดับ window.fetch เฉพาะ request ที่วิ่งไป backend — request อื่น (แผนที่ ฯลฯ) ปล่อยผ่าน
export function installMockFetch() {
  if (!MOCK) return
  const orig = window.fetch.bind(window)
  const base = window.__API_BASE__ || (import.meta.env.VITE_API_BASE as string | undefined) || 'http://localhost:8300'
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (!url.startsWith(base)) return orig(input as any, init)
    const { mockRoute } = await import('./mockData')
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    const out = mockRoute(method, url.slice(base.length), body)
    await new Promise((r) => setTimeout(r, 120))
    const json = (v: unknown, status: number) =>
      new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } })
    return out === undefined
      ? json({ detail: `[mock] ยังไม่มีข้อมูลตัวอย่างของ ${url.slice(base.length)}` }, 404)
      : json(out, 200)
  }
}

export function mockSession(username: string, opts: { kind?: string; hcode?: string } = {}): Session {
  // login ด้วยบัญชี HOSxP = บุคลากรของโรงนั้น -> role user (ดูอย่างเดียว) ปักโรงที่กรอกมาเสมอ
  // (ไม่เดา role จาก username เหมือน login ปกติ — พนักงานโรงไม่มีทางเป็นบัญชีส่วนกลาง)
  const role = opts.kind === 'staff' ? 'user' : roleFrom(username)
  const central = role === 'superadmin' || role === 'bmsadmin'
  // ส่วนกลางเห็นทุกโรง; admin/user ปักโรงเดียว (ใช้ hcode ที่ส่งมาถ้ามี — มาจากแท็บผู้ใช้งาน)
  // โรงที่ปัก: ใช้ hcode ที่ส่งมาเสมอ (โรงจากหน้า login อาจไม่อยู่ในลิสต์ตัวอย่าง 3 โรงนี้)
  const one = HOSPITALS.find((h) => h.value === opts.hcode)
    ?? (opts.hcode ? { value: opts.hcode, label: `โรงพยาบาล ${opts.hcode} (Mock)` } : HOSPITALS[0])
  const name = username.trim() || role
  const staff = opts.kind === 'staff' ? pickStaff(`${username}|${opts.hcode ?? ''}`) : null
  return {
    token: `mock-token-${role}`,
    username: name,
    role,
    ...(opts.kind ? { kind: opts.kind } : {}),
    name: staff?.name ?? LABEL[role],
    ...(staff ? { position: staff.position } : {}),
    initial: ((staff?.name ?? name)[0] ?? 'M').toUpperCase(),
    hospitals: central ? HOSPITALS : [one],
    tabs: tabsFor(role),
    demo_hcode: '',
  }
}
