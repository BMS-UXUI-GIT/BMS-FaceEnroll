import { useState } from 'react'
import { HeroCard } from '../components/layout/PageHeader'
import { api } from '../api'
import { toast } from '../components/dialog'
import { ROLE_TH, useApp } from '../state'
import { SectionPanel } from '../components/layout/SectionPanel'
import { HospitalArt } from '../components/PickHospital'
import { Button } from '../components/inputs/Button'
import { Icon } from '../icons'
import { TEXT } from '../typography'

// จัดการบัญชี — หน้าตั้งค่าบัญชีของตัวเอง (เข้าจากเมนูโปรไฟล์ท้ายแถบเมนู)
// เลย์เอาต์แบบ "รายการตั้งค่า": หัวข้อกลุ่ม -> การ์ดรวมแถว (ป้ายซ้าย · ค่า/ปุ่มขวา)
// เปลี่ยนรหัสผ่านทำในหน้านี้เลย (บัญชี HOSxP ไม่มีส่วนนี้ — ไปแก้ที่ HOSxP)

/** แถวข้อมูล/การกระทำ 1 บรรทัดในการ์ดกลุ่ม */
function Row({ icon, label, value, onClick, danger, last }: {
  icon: string
  label: string
  value?: React.ReactNode
  onClick?: () => void
  danger?: boolean
  last?: boolean
}) {
  const inner = (
    <>
      <span aria-hidden style={{
        width: 32, height: 32, flex: 'none', borderRadius: 'var(--r-md)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: danger ? 'var(--danger-light)' : 'var(--accent-light)',
        color: danger ? 'var(--danger)' : 'var(--accent-active)',
      }}>
        <Icon name={icon} size={18} width={1.8} />
      </span>
      <span style={{ ...TEXT.body, color: danger ? 'var(--danger)' : 'var(--text)', flex: 1, minWidth: 0, textAlign: 'left' }}>{label}</span>
      {value != null && (
        <span style={{ ...TEXT.body, color: 'var(--text-dim)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
      )}
      {onClick && <Icon name="chevron-down" size={16} width={2} color="var(--text-faint)" style={{ flex: 'none', transform: 'rotate(-90deg)' }} />}
    </>
  )
  const style: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%',
    padding: 'var(--sp-3) var(--sp-4)', minHeight: 60,
    borderBottom: last ? 'none' : '1px solid var(--control-border)',
    background: 'transparent', border: 'none', fontFamily: 'var(--sans)',
  }
  return onClick
    ? <button type="button" onClick={onClick} className="row-hover" style={{ ...style, cursor: 'pointer' }}>{inner}</button>
    : <div style={style}>{inner}</div>
}

/** การ์ดรวมแถวของกลุ่ม */
function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'var(--surface-alt)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>{children}</div>
}

const fld: React.CSSProperties = {
  width: '100%', padding: 'var(--sp-2) var(--sp-3)', minHeight: 40,
  border: '1px solid var(--control-border)', borderRadius: 'var(--r-md)',
  background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none',
}

