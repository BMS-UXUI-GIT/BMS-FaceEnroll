import { useEffect, useState } from 'react'
import { useScreenZoom } from '../hooks'
import { Icon } from '../icons'
import { useApp } from '../state'

// หน้า login มี 2 แท็บ:
//   ผู้ดูแลระบบ = บัญชี dashboard (app_user)
//   ผู้ใช้งาน   = พนักงานโรง login ด้วยบัญชี HOSxP (เลือกโรงก่อน — เฉพาะโรงที่เปิดใช้งานแล้ว)
//                เข้ามาเป็น role user ดูอย่างเดียว

const BASE = window.__API_BASE__ || (import.meta.env.VITE_API_BASE as string | undefined) || 'http://localhost:8300'

type Hosp = { hcode: string; name: string }

// จำค่าล่าสุดไว้ในเครื่อง (เฉพาะเมื่อติ๊ก "จำฉันไว้"): แท็บ/โรงพยาบาล/ชื่อผู้ใช้/รหัสผ่าน
// ⚠️ รหัสผ่านเก็บใน localStorage ของเครื่องนี้ — ใช้เฉพาะเครื่องส่วนตัว ไม่ใช่เครื่องสาธารณะ
const REMEMBER_KEY = 'facecheck_login_remember_v1'
type Remembered = {
  remember?: boolean
  tab?: 'admin' | 'user'; hosp?: Hosp | null
  adminUser?: string; adminPass?: string
  staffUser?: string; staffPass?: string
}
function loadRemembered(): Remembered {
  try { return JSON.parse(localStorage.getItem(REMEMBER_KEY) || '{}') } catch { return {} }
}
function saveRemembered(patch: Remembered) {
  try { localStorage.setItem(REMEMBER_KEY, JSON.stringify({ ...loadRemembered(), ...patch })) } catch { /* private mode */ }
}
function clearRemembered() {
  try { localStorage.removeItem(REMEMBER_KEY) } catch { /* private mode */ }
}

const field: React.CSSProperties = {
  width: '100%', padding: '11px 13px', border: '1px solid var(--border)', borderRadius: 10,
  background: 'var(--surface-card)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13.5, outline: 'none',
}
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }

