import { useEffect, useRef, useState } from 'react'
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
// คลิปเปิดแอป: เล่นครั้งเดียวต่อการโหลดหน้า
// เก็บใน memory ไม่ใช่ sessionStorage — refresh = โมดูลถูกโหลดใหม่ = ได้ดูคลิปอีกรอบ
// (ออกจากระบบแล้วกลับมาหน้า login ในรอบเดิม ไม่ต้องดูซ้ำ)
let splashPlayed = false
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
  // คลิปเปิดแอป — เล่นรอบเดียวต่อการโหลดหน้า (hard refresh แล้วเล่นใหม่)
  const [splash, setSplash] = useState(() => !splashPlayed)
  const videoRef = useRef<HTMLVideoElement>(null)
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

  // แท็บเลือกชนิดบัญชี — HOSxP (พนักงานโรงพยาบาล) มาก่อน เพราะคนใช้งานส่วนใหญ่คือกลุ่มนี้
  const TABS: ['admin' | 'user', string, string][] = [
    ['user', 'HOSxP', 'hospital'],
    ['admin', 'ผู้ดูแลระบบ', 'lock'],
  ]

  // จบคลิป / กดข้าม / โหลดคลิปไม่ได้ -> หยุดคลิปค้างเฟรมสุดท้าย แล้วเฟดการ์ดเข้าทับ
  const endSplash = () => {
    if (!splash) return
    videoRef.current?.pause()
    splashPlayed = true
    setSplash(false)
  }

  // กันคลิปค้าง (ไม่ยิง ended/error เช่นเบราว์เซอร์บล็อก autoplay) — เกิน 15 วิ ปิดเอง
  useEffect(() => {
    if (!splash) return
    const t = setTimeout(endSplash, 15000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splash])

  const errorBox = (msg: string) => (
    <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">{msg}</div>
  )

  return (
    <div style={{ zoom, width: '100%', minHeight: `${100 / zoom}vh`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-6)' }}>
      {/* ---------- คลิปเปิดแอป — คลุมเต็มจอเป็นฉากหลัง เล่นจบแล้วค้างเฟรมสุดท้ายไว้
                     การ์ด login โผล่ทับบนคลิป (ไม่เอาคลิปออก) ---------- */}
      <video
        ref={videoRef}
        src={asset('/bms-face-enroll-splash.mp4')}
        autoPlay={splash} muted playsInline
        onEnded={endSplash}
        onError={endSplash}
        // เคยดูจบไปแล้วในแท็บนี้: ไม่เล่นซ้ำ กระโดดไปเฟรมสุดท้ายเป็นภาพนิ่งเลย
        onLoadedMetadata={(e) => { if (!splash) e.currentTarget.currentTime = e.currentTarget.duration || 0 }}
        aria-hidden
        style={{
          position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          zIndex: 0, pointerEvents: 'none', background: 'var(--bg)',
          // เล่นจบแล้วหรี่ลง + เบลอ = เหลือเป็นแค่ฉากหลัง ไม่แย่งสายตาไปจากการ์ด login
          opacity: splash ? 1 : 0.25,
          filter: splash ? 'blur(0px) saturate(1)' : 'blur(3px) saturate(0.8)',
          transform: splash ? 'scale(1)' : 'scale(1.03)',   // กันขอบขาวจากการเบลอ
          // ทุก property ต้องอยู่ในลิสต์ ไม่งั้น transform/filter จะกระโดดทันที
          transition: 'opacity .9s ease, filter .9s ease, transform .9s ease',
          willChange: 'opacity, filter, transform',
        }}
      />

      {/* ฝ้าขาวคลุมคลิปอีกชั้น — mount ไว้ตลอดแล้วค่อยไล่ opacity (mount ทีหลัง = ตัดภาพกระตุก) */}
      <span aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'color-mix(in srgb, var(--bg) 45%, transparent)',
        opacity: splash ? 0 : 1, transition: 'opacity .9s ease',
      }} />

      {/* ปุ่มข้าม — เฉพาะระหว่างคลิปยังเล่นอยู่ */}
      {splash && (
        <button type="button" onClick={endSplash} style={{
          position: 'fixed', right: 'var(--sp-6)', bottom: 'var(--sp-6)', zIndex: 2,
          ...TEXT.sm, fontFamily: 'var(--sans)', color: 'var(--text-dim)',
          background: 'color-mix(in srgb, var(--bg) 70%, transparent)',
          border: '1px solid var(--control-border)', borderRadius: 'var(--r-full)',
          padding: 'var(--sp-2) var(--sp-4)', cursor: 'pointer', backdropFilter: 'blur(8px)',
        }}>ข้าม</button>
      )}

      <div className="login-card rounded-xl" style={{
        position: 'relative', zIndex: 1,
        width: 'min(940px, 100%)', background: 'var(--bg)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
        // คลิปยังเล่นอยู่ = ซ่อนการ์ดไว้ก่อน · จบคลิปแล้วค่อยลอยเข้ามาทับเฟรมสุดท้าย
        // หน่วง 350ms ให้ฉากหลังหรี่ลงไปก่อน แล้วการ์ดค่อยมา (มาพร้อมกัน = ตากวาดไม่ทัน)
        opacity: splash ? 0 : 1,
        transform: splash ? 'translateY(18px) scale(.985)' : 'none',
        transition: splash
          ? 'opacity .25s ease, transform .25s ease'
          : 'opacity .75s ease .35s, transform .75s cubic-bezier(.16,.84,.28,1) .35s',
        willChange: 'opacity, transform',
        pointerEvents: splash ? 'none' : undefined,
      }}>
        {/* ---------- ซ้าย: ภาพประกอบเต็มครึ่งการ์ด + โลโก้/ข้อความวางทับ ---------- */}
        <div className="relative overflow-hidden" style={{ minHeight: 560, padding: 'var(--sp-6)' }}>
          {/* ภาพประกอบ (Figma 457:29497 — พยาบาลสแกนใบหน้าหน้าโรงพยาบาล) คลุมเต็มแผงซ้าย */}
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

          {/* เลือกชนิดบัญชี — แท็บ 2 ปุ่มในราง (ลิงก์เล็ก ๆ ท้ายฟอร์มแบบเดิมมองไม่เห็น
              ผู้ดูแลระบบเลยหาทางเข้าไม่เจอ) */}
          <div role="tablist" aria-label="ชนิดบัญชี" style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-1)',
            padding: 'var(--sp-1)', borderRadius: 'var(--r-full)', background: 'var(--surface-alt)',
          }}>
            {TABS.map(([k, label, icon]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k}
                onClick={() => { setTab(k); setErr(null); setNotice(null); persist({ tab: k }) }}
                style={{
                  ...TEXT.sm, fontWeight: 500, fontFamily: 'var(--sans)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-2)',
                  minHeight: 40, padding: '0 var(--sp-3)', borderRadius: 'var(--r-full)', border: 'none', cursor: 'pointer',
                  background: tab === k ? 'var(--accent)' : 'transparent',
                  color: tab === k ? 'var(--bg)' : 'var(--text-dim)',
                  transition: 'background .12s ease, color .12s ease',
                }}>
                <Icon name={icon} size={18} width={1.8} />
                {label}
              </button>
            ))}
          </div>

          {/* กรอบสูงคงที่ — ฟอร์ม HOSxP มี 3 ช่อง ผู้ดูแลระบบมี 2 ถ้าไม่ล็อกความสูง
              การ์ดจะกระตุกสั้น-ยาวทุกครั้งที่สลับแท็บ (ฟอร์มที่สั้นกว่าดันปุ่มลงไปชิดล่างแทน) */}
          <div style={{ minHeight: 344, display: 'flex', flexDirection: 'column' }}>
          {tab === 'admin' ? (
            // ติ๊ก "จำฉันไว้" = เก็บชื่อผู้ใช้+รหัสในเครื่อง / browser autocomplete ยังทำงานคู่กันได้
            <form key="f:admin" className="tab-in" onSubmit={(e) => { e.preventDefault(); submit() }} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
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

              <span aria-hidden style={{ flex: 1 }} />
              {err && errorBox(err)}
              {rememberRow}

              <Button variant="primary" size="lg" pill fullWidth type="submit" disabled={busy}>
                {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
              </Button>
            </form>
          ) : (
            <form key="f:user" className="tab-in" onSubmit={(e) => { e.preventDefault(); submitUser() }} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
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

              <span aria-hidden style={{ flex: 1 }} />
              {notice && errorBox(notice)}
              {rememberRow}

              <Button variant="primary" size="lg" pill fullWidth type="submit"
                disabled={busy || !hosp || !uu.trim() || !up.trim()}>
                {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
              </Button>
            </form>
          )}
          </div>

          {/* ท้ายฟอร์ม: เวอร์ชัน (สลับชนิดบัญชีอยู่ที่แท็บด้านบนแล้ว) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', paddingTop: 'var(--sp-2)', borderTop: '1px solid var(--control-border)' }}>
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
