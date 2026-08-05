import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'
import { SearchSelect } from './SearchSelect'
import { ChangePasswordModal } from './ChangePasswordModal'
import { Button } from './inputs/Button'

// โปรไฟล์ผู้ใช้บน Topbar (ขวาสุด หลังปุ่มแจ้งเตือน)
// กดแล้วเปิดเมนูลงล่าง: เลือกโรงพยาบาล / เปลี่ยนรหัสผ่าน / ออกจากระบบ
// เดิมอยู่ท้าย Sidebar — ย้ายขึ้น header ตามดีไซน์ใหม่

/** ปุ่ม 1 บรรทัดในเมนูโปรไฟล์ */
function MenuAction({ icon, label, danger, onClick }: { icon: string; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <Button onClick={onClick} variant={danger ? 'ghost-danger' : 'ghost'} size="xs" align="start" fullWidth
      icon={<Icon name={icon} size={16} />}>
      <span style={{ color: danger ? undefined : 'var(--text)' }}>{label}</span>
    </Button>
  )
}

export function ProfileMenu() {
  const { session, logout, isSuper, isDemo, currentHcode, setHcode } = useApp()
  const [menu, setMenu] = useState(false)
  const [showPw, setShowPw] = useState(false)
  // Topbar มี overflow:hidden (คุมความสูงแถบ) เมนูที่วางแบบ absolute เลยโดนตัด
  // -> portal ไป body + วางแบบ fixed ใต้ปุ่ม เมนูจึงลอยเหนือทุกอย่างจริง ๆ
  const btnRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  useLayoutEffect(() => {
    if (!menu) return
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect()
      if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [menu])

  if (!session) return null

  return (
    <div ref={btnRef} style={{ position: 'relative', flex: 'none' }}>
      {/* backdrop ปิดเมนูตอนคลิกที่ว่าง — ใช้ z-index แทน document listener
          เพื่อไม่ให้ชนกับ dropdown ของ SearchSelect ที่ portal ไป body (z 300) */}
      {menu && <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />}
      {/* การ์ดโปรไฟล์ = Button variant soft (พื้น surface-alt) จัดเนื้อหาชิดซ้าย */}
      <Button onClick={() => setMenu((v) => !v)} title="บัญชีและการตั้งค่า"
        variant="soft" size="lg" align="start" radius="lg"
        icon={(
          <span aria-hidden style={{
            width: 32, height: 32, flex: 'none', borderRadius: 'var(--r-full)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDemo ? 'var(--warn)' : 'var(--border)', color: 'var(--bg)', ...TEXT.sm,
          }}>{session.initial}</span>
        )}>
        <span style={{ minWidth: 0, maxWidth: 180 }}>
          <span style={{ ...TEXT.sm, fontWeight: 500, display: 'block', color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {session.name}
          </span>
          <span style={{ ...TEXT.caption, display: 'block', color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentHcode === '*' ? 'ทุกโรงพยาบาล' : session.hospitals.find((h) => h.value === currentHcode)?.label ?? session.username}
          </span>
        </span>
      </Button>

      {menu && createPortal((
        <div style={{
          position: 'fixed', right: pos.right, top: pos.top, minWidth: 260,
          zIndex: 200, background: 'var(--bg)', borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', padding: 'var(--sp-2)',
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
      ), document.body)}

      {showPw && <ChangePasswordModal onClose={() => setShowPw(false)} />}
    </div>
  )
}
