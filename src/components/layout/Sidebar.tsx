import { useEffect, useState } from 'react'
import { api } from '../../api'
import { Icon } from '../../icons'
import { TEXT } from '../../typography'
import { useApp, type Nav } from '../../state'
import { SearchSelect } from '../SearchSelect'
import { ChangePasswordModal } from '../ChangePasswordModal'
import { MenuItem } from './MenuItem'
import { SectionHeader } from './SectionHeader'

// แถบเมนูข้าง — compose จาก MenuItem + SectionHeader (Figma component set 100:4421)
// สเปกจริงจาก Figma: กว้าง 262 · พื้นขาว · padding 16/24/24/24 · ระยะห่างกลุ่ม 16 · ระยะห่างเมนู 8
// ไม่มีเส้นแบ่งกับเนื้อหา — Figma ให้ sidebar กับ content เป็นพื้นผิวขาวผืนเดียวกัน
//
// หน้าที่ทำ action แล้วอยากให้ตัวเลขงานค้างอัปเดต: window.dispatchEvent(new Event('fh-badges'))
// mobile = โหมด drawer (เลื่อนเข้าจากซ้าย มี backdrop, เลือกเมนูแล้วปิดเอง)

/** ปุ่ม 1 บรรทัดในเมนูโปรไฟล์ */
function MenuAction({ icon, label, danger, onClick }: { icon: string; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      ...TEXT.bodyMed,
      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%', textAlign: 'left',
      padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
      background: 'transparent', fontFamily: 'var(--sans)',
      color: danger ? 'var(--danger)' : 'var(--text)',
    }}>
      <Icon name={icon} size={18} />
      {label}
    </button>
  )
}

/** เมนูที่ผูกกับ nav ปัจจุบัน — active/onClick มาจาก context ให้อัตโนมัติ */
function NavItem({ id, label, icon, badge }: { id: Nav; label: string; icon: string; badge?: number }) {
  const { nav, setNav } = useApp()
  return <MenuItem icon={icon} label={label} badge={badge} active={nav === id} onClick={() => setNav(id)} />
}

export function Sidebar({ mobile = false, open = false, onClose }: {
  mobile?: boolean; open?: boolean; onClose?: () => void
}) {
  const { session, nav, logout, isSuper, isDemo, currentHcode, setHcode } = useApp()
  const [menu, setMenu] = useState(false)
  const [showPw, setShowPw] = useState(false)
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
      ...(mobile
        ? {
            position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 120, boxShadow: open ? 'var(--shadow-lg)' : 'none',
            transform: open ? 'translateX(0)' : 'translateX(-105%)', transition: 'transform .22s ease',
          }
        : { alignSelf: 'stretch' }),
    }}>
      {/* Figma ไม่มีบล็อกโลโก้ในแถบข้าง — โลโก้/ชื่อระบบอยู่บน Topbar แล้ว
          เหลือไว้แค่ปุ่มปิด drawer ของจอเล็ก (จอใหญ่ไม่แสดงอะไรเลย) */}
      <div style={{ padding: mobile ? 'var(--sp-4) var(--sp-6) 0' : 'var(--sp-4) 0 0', display: 'flex', justifyContent: 'flex-end' }}>
        {mobile && (
          <button onClick={onClose} title="ปิดเมนู" style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', padding: 'var(--sp-1)' }}>
            <Icon name="close" size={18} width={2} />
          </button>
        )}
      </div>

      {/* mobile: เลือกเมนูแล้วปิด drawer เอง */}
      <nav onClick={(e) => { if (mobile && (e.target as HTMLElement).closest('button')) onClose?.() }}
        style={{ padding: '0 var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {(has('overview') || has('face') || has('attendance')) && <SectionHeader>มอนิเตอร์</SectionHeader>}
        {has('overview') && <NavItem id="overview" label="Dashboard" icon="overview" />}
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

      {/* การ์ดโปรไฟล์ท้ายแถบ — Figma: 214x72 · พื้น surface-alt · r-lg · padding 16 · gap 12
          กดแล้วเปิดเมนู: เลือกโรงพยาบาล / เปลี่ยนรหัสผ่าน / ออกจากระบบ
          (ของพวกนี้เดิมอยู่บน Topbar แต่ดีไซน์ใหม่ของ Topbar ไม่มีที่ให้) */}
      {session && (
        <div style={{ padding: '0 var(--sp-6) var(--sp-6)', position: 'relative' }}>
          {menu && (
            <>
              <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 130 }} />
              <div style={{
                position: 'absolute', left: 'var(--sp-6)', right: 'var(--sp-6)', bottom: 'calc(var(--sp-6) + 80px)',
                zIndex: 131, background: 'var(--bg)', borderRadius: 'var(--r-lg)',
                boxShadow: 'var(--shadow-lg)', padding: 'var(--sp-2)',
                display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)',
              }}>
                {(isSuper || session.hospitals.length > 1) && (
                  <div style={{ padding: 'var(--sp-2)' }}>
                    <div style={{ ...TEXT.caption, color: 'var(--text-dim)', marginBottom: 'var(--sp-1)' }}>โรงพยาบาลที่กำลังดู</div>
                    <SearchSelect
                      value={currentHcode}
                      onChange={(v) => { setHcode(v); setMenu(false) }}
                      options={[
                        ...(isSuper ? [{ value: '*', label: 'ทุกโรงพยาบาล' }] : []),
                        ...session.hospitals.map((h) => ({
                          value: h.value,
                          label: h.value === session.demo_hcode ? `${h.label} · ตัวอย่าง` : h.label,
                          sub: h.value,
                        })),
                      ]}
                    />
                  </div>
                )}
                {session.kind !== 'staff' && (
                  <MenuAction icon="lock" label="เปลี่ยนรหัสผ่าน" onClick={() => { setShowPw(true); setMenu(false) }} />
                )}
                <MenuAction icon="logout" label="ออกจากระบบ" danger onClick={logout} />
              </div>
            </>
          )}

          <button onClick={() => setMenu((v) => !v)} title="บัญชีและการตั้งค่า"
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%', textAlign: 'left',
              padding: 'var(--sp-4)', borderRadius: 'var(--r-lg)', border: 'none', cursor: 'pointer',
              background: 'var(--surface-alt)', fontFamily: 'var(--sans)',
            }}>
            <span aria-hidden style={{
              width: 40, height: 40, flex: 'none', borderRadius: 'var(--r-full)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isDemo ? 'var(--warn)' : 'var(--border)', color: 'var(--bg)', ...TEXT.bodyMed,
            }}>{session.initial}</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ ...TEXT.bodyMed, display: 'block', color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session.name}
              </span>
              <span style={{ ...TEXT.sm, display: 'block', color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentHcode === '*' ? 'ทุกโรงพยาบาล' : session.hospitals.find((h) => h.value === currentHcode)?.label ?? session.username}
              </span>
            </span>
          </button>
        </div>
      )}

      {showPw && <ChangePasswordModal onClose={() => setShowPw(false)} />}
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
