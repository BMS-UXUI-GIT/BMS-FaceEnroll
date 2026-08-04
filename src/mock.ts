import type { Role, Session } from './state'

// ── Mock login (dev เท่านั้น) ────────────────────────────────────────────────
// ใช้ตอนยังไม่มี backend (attendance-api :8300) รันในเครื่อง — ข้ามหน้า login ไปดู UI ได้
//
// เปิดใช้: สร้างไฟล์ .env.local ที่ root แล้วใส่ VITE_MOCK=1 จากนั้นรัน dev ใหม่
// ปิด: ลบบรรทัดนั้น (หรือลบไฟล์) — กลับไปต่อ backend จริงเหมือนเดิม 100%
//
// ⚠️ ความปลอดภัย: ทุกจุดที่เรียก mock ถูกครอบด้วย import.meta.env.DEV ซึ่งเป็น false
// ตอน `vite build` เสมอ — bundler จึงตัดโค้ดก้อนนี้ทิ้งทั้งหมด ไม่มีทางหลุดขึ้น production
// (ไฟล์นี้แตะเฉพาะฝั่ง frontend ไม่ยิง/ไม่แก้ backend ใดๆ)

export const MOCK = import.meta.env.DEV && import.meta.env.VITE_MOCK === '1'

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
  const role = roleFrom(username)
  const central = role === 'superadmin' || role === 'bmsadmin'
  // ส่วนกลางเห็นทุกโรง; admin/user ปักโรงเดียว (ใช้ hcode ที่ส่งมาถ้ามี — มาจากแท็บผู้ใช้งาน)
  const one = HOSPITALS.find((h) => h.value === opts.hcode) ?? HOSPITALS[0]
  const name = username.trim() || role
  return {
    token: `mock-token-${role}`,
    username: name,
    role,
    ...(opts.kind ? { kind: opts.kind } : {}),
    name: LABEL[role],
    initial: (name[0] ?? 'M').toUpperCase(),
    hospitals: central ? HOSPITALS : [one],
    tabs: tabsFor(role),
    demo_hcode: '',
  }
}
