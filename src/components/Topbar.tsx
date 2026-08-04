import { useState } from 'react'
import { api } from '../api'
import { Icon } from '../icons'
import { SearchSelect } from './SearchSelect'
import { useApp, type Nav, ROLE_TH } from '../state'

const PAGE: Record<Nav, { overline: string; title: string }> = {
  overview: { overline: 'มอนิเตอร์', title: 'Dashboard' },
  face: { overline: 'มอนิเตอร์', title: 'ลงทะเบียนใบหน้า' },
  attendance: { overline: 'มอนิเตอร์', title: 'ลงเวลา' },
  health: { overline: 'จัดการระบบ', title: 'สถานะระบบ' },
  settings: { overline: 'โรงพยาบาล', title: 'ตั้งค่าแอปสแกน' },
  locations: { overline: 'โรงพยาบาล', title: 'จุดลงเวลา' },
  'hosp-audit': { overline: 'โรงพยาบาล', title: 'ประวัติการจัดการ' },
  'sys-approve': { overline: 'จัดการระบบ', title: 'อนุมัติโรงพยาบาล' },
  'sys-hospitals': { overline: 'จัดการระบบ', title: 'จัดการโรงพยาบาล' },
  'sys-users': { overline: 'จัดการระบบ', title: 'ผู้ใช้และสิทธิ์' },
  'sys-audit': { overline: 'จัดการระบบ', title: 'ประวัติการจัดการ' },
  'rp-person': { overline: 'รายงาน · วิเคราะห์', title: 'รายบุคคล' },
  'rp-dept': { overline: 'รายงาน · วิเคราะห์', title: 'รายแผนก' },
  'rp-shift': { overline: 'รายงาน · วิเคราะห์', title: 'รายเวร' },
  'rp-late': { overline: 'รายงาน · วิเคราะห์', title: 'การมาสาย / ออกก่อน' },
  'rp-reports': { overline: 'รายงาน · วิเคราะห์', title: 'รายงาน' },
  help: { overline: 'ช่วยเหลือ', title: 'คู่มือการใช้งาน' },
}


// modal เปลี่ยนรหัสผ่านตัวเอง (บัญชี dashboard — บัญชี HOSxP ไม่มีปุ่มนี้)
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [oldP, setOldP] = useState('')
  const [newP, setNewP] = useState('')
  const [confirmP, setConfirmP] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const save = async () => {
    if (busy) return
    setErr(null)
    if (newP.trim().length < 6) return setErr('รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัว')
    if (newP.trim() !== confirmP.trim()) return setErr('ยืนยันรหัสผ่านใหม่ไม่ตรงกัน')
    setBusy(true)
    try {
      await api.post('/admin/auth/change-password', { old_password: oldP, new_password: newP.trim() })
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (e: any) {
      setErr(e?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  const fld: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none' }
  const lb: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 380, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 14.5 }}>เปลี่ยนรหัสผ่าน</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {done ? (
            <div style={{ textAlign: 'center', color: 'var(--ok)', fontWeight: 700, fontSize: 14, padding: '10px 0' }}>✓ เปลี่ยนรหัสผ่านแล้ว</div>
          ) : (
            <>
              <div><label style={lb}>รหัสผ่านเดิม</label>
                <input type="password" value={oldP} onChange={(e) => setOldP(e.target.value)} style={fld} /></div>
              <div><label style={lb}>รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</label>
                <input type="password" value={newP} onChange={(e) => setNewP(e.target.value)} style={fld} /></div>
              <div><label style={lb}>ยืนยันรหัสผ่านใหม่</label>
                <input type="password" value={confirmP} onChange={(e) => setConfirmP(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && save()} style={fld} /></div>
              {err && <div style={{ fontSize: 12.5, color: 'var(--danger)' }}>{err}</div>}
              <button onClick={save} disabled={busy || !oldP || !newP || !confirmP}
                style={{ width: '100%', padding: 11, borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: busy || !oldP || !newP || !confirmP ? 0.6 : 1 }}>
                {busy ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { nav, theme, toggleTheme, session, logout, isSuper, isDemo, currentHcode, setHcode } = useApp()
  const [showPw, setShowPw] = useState(false)
  if (!session) return null
  const page = PAGE[nav]
  const one = session.hospitals[0]

  return (
    <header className="topbar" style={{
      position: 'sticky', top: 0, zIndex: 20, background: 'var(--surface)',
      borderBottom: '1px solid var(--border)', padding: '14px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      {onMenu && (
        <button onClick={onMenu} title="เมนู" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10,
          border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-dim)', cursor: 'pointer', flex: 'none',
        }}>
          <Icon name="menu" size={18} width={2} />
        </button>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{page.overline}</div>
        <h1 style={{ margin: '1px 0 0', fontSize: 20, fontWeight: 700, letterSpacing: '-.4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{page.title}</h1>
      </div>

      {isSuper || session.hospitals.length > 1 ? (
        // super (เห็นทุกโรง) หรือ non-super ที่มีหลายโรง → เลือกได้
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${isDemo ? 'var(--warn)' : 'var(--border)'}`, borderRadius: 10, background: isDemo ? 'var(--warn-soft)' : 'var(--surface-2)' }}>
          <Icon name="hospital" size={15} color={isDemo ? 'var(--warn)' : 'var(--text-dim)'} width={1.8} />
          <SearchSelect
            bare
            maxTriggerWidth={200}
            value={currentHcode}
            onChange={setHcode}
            options={[
              ...(isSuper ? [{ value: '*', label: 'มุมมอง admin' }] : []),
              ...session.hospitals.map((h) => ({
                value: h.value,
                // โรงสาธิตติดป้ายให้เห็นตั้งแต่ในดรอปดาวน์
                label: h.value === session.demo_hcode ? `${h.label} · ตัวอย่าง` : h.label,
                sub: h.value,
              })),
            ]}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-2)' }}>
          <Icon name="hospital" size={15} color="var(--text-dim)" width={1.8} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{one?.label ?? '—'}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-faint)' }}>{one?.value ?? ''}</span>
        </div>
      )}

      {session.kind !== 'staff' && (
        <button onClick={() => setShowPw(true)} title="เปลี่ยนรหัสผ่าน" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10,
          border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-dim)', cursor: 'pointer',
        }}>
          <Icon name="lock" size={16} width={1.8} />
        </button>
      )}
      <button onClick={toggleTheme} title="สลับโหมดสว่าง/มืด" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10,
        border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-dim)', cursor: 'pointer',
      }}>
        <Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} width={1.8} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingLeft: 4 }}>
        <div className="hide-sm" style={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12.5 }}>{session.initial}</div>
        <div className="hide-sm" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ROLE_TH[session.role]}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.name}</div>
        </div>
        <button onClick={logout} title="ออกจากระบบ" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9,
          border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-dim)', cursor: 'pointer', marginLeft: 2,
        }}>
          <Icon name="logout" size={16} width={1.9} />
        </button>
      </div>

      {showPw && <ChangePasswordModal onClose={() => setShowPw(false)} />}
    </header>
  )
}
