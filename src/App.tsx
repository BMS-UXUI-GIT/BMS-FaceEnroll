import { useEffect, useState } from 'react'
import { DialogHost, ToastHost } from './components/dialog'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/Topbar'
import { useMedia } from './hooks'
import { HospitalRequest } from './screens/HospitalRequest'
import { Login } from './screens/Login'
import { Overview, Face, Attendance, Settings, Health } from './screens'
import { Locations } from './screens/Locations'
import { ReportDept } from './screens/ReportDept'
import { ReportLate } from './screens/ReportLate'
import { ReportPerson } from './screens/ReportPerson'
import { ReportShift } from './screens/ReportShift'
import { ReportsHub } from './screens/ReportsHub'
import { SystemApprove } from './screens/SystemApprove'
import { SystemHospitals } from './screens/SystemHospitals'
import { SystemAudit } from './screens/SystemAudit'
import { Users } from './screens/Users'
import { Help } from './screens/Help'
import { useApp, NAV_TAB, type Nav } from './state'

// ลำดับหาแท็บแรกที่มีสิทธิ์ (ตรงกับ Sidebar)
const NAV_ORDER: Nav[] = ['overview', 'face', 'attendance',
  'rp-person', 'rp-dept', 'rp-shift', 'rp-late', 'rp-reports',
  'settings', 'locations', 'hosp-audit',
  'sys-approve', 'sys-hospitals', 'sys-users', 'sys-audit', 'health']

// แถบเตือนเมื่อกำลังดู "โรงพยาบาลสาธิต" — กันสับสนว่าเป็นข้อมูลจริง
function DemoBanner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px', marginBottom: 16,
      borderRadius: 11, background: 'var(--warn-light)', border: '1px solid var(--warn)',
      color: 'var(--warn)', fontSize: 12.5, fontWeight: 500,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
        <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
      โรงพยาบาลสาธิต — ข้อมูลตัวอย่าง ไม่ใช่ข้อมูลจริง และไม่ถูกบันทึกลงระบบโรงพยาบาลใดๆ
    </div>
  )
}

export function App() {
  const { session, nav, setNav, currentHcode, isDemo } = useApp()
  // จอเล็ก: sidebar เป็น drawer เปิดจากปุ่มเมนูบน topbar
  const mobile = useMedia('(max-width: 920px)')
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => { if (!mobile) setMenuOpen(false) }, [mobile])

  // ฟอร์มลงทะเบียนโรง (public) — เข้าได้เฉพาะคนที่รู้ URL ตรงนี้ ไม่มีลิงก์จากหน้าไหน
  // endsWith ไม่ใช่ === เพราะเว็บ demo บน GitHub Pages ถูกวางใต้ subpath
  // (/BMS-FaceEnroll/hospital-request) — บน server จริงที่ root ผลลัพธ์เหมือนเดิม
  const isRequestForm = window.location.pathname.replace(/\/$/, '').endsWith('/hospital-request')

  // สิทธิ์รายแท็บจาก backend — เมนูย่อยเช็คผ่านแท็บแม่ (NAV_TAB)
  // ประวัติการจัดการมี 2 หน้าใช้สิทธิ์ 'audit' ร่วมกัน: hosp-audit = โรงตัวเอง, sys-audit = ทุกโรง
  const tabs = session?.tabs ?? []
  const central = session?.role === 'superadmin' || session?.role === 'bmsadmin'
  const allowed = (n: Nav) =>
    n === 'help' // help เปิดได้ทุกคน
    || ((tabs.includes(NAV_TAB[n]) || (NAV_TAB[n] === 'users' && session?.role === 'superadmin'))
      && !(n === 'hosp-audit' && session?.role !== 'admin')
      && !(n === 'sys-audit' && !central))
  const firstNav: Nav = NAV_ORDER.find(allowed) ?? 'overview'
  const effNav: Nav = allowed(nav) ? nav : firstNav

  // sync nav ให้ตรงกับที่เห็นจริง (ไฮไลต์/ชื่อหน้าถูก ไม่ค้างแท็บที่ถูกบล็อก)
  useEffect(() => {
    if (session && !isRequestForm && nav !== effNav) setNav(effNav)
  }, [session, isRequestForm, nav, effNav, setNav])

  if (isRequestForm) return <HospitalRequest />
  if (!session) return <Login />

  const screen = (() => {
    switch (effNav) {
      case 'face': return <Face />
      case 'attendance': return <Attendance />
      case 'settings': return <Settings />
      case 'locations': return <Locations />
      case 'sys-approve': return <SystemApprove />
      case 'sys-hospitals': return <SystemHospitals />
      case 'sys-users': return <Users me={session.username} />
      case 'sys-audit': return <SystemAudit />
      case 'hosp-audit': return <SystemAudit />
      case 'health': return <Health />
      case 'rp-person': return <ReportPerson />
      case 'rp-dept': return <ReportDept />
      case 'rp-shift': return <ReportShift />
      case 'rp-late': return <ReportLate />
      case 'rp-reports': return <ReportsHub />
      case 'help': return <Help />
      default: return <Overview />
    }
  })()

  // โครงหน้าตาม Figma (screen 227:6394):
  //   พื้นหลังไล่สีฟ้า (ตั้งใน theme.css) → เว้นขอบ --shell-gap → การ์ดขาวใบเดียว r-xl
  //   ในการ์ด: Topbar เต็มความกว้าง แล้ว Sidebar + เนื้อหาอยู่ใต้ ใช้พื้นผิวเดียวกัน
  return (
    <div style={{
      height: '100vh', width: '100%', overflow: 'hidden',
      padding: mobile ? 0 : 'var(--shell-gap)',
      display: 'flex',
    }}>
      <div style={{
        position: 'relative',
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--bg)',
        borderRadius: mobile ? 0 : 'var(--r-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* header กระจกลอยทับ — content เลื่อนลอดข้างหลัง */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 }}>
          <Topbar onMenu={mobile ? () => setMenuOpen(true) : undefined} />
        </div>
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <Sidebar mobile={mobile} open={menuOpen} onClose={() => setMenuOpen(false)} />
          <main style={{
            flex: 1, overflowY: 'auto', overflowX: 'auto', minWidth: 0,
            padding: mobile ? 'var(--sp-3)' : 'var(--sp-6)',
            paddingTop: 0,
          }}>
            {/* spacer แทน paddingTop — ให้ content เริ่มใต้ header แต่ sticky ยังวัดจากขอบบน main (top:0) */}
            <div aria-hidden style={{ height: 'calc(var(--topbar-h) + var(--sp-4))' }} />
            {isDemo && <DemoBanner />}
            {/* key = หน้าปัจจุบัน -> เปลี่ยนเมนูแล้ว React สร้าง node ใหม่ อนิเมชัน .page-in เล่นซ้ำทุกครั้ง */}
            <div key={`${effNav}:${currentHcode}`} className="page-in">
              <ErrorBoundary resetKey={`${effNav}:${currentHcode}`}>{screen}</ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
      <DialogHost />
      <ToastHost />
    </div>
  )
}
