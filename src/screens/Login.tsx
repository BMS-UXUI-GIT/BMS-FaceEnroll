import { useState } from 'react'
import { useScreenZoom } from '../hooks'
import { Icon } from '../icons'
import { useApp } from '../state'
import { asset } from '../assets'
import { SearchSelect } from '../components/SearchSelect'
import { Button } from '../components/inputs/Button'
import { TEXT } from '../typography'

// หน้า login มี 2 แท็บ:
//   ผู้ดูแลระบบ = บัญชี dashboard (app_user)
//   HOSxP      = พนักงานโรง login ด้วยบัญชี HOSxP (เลือกโรงก่อน — เฉพาะโรงที่เปิดใช้งานแล้ว)
//                เข้ามาเป็น role user ดูอย่างเดียว
//
// เลย์เอาต์เดียวกับหน้าอื่นในระบบ: การ์ดใบเดียว 2 คอลัมน์
//   ซ้าย = แผงแบรนด์ไล่สี + ภาพประกอบ · ขวา = ฟอร์ม (แท็บ → ช่องกรอก → ปุ่มหลัก)

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
  width: '100%', padding: 'var(--sp-3)', minHeight: 48,
  border: '1px solid var(--control-border)', borderRadius: 'var(--r-lg)',
  background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 14, outline: 'none',
}
const lbl: React.CSSProperties = { ...TEXT.sm, display: 'block', color: 'var(--text-dim)', marginBottom: 'var(--sp-1)' }

