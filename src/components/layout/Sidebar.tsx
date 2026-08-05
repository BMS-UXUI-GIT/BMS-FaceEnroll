import { useEffect, useState } from 'react'
import { api } from '../../api'
import { Icon } from '../../icons'
import { useApp, type Nav } from '../../state'
import { MenuItem } from './MenuItem'
import { SectionHeader } from './SectionHeader'

// แถบเมนูข้าง — compose จาก MenuItem + SectionHeader (Figma component set 100:4421)
// สเปกจริงจาก Figma: กว้าง 262 · พื้นขาว · padding 16/24/24/24 · ระยะห่างกลุ่ม 16 · ระยะห่างเมนู 8
// ไม่มีเส้นแบ่งกับเนื้อหา — Figma ให้ sidebar กับ content เป็นพื้นผิวขาวผืนเดียวกัน
//
// หน้าที่ทำ action แล้วอยากให้ตัวเลขงานค้างอัปเดต: window.dispatchEvent(new Event('fh-badges'))
// mobile = โหมด drawer (เลื่อนเข้าจากซ้าย มี backdrop, เลือกเมนูแล้วปิดเอง)

/** เมนูที่ผูกกับ nav ปัจจุบัน — active/onClick มาจาก context ให้อัตโนมัติ */
function NavItem({ id, label, icon, badge }: { id: Nav; label: string; icon: string; badge?: number }) {
  const { nav, setNav } = useApp()
  return <MenuItem icon={icon} label={label} badge={badge} active={nav === id} onClick={() => setNav(id)} />
}

export function Sidebar({ mobile = false, open = false, onClose }: {
  mobile?: boolean; open?: boolean; onClose?: () => void
}) {
  const { session, nav } = useApp()
  const tabs = session?.tabs ?? []
  const has = (t: string) => tabs.includes(t)
  // จัดการบัญชี — แท็บ 'users' (superadmin ผ่านเสมอ กัน session เก่าที่ยังไม่มีแท็บนี้)
  const central = session?.role === 'superadmin' || session?.role === 'bmsadmin'
  const canUsers = has('users') || session?.role === 'superadmin'
  // กลุ่มงานส่วนกลาง — เฉพาะ role ส่วนกลาง และต้องมีสิทธิ์ใบใดใบหนึ่ง
  const anyCentral = central && (['approve', 'tenants', 'audit', 'health'].some(has) || canUsers)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    if (!has('approve')) return
    const load = () => api.get<{ pending_hospitals: number }>('/admin/badges')
      .then((d) => setPending(d.pending_hospitals ?? 0)).catch(() => {})
    load()
    window.addEventListener('fh-badges', load)
    return () => window.removeEventListener('fh-badges', load)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, nav])

  const aside = (
    <aside style={{
      width: 'var(--sidebar-w)', flex: 'none',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      paddingTop: mobile ? 0 : 'var(--topbar-h)',
      ...(mobile
        ? {
            position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 120, boxShadow: open ? 'var(--shadow-lg)' : 'none',
            transform: open ? 'translateX(0)' : 'translateX(-105%)', transition: 'transform .22s ease',
          }
        : { alignSelf: 'stretch' }),
    }}>
      {/* Figma ไม่มีบล็อกโลโก้ในแถบข้าง — โลโก้/ชื่อระบบอยู่บน Topbar แล้ว
          เหลือไว้แค่ปุ่มปิด drawer ของจอเล็ก (จอใหญ่ไม่แสดงอะไรเลย) */}
      <div style={{ padding: mobile ? 'var(--sp-3) var(--sp-6) 0' : 'var(--sp-3) 0 0', display: 'flex', justifyContent: 'flex-end' }}>
        {mobile && (
          <button onClick={onClose} title="ปิดเมนู" style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', padding: 'var(--sp-1)' }}>
            <Icon name="close" size={18} width={2} />
          </button>
        )}
      </div>

      {/* mobile: เลือกเมนูแล้วปิด drawer เอง */}
      <nav className="no-scrollbar" onClick={(e) => { if (mobile && (e.target as HTMLElement).closest('button')) onClose?.() }}
        style={{ padding: '0 var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-0)', overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {(has('overview') || has('face') || has('attendance')) && <SectionHeader>มอนิเตอร์</SectionHeader>}
        {has('overview') && <NavItem id="overview" label="หน้าหลัก" icon="overview" />}
        {has('face') && <NavItem id="face" label="ลงทะเบียนใบหน้า" icon="face" />}
        {has('attendance') && <NavItem id="attendance" label="ลงเวลา" icon="clock" />}

        {has('attendance') && (
          <>
            <SectionHeader>รายงาน · วิเคราะห์</SectionHeader>
            <NavItem id="rp-person" label="รายบุคคล" icon="person" />
            <NavItem id="rp-dept" label="รายแผนก" icon="people" />
            <NavItem id="rp-shift" label="รายเวร" icon="calendar" />
            <NavItem id="rp-late" label="การมาสาย / ออกก่อน" icon="clock-alert" />
            <NavItem id="rp-reports" label="รายงาน" icon="report" />
          </>
        )}

        {(has('settings') || (session?.role === 'admin' && has('audit'))) && (
          <>
            <SectionHeader>โรงพยาบาล</SectionHeader>
            {has('settings') && <NavItem id="settings" label="ตั้งค่าแอปสแกน" icon="system" />}
            {has('settings') && <NavItem id="locations" label="จุดลงเวลา" icon="map-pin" />}
            {/* admin โรงดู audit เฉพาะโรงตัวเอง (ส่วนกลางใช้ sys-audit แทน) */}
            {session?.role === 'admin' && has('audit') && <NavItem id="hosp-audit" label="ประวัติการจัดการ" icon="clock" />}
          </>
        )}

        {anyCentral && (
          <>
            <SectionHeader tag="SUPER">จัดการระบบ</SectionHeader>
            {has('approve') && <NavItem id="sys-approve" label="อนุมัติโรงพยาบาล" icon="hospital" badge={pending} />}
            {has('tenants') && <NavItem id="sys-hospitals" label="จัดการโรงพยาบาล" icon="hospital" />}
            {canUsers && <NavItem id="sys-users" label="ผู้ใช้และสิทธิ์" icon="face" />}
            {has('audit') && <NavItem id="sys-audit" label="ประวัติการจัดการ" icon="clock" />}
            {has('health') && <NavItem id="health" label="สถานะระบบ" icon="health" />}
          </>
        )}
      </nav>
    </aside>
  )

  if (!mobile) return aside
  return (
    <>
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 119, background: 'var(--overlay)' }} />}
      {aside}
    </>
  )
}
