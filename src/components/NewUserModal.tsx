import { useEffect, useState } from 'react'
import { api } from '../api'
import { ROLE_TH, useApp } from '../state'
import { SearchSelect } from './SearchSelect'
import { Button } from './inputs/Button'
import { Icon } from '../icons'
import { TEXT } from '../typography'

// popup "เพิ่มผู้ใช้" — ใช้ร่วมหน้าผู้ใช้และสิทธิ์ + หน้ารายละเอียดโรงพยาบาล
// เปิดจากหน้ารายละเอียดโรง = เติมโรงให้ล่วงหน้า (prefill) ไม่ต้องค้นซ้ำ
// สร้างเสร็จโชว์อีเมล+รหัสผ่านครั้งเดียว ให้คัดลอกส่งผู้ใช้

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/

// รหัสผ่าน 6 ตัว ตัดตัวที่อ่านสับสน (0/O, 1/l/I)
export const genPassword = () => {
  const cs = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const a = new Uint32Array(6)
  crypto.getRandomValues(a)
  return [...a].map((n) => cs[n % cs.length]).join('')
}

const card: React.CSSProperties = { background: 'var(--bg)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)' }
const field: React.CSSProperties = {
  padding: 'var(--sp-2) var(--sp-3)', minHeight: 40, border: '1px solid var(--control-border)',
  borderRadius: 'var(--r-md)', background: 'var(--bg)', color: 'var(--text)',
  fontFamily: 'var(--sans)', fontSize: 13, outline: 'none',
}
// ไอคอน + คำอธิบายของแต่ละบทบาท (การ์ดเลือกบทบาท)
const ROLE_INFO: Record<string, { icon: string; desc: string }> = {
  superadmin: { icon: 'lock', desc: 'ดูแลทั้งระบบ ทุกโรงพยาบาล' },
  bmsadmin: { icon: 'system', desc: 'ทีม BMS ดูแลงานส่วนกลาง' },
  admin: { icon: 'hospital', desc: 'ผู้ดูแลของโรงพยาบาล' },
}

/** การ์ดเลือกบทบาท — ไอคอนบน ชื่อล่าง (เลือกได้ทีละใบ) */
function RoleCard({ role, on, onClick }: { role: string; on: boolean; onClick: () => void }) {
  const info = ROLE_INFO[role] ?? { icon: 'person', desc: '' }
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)',
      padding: 'var(--sp-3) var(--sp-2)', cursor: 'pointer', fontFamily: 'var(--sans)', textAlign: 'center',
      borderRadius: 'var(--r-lg)', border: `1px solid ${on ? 'var(--accent)' : 'transparent'}`,
      background: on ? 'var(--accent-light)' : 'var(--surface-alt)',
      transition: 'background .12s ease, border-color .12s ease',
    }}>
      <span aria-hidden style={{
        width: 40, height: 40, flex: 'none', borderRadius: 'var(--r-full)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: on ? 'var(--accent-active)' : 'var(--bg)', color: on ? 'var(--bg)' : 'var(--text-dim)',
      }}>
        <Icon name={info.icon} size={22} width={1.8} />
      </span>
      <span style={{ ...TEXT.sm, fontWeight: 500, color: on ? 'var(--accent-active)' : 'var(--text)' }}>{ROLE_TH[role] ?? role}</span>
      {info.desc && <span style={{ ...TEXT.caption, color: 'var(--text-dim)' }}>{info.desc}</span>}
    </button>
  )
}

// ขั้นตอนของฟอร์ม
const STEPS = ['บทบาท', 'ข้อมูลบัญชี', 'ตรวจสอบ']

const labelSt: React.CSSProperties = { ...TEXT.sm, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }

/** popup โชว์อีเมล+รหัสหลังสร้าง/รีเซ็ต — รหัสอ่านได้ครั้งเดียว */
export function CredentialsModal({ username, password, reset, onClose }: {
  username: string; password: string; reset?: boolean; onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 420, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--control-border)', ...TEXT.h3, color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <Icon name="rosette-check" size={20} width={1.8} />{reset ? 'รีเซ็ตรหัสผ่านแล้ว' : 'สร้างบัญชีแล้ว'}
        </div>
        <div style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <div style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>อีเมล</div>
          <div style={{ ...field, fontFamily: 'var(--mono)', fontWeight: 500, background: 'var(--surface-alt)' }}>{username}</div>
          <div style={{ ...TEXT.sm, color: 'var(--text-dim)', marginTop: 'var(--sp-2)' }}>รหัสผ่าน</div>
          <div style={{ ...field, fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 500, letterSpacing: '2px', background: 'var(--surface-alt)' }}>{password}</div>
          <div style={{ ...TEXT.sm, color: 'var(--warn)' }}>รหัสผ่านแสดงครั้งเดียว — คัดลอกส่งให้ผู้ใช้เก็บไว้ก่อนปิดหน้าต่างนี้</div>
        </div>
        <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderTop: '1px solid var(--control-border)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)' }}>
          <Button variant="secondary" size="md" pill
            onClick={() => { navigator.clipboard?.writeText(`${username}\n${password}`).then(() => setCopied(true)).catch(() => {}) }}>
            {copied ? '✓ คัดลอกแล้ว' : 'คัดลอกอีเมล + รหัส'}
          </Button>
          <Button variant="primary" size="md" pill onClick={onClose}>ปิด</Button>
        </div>
      </div>
    </div>
  )
}