export function Account() {
  const { session, logout, currentHcode } = useApp()
  const [oldP, setOldP] = useState('')
  const [newP, setNewP] = useState('')
  const [confirmP, setConfirmP] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!session) return null
  const staff = session.kind === 'staff'   // บัญชี HOSxP — เปลี่ยนรหัสผ่านที่นี่ไม่ได้

  const hospLabel = currentHcode === '*'
    ? 'ทุกโรงพยาบาล'
    : session.hospitals.find((h) => h.value === currentHcode)?.label ?? currentHcode

  const savePassword = async () => {
    if (busy) return
    setErr(null)
    if (newP.trim().length < 6) return setErr('รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัว')
    if (newP.trim() !== confirmP.trim()) return setErr('ยืนยันรหัสผ่านใหม่ไม่ตรงกัน')
    setBusy(true)
    try {
      await api.post('/admin/auth/change-password', { old_password: oldP, new_password: newP.trim() })
      setOldP(''); setNewP(''); setConfirmP('')
      toast.success('เปลี่ยนรหัสผ่านแล้ว')
    } catch (e: any) {
      setErr(e?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      {/* ---------- การ์ดหัวเรื่อง ---------- */}
      <HeroCard>
        <span aria-hidden className="hide-sm hero-rise" style={{ position: 'absolute', right: 24, bottom: -150, lineHeight: 0 }}>
          <HospitalArt width={300} />
        </span>

        <div className="relative">
          <h1 className="text-h2 m-0 text-text">จัดการบัญชี</h1>
          <p className="text-body mt-2 mb-0 text-[color-mix(in_srgb,var(--text-faint)_50%,transparent)]">
            ข้อมูลบัญชีของคุณ ขอบเขตข้อมูลที่ดูได้ และการเปลี่ยนรหัสผ่าน
          </p>

          {/* การ์ดโปรไฟล์ */}
          <div className="bg-bg rounded-xl mt-4" style={{
            display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-3)',
            padding: 'var(--sp-3) var(--sp-4)', maxWidth: '100%',
          }}>
            <span aria-hidden style={{
              width: 48, height: 48, flex: 'none', borderRadius: 'var(--r-full)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--border)', color: 'var(--bg)', ...TEXT.h3,
            }}>{session.initial}</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ ...TEXT.bodyMed, color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.name}
              </span>
              <span style={{ ...TEXT.sm, color: 'var(--text-dim)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.position || ROLE_TH[session.role] || session.role}
              </span>
            </span>
          </div>
        </div>
      </HeroCard>

      <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px,100%), 1fr))' }}>
        <div className="flex flex-col gap-4">
          <SectionPanel title="ข้อมูลบัญชี">
            <Card>
              <Row icon="mail" label="ชื่อผู้ใช้" value={session.username} />
              <Row icon="lock" label="บทบาท" value={ROLE_TH[session.role] ?? session.role} />
              <Row icon="face" label="ชนิดบัญชี" value={staff ? 'บัญชี HOSxP ของโรงพยาบาล' : 'บัญชี dashboard'} last />
            </Card>
          </SectionPanel>

          <SectionPanel title="ข้อมูลที่ดูได้">
            <Card>
              <Row icon="hospital" label="ฐานข้อมูลปัจจุบัน" value={hospLabel} />
              <Row icon="people" label="โรงพยาบาลในสิทธิ์"
                value={session.hospitals.length ? `${session.hospitals.length} แห่ง` : '—'} last />
            </Card>
          </SectionPanel>

          <SectionPanel title="ระบบ">
            <Card>
              <Row icon="info" label="ภาษา" value="ไทย" />
              <Row icon="logout" label="ออกจากระบบ" danger onClick={logout} last />
            </Card>
          </SectionPanel>
        </div>

        {/* ---------- เปลี่ยนรหัสผ่าน (อยู่ในหน้านี้เลย) ---------- */}
        <SectionPanel title="เปลี่ยนรหัสผ่าน"
          meta={staff ? undefined : 'อย่างน้อย 6 ตัวอักษร'}>
          {staff ? (
            <div style={{ ...TEXT.body, padding: '32px 20px', color: 'var(--text-dim)', textAlign: 'center' }}>
              บัญชีนี้เข้าระบบด้วยรหัสผ่านของ HOSxP — เปลี่ยนรหัสผ่านได้ที่ระบบ HOSxP ของโรงพยาบาล
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <label style={{ ...TEXT.sm, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
                รหัสผ่านเดิม
                <input type="password" autoComplete="current-password" value={oldP} onChange={(e) => setOldP(e.target.value)} style={fld} />
              </label>
              <label style={{ ...TEXT.sm, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
                รหัสผ่านใหม่
                <input type="password" autoComplete="new-password" value={newP} onChange={(e) => setNewP(e.target.value)} style={fld} />
              </label>
              <label style={{ ...TEXT.sm, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
                ยืนยันรหัสผ่านใหม่
                <input type="password" autoComplete="new-password" value={confirmP} onChange={(e) => setConfirmP(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && savePassword()} style={fld} />
              </label>

              {err && <div style={{ ...TEXT.sm, color: 'var(--danger)' }}>{err}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" size="md" pill onClick={savePassword}
                  disabled={busy || !oldP || !newP || !confirmP}>
                  {busy ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน'}
                </Button>
              </div>
            </div>
          )}
        </SectionPanel>
      </div>
    </div>
  )
}