export function Login() {
  const { login, loginStaff } = useApp()
  const zoom = useScreenZoom()
  const [remembered] = useState<Remembered>(loadRemembered)
  const [remember, setRemember] = useState<boolean>(remembered.remember ?? true) // จำฉันไว้ (default ติ๊ก)
  // เปิดมาเจอฟอร์ม HOSxP (พนักงานโรง) เสมอ — ผู้ดูแลระบบกดสลับจากลิงก์ท้ายฟอร์ม
  // (ไม่จำโหมดล่าสุด: คนใช้งานส่วนใหญ่คือพนักงานโรง)
  const [tab, setTab] = useState<'admin' | 'user'>('user')
  const [u, setU] = useState(remembered.adminUser ?? '')
  const [p, setP] = useState(remembered.adminPass ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showP, setShowP] = useState(false)   // โชว์/ซ่อนรหัส (ปุ่มลูกตา)
  const [showUp, setShowUp] = useState(false)

  // แท็บ HOSxP (พนักงานโรง)
  const [hosp, setHosp] = useState<Hosp | null>(remembered.hosp?.hcode ? remembered.hosp : null)
  const [uu, setUu] = useState(remembered.staffUser ?? '')
  const [up, setUp] = useState(remembered.staffPass ?? '')
  const [notice, setNotice] = useState<string | null>(null)

  // ค้นเฉพาะโรงที่เปิดใช้งานแล้ว (endpoint เดียวกับแอปมือถือ) — SearchSelect หน่วงให้เอง
  const searchHospitals = (q: string) =>
    fetch(`${BASE}/hospitals?q=${encodeURIComponent(q)}&limit=8`)
      .then((r) => r.json())
      .then((d) => ((d?.hospitals as Hosp[]) ?? []).map((h) => ({ value: h.hcode, label: h.name || '(ไม่มีชื่อ)', sub: h.hcode })))
      .catch(() => [])

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
      await loginStaff(hosp.hcode, uu, up, hosp.name)
      if (remember) saveRemembered({ remember: true, tab: 'user', staffUser: uu.trim(), staffPass: up, hosp })
      else clearRemembered()
    } catch (e: any) {
      setNotice(e?.message || 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  // ไอคอนนำหน้าในช่องกรอก
  const leadIcon: React.CSSProperties = {
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    color: 'var(--text-faint)', display: 'flex', alignItems: 'center', pointerEvents: 'none',
  }

  const eyeBtn: React.CSSProperties = {
    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
    border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-faint)',
    display: 'flex', alignItems: 'center', padding: 4,
  }

  // "จำฉันไว้" — ใช้ทั้ง 2 ฟอร์ม · ไม่ติ๊ก = ไม่จำอะไรเลย (ล้างที่เคยจำด้วย)
  const rememberRow = (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', cursor: 'pointer',
      ...TEXT.sm, color: 'var(--text-dim)', userSelect: 'none',
    }}>
      <input type="checkbox" checked={remember} onChange={toggleRemember}
        style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer', flex: 'none' }} />
      จำฉันไว้ในเครื่องนี้
    </label>
  )

  const errorBox = (msg: string) => (
    <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">{msg}</div>
  )

  return (
    <div style={{ zoom, width: '100%', minHeight: `${100 / zoom}vh`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-6)' }}>
      <div className="login-card rounded-xl" style={{
        width: 'min(940px, 100%)', background: 'var(--bg)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
      }}>
        {/* ---------- ซ้าย: ภาพประกอบเต็มครึ่งการ์ด + โลโก้/ข้อความวางทับ ---------- */}
        <div className="relative overflow-hidden" style={{ minHeight: 560, padding: 'var(--sp-6)' }}>
          {/* ภาพประกอบ (Figma 401:25169) — คลุมเต็มแผงซ้าย */}
          <img aria-hidden src={asset('/login-art.jpg')} alt=""
            className="pointer-events-none select-none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center bottom' }} />

          {/* ฝ้าขาวจางจากมุมซ้ายบน — เข้มตรงโลโก้/ข้อความ แล้วจางหายไปทางขวา-ล่าง */}
          <span aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(115% 85% at 0% 0%, var(--bg) 0%, color-mix(in srgb, var(--bg) 72%, transparent) 38%, transparent 72%)',
          }} />

          <div style={{ position: 'relative' }}>
            {/* ชุดเดียวกับ header: สัญลักษณ์ + wordmark */}
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <img src={asset('/logo-mark.svg')} alt="" width={56} height={56} style={{ display: 'block', flex: 'none' }} />
              <img src={asset('/wordmark.svg')} alt="BMS FaceEnroll" style={{ display: 'block', height: 34, width: 'auto', flex: 'none' }} />
            </span>
            <p className="text-body mt-3 mb-0 text-text-dim" style={{ whiteSpace: 'nowrap' }}>
              ระบบสแกนใบหน้าเพื่อลงเวลาปฏิบัติงานของโรงพยาบาล
            </p>
          </div>
        </div>

        {/* ---------- ขวา: ฟอร์ม ---------- */}
        {/* การ์ดฟอร์ม — มุมมนทุกด้าน เกยทับภาพฝั่งซ้ายเล็กน้อย (ตามดีไซน์) */}
        <div style={{
          position: 'relative', zIndex: 1, background: 'var(--bg)',
          borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-md)',
          marginLeft: 'calc(var(--sp-6) * -1)',
          padding: 'var(--sp-8) var(--sp-6)', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', gap: 'var(--sp-4)',
        }}>
        <div style={{ width: '100%', maxWidth: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {/* หัวฟอร์มจัดกึ่งกลาง — โลโก้บริษัท (BMS) → หัวข้อ → คำอธิบาย */}
          <div style={{ textAlign: 'center' }}>
            {/* (โลโก้อยู่นอก key เพราะไม่เปลี่ยนตามโหมด) */}
            <img src={asset('/bms-icon.png')} alt="BMS" width={52} height={52}
              style={{ display: 'block', margin: '0 auto var(--sp-3)', borderRadius: 'var(--r-full)' }} />
            <div key={`h:${tab}`} className="tab-in">
              <h1 className="text-h2 m-0 text-text">
                {tab === 'admin' ? 'เข้าสู่ระบบผู้ดูแลระบบ' : 'เข้าสู่ระบบด้วย HOSxP'}
              </h1>
              <p className="text-body mt-2 mb-0 text-text-dim">
                {tab === 'admin' ? 'บัญชีผู้ดูแลของ dashboard' : 'ใช้บัญชี HOSxP ของโรงพยาบาลที่สังกัด'}
              </p>
            </div>
          </div>

          {tab === 'admin' ? (
            // ติ๊ก "จำฉันไว้" = เก็บชื่อผู้ใช้+รหัสในเครื่อง / browser autocomplete ยังทำงานคู่กันได้
            <form key="f:admin" className="tab-in" onSubmit={(e) => { e.preventDefault(); submit() }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <div>
                <label style={lbl}>ชื่อผู้ใช้ (อีเมล)</label>
                <div style={{ position: 'relative' }}>
                  <span style={leadIcon}><Icon name="mail" size={18} width={1.8} /></span>
                  <input value={u} onChange={(e) => setU(e.target.value)} placeholder="เช่น somchai@hospital.go.th"
                    name="username" autoComplete="username" style={{ ...field, paddingLeft: 44 }} />
                </div>
              </div>

              <div>
                <label style={lbl}>รหัสผ่าน</label>
                <div style={{ position: 'relative' }}>
                  <span style={leadIcon}><Icon name="lock" size={18} width={1.8} /></span>
                  <input value={p} onChange={(e) => setP(e.target.value)} type={showP ? 'text' : 'password'} placeholder="กรอกรหัสผ่าน"
                    name="password" autoComplete="current-password" autoFocus={!!u}
                    style={{ ...field, paddingLeft: 44, paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowP(!showP)} title={showP ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} style={eyeBtn}>
                    <Icon name={showP ? 'eye-off' : 'eye'} size={18} width={1.8} />
                  </button>
                </div>
              </div>

              {err && errorBox(err)}
              {rememberRow}

              <Button variant="primary" size="lg" pill fullWidth type="submit" disabled={busy}>
                {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
              </Button>
            </form>
          ) : (
            <form key="f:user" className="tab-in" onSubmit={(e) => { e.preventDefault(); submitUser() }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <div>
                <label style={lbl}>โรงพยาบาล</label>
                {/* ค้นสดจากทะเบียนโรงที่เปิดใช้งานแล้ว */}
                <SearchSelect
                  value={hosp?.hcode}
                  onChange={(v) => {
                    // ชื่อโรงมาจากผลค้นล่าสุด — เก็บไว้ใช้ตอน login (โชว์ชื่อบน header)
                    searchHospitals(v).then((rows) => {
                      const found = rows.find((r) => r.value === v)
                      const next = { hcode: v, name: found?.label ?? v }
                      setHosp(next); persist({ hosp: next })
                    })
                  }}
                  options={hosp ? [{ value: hosp.hcode, label: hosp.name || '(ไม่มีชื่อ)', sub: hosp.hcode }] : []}
                  onSearch={searchHospitals}
                  placeholder="พิมพ์รหัส (hcode) หรือชื่อโรงพยาบาล…"
                  searchPlaceholder="พิมพ์รหัสหรือชื่อโรงพยาบาล…"
                />
              </div>

              <div>
                <label style={lbl}>ชื่อผู้ใช้ HOSxP</label>
                <div style={{ position: 'relative' }}>
                  <span style={leadIcon}><Icon name="person" size={18} width={1.8} /></span>
                  <input value={uu} onChange={(e) => setUu(e.target.value)} placeholder="เช่น somchai"
                    name="username" autoComplete="username" style={{ ...field, paddingLeft: 44 }} />
                </div>
              </div>

              <div>
                <label style={lbl}>รหัสผ่าน</label>
                <div style={{ position: 'relative' }}>
                  <span style={leadIcon}><Icon name="lock" size={18} width={1.8} /></span>
                  <input value={up} onChange={(e) => setUp(e.target.value)} type={showUp ? 'text' : 'password'} placeholder="กรอกรหัสผ่าน"
                    name="password" autoComplete="current-password" autoFocus={!!uu && !!hosp}
                    style={{ ...field, paddingLeft: 44, paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowUp(!showUp)} title={showUp ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} style={eyeBtn}>
                    <Icon name={showUp ? 'eye-off' : 'eye'} size={18} width={1.8} />
                  </button>
                </div>
              </div>

              {notice && errorBox(notice)}
              {rememberRow}

              <Button variant="primary" size="lg" pill fullWidth type="submit"
                disabled={busy || !hosp || !uu.trim() || !up.trim()}>
                {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
              </Button>
            </form>
          )}

          {/* ท้ายฟอร์ม: ช่วยเหลือซ้าย · เวอร์ชันขวา */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', paddingTop: 'var(--sp-2)', borderTop: '1px solid var(--control-border)' }}>
            {/* สลับไปฟอร์มอีกแบบ (ผู้ดูแลระบบ ↔ HOSxP) */}
            <button type="button"
              onClick={() => {
                const next = tab === 'admin' ? 'user' : 'admin'
                setTab(next); setErr(null); setNotice(null); persist({ tab: next })
              }}
              style={{
                ...TEXT.sm, display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)',
                border: 'none', background: 'transparent', color: 'var(--accent-active)',
                cursor: 'pointer', fontFamily: 'var(--sans)', padding: 0,
              }}>
              <Icon name={tab === 'admin' ? 'hospital' : 'lock'} size={16} width={1.8} />
              {tab === 'admin' ? 'เข้าสู่ระบบด้วย HOSxP' : 'เข้าสู่ระบบผู้ดูแลระบบ'}
            </button>
            <span style={{ ...TEXT.sm, fontFamily: 'var(--mono)', color: 'var(--text-faint)', marginLeft: 'auto' }}>
              เวอร์ชัน {__APP_VERSION__}
            </span>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
