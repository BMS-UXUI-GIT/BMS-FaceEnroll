// ── ข้อมูลตัวอย่างสำหรับ dev (mock) ─────────────────────────────────────────
// ตอบแทน backend ทุก endpoint ที่หน้าจอเรียก เพื่อให้เปิดดู UI ได้ครบโดยไม่ต้องมี
// attendance-api (:8300) รันในเครื่อง — ไม่ยิง ไม่แก้ ไม่แตะ backend ใดๆ
//
// เปิดใช้: .env.local -> VITE_MOCK=1  (ดูหัวไฟล์ src/mock.ts)
// ทุกจุดเรียกถูกครอบด้วย import.meta.env.DEV -> ตอน build โค้ดนี้ถูกตัดทิ้งทั้งไฟล์
//
// ข้อมูลถูกสร้างจาก seed คงที่ (mulberry32) -> รีเฟรชกี่ครั้งตัวเลขก็เท่าเดิม
// ไม่กระโดดไปมาจนดูรายงานไม่รู้เรื่อง แต่เลื่อนตามวันที่ที่เลือกจริง

// ── สุ่มแบบกำหนดผลได้ ───────────────────────────────────────────────────────
function rand(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = <T,>(arr: T[], r: number) => arr[Math.floor(r * arr.length) % arr.length]
const int = (r: number, lo: number, hi: number) => lo + Math.floor(r * (hi - lo + 1))

// ── วันที่ ─────────────────────────────────────────────────────────────────
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const today = () => iso(new Date())
function dateRange(from: string, to: string): string[] {
  const a = new Date(`${from}T00:00:00`), b = new Date(`${to}T00:00:00`)
  if (isNaN(a.getTime()) || isNaN(b.getTime()) || b < a) return [to || today()]
  const out: string[] = []
  for (const d = new Date(a); d <= b && out.length < 62; d.setDate(d.getDate() + 1)) out.push(iso(d))
  return out
}
// wrap ให้อยู่ 0..1439 เสมอ — เวรดึก (start=0) มาก่อนเวลาได้ inMin ติดลบ ต้องม้วนกลับเป็น 23:xx
const hhmm = (mins: number) => {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// ── ข้อมูลตั้งต้น ───────────────────────────────────────────────────────────
const FIRST = ['สมชาย', 'สมหญิง', 'อนันต์', 'ปรียา', 'วิชัย', 'มาลี', 'ณัฐพล', 'ศิริพร', 'ธนากร', 'กนกนิษฐ์', 'ประเสริฐ', 'จันทรา', 'ภูมิ', 'อารยา', 'เอกชัย', 'พิมพ์ใจ']
const LAST = ['ใจดี', 'สุขสันต์', 'ทองมา', 'ศรีสุข', 'บุญมี', 'รักไทย', 'พงศ์ธร', 'วัฒนา', 'อินทร์แก้ว', 'แสงทอง', 'ชัยมงคล', 'ธีรพงษ์']
const DEPTS = ['อายุรกรรม', 'ศัลยกรรม', 'กุมารเวชกรรม', 'ห้องฉุกเฉิน', 'เภสัชกรรม', 'ห้องปฏิบัติการ', 'การเงิน', 'ธุรการ', '']
const SHIFTS = [
  { id: 'M', name: 'เช้า (08:00-16:00)', start: 8 * 60 },
  { id: 'A', name: 'บ่าย (16:00-24:00)', start: 16 * 60 },
  { id: 'N', name: 'ดึก (00:00-08:00)', start: 0 },
]
const POSITIONS = ['พยาบาลวิชาชีพ', 'นักวิชาการสาธารณสุข', 'เจ้าพนักงานธุรการ', 'แพทย์', 'เภสัชกร', 'ผู้ช่วยพยาบาล']
const EMP_TYPES = ['ข้าราชการ', 'พนักงานราชการ', 'ลูกจ้างชั่วคราว', 'พนักงานกระทรวง']

export type MockEmp = {
  emp: string; name: string; dept: string; position: string; phone: string; email: string
  start_date: string; emp_type: string; shift: (typeof SHIFTS)[number]; enrolled: boolean
}

const EMPLOYEES: MockEmp[] = Array.from({ length: 48 }, (_, i) => {
  const r = rand(1000 + i)
  return {
    emp: String(10001 + i),
    name: `${pick(FIRST, r())} ${pick(LAST, r())}`,
    dept: pick(DEPTS, r()),
    position: pick(POSITIONS, r()),
    phone: `08${int(r(), 1, 9)}-${String(int(r(), 100, 999))}-${String(int(r(), 1000, 9999))}`,
    // อีเมลตัวอย่าง — ใช้ emp_id เป็นชื่อกล่อง (ชื่อไทยเอามาทำ local part ไม่ได้)
    email: `staff${10001 + i}@hospital.example.com`,
    start_date: `${int(r(), 2012, 2023)}-${String(int(r(), 1, 12)).padStart(2, '0')}-${String(int(r(), 1, 28)).padStart(2, '0')}`,
    emp_type: pick(EMP_TYPES, r()),
    shift: pick(SHIFTS, r()),
    enrolled: r() > 0.18, // ~82% ลงทะเบียนใบหน้าแล้ว
  }
})
const ENROLLED = EMPLOYEES.filter((e) => e.enrolled)
const deptOf = (e: MockEmp) => e.dept
// จำนวนใบหน้าคงที่ต่อคน (seed จาก emp) — ใช้ทั้งตารางและนับ "ลงทะเบียนไม่ครบ" ให้ตรงกัน
const faceCountOf = (e: MockEmp) => int(rand(Number(e.emp) || 1)(), 1, 5)

// จุดลงเวลา (พิกัดตัวอย่าง — โรงพยาบาลสมมติ)
const FENCES = [
  { name: 'อาคารผู้ป่วยนอก', lat: 13.7563, lng: 100.5018, radius_m: 120 },
  { name: 'อาคารอุบัติเหตุ-ฉุกเฉิน', lat: 13.7571, lng: 100.5032, radius_m: 80 },
]

// ── การลงเวลา 1 คน 1 วัน ───────────────────────────────────────────────────
type Punch = {
  emp: MockEmp; date: string; inMin: number; outMin: number
  late: boolean; early: boolean; late_min: number; early_min: number
  no_out: boolean; out_area: boolean; dist_m: number | null; absent: boolean
}
function punchOf(e: MockEmp, date: string, empIdx: number, dayIdx: number): Punch {
  const r = rand(empIdx * 977 + dayIdx * 31 + 7)
  const absent = r() < 0.06                       // ~6% ไม่มาสแกน
  const lateRoll = r()
  const late = lateRoll < 0.17                    // ~17% มาสาย
  const late_min = late ? int(r(), 3, 47) : 0
  const earlyRoll = r()
  const early = earlyRoll < 0.09
  const early_min = early ? int(r(), 5, 35) : 0
  const no_out = r() < 0.07                       // ลืมสแกนออก
  const out_area = r() < 0.05                     // สแกนนอกพื้นที่
  const inMin = e.shift.start + (late ? late_min : -int(r(), 0, 18))
  const outMin = e.shift.start + 8 * 60 - (early ? early_min : -int(r(), 0, 25))
  return {
    emp: e, date, inMin, outMin, late, early, late_min, early_min, no_out, out_area,
    dist_m: out_area ? int(r(), 130, 900) : int(r(), 5, 95), absent,
  }
}
// การลงเวลาทั้งโรงในช่วงวันที่ (กรองคนที่ไม่มาออก)
function punches(dates: string[]): Punch[] {
  const out: Punch[] = []
  dates.forEach((d, di) => EMPLOYEES.forEach((e, ei) => {
    const p = punchOf(e, d, ei, di)
    if (!p.absent) out.push(p)
  }))
  return out
}
const statusOf = (p: Punch) => (p.no_out ? 'ยังไม่ออก' : p.late ? 'มาสาย' : p.early ? 'ออกก่อน' : 'ปกติ')
const coordsOf = (p: Punch) => {
  const r = rand(Number(p.emp.emp) + p.date.length)
  const f = FENCES[0]
  const jitter = p.out_area ? 0.006 : 0.0006
  return [
    { lat: f.lat + (r() - 0.5) * jitter, lng: f.lng + (r() - 0.5) * jitter, time: hhmm(p.inMin) },
    ...(p.no_out ? [] : [{ lat: f.lat + (r() - 0.5) * jitter, lng: f.lng + (r() - 0.5) * jitter, time: hhmm(p.outMin) }]),
  ]
}

// ── สรุป/วิเคราะห์ (ใช้ร่วมหลายหน้า) ─────────────────────────────────────────
function summaryOf(ps: Punch[], dates: string[]) {
  return {
    date: dates[dates.length - 1], date_from: dates[0], date_to: dates[dates.length - 1], days: dates.length,
    punched: ps.length,
    done: ps.filter((p) => !p.no_out).length,
    open: ps.filter((p) => p.no_out).length,
    late: ps.filter((p) => p.late).length,
    early: ps.filter((p) => p.early).length,
    out_area: ps.filter((p) => p.out_area).length,
  }
}
function analytics(from: string, to: string) {
  const dates = dateRange(from, to)
  const ps = punches(dates)
  const lateP = ps.filter((p) => p.late)
  const earlyP = ps.filter((p) => p.early)

  const days = dates.map((d) => {
    const dp = ps.filter((p) => p.date === d)
    const dl = dp.filter((p) => p.late)
    return {
      date: d, punched: dp.length, on_time: dp.length - dl.length, late: dl.length,
      early: dp.filter((p) => p.early).length,
      avg_late_min: dl.length ? +(dl.reduce((s, p) => s + p.late_min, 0) / dl.length).toFixed(1) : 0,
    }
  })

  const shifts = SHIFTS.map((s) => {
    const sp = ps.filter((p) => p.emp.shift.id === s.id)
    const avgIn = sp.length ? Math.round(sp.reduce((a, p) => a + p.inMin, 0) / sp.length) : s.start
    return {
      name: s.name,
      persons: new Set(sp.map((p) => p.emp.emp)).size,
      late: sp.filter((p) => p.late).length,
      early: sp.filter((p) => p.early).length,
      avg_in: hhmm(avgIn),
    }
  })

  const depts = [...new Set(EMPLOYEES.map(deptOf))].map((dept) => {
    const staff = EMPLOYEES.filter((e) => deptOf(e) === dept).length
    const dp = ps.filter((p) => deptOf(p.emp) === dept)
    const present = new Set(dp.map((p) => p.emp.emp)).size
    return {
      dept, staff, present, person_days: dp.length,
      late: dp.filter((p) => p.late).length,
      early: dp.filter((p) => p.early).length,
      no_out: dp.filter((p) => p.no_out).length,
      rate: staff ? +((dp.length / (staff * dates.length)) * 100).toFixed(2) : null,
    }
  })

  // อันดับคนมาสายบ่อย
  const byEmp = new Map<string, { emp: string; name: string; dept: string; count: number; total: number }>()
  lateP.forEach((p) => {
    const k = p.emp.emp
    const cur = byEmp.get(k) ?? { emp: k, name: p.emp.name, dept: deptOf(p.emp), count: 0, total: 0 }
    cur.count++; cur.total += p.late_min
    byEmp.set(k, cur)
  })
  const top_late = [...byEmp.values()]
    .map((x) => ({ emp: x.emp, name: x.name, dept: x.dept, count: x.count, avg_min: +(x.total / x.count).toFixed(1) }))
    .sort((a, b) => b.count - a.count).slice(0, 10)

  const rowOf = (p: Punch) => ({
    emp: p.emp.emp, name: p.emp.name, dept: deptOf(p.emp), date: p.date,
    shift: p.emp.shift.name, in: hhmm(p.inMin), out: p.no_out ? '' : hhmm(p.outMin),
  })

  return {
    summary: summaryOf(ps, dates),
    total_staff: EMPLOYEES.length,
    // เข้าเวรล่าสุด (Dashboard)
    recent: ps.slice(-25).reverse().map((p) => ({
      emp: p.emp.emp, seq: 1, name: p.emp.name, date: p.date, in: hhmm(p.inMin),
      out: p.no_out ? '' : hhmm(p.outMin), shift: p.emp.shift.name, dept: deptOf(p.emp),
      late: p.late, status: statusOf(p),
    })),
    days, shifts, depts, top_late,
    avg_late_min: lateP.length ? +(lateP.reduce((s, p) => s + p.late_min, 0) / lateP.length).toFixed(1) : 0,
    late_total: lateP.length,
    early_total: earlyP.length,
    late_rows: lateP.slice(0, 300).map((p) => ({ ...rowOf(p), min: p.late_min })),
    early_rows: earlyP.slice(0, 300).map((p) => ({ ...rowOf(p), out: hhmm(p.outMin), min: p.early_min })),
  }
}

// ── นโยบายการสแกน (Settings + Locations) ────────────────────────────────────
let POLICY: Record<string, any> = {
  liveness_enabled: true, liveness_count: 2, liveness_type: 'random',
  liveness_yaw_deg: 20, liveness_pitch_deg: 12, liveness_eye_open: 0.35, liveness_smile: 0.5,
  smile_confirm: false, confirm_popup: true, min_face_width: 40,
  bms_noti: true, noti_token: 'mock-noti-token-xxxx',
  telegram_noti: false, telegram_bot_token: '', telegram_chat_id: '',
  gps_required: true, gps_lat: FENCES[0].lat, gps_lng: FENCES[0].lng, gps_radius_m: FENCES[0].radius_m,
  gps_locations: FENCES.map((f) => ({ ...f })),
}

// ── โรงพยาบาล (tenants) ────────────────────────────────────────────────────
const mkTenant = (o: Partial<any> & { hcode: string; name: string }) => ({
  active: true, province: 'กรุงเทพมหานคร', status: 'approved', request_type: 'real',
  demo_expires_at: null, demo_expired: false, prod_expires_at: null,
  contact_name: 'ผู้ประสานงาน (ตัวอย่าง)', contact_phone: '02-000-0000', contact_email: 'contact@example.local',
  requested_at: '2025-11-02', approved_by: 'superadmin', approved_at: '2025-11-05', reject_reason: '',
  note: '', health: 'ok',
  dry_run: { value: false, override: false }, auth_enforce: { value: true, override: false },
  eligibility_check: { value: true, override: false }, has_status: { value: true, override: false },
  ...o,
})
let TENANTS: any[] = [
  mkTenant({ hcode: '10670', name: 'โรงพยาบาลสาธิต (Mock)' }),
  mkTenant({ hcode: '10671', name: 'โรงพยาบาลทดสอบ 2 (Mock)', health: 'watch', province: 'เชียงใหม่' }),
  mkTenant({ hcode: '10672', name: 'โรงพยาบาลทดสอบ 3 (Mock)', request_type: 'demo', demo_expires_at: '2026-09-15', province: 'ขอนแก่น' }),
  mkTenant({ hcode: '10673', name: 'โรงพยาบาลใกล้หมดอายุ (Mock)', request_type: 'demo', demo_expires_at: '2026-08-08', health: 'watch', province: 'ภูเก็ต' }),
  mkTenant({ hcode: '10674', name: 'โรงพยาบาลหมดอายุทดลอง (Mock)', request_type: 'demo', demo_expires_at: '2026-06-30', demo_expired: true, health: 'risk', active: false, province: 'สงขลา' }),
  mkTenant({ hcode: '10675', name: 'โรงพยาบาลรออนุมัติ A (Mock)', status: 'pending', approved_by: '', approved_at: null, requested_at: '2026-07-28', province: 'นครราชสีมา' }),
  mkTenant({ hcode: '10676', name: 'โรงพยาบาลรออนุมัติ B (Mock)', status: 'pending', approved_by: '', approved_at: null, requested_at: '2026-07-30', province: 'อุบลราชธานี' }),
  mkTenant({ hcode: '10677', name: 'โรงพยาบาลรออนุมัติ C (Mock)', status: 'pending', approved_by: '', approved_at: null, requested_at: '2026-08-01', province: 'ชลบุรี' }),
  mkTenant({ hcode: '10678', name: 'โรงพยาบาลพักใช้ (Mock)', status: 'suspended', active: false, health: 'risk', province: 'ลำปาง' }),
  mkTenant({ hcode: '10679', name: 'โรงพยาบาลถูกปฏิเสธ (Mock)', status: 'rejected', active: false, reject_reason: 'ข้อมูลผู้ติดต่อไม่ครบถ้วน', province: 'ตาก' }),
]
const bucketOf = (t: any): string => {
  if (t.status === 'pending') return 'pending'
  if (t.status === 'rejected') return 'rejected'
  if (t.status === 'suspended' || !t.active) return 'suspended'
  if (t.request_type === 'demo') {
    if (t.demo_expired) return 'demo_expired'
    const left = t.demo_expires_at ? Math.ceil((new Date(`${t.demo_expires_at}T23:59:59`).getTime() - Date.now()) / 86400000) : null
    return left != null && left <= 7 ? 'demo_expiring' : 'demo'
  }
  return 'real'
}
const daysLeftOf = (t: any) =>
  t.demo_expires_at ? Math.ceil((new Date(`${t.demo_expires_at}T23:59:59`).getTime() - Date.now()) / 86400000) : null
const platformRow = (t: any) => ({
  hcode: t.hcode, name: t.name, bucket: bucketOf(t), request_type: t.request_type,
  demo_expires_at: t.demo_expires_at, demo_days_left: daysLeftOf(t),
  contact_name: t.contact_name, contact_phone: t.contact_phone, requested_at: t.requested_at,
})

// ── ผู้ใช้และสิทธิ์ ─────────────────────────────────────────────────────────
const ALL_TABS = ['overview', 'face', 'attendance', 'settings', 'health', 'approve', 'tenants', 'audit', 'users', 'help']
const ROLE_DEFAULT_TABS: Record<string, string[]> = {
  superadmin: ALL_TABS,
  bmsadmin: ['overview', 'face', 'attendance', 'settings', 'health', 'approve', 'tenants', 'audit', 'help'],
  admin: ['overview', 'face', 'attendance', 'settings', 'health', 'audit', 'help'],
  user: ['overview', 'attendance', 'help'],
}
let USERS: any[] = [
  { username: 'superadmin', display_name: 'ผู้ดูแลระบบสูงสุด (Mock)', role: 'superadmin', hcodes: [], tabs: null, active: true, last_login_at: '2026-08-04 09:12' },
  { username: 'bmsadmin', display_name: 'BMS Admin (Mock)', role: 'bmsadmin', hcodes: [], tabs: null, active: true, last_login_at: '2026-08-03 16:40' },
  { username: 'admin10670', display_name: 'ผู้ดูแล รพ.สาธิต', role: 'admin', hcodes: ['10670'], tabs: null, active: true, last_login_at: '2026-08-04 08:05' },
  { username: 'admin10671', display_name: 'ผู้ดูแล รพ.ทดสอบ 2', role: 'admin', hcodes: ['10671'], tabs: ['overview', 'attendance', 'help'], active: true, last_login_at: '2026-07-29 11:20' },
  { username: 'viewer01', display_name: 'ผู้บริหาร (ดูอย่างเดียว)', role: 'user', hcodes: ['10670'], tabs: null, active: true, last_login_at: '2026-08-02 19:02' },
  { username: 'olduser', display_name: 'บัญชีปิดใช้งาน', role: 'user', hcodes: ['10672'], tabs: null, active: false, last_login_at: null },
]
const usersRes = () => ({
  users: USERS.map((u) => ({ ...u, effective_tabs: u.tabs ?? ROLE_DEFAULT_TABS[u.role] ?? [] })),
  roles: ['superadmin', 'bmsadmin', 'admin', 'user'],
  all_tabs: ALL_TABS,
  role_default_tabs: ROLE_DEFAULT_TABS,
  role_tabs: ROLE_DEFAULT_TABS,
})

// ── ประวัติการจัดการ (audit) ────────────────────────────────────────────────
const AUDIT_ACTIONS = ['login', 'tenant.approve', 'tenant.flag', 'policy.update', 'user.create', 'user.password', 'face.delete', 'attendance.correction']
const AUDIT: any[] = Array.from({ length: 120 }, (_, i) => {
  const r = rand(50000 + i)
  const d = new Date(); d.setHours(d.getHours() - i * 5)
  return {
    ts: `${iso(d)} ${hhmm(d.getHours() * 60 + d.getMinutes())}`,
    actor: pick(['superadmin', 'bmsadmin', 'admin10670', 'admin10671'], r()),
    role: pick(['superadmin', 'bmsadmin', 'admin'], r()),
    action: pick(AUDIT_ACTIONS, r()),
    target: pick(['10670', '10671', '10672', 'viewer01', '10001'], r()),
    detail: 'ข้อมูลตัวอย่างสำหรับทดสอบหน้าจอ',
    ip: `10.0.${int(r(), 0, 9)}.${int(r(), 2, 250)}`,
  }
})

// ── ตัวช่วย ────────────────────────────────────────────────────────────────
const page = <T,>(rows: T[], qs: URLSearchParams, offsetKey = 'offset') => {
  const limit = Number(qs.get('limit') ?? 20)
  const offset = Number(qs.get(offsetKey) ?? 0)
  return rows.slice(offset, offset + (limit > 0 ? limit : 20))
}
const like = (hay: string, needle: string | null) =>
  !needle || hay.toLowerCase().includes(needle.toLowerCase())

/** ตอบ endpoint ตาม path — คืน undefined ถ้าไม่รู้จัก (api.ts จะโยน error ให้เห็นชัด) */
export function mockRoute(method: string, fullPath: string, body?: any): any {
  const [p, query = ''] = fullPath.split('?')
  const qs = new URLSearchParams(query)
  const from = qs.get('date_from') || qs.get('date') || today()
  const to = qs.get('date_to') || qs.get('date') || from
  const m = method.toUpperCase()

  // ── งานส่วนกลาง ────────────────────────────────────────────────────────
  if (p === '/admin/badges') return { pending_hospitals: TENANTS.filter((t) => t.status === 'pending').length }

  if (p === '/admin/health') {
    return {
      face: { status: 'ok', version: '2.4.1-mock', engine: { ok: true, url: 'http://luxand.mock:8080' }, db: { ok: true, name: 'facedb-mock' } },
      attendance: { dry_run_global: false, facescan_configured: true },
      dashboard_db: 'postgres://mock/dashboard (ตัวอย่าง)',
      hospitals: TENANTS.map((t, i) => ({
        hcode: t.hcode, name: t.name,
        ok: t.health !== 'risk',
        latency_ms: int(rand(700 + i)(), 18, 480),
        error: t.health === 'risk' ? 'เชื่อมต่อฐานข้อมูล HOSxP ไม่ได้ (ตัวอย่าง)' : '',
      })),
    }
  }

  if (p === '/admin/platform/overview') {
    const rows = TENANTS.map(platformRow)
    const counts: Record<string, number> = {}
    rows.forEach((r) => { counts[r.bucket] = (counts[r.bucket] ?? 0) + 1 })
    return {
      total: rows.length, counts, hospitals: rows,
      recent: [...rows].sort((a, b) => String(b.requested_at).localeCompare(String(a.requested_at))).slice(0, 8),
      follow_up: rows.filter((r) => ['pending', 'demo_expiring', 'demo_expired'].includes(r.bucket)),
    }
  }

  if (p === '/admin/tenants' && m === 'GET') return { tenants: TENANTS }

  // /admin/tenants/{hcode}/detail | /meta | /flag | /approve | /reject | ...
  const tm = /^\/admin\/tenants\/([^/]+)(?:\/(\w+))?$/.exec(p)
  if (tm) {
    const [, hcode, sub] = tm
    const t = TENANTS.find((x) => x.hcode === hcode)
    if (sub === 'detail') {
      return {
        tenant: t ?? TENANTS[0],
        users: USERS.filter((u) => u.hcodes.includes(hcode)).map(({ username, display_name, role, active, last_login_at }) => ({ username, display_name, role, active, last_login_at })),
        audit: AUDIT.filter((a) => a.target === hcode).slice(0, 10).map(({ ts, actor, action, detail }) => ({ ts, actor, action, detail })),
        usage: { active_staff: EMPLOYEES.length, enrolled: ENROLLED.length, punched_today: punches([today()]).length },
      }
    }
    if (m === 'POST' && t) {
      if (sub === 'flag' && body?.flag) t[body.flag] = { value: !!body.value, override: true }
      else if (sub === 'meta') Object.assign(t, body ?? {})
      else if (sub === 'approve') Object.assign(t, { status: 'approved', active: true, request_type: body?.request_type ?? t.request_type, approved_by: 'superadmin', approved_at: today() })
      else if (sub === 'reject') Object.assign(t, { status: 'rejected', active: false, reject_reason: body?.reason ?? '' })
      else if (sub === 'suspend') Object.assign(t, { status: 'suspended', active: false })
      else if (sub === 'activate' || sub === 'resume') Object.assign(t, { status: 'approved', active: true })
      else if (sub === 'extend') Object.assign(t, { demo_expires_at: body?.demo_expires_at ?? t.demo_expires_at, demo_expired: false })
      return { tenants: TENANTS }
    }
    if (m === 'POST' || m === 'PATCH' || m === 'DELETE') return { tenants: TENANTS }
  }

  if (p === '/admin/audit') {
    const rows = AUDIT.filter((a) =>
      like(a.actor, qs.get('actor')) && like(a.action, qs.get('action')) &&
      like(`${a.actor} ${a.action} ${a.target} ${a.detail}`, qs.get('q')))
    return { rows: page(rows, qs), total: rows.length }
  }

  // ── ผู้ใช้ ─────────────────────────────────────────────────────────────
  if (p === '/admin/users' && m === 'GET') return usersRes()
  if (p === '/admin/users' && m === 'POST') {
    USERS = [...USERS, { username: body?.username ?? 'newuser', display_name: body?.display_name ?? 'ผู้ใช้ใหม่ (Mock)', role: body?.role ?? 'user', hcodes: body?.hcodes ?? [], tabs: body?.tabs ?? null, active: true, last_login_at: null }]
    return usersRes()
  }
  const um = /^\/admin\/users\/(.+)$/.exec(p)
  if (um) {
    const uname = decodeURIComponent(um[1])
    if (m === 'DELETE') USERS = USERS.filter((u) => u.username !== uname)
    else if (m === 'PATCH') USERS = USERS.map((u) => (u.username === uname ? { ...u, ...(body ?? {}), password: undefined } : u))
    return usersRes()
  }

  if (p === '/admin/hospitals/search') {
    const q = qs.get('q')
    return { hospitals: TENANTS.filter((t) => like(`${t.hcode} ${t.name}`, q)).map((t) => ({ hcode: t.hcode, name: t.name })) }
  }

  // ── นโยบาย (ตั้งค่าแอปสแกน + จุดลงเวลา) ─────────────────────────────────
  if (p === '/admin/policy' && m === 'GET') return { policy: POLICY }
  if (/^\/admin\/policy\//.test(p) && m === 'POST') {
    POLICY = { ...POLICY, ...(body ?? {}) }
    return { policy: POLICY }
  }

  // ── สถานะโรง / กระทบยอด (Dashboard) ─────────────────────────────────────
  if (p === '/admin/tenant-status') {
    const t = TENANTS.find((x) => x.hcode === qs.get('hcode')) ?? TENANTS[0]
    return {
      registered: t.status === 'approved', request_type: t.request_type,
      demo_expires_at: t.demo_expires_at, demo_days_left: daysLeftOf(t), expired: !!t.demo_expired,
    }
  }
  if (p === '/admin/recon') {
    const ps = punches([to])
    const punched = new Set(ps.map((x) => x.emp.emp))
    const slim = (list: MockEmp[]) => ({ count: list.length, rows: list.map((e) => ({ emp_id: e.emp, name: e.name })) })
    return {
      match_no_punch: slim(EMPLOYEES.filter((e) => e.enrolled && !punched.has(e.emp))),
      punch_no_match: slim(EMPLOYEES.filter((e) => !e.enrolled && punched.has(e.emp)).slice(0, 4)),
      not_enrolled: slim(EMPLOYEES.filter((e) => !e.enrolled)),
    }
  }

  // ── ลงเวลา ─────────────────────────────────────────────────────────────
  if (p === '/admin/attendance/filters') {
    return {
      shifts: SHIFTS.map((s) => ({ id: s.id, name: s.name })),
      departments: [...new Set(EMPLOYEES.map(deptOf))].filter(Boolean).map((d) => ({ id: d, name: d })),
    }
  }
  if (p === '/admin/attendance/analytics') return analytics(from, to)

  if (p === '/admin/attendance/daily') {
    const dates = dateRange(from, to)
    const all = punches(dates)
    return {
      summary: summaryOf(all, dates),
      total: all.length,
      fences: FENCES,
      rows: page(all, qs).map((x) => ({
        emp: x.emp.emp, name: x.emp.name, dept: deptOf(x.emp), date: x.date, seq: 1,
        in: hhmm(x.inMin), out: x.no_out ? '' : hhmm(x.outMin), shift: x.emp.shift.name,
        gps: true, coords: coordsOf(x),
        late: x.late, early: x.early, no_out: x.no_out, out_area: x.out_area,
        late_min: x.late_min, early_min: x.early_min, dist_m: x.dist_m,
        status: statusOf(x), status_in: x.late ? 'สาย' : 'ปกติ', status_out: x.no_out ? '' : x.early ? 'ออกก่อน' : 'ปกติ',
      })),
    }
  }

  if (p === '/admin/attendance/timesheet') {
    const dates = dateRange(from, to)
    const bad = punches(dates).filter((x) => x.late || x.early || x.no_out || x.out_area)
    return {
      from: dates[0], to: dates[dates.length - 1], total: bad.length,
      rows: page(bad, qs).map((x) => ({
        emp: x.emp.emp, name: x.emp.name, dept: deptOf(x.emp), date: x.date, shift: x.emp.shift.name, seq: 1,
        io: x.no_out ? 'เข้า' : 'เข้า-ออก',
        issue: x.no_out ? 'ไม่สแกนออก' : x.late ? `มาสาย ${x.late_min} นาที` : x.early ? `ออกก่อน ${x.early_min} นาที` : 'สแกนนอกพื้นที่',
      })),
    }
  }

  if (p === '/admin/attendance/monthly') {
    const month = qs.get('month') || today().slice(0, 7)
    const last = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()
    const dates = dateRange(`${month}-01`, `${month}-${String(last).padStart(2, '0')}`)
    const all = punches(dates)
    const rows = EMPLOYEES.map((e) => {
      const mine = all.filter((x) => x.emp.emp === e.emp)
      return {
        emp: e.emp, name: e.name, dept: deptOf(e),
        present: mine.length,
        late: mine.filter((x) => x.late).length,
        early: mine.filter((x) => x.early).length,
        no_out: mine.filter((x) => x.no_out).length,
        out_area: mine.filter((x) => x.out_area).length,
      }
    })
    return { month, days_counted: dates.length, total: rows.length, rows: page(rows, qs) }
  }

  if (p === '/admin/attendance/employee') {
    const empId = qs.get('emp_id') ?? EMPLOYEES[0].emp
    const e = EMPLOYEES.find((x) => x.emp === empId) ?? EMPLOYEES[0]
    const idx = EMPLOYEES.indexOf(e)
    const days = Number(qs.get('days') ?? 0)
    const dates = days > 0
      ? dateRange(iso(new Date(Date.now() - (days - 1) * 86400000)), today())
      : dateRange(from, to)
    const mine = dates.map((d, di) => punchOf(e, d, idx, di)).filter((x) => !x.absent)
    return {
      emp_id: e.emp, name: e.name, days: dates.length,
      stat: {
        present: mine.length,
        late: mine.filter((x) => x.late).length,
        early: mine.filter((x) => x.early).length,
        no_out: mine.filter((x) => x.no_out).length,
        out_area: mine.filter((x) => x.out_area).length,
      },
      rows: mine.map((x) => ({
        date: x.date, seq: 1, in: hhmm(x.inMin), out: x.no_out ? '' : hhmm(x.outMin), shift: e.shift.name,
        late: x.late, early: x.early, late_min: x.late_min, early_min: x.early_min,
        no_out: x.no_out, out_area: x.out_area, dist_m: x.dist_m,
      })),
    }
  }

  if (p === '/admin/employees') {
    const q = qs.get('q')
    const rows = EMPLOYEES.filter((e) => like(`${e.emp} ${e.name} ${e.dept}`, q))
    return {
      total: rows.length, count: rows.length,
      rows: page(rows, qs).map(({ emp, name, dept, position, phone, email, start_date, emp_type }) =>
        ({ emp, name, dept, position, phone, email, start_date, emp_type })),
    }
  }

  // ── ใบหน้า ─────────────────────────────────────────────────────────────
  if (p === '/admin/face/subjects' && m === 'GET') {
    const q = qs.get('q')
    let rows = ENROLLED.filter((e) => like(`${e.emp} ${e.name}`, q))
    if (qs.get('incomplete')) rows = rows.filter((e) => faceCountOf(e) < 3)
    return {
      total: rows.length,
      subjects: page(rows, qs).map((e, i) => ({
        subject_id: `10670-${e.emp}`, hcode: '10670', hospital_name: 'โรงพยาบาลสาธิต (Mock)',
        metadata: { emp_id: e.emp, name: e.name, dept: deptOf(e), position: e.position },
        status: i % 11 === 3 ? 'inactive' : 'active',
        face_count: faceCountOf(e),
        updated_at: `${today()} ${hhmm(int(rand(400 + i)(), 8 * 60, 17 * 60))}`,
      })),
    }
  }
  if (/^\/admin\/face\/subjects\//.test(p) && (m === 'PATCH' || m === 'DELETE')) return { ok: true }

  if (p === '/admin/face/coverage') {
    const q = qs.get('q')
    const missing = EMPLOYEES.filter((e) => !e.enrolled && like(`${e.emp} ${e.name}`, q))
    return {
      active_staff: EMPLOYEES.length, enrolled: ENROLLED.length,
      not_enrolled_count: missing.length, total: missing.length,
      incomplete: ENROLLED.filter((e) => faceCountOf(e) < 3).length,
      not_enrolled: page(missing, qs).map((e) => ({ emp_id: e.emp, name: e.name })),
    }
  }

  // ── endpoint สาธารณะ (ไม่ต้อง login) — หน้า login + หน้าลงทะเบียนโรงพยาบาล ──
  if (p === '/hospitals') {
    const q = qs.get('q')
    return { hospitals: TENANTS.filter((t) => t.active && like(`${t.hcode} ${t.name}`, q)).slice(0, 8).map((t) => ({ hcode: t.hcode, name: t.name })) }
  }
  if (p === '/hospital-master/search') {
    const q = qs.get('q')
    // ทะเบียนหน่วยงานทั้งหมด (รวมโรงที่ยังไม่ได้ลงทะเบียนในระบบ)
    const master = [...TENANTS.map((t) => ({ hcode: t.hcode, name: t.name, province: t.province })),
      { hcode: '11001', name: 'โรงพยาบาลยังไม่ลงทะเบียน A (Mock)', province: 'นนทบุรี' },
      { hcode: '11002', name: 'โรงพยาบาลยังไม่ลงทะเบียน B (Mock)', province: 'ปทุมธานี' },
      { hcode: '11003', name: 'โรงพยาบาลส่งเสริมสุขภาพตำบล (Mock)', province: 'สมุทรปราการ' }]
    return { hospitals: master.filter((h) => like(`${h.hcode} ${h.name} ${h.province}`, q)).slice(0, 20) }
  }
  if (p === '/hospital-request' && m === 'POST') {
    TENANTS = [...TENANTS, mkTenant({
      hcode: body?.hcode ?? '11001', name: body?.name ?? 'โรงพยาบาลใหม่ (Mock)',
      status: 'pending', active: false, approved_by: '', approved_at: null, requested_at: today(),
      request_type: body?.request_type ?? 'demo',
      contact_name: body?.contact_name ?? '', contact_phone: body?.contact_phone ?? '', contact_email: body?.contact_email ?? '',
    })]
    return { ok: true }
  }

  // ── การกระทำอื่นๆ (ตอบ ok เฉยๆ) ─────────────────────────────────────────
  if (p === '/admin/attendance/correction') return { ok: true }
  if (/\/unlock-pin$/.test(p)) return { ok: true }
  if (p === '/admin/auth/change-password') return { ok: true }
  if (p === '/admin/auth/verify-password') return { ok: true }

  return undefined // ไม่รู้จัก -> api.ts โยน error บอก path ให้เห็นชัด
}

/** CSV ตัวอย่างสำหรับปุ่มดาวน์โหลด (api.download) */
export function mockCsv(path: string): string {
  const qs = new URLSearchParams(path.split('?')[1] ?? '')
  if (path.includes('export-monthly')) {
    const d: any = mockRoute('GET', `/admin/attendance/monthly?month=${qs.get('month') ?? today().slice(0, 7)}&limit=999`)
    return ['รหัส,ชื่อ,แผนก,มาปฏิบัติงาน,สาย,ออกก่อน,ไม่สแกนออก,นอกพื้นที่',
      ...d.rows.map((r: any) => [r.emp, r.name, r.dept || 'ไม่ระบุแผนก', r.present, r.late, r.early, r.no_out, r.out_area].join(','))].join('\n')
  }
  const d: any = mockRoute('GET', `/admin/attendance/daily?date_from=${qs.get('date_from') ?? today()}&date_to=${qs.get('date_to') ?? today()}&limit=999`)
  return ['รหัส,ชื่อ,แผนก,วันที่,เวลาเข้า,เวลาออก,เวร,สถานะ',
    ...d.rows.map((r: any) => [r.emp, r.name, r.dept || 'ไม่ระบุแผนก', r.date, r.in, r.out || '-', r.shift, r.status].join(','))].join('\n')
}