export function Login() {
  const { theme, toggleTheme, login, loginStaff } = useApp()
  const zoom = useScreenZoom()
  const [remembered] = useState<Remembered>(loadRemembered)
  const [remember, setRemember] = useState<boolean>(remembered.remember ?? true) // จำฉันไว้ (default ติ๊ก)
  const [tab, setTab] = useState<'admin' | 'user'>(remembered.tab === 'user' ? 'user' : 'admin')
  const [u, setU] = useState(remembered.adminUser ?? '')
  const [p, setP] = useState(remembered.adminPass ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showP, setShowP] = useState(false)   // โชว์/ซ่อนรหัส (ปุ่มลูกตา)
  const [showUp, setShowUp] = useState(false)

  // แท็บผู้ใช้งาน (พนักงานโรง — บัญชี HOSxP)
  const [hq, setHq] = useState('')
  const [hres, setHres] = useState<Hosp[]>([])
  const [hosp, setHosp] = useState<Hosp | null>(remembered.hosp?.hcode ? remembered.hosp : null)
  const [uu, setUu] = useState(remembered.staffUser ?? '')
  const [up, setUp] = useState(remembered.staffPass ?? '')
  const [notice, setNotice] = useState<string | null>(null)

  // ค้นเฉพาะโรงที่เปิดใช้งานแล้ว (endpoint เดียวกับแอปมือถือ) — debounce ตอนยังไม่เลือก
  useEffect(() => {
    if (tab !== 'user' || hosp || hq.trim().length < 1) { setHres([]); return }
    let alive = true
    const t = setTimeout(() => {
      fetch(`${BASE}/hospitals?q=${encodeURIComponent(hq.trim())}&limit=8`)
        .then((r) => r.json())
        .then((d) => alive && setHres((d?.hospitals as Hosp[]) ?? []))
        .catch(() => alive && setHres([]))
    }, 300)
    return () => { alive = false; clearTimeout(t) }
  }, [hq, tab, hosp])

  // เขียนค่าจำ เฉพาะเมื่อติ๊ก "จำฉันไว้" — ไม่ติ๊ก = ไม่แตะ localStorage เลย
  const persist = (patch: Remembered) => { if (remember) saveRemembered({ ...patch, remember: true }) }

  // ติ๊ก/เอาออก — เอาออก = ล้างที่เคยจำทิ้งทันที
  const toggleRemember = () => {
    setRemember((v) => {
      if (v) clearRemembered()
      return !v
    })
  }

  const submit = async () => {
    if (busy) return
    setErr(null)
    setBusy(true)
    try {
      await login(u, p)
      if (remember) saveRemembered({ remember: true, tab: 'admin', adminUser: u.trim(), adminPass: p })
      else clearRemembered()
    } catch (e: any) {
      setErr(e?.message || 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  const submitUser = async () => {
    if (busy || !hosp) return
    setNotice(null)
    setBusy(true)
    try {
      await loginStaff(hosp.hcode, uu, up)
      if (remember) saveRemembered({ remember: true, tab: 'user', staffUser: uu.trim(), staffPass: up, hosp })
      else clearRemembered()
    } catch (e: any) {
      setNotice(e?.message || 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  const eyeBtn: React.CSSProperties = {
    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
    border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-faint)',
    display: 'flex', alignItems: 'center', padding: 4,
  }

  const segBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)',
    fontSize: 13, fontWeight: active ? 700 : 500,
    background: active ? 'var(--surface)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text-faint)',
    boxShadow: active ? 'var(--shadow)' : 'none',
  })

  // "จำฉันไว้" — ใช้ทั้ง 2 ฟอร์ม · ไม่ติ๊ก = ไม่จำอะไรเลย (ล้างที่เคยจำด้วย)
  const rememberRow = (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px', cursor: 'pointer', fontSize: 12.5, color: 'var(--text-dim)', userSelect: 'none' }}>
      <input type="checkbox" checked={remember} onChange={toggleRemember}
        style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer', flex: 'none' }} />
      Remember me <span style={{ color: 'var(--text-faint)' }}>(จำชื่อผู้ใช้ + รหัสผ่านในเครื่องนี้)</span>
    </label>
  )

  return (
    <div style={{ zoom, width: '100%', minHeight: `${100 / zoom}vh`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      <button onClick={toggleTheme} title="สลับโหมดสว่าง/มืด" style={{
        position: 'absolute', top: 22, right: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer',
      }}>
        <Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} width={1.8} />
      </button>

      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26, justifyContent: 'center' }}>
          <div style={{ width: 42, height: 42, flex: 'none', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <img src="/logo.png" alt="" width={42} height={42} style={{ display: 'block' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 19, letterSpacing: '-.3px' }}>FaceCheck Admin</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>แดชบอร์ดผู้ดูแลระบบ</div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', padding: '28px 28px 26px' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>เข้าสู่ระบบ</h1>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-dim)' }}>มอนิเตอร์ระบบสแกนหน้า–ลงเวลา รพ.</p>

          <div style={{ display: 'flex', gap: 3, padding: 3, background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 20 }}>
            <button onClick={() => { setTab('admin'); setNotice(null); persist({ tab: 'admin' }) }} style={segBtn(tab === 'admin')}>ผู้ดูแลระบบ</button>
            <button onClick={() => { setTab('user'); setErr(null); persist({ tab: 'user' }) }} style={segBtn(tab === 'user')}>HOSxP</button>
          </div>

          {tab === 'admin' ? (
            // ติ๊ก "จำฉันไว้" = เก็บชื่อผู้ใช้+รหัสในเครื่อง / browser autocomplete ยังทำงานคู่กันได้
            <form onSubmit={(e) => { e.preventDefault(); submit() }}>
              <label style={lbl}>ชื่อผู้ใช้</label>
              <input value={u} onChange={(e) => setU(e.target.value)} placeholder="เช่น somchai@hospital.go.th"
                name="username" autoComplete="username"
                style={{ ...field, marginBottom: 15 }} />

              <label style={lbl}>รหัสผ่าน</label>
              <div style={{ position: 'relative', marginBottom: err ? 12 : 20 }}>
                <input value={p} onChange={(e) => setP(e.target.value)} type={showP ? 'text' : 'password'} placeholder="••••••••"
                  name="password" autoComplete="current-password" autoFocus={!!u}
                  style={{ ...field, paddingRight: 38 }} />
                <button type="button" onClick={() => setShowP(!showP)} title={showP ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} style={eyeBtn}>
                  <Icon name={showP ? 'eye-off' : 'eye'} size={16} width={1.8} />
                </button>
              </div>

              {err && (
                <div style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--danger)', background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 9, padding: '9px 12px' }}>{err}</div>
              )}

              {rememberRow}

              <button type="submit" disabled={busy} style={{
                width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--bg)',
                fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
              }}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); submitUser() }}>
              <label style={lbl}>โรงพยาบาล</label>
              {hosp ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 15 }}>
                  <div style={{ ...field, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700, color: 'var(--accent-active)', background: 'var(--accent-light)', padding: '2px 7px', borderRadius: 6, flex: 'none' }}>{hosp.hcode}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hosp.name || '(ไม่มีชื่อ)'}</span>
                    <button type="button" onClick={() => { setHosp(null); setHq('') }} style={{ border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 15, lineHeight: 1, flex: 'none' }}>×</button>
                  </div>
                </div>
              ) : (
                <div style={{ position: 'relative', marginBottom: 15 }}>
                  <input value={hq} onChange={(e) => setHq(e.target.value)} placeholder="พิมพ์รหัส (hcode) หรือชื่อโรงพยาบาล…"
                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()} autoComplete="off" style={field} />
                  {hres.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                      {hres.map((h) => (
                        <button key={h.hcode} type="button" onClick={() => { setHosp(h); setHres([]); persist({ hosp: h }) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--sans)', color: 'var(--text)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-card)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700, color: 'var(--accent-active)', background: 'var(--accent-light)', padding: '2px 7px', borderRadius: 6, flex: 'none' }}>{h.hcode}</span>
                          <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name || '(ไม่มีชื่อ)'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <label style={lbl}>ชื่อผู้ใช้</label>
              <input value={uu} onChange={(e) => setUu(e.target.value)} placeholder="เช่น somchai"
                name="username" autoComplete="username"
                style={{ ...field, marginBottom: 15 }} />

              <label style={lbl}>รหัสผ่าน</label>
              <div style={{ position: 'relative', marginBottom: notice ? 12 : 20 }}>
                <input value={up} onChange={(e) => setUp(e.target.value)} type={showUp ? 'text' : 'password'} placeholder="••••••••"
                  name="password" autoComplete="current-password" autoFocus={!!uu && !!hosp}
                  style={{ ...field, paddingRight: 38 }} />
                <button type="button" onClick={() => setShowUp(!showUp)} title={showUp ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} style={eyeBtn}>
                  <Icon name={showUp ? 'eye-off' : 'eye'} size={16} width={1.8} />
                </button>
              </div>

              {notice && (
                <div style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--danger)', background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 9, padding: '9px 12px' }}>{notice}</div>
              )}

              {rememberRow}

              <button type="submit" disabled={busy || !hosp || !uu.trim() || !up.trim()} style={{
                width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--bg)',
                fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer',
                opacity: busy || !hosp || !uu.trim() || !up.trim() ? 0.55 : 1,
              }}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
            </form>
          )}
        </div>

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 11.5, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>
          เวอร์ชัน {__APP_VERSION__}
        </div>
      </div>
    </div>
  )
}
