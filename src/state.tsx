import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import { clearSuperUnlock } from './components/SuperGate'

export type Role = 'superadmin' | 'bmsadmin' | 'admin' | 'user'
// ป้ายของบทบาท (role ระบบมี 4 ตัวตายตัว — ตรงกับ ROLES ฝั่ง backend)
// user = ดูอย่างเดียว (เดิมชื่อ Executive) — รวมพนักงานที่ login ด้วยบัญชี HOSxP
export const ROLE_TH: Record<string, string> = {
  superadmin: 'Super Admin', bmsadmin: 'BMS Admin', admin: 'Hospital Admin', user: 'User',
}

export type Nav =
  | 'overview' | 'face' | 'attendance' | 'settings' | 'locations' | 'health'
  | 'hosp-audit' | 'sys-approve' | 'sys-hospitals' | 'sys-users' | 'sys-audit'
  | 'rp-person' | 'rp-dept' | 'rp-shift' | 'rp-late' | 'rp-reports' | 'help' | 'account' | 'design' | 'display'
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
  account: 'help', // จัดการบัญชีของตัวเอง — เปิดได้ทุกคนเช่นกัน
  design: 'help',  // ระบบดีไซน์ (แคตตาล็อก component) — เปิดได้ทุกคน ไม่มีข้อมูลจริงในหน้านี้
  display: 'help', // การแสดงผล (ธีม/ขนาดตัวอักษร) — ค่าของเครื่อง เปิดได้ทุกคน
}

export type Session = {
  token: string
  username: string
  role: Role
  kind?: string // 'staff' = login ด้วยบัญชี HOSxP (เปลี่ยนรหัสผ่านใน dashboard ไม่ได้)
  name: string
  initial: string
  position?: string     // ตำแหน่ง/แผนก (บัญชี HOSxP) — ใช้แสดงแทนป้ายบทบาทในเมนูโปรไฟล์
  hospitals: Hospital[] // scope the account can see (ส่วนกลาง = many, admin/user = one)
  tabs: string[]        // แท็บที่บัญชีนี้เห็น (superadmin กำหนดรายคนได้)
  demo_hcode?: string   // โรงพยาบาลสาธิต (ข้อมูลตัวอย่าง) — '' = ปิดฟีเจอร์
}

// การแสดงผลของผู้ใช้แต่ละคน (เก็บในเครื่อง ไม่ผูกกับบัญชี)
//   theme 'system' = ตามค่าของเครื่อง (prefers-color-scheme) และเปลี่ยนตามทันทีถ้าผู้ใช้สลับ
//   fontScale = ย่อ/ขยายทั้งแอพด้วย zoom (สเกลข้อความเป็น px ในโค้ด คูณด้วย CSS อย่างเดียวไม่พอ)
// ธีมที่มีให้เลือก — ค่าที่ใส่ใน data-theme ของ <html> (ชุดสีอยู่ใน theme.css)
//   light    = ชุดตาม Figma (ค่าเริ่มต้น)
//   dark     = พื้นเทาเข้ม
//   midnight = พื้นน้ำเงินเข้ม โทนเย็นกว่า dark
//   sepia    = พื้นกระดาษโทนอุ่น (สว่าง) ลดแสงฟ้าจ้า
//   contrast = ขาว-ดำคอนทราสต์สูง เส้นขอบเข้ม (อ่านง่ายสุด)
//   hosxp    = หน้าตาโปรแกรมเดสก์ท็อป uniGUI/ExtJS ที่ HOSxP ใช้
//   glass    = กระจกฝ้าแบบ iOS (Liquid Glass) — พื้นผิวโปร่ง เบลอฉากหลัง ขอบสว่าง
export const THEME_IDS = ['light', 'dark', 'midnight', 'sepia', 'contrast', 'hosxp', 'glass'] as const
export type ThemeId = (typeof THEME_IDS)[number]
/** ธีมตระกูลพื้นเข้ม — ใช้ตัดสินใจเรื่องโลโก้/ตัวอักษรในปุ่ม */
export const DARK_THEMES: ThemeId[] = ['dark', 'midnight']
export type ThemeMode = ThemeId | 'system'
export const FONT_SCALES = [0.9, 1, 1.15, 1.3] as const
export type FontScale = (typeof FONT_SCALES)[number]

type Ctx = {
  /** ธีมที่แสดงอยู่จริง (แปลง 'system' เป็นค่าจริงแล้ว) */
  theme: ThemeId
  /** ธีมที่ใช้อยู่เป็นตระกูลพื้นเข้มไหม (โลโก้/ปุ่มต้องสลับชุดสี) */
  isDark: boolean
  /** ค่าที่ผู้ใช้เลือกไว้ ('system' = ตามเครื่อง) */
  themeMode: ThemeMode
  setThemeMode: (m: ThemeMode) => void
  toggleTheme: () => void
  fontScale: FontScale
  setFontScale: (s: FontScale) => void
  session: Session | null
  login: (username: string, password: string) => Promise<void>
  loginStaff: (hcode: string, username: string, password: string, hospitalName?: string) => Promise<void>
  loginDemo: () => Promise<void>
  logout: () => void
  nav: Nav
  setNav: (n: Nav) => void
  currentHcode: string // '*' = ทุกโรง (super only)
  setHcode: (h: string) => void
  /** รหัสพนักงานที่สั่งให้หน้ารายบุคคลเปิดรายละเอียดทันที (จากช่องค้นหาทั้งระบบ) — เปิดแล้วเคลียร์เป็น null */
  focusEmp: string | null
  setFocusEmp: (emp: string | null) => void
  isSuper: boolean
  isDemo: boolean      // กำลังดูโรงพยาบาลสาธิต (ข้อมูลตัวอย่าง)
}

