import { useState } from 'react'
import { api } from '../api'
import { useApp } from '../state'
import { Button } from './inputs/Button'
import { Icon } from '../icons'
import { TEXT } from '../typography'

// ด่านยืนยันตัวตนก่อนเข้าเมนูกลุ่ม "จัดการระบบ"
// เมนูกลุ่มนี้แก้ข้อมูลระดับระบบได้ (อนุมัติโรง เปิด-ปิดโรง สร้างบัญชี) — เครื่องที่เปิดทิ้งไว้
// จึงต้องกรอกรหัสผ่านของบัญชีตัวเองซ้ำก่อน ปลดล็อกครั้งเดียวใช้ได้ทั้ง session นี้
// (เก็บใน sessionStorage: ปิดแท็บ/ออกจากระบบแล้วต้องกรอกใหม่)

const KEY = 'facecheck_super_unlocked'

/** ปลดล็อกแล้วหรือยังใน session นี้ */
export const isSuperUnlocked = () => sessionStorage.getItem(KEY) === '1'
/** ล้างสถานะปลดล็อก — เรียกตอน logout */
export const clearSuperUnlock = () => sessionStorage.removeItem(KEY)

export function SuperGate({ onUnlock }: { onUnlock: () => void }) {
  const { session } = useApp()
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    if (busy || !pw.trim()) return
    setBusy(true); setErr(null)
    try {
      await api.verifyPassword(pw)
      sessionStorage.setItem(KEY, '1')
      onUnlock()
    } catch (e: any) {
      setErr(e?.message || 'รหัสผ่านไม่ถูกต้อง')
      setPw('')
    } finally {
      setBusy(false)
    }
  }

  return (
    // จัดกลางพื้นที่เนื้อหา (แนวตั้ง+แนวนอน) — หน้านี้มีของชิ้นเดียว
    <div style={{ minHeight: 'calc(var(--app-h) - 220px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
      <div className="rounded-xl" style={{
        background: 'var(--surface-alt)', padding: 'var(--sp-6)',
        display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', alignItems: 'center', textAlign: 'center',
      }}>
        <span aria-hidden style={{
          width: 64, height: 64, borderRadius: 'var(--r-full)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--accent-light)', color: 'var(--accent-active)',
        }}>
          <Icon name="lock" size={30} width={1.8} />
        </span>

        <div>
          <h1 className="text-h2 m-0 text-text">ยืนยันตัวตนก่อนเข้าเมนูจัดการระบบ</h1>
          <p className="text-body mt-2 mb-0 text-text-dim">
            เมนูกลุ่มนี้แก้ข้อมูลระดับระบบได้ — กรอกรหัสผ่านของบัญชี{' '}
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{session?.username}</span>{' '}
            อีกครั้งเพื่อยืนยันว่าเป็นคุณ (ครั้งเดียวต่อการเข้าใช้งาน)
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
            padding: 'var(--sp-2) var(--sp-3)', minHeight: 48, borderRadius: 'var(--r-full)',
            background: 'var(--bg)', border: '1px solid var(--control-border)',
          }}>
            <Icon name="lock" size={18} width={1.8} color="var(--text-faint)" />
            <input
              autoFocus type={show ? 'text' : 'password'} value={pw} autoComplete="current-password"
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="รหัสผ่านของคุณ"
              style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--text)' }} />
            <button type="button" onClick={() => setShow((v) => !v)} title={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              style={{ border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', lineHeight: 0, padding: 0 }}>
              <Icon name={show ? 'eye-off' : 'eye'} size={18} width={1.8} />
            </button>
          </div>

          {err && <div style={{ ...TEXT.sm, color: 'var(--danger)' }}>{err}</div>}

          <Button variant="primary" size="lg" pill fullWidth disabled={busy || !pw.trim()} onClick={submit}>
            {busy ? 'กำลังตรวจสอบ…' : 'ยืนยัน'}
          </Button>
        </div>
      </div>
      </div>
    </div>
  )
}