export function NewUserModal({ hcodes: initialHcodes = [], hospitalNames, onClose, onCreated }: {
  /** โรงที่เติมให้ล่วงหน้า (เปิดจากหน้ารายละเอียดโรง) */
  hcodes?: string[]
  /** ชื่อโรงของ hcode ที่เติมมา — ไม่งั้นชิปจะโชว์แค่รหัส (โรงนั้นอาจไม่อยู่ใน scope ของคนที่ login) */
  hospitalNames?: Record<string, string>
  onClose: () => void
  /** สร้างสำเร็จ — ให้หน้าที่เรียกโหลดข้อมูลใหม่ */
  onCreated?: () => void
}) {
  const { session } = useApp()
  const [roles, setRoles] = useState<string[]>(['admin', 'bmsadmin', 'superadmin'])
  const [nu, setNu] = useState({ username: '', password: genPassword(), display_name: '', role: 'admin', hcodes: initialHcodes })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null)
  const [step, setStep] = useState(0)   // 0 = บทบาท/โรง · 1 = ข้อมูลบัญชี · 2 = ตรวจสอบ

  // รายชื่อ role จาก backend (เผื่อเพิ่ม/ตัด role ภายหลัง) — ล้มเหลวก็ใช้ค่าตั้งต้นด้านบน
  useEffect(() => {
    let alive = true
    api.get<{ roles: string[] }>('/admin/users')
      .then((d) => alive && d.roles?.length && setRoles(d.roles))
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // ตัวเลือกโรง = โรงใน scope ของคนที่ login + โรงที่เติมมาให้ (พร้อมชื่อ) — กันชิปโชว์เป็นรหัสเปล่า
  const hospOpts = [
    ...Object.entries(hospitalNames ?? {})
      .filter(([v]) => !(session?.hospitals ?? []).some((h) => h.value === v))
      .map(([value, label]) => ({ value, label, sub: value })),
    ...(session?.hospitals ?? []).filter((h) => h.value !== '*').map((h) => ({ value: h.value, label: h.label, sub: h.value })),
  ]
  const searchHospitals = (q: string) =>
    api.get<{ hospitals: { hcode: string; name: string }[] }>(`/admin/hospitals/search?q=${encodeURIComponent(q)}&limit=30`)
      .then((d) => (d.hospitals ?? []).map((h) => ({ value: h.hcode, label: h.name || '(ไม่มีชื่อ)', sub: h.hcode })))

  const needsHospital = nu.role !== 'superadmin' && nu.role !== 'bmsadmin'
  const emailOk = EMAIL_RE.test(nu.username.trim().toLowerCase())
  // ผ่านขั้นนี้ไปขั้นถัดไปได้หรือยัง
  const stepOk = [
    !!nu.role && (!needsHospital || nu.hcodes.length > 0),
    emailOk && nu.password.trim().length >= 6,
    true,
  ]

  const create = async () => {
    if (busy) return
    setBusy(true); setErr(null)
    try {
      const uname = nu.username.trim().toLowerCase()
      const pw = nu.password.trim()
      if (!EMAIL_RE.test(uname)) throw new Error('ชื่อผู้ใช้ต้องเป็นอีเมล เช่น somchai@hospital.go.th')
      if (pw.length < 6) throw new Error('รหัสผ่านต้องยาวอย่างน้อย 6 ตัว')
      const hcodes = needsHospital ? nu.hcodes : ['*']
      await api.post('/admin/users', { ...nu, username: uname, password: pw, hcodes })
      setCreated({ username: uname, password: pw })
      onCreated?.()
    } catch (e: any) { setErr(e?.message || 'สร้างบัญชีไม่สำเร็จ') } finally { setBusy(false) }
  }

  if (created) return <CredentialsModal username={created.username} password={created.password} onClose={onClose} />

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 440, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--control-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...TEXT.h3, color: 'var(--text)' }}>เพิ่มผู้ใช้</span>
          <button onClick={onClose} title="ปิด" style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', lineHeight: 0, padding: 'var(--sp-1)' }}>
            <Icon name="close" size={18} width={2} />
          </button>
        </div>

        {/* แถบขั้นตอน */}
        <div style={{ padding: 'var(--sp-4) var(--sp-5) 0', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          {STEPS.map((label, i) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flex: i < STEPS.length - 1 ? 1 : 'none', minWidth: 0 }}>
              <span aria-current={i === step ? 'step' : undefined} style={{
                width: 26, height: 26, flex: 'none', borderRadius: 'var(--r-full)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                ...TEXT.sm, fontWeight: 500,
                background: i < step ? 'var(--ok)' : i === step ? 'var(--accent-active)' : 'var(--surface-alt)',
                color: i <= step ? 'var(--bg)' : 'var(--text-dim)',
              }}>{i < step ? <Icon name="rosette-check" size={14} width={2.2} /> : i + 1}</span>
              <span style={{ ...TEXT.sm, fontWeight: i === step ? 500 : 400, color: i === step ? 'var(--text)' : 'var(--text-dim)', whiteSpace: 'nowrap' }}>{label}</span>
              {i < STEPS.length - 1 && (
                <span aria-hidden style={{ flex: 1, height: 2, borderRadius: 2, background: i < step ? 'var(--ok)' : 'var(--control-border)', minWidth: 12 }} />
              )}
            </span>
          ))}
        </div>

        <div style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', minHeight: 240 }}>
          {/* ---------- ขั้น 1: บทบาท + โรงที่ดูแล ---------- */}
          {step === 0 && (
            <>
              <div style={labelSt}>บทบาท
                {/* role user สร้างจากหน้านี้ไม่ได้ (พนักงานโรง login ผ่านบัญชี HOSxP เอง) */}
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                  {roles.filter((r) => r !== 'user').map((r) => (
                    <RoleCard key={r} role={r} on={nu.role === r} onClick={() => setNu({ ...nu, role: r })} />
                  ))}
                </div>
              </div>

              {needsHospital ? (
                <label style={labelSt}>โรงพยาบาลที่ดูแล (เลือกได้หลายโรง)
                  <SearchSelect multi allowCustom values={nu.hcodes}
                    onToggle={(v) => setNu((s2) => ({ ...s2, hcodes: s2.hcodes.includes(v) ? s2.hcodes.filter((x) => x !== v) : [...s2.hcodes, v] }))}
                    options={hospOpts} onSearch={searchHospitals}
                    placeholder="พิมพ์เลขหรือชื่อโรงพยาบาลเพื่อค้นหา…" />
                </label>
              ) : (
                <div style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>บัญชีส่วนกลางเห็นทุกโรงพยาบาลอยู่แล้ว ไม่ต้องเลือกโรง</div>
              )}
            </>
          )}

          {/* ---------- ขั้น 2: ข้อมูลบัญชี ---------- */}
          {step === 1 && (
            <>
              <label style={labelSt}>อีเมล (ใช้เป็นชื่อผู้ใช้ login)
                <input autoFocus value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} type="email"
                  placeholder="เช่น somchai@hospital.go.th"
                  style={{ ...field, ...(nu.username.trim() && !emailOk ? { borderColor: 'var(--danger)' } : {}) }} />
              </label>

              <label style={labelSt}>ชื่อที่แสดง
                <input value={nu.display_name} onChange={(e) => setNu({ ...nu, display_name: e.target.value })}
                  placeholder="เช่น คุณสมชาย (ไอที)" style={field} />
              </label>

              <label style={labelSt}>รหัสผ่าน (ระบบสุ่มให้ 6 ตัว)
                <span style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                  <input value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })}
                    style={{ ...field, flex: 1, fontFamily: 'var(--mono)', letterSpacing: '1px' }} />
                  <Button variant="secondary" size="sm" onClick={() => setNu({ ...nu, password: genPassword() })}>สุ่มใหม่</Button>
                </span>
              </label>
            </>
          )}

          {/* ---------- ขั้น 3: ตรวจสอบก่อนสร้าง ---------- */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {([
                ['บทบาท', ROLE_TH[nu.role] ?? nu.role],
                ['โรงพยาบาล', needsHospital ? nu.hcodes.join(', ') : 'ทุกโรงพยาบาล'],
                ['อีเมล', nu.username.trim().toLowerCase()],
                ['ชื่อที่แสดง', nu.display_name.trim() || '—'],
                ['รหัสผ่าน', nu.password.trim()],
              ] as const).map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap',
                  padding: 'var(--sp-2) var(--sp-3)', background: 'var(--surface-alt)', borderRadius: 'var(--r-lg)',
                }}>
                  <span style={{ ...TEXT.sm, color: 'var(--text-dim)', flex: 1, minWidth: 90 }}>{k}</span>
                  <span style={{ ...TEXT.bodyMed, color: 'var(--text)', fontFamily: k === 'รหัสผ่าน' || k === 'อีเมล' ? 'var(--mono)' : undefined, wordBreak: 'break-word' }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {err && <div style={{ ...TEXT.sm, color: 'var(--danger)' }}>ผิดพลาด: {err}</div>}
        </div>

        <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderTop: '1px solid var(--control-border)', display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-2)' }}>
          <Button variant="ghost" size="md" pill onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>
            {step === 0 ? 'ยกเลิก' : 'ย้อนกลับ'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" size="md" pill onClick={() => setStep(step + 1)} disabled={!stepOk[step]}>ถัดไป</Button>
          ) : (
            <Button variant="primary" size="md" pill onClick={create} disabled={busy || !stepOk[0] || !stepOk[1]}>
              {busy ? 'กำลังสร้าง…' : 'สร้างบัญชี'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
