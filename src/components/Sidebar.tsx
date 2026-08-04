import { useEffect, useState } from 'react'
import { api } from '../api'
import { Icon } from '../icons'
import { useApp, type Nav } from '../state'

const overline: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, letterSpacing: '.7px', textTransform: 'uppercase',
  color: 'var(--text-faint)', padding: '12px 10px 6px',
}

function NavItem({ id, label, icon, badge }: { id: Nav; label: string; icon: string; badge?: number }) {
  const { nav, setNav } = useApp()
  const active = nav === id
  return (
    <button
      onClick={() => setNav(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 9,
        cursor: 'pointer', fontSize: 13.5, width: '100%', textAlign: 'left', border: 'none',
        fontFamily: 'var(--sans)', whiteSpace: 'nowrap',
        fontWeight: active ? 600 : 500,
        color: active ? 'var(--on-accent)' : 'var(--text-dim)',
        background: active ? 'var(--accent)' : 'transparent',
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-dim)' } }}
    >
      <Icon name={icon} />
      <span style={{ flex: 1 }}>{label}</span>
      {!!badge && (
        <span style={{
          fontSize: 10.5, fontWeight: 700, minWidth: 18, textAlign: 'center', padding: '1px 6px',
          borderRadius: 10, background: active ? 'rgba(255,255,255,.25)' : 'var(--warn)',
          color: active ? 'var(--on-accent)' : '#fff',
        }}>{badge}</span>
      )}
    </button>
  )
}

// หน้าที่ทำ action แล้วอยากให้ตัวเลขงานค้างอัปเดต: window.dispatchEvent(new Event('fh-badges'))
// mobile = โหมด drawer (เลื่อนเข้าจากซ้าย มี backdrop, เลือกเมนูแล้วปิดเอง)
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
      width: 238, flex: 'none', background: 'var(--surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      ...(mobile
        ? {
            position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 120, boxShadow: open ? 'var(--shadow-lg)' : 'none',
            transform: open ? 'translateX(0)' : 'translateX(-105%)', transition: 'transform .22s ease',
          }
        : { position: 'sticky', top: 0, height: '100vh' }),
    }}>
      <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{
          width: 34, height: 34, flex: 'none', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)',
        }}>
          <img src="/logo.png" alt="" width={34} height={34} style={{ display: 'block' }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, letterSpacing: '-.2px' }}>FaceCheck</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>แดชบอร์ดผู้ดูแลระบบ</div>
        </div>
        {mobile && (
          <button onClick={onClose} title="ปิดเมนู" style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}>
            <Icon name="close" size={18} width={2} />
          </button>
        )}
      </div>

      {/* mobile: เลือกเมนูแล้วปิด drawer เอง */}
      <nav onClick={(e) => { if (mobile && (e.target as HTMLElement).closest('button')) onClose?.() }}
        style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', flex: 1 }}>
        {(has('overview') || has('face') || has('attendance')) && <div style={overline}>มอนิเตอร์</div>}
        {has('overview') && <NavItem id="overview" label="Dashboard" icon="overview" />}
        {has('face') && <NavItem id="face" label="ลงทะเบียนใบหน้า" icon="face" />}
        {has('attendance') && <NavItem id="attendance" label="ลงเวลา" icon="clock" />}

        {has('attendance') && (
          <>
            <div style={overline}>รายงาน · วิเคราะห์</div>
            <NavItem id="rp-person" label="รายบุคคล" icon="person" />
            <NavItem id="rp-dept" label="รายแผนก" icon="people" />
            <NavItem id="rp-shift" label="รายเวร" icon="calendar" />
            <NavItem id="rp-late" label="การมาสาย / ออกก่อน" icon="clock-alert" />
            <NavItem id="rp-reports" label="รายงาน" icon="report" />
          </>
        )}

        {(has('settings') || (session?.role === 'admin' && has('audit'))) && (
          <>
            <div style={overline}>โรงพยาบาล</div>
            {has('settings') && <NavItem id="settings" label="ตั้งค่าแอปสแกน" icon="system" />}
            {has('settings') && <NavItem id="locations" label="จุดลงเวลา" icon="hospital" />}
            {/* admin โรงดู audit เฉพาะโรงตัวเอง (ส่วนกลางใช้ sys-audit แทน) */}
            {session?.role === 'admin' && has('audit') && <NavItem id="hosp-audit" label="ประวัติการจัดการ" icon="clock" />}
          </>
        )}

        {anyCentral && (
          <>
            <div style={{ ...overline, display: 'flex', alignItems: 'center', gap: 7 }}>
              จัดการระบบ
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '.4px', padding: '1px 6px', borderRadius: 5,
                background: 'var(--accent-soft)', color: 'var(--accent-strong)',
              }}>SUPER</span>
            </div>
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
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 119, background: 'rgba(0,0,0,.4)' }} />}
      {aside}
    </>
  )
}
