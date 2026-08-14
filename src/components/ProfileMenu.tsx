import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { ROLE_TH, useApp } from '../state'
import { SearchSelect } from './SearchSelect'
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

export function ProfileMenu({ fullWidth }: { fullWidth?: boolean } = {}) {
  const { session, logout, isSuper, isDemo, currentHcode, setHcode, setNav, isDark } = useApp()
  const [menu, setMenu] = useState(false)

  // Topbar มี overflow:hidden (คุมความสูงแถบ) เมนูที่วางแบบ absolute เลยโดนตัด
  // -> portal ไป body + วางแบบ fixed ใต้ปุ่ม เมนูจึงลอยเหนือทุกอย่างจริง ๆ
  const btnRef = useRef<HTMLDivElement>(null)
  // อยู่ท้าย sidebar -> ที่ว่างด้านล่างมักไม่พอ ให้พลิกไปกางขึ้นบนแทน
  const [pos, setPos] = useState({ top: 0, left: 0, up: false })
  useLayoutEffect(() => {
    if (!menu) return
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect()
      if (!r) return
      const up = window.innerHeight - r.bottom < 260
      setPos({ top: up ? r.top - 8 : r.bottom + 8, left: Math.max(8, r.left), up })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [menu])

  if (!session) return null

  return (
    <div ref={btnRef} style={{ position: 'relative', flex: 'none', width: fullWidth ? '100%' : undefined }}>
      {/* backdrop ปิดเมนูตอนคลิกที่ว่าง — ใช้ z-index แทน document listener
          เพื่อไม่ให้ชนกับ dropdown ของ SearchSelect ที่ portal ไป body (z 300) */}
      {menu && <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />}
      {/* การ์ดโปรไฟล์ = Button variant soft (พื้น surface-alt) จัดเนื้อหาชิดซ้าย */}
      <Button onClick={() => setMenu((v) => !v)} title="บัญชีและการตั้งค่า"
        variant="soft" size="lg" align="start" radius="lg" fullWidth={fullWidth}
        icon={(
          <span aria-hidden style={{
            width: 32, height: 32, flex: 'none', borderRadius: 'var(--r-full)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDemo ? 'var(--warn)' : 'var(--border)', color: 'var(--bg)', ...TEXT.sm,
          }}>{session.initial}</span>
        )}>
        <span style={{ minWidth: 0, maxWidth: 180 }}>
          {/* ไทยมีวรรณยุกต์/สระบน-ล่าง — line-height ตามสเกลเป๊ะ ๆ แล้วโดน overflow:hidden ตัดหัว/หาง
              เลยเผื่อความสูงบรรทัดให้มากกว่าสเกลนิดหน่อยเฉพาะบล็อกนี้ */}
          <span style={{ ...TEXT.sm, fontWeight: 500, lineHeight: '20px', display: 'block', color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {session.name}
          </span>
          <span style={{ ...TEXT.caption, lineHeight: '18px', display: 'block', color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {/* บัญชี HOSxP: บอกตำแหน่ง/แผนกจริง มีความหมายกับผู้ใช้มากกว่าป้าย role ของระบบ */}
            {session.position || ROLE_TH[session.role] || session.role}
          </span>
        </span>
      </Button>

      {menu && createPortal((
        <div style={{
          position: 'fixed', left: pos.left, minWidth: 260,
          ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
          zIndex: 200, background: 'var(--bg)', borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', padding: 'var(--sp-2)',
          display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)',
        }}>
          {/* ตัวเลือกโรงพยาบาลย้ายไปอยู่บน header แล้ว (Topbar) — ที่นี่เหลือแค่บัญชีผู้ใช้
              จอแคบ header ซ่อนตัวเลือก จึงคงไว้ให้เลือกจากเมนูนี้ได้ */}
          {(isSuper || session.hospitals.length > 1) && (
            <div className="only-sm" style={{ padding: 'var(--sp-2)' }}>
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
          <MenuAction icon="person" label="จัดการบัญชี" onClick={() => { setNav('account'); setMenu(false) }} />
          {/* ธีม/ขนาดตัวอักษร — ทางลัดจากเมนูโปรไฟล์ (หน้าเต็มอยู่ในเมนู "อื่น ๆ") */}
          <MenuAction icon={isDark ? 'moon' : 'sun'} label="การแสดงผล" onClick={() => { setNav('display'); setMenu(false) }} />
          <MenuAction icon="logout" label="ออกจากระบบ" danger onClick={logout} />
        </div>
      ), document.body)}

    </div>
  )
}
