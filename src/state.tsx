import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'

export type Role = 'superadmin' | 'bmsadmin' | 'admin' | 'user'
// ป้ายของบทบาท (role ระบบมี 4 ตัวตายตัว — ตรงกับ ROLES ฝั่ง backend)
// user = ดูอย่างเดียว (เดิมชื่อ Executive) — รวมพนักงานที่ login ด้วยบัญชี HOSxP
export const ROLE_TH: Record<string, string> = {
  superadmin: 'Super Admin', bmsadmin: 'BMS Admin', admin: 'Hospital Admin', user: 'User',
}

export type Nav =
  | 'overview' | 'face' | 'attendance' | 'settings' | 'locations' | 'health'
  | 'hosp-audit' | 'sys-approve' | 'sys-hospitals' | 'sys-users' | 'sys-audit'
  | 'rp-person' | 'rp-dept' | 'rp-shift' | 'rp-late' | 'rp-reports' | 'help'
export type Hospital = { value: string; label: string }

// เมนูย่อย → แท็บสิทธิ์ (สิทธิ์คุมระดับแท็บหลัก 6 ตัวเหมือนเดิม — เมนูย่อยเกาะแท็บแม่)
export const NAV_TAB: Record<Nav, string> = {
  overview: 'overview', face: 'face', attendance: 'attendance', settings: 'settings', locations: 'settings', health: 'health',
  // งานส่วนกลางแยกสิทธิ์รายเมนู — เปิดให้ bmsadmin ทีละใบได้
  // hosp-audit + sys-audit ใช้สิทธิ์ 'audit' ร่วมกัน (ต่างที่ขอบเขต: โรงตัวเอง vs ทุกโรง)
  'hosp-audit': 'audit', 'sys-approve': 'approve', 'sys-hospitals': 'tenants', 'sys-users': 'users', 'sys-audit': 'audit',
  // กลุ่มรายงาน·วิเคราะห์ — เกาะสิทธิ์แท็บลงเวลา (ข้อมูลชุดเดียวกัน มุมมองต่างกัน)
  'rp-person': 'attendance', 'rp-dept': 'attendance', 'rp-shift': 'attendance',
  'rp-late': 'attendance', 'rp-reports': 'attendance',
  help: 'help', // ช่วยเหลือ — เปิดได้ทุกบทบาท (App override allowed ให้เสมอ)
}

export type Session = {
  token: string
  username: string
  role: Role
  kind?: string // 'staff' = login ด้วยบัญชี HOSxP (เปลี่ยนรหัสผ่านใน dashboard ไม่ได้)
  name: string
  initial: string
  hospitals: Hospital[] // scope the account can see (ส่วนกลาง = many, admin/user = one)
  tabs: string[]        // แท็บที่บัญชีนี้เห็น (superadmin กำหนดรายคนได้)
  demo_hcode?: string   // โรงพยาบาลสาธิต (ข้อมูลตัวอย่าง) — '' = ปิดฟีเจอร์
}

type Ctx = {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  session: Session | null
  login: (username: string, password: string) => Promise<void>
  loginStaff: (hcode: string, username: string, password: string) => Promise<void>
  loginDemo: () => Promise<void>
  logout: () => void
  nav: Nav
  setNav: (n: Nav) => void
  currentHcode: string // '*' = ทุกโรง (super only)
  setHcode: (h: string) => void
  isSuper: boolean
  isDemo: boolean      // กำลังดูโรงพยาบาลสาธิต (ข้อมูลตัวอย่าง)
}

const AppCtx = createContext<Ctx | null>(null)
export const useApp = () => {
  const v = useContext(AppCtx)
  if (!v) throw new Error('useApp must be inside AppProvider')
  return v
}

const THEME_KEY = 'facehub_theme'
// v3: เปลี่ยน role exec -> user — บังคับ login ใหม่ให้ session เก่าไม่ค้าง role เดิม
const SESSION_KEY = 'facecheck_session_v3'

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light',
  )
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) return null
      const s = JSON.parse(raw) as Session
      api.setToken(s.token) // sync token ก่อน component ลูกยิง API
      return s
    } catch {
      return null
    }
  })
  const [nav, setNav] = useState<Nav>('overview')
  const [currentHcode, setHcode] = useState<string>('*')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  // token หมดอายุ/ไม่ถูกต้อง (401 จาก api) -> เคลียร์ session -> แอพเด้งกลับหน้า login เอง
  useEffect(() => {
    api.setAuthErrorHandler(() => setSession(null))
    return () => api.setAuthErrorHandler(null)
  }, [])

  useEffect(() => {
    api.setToken(session?.token ?? null)
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      // super lands on "ทุกโรง"; admin/user are pinned to their single hospital
      const central = session.role === 'superadmin' || session.role === 'bmsadmin'
      setHcode(central ? '*' : session.hospitals[0]?.value ?? '*')
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  }, [session])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  const login = async (username: string, password: string) => {
    const s = await api.login(username.trim(), password)
    api.setToken(s.token) // sync token ก่อน setSession
    setSession(s)
    setNav('overview')
  }
  // พนักงานโรง (บัญชี HOSxP) — flow เดียวกับ login ปกติ แต่ endpoint แยก
  const loginStaff = async (hcode: string, username: string, password: string) => {
    const s = await api.staffLogin(hcode, username.trim(), password)
    api.setToken(s.token)
    setSession(s)
    setNav('overview')
  }
  // เข้าดูโรงพยาบาลสาธิต (public) — persist localStorage ทันที กัน race ตอน navigate ออกจาก /hospital-request
  const loginDemo = async () => {
    const s = await api.demoLogin()
    api.setToken(s.token)
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    setSession(s)
    setNav('overview')
  }
  const logout = () => {
    api.logout().catch(() => {})
    api.setToken(null)
    setSession(null)
  }

  const value: Ctx = {
    theme,
    toggleTheme,
    session,
    login,
    loginStaff,
    loginDemo,
    logout,
    nav,
    setNav,
    currentHcode,
    setHcode,
    isSuper: session?.role === 'superadmin' || session?.role === 'bmsadmin',
    isDemo: !!session?.demo_hcode && currentHcode === session.demo_hcode,
  }
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
