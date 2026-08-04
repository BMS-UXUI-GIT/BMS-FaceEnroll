import { useState } from 'react'
import { api } from '../api'

// modal เปลี่ยนรหัสผ่านตัวเอง (บัญชี dashboard — บัญชี HOSxP ไม่มีปุ่มนี้)
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
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

  const fld: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface-card)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none' }
  const lb: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
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
                style={{ width: '100%', padding: 11, borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--bg)', fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: busy || !oldP || !newP || !confirmP ? 0.6 : 1 }}>
                {busy ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