const AppCtx = createContext<Ctx | null>(null)
export const useApp = () => {
  const v = useContext(AppCtx)
  if (!v) throw new Error('useApp must be inside AppProvider')
  return v
}

/** บัญชีส่วนกลาง (เห็นได้ทุกโรง) — staff ที่ login ผ่าน HOSxP ไม่นับ เพราะผูกโรงเดียว */
export const isCentral = (s: Session) => s.kind !== 'staff' && (s.role === 'superadmin' || s.role === 'bmsadmin')

const THEME_KEY = 'facehub_theme'
const FONT_KEY = 'facehub_font_scale'
// v3: เปลี่ยน role exec -> user — บังคับ login ใหม่ให้ session เก่าไม่ค้าง role เดิม
const SESSION_KEY = 'facecheck_session_v3'

export function AppProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    () => (localStorage.getItem(THEME_KEY) as ThemeMode) || 'light',
  )
  // ค่าของเครื่อง — ใช้ตอนเลือก 'system' และอัปเดตทันทีเมื่อผู้ใช้สลับธีมของ OS
  const [sysDark, setSysDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const m = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => setSysDark(m.matches)
    m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }, [])
  const theme: ThemeId = themeMode === 'system' ? (sysDark ? 'dark' : 'light') : themeMode
  const isDark = DARK_THEMES.includes(theme)

  const [fontScale, setFontScale] = useState<FontScale>(() => {
    const v = Number(localStorage.getItem(FONT_KEY))
    return (FONT_SCALES as readonly number[]).includes(v) ? (v as FontScale) : 1
  })
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
  const [focusEmp, setFocusEmp] = useState<string | null>(null)

  useEffect(() => {
    // หน้าก่อน login (เข้าสู่ระบบ / ฟอร์มลงทะเบียนโรง) บังคับธีมสว่างเสมอ
    // — เป็นหน้าหน้าตาแบรนด์ที่ออกแบบมาบนพื้นขาว (คลิปเปิดแอป/ภาพประกอบ) ธีมมืดทำให้เพี้ยน
    const shown = session ? theme : 'light'
    document.documentElement.setAttribute('data-theme', shown)
    // color-scheme บอกเบราว์เซอร์ให้เปลี่ยนสี scrollbar/ช่องกรอกของระบบตามธีมด้วย
    document.documentElement.style.colorScheme = DARK_THEMES.includes(shown) ? 'dark' : 'light'
    localStorage.setItem(THEME_KEY, themeMode)
  }, [theme, themeMode, session])

  useEffect(() => {
    document.documentElement.style.setProperty('--app-zoom', String(fontScale))
    localStorage.setItem(FONT_KEY, String(fontScale))
  }, [fontScale])

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
      // บัญชี HOSxP (kind='staff') ผูกโรงเดียวเสมอ ไม่ว่า role จะเป็นอะไร
      const central = isCentral(session)
      setHcode(central ? '*' : session.hospitals[0]?.value ?? '*')
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  }, [session])

  // ปุ่มสลับเร็ว — ยึดจากธีมที่เห็นอยู่จริง แล้วปักเป็นค่าตายตัว (ออกจากโหมด 'ตามระบบ')
  const toggleTheme = () => setThemeMode(isDark ? 'light' : 'dark')

  const login = async (username: string, password: string) => {
    const s = await api.login(username.trim(), password)
    api.setToken(s.token) // sync token ก่อน setSession
    setSession(s)
    setNav('overview')
  }
  // พนักงานโรง (บัญชี HOSxP) — flow เดียวกับ login ปกติ แต่ endpoint แยก
  // login ด้วยรหัสโรงอยู่แล้ว → ปักโรงนั้นทันที ไม่ต้องให้เลือกซ้ำ
  // (กัน backend ที่ส่ง hospitals ว่างมา แล้ว currentHcode ตกไปเป็น '*' → หน้าจอบังคับเลือกโรง)
  const loginStaff = async (hcode: string, username: string, password: string, hospitalName?: string) => {
    const s = await api.staffLogin(hcode, username.trim(), password)
    api.setToken(s.token)
    // บัญชี HOSxP ผูกกับโรงเดียว = โรงที่กรอกตอน login เสมอ
    // -> ปักไว้โรงนั้นโรงเดียว ไม่เอา list ที่ backend ส่งมา (กันกรณีส่งโรงอื่น/ส่งไม่ครบ
    //    แล้ว currentHcode ไปเกาะโรงแรกในลิสต์ ซึ่งไม่ใช่โรงที่ผู้ใช้ login เข้ามา)
    const match = s.hospitals?.find((h) => h.value === hcode)
    const hospitals = [{ value: hcode, label: match?.label || hospitalName || hcode }]
    setSession({ ...s, hospitals })
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
    clearSuperUnlock() // เข้าใหม่ต้องยืนยันรหัสผ่านก่อนเข้าเมนูจัดการระบบอีกครั้ง
    setSession(null)
  }

  const value: Ctx = {
    theme,
    isDark,
    themeMode,
    setThemeMode,
    toggleTheme,
    fontScale,
    setFontScale,
    session,
    login,
    loginStaff,
    loginDemo,
    logout,
    nav,
    setNav,
    currentHcode,
    setHcode,
    focusEmp,
    setFocusEmp,
    isSuper: !!session && isCentral(session),
    isDemo: !!session?.demo_hcode && currentHcode === session.demo_hcode,
  }
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
