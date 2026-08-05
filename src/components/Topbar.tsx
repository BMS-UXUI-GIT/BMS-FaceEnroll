import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'
import { Button } from './inputs/Button'
import { ProfileMenu } from './ProfileMenu'

// แถบบนสุด — Figma node 227:6401 ("Group 18")
// สเปกจริง: 1408x112 · พื้นขาว · มุมบน [24,24,0,0] (มุมมาจากการ์ดแม่ใน App.tsx)
//   ซ้าย: โลโก้ 64x64 r-xl · gap 16 · "BMS FaceEnroll" 20/700 · คำบรรยาย 14/400 ดำ 60% (gap 5)
//   ขวา: ปุ่มกระดิ่ง 56x56 · พื้น accent-light (#5682E9 @10%) · r-lg · ไอคอน 24
//   padding 24 รอบด้าน
//
// ⚠️ ดีไซน์นี้ไม่มี: ชื่อหน้า · ตัวเลือกโรงพยาบาล · เปลี่ยนรหัสผ่าน · สลับธีม · ออกจากระบบ
//    ของที่ยังจำเป็น (เลือกโรง / เปลี่ยนรหัสผ่าน / ออกจากระบบ) ย้ายไปการ์ดโปรไฟล์ท้าย Sidebar
//    ส่วนปุ่มสลับธีมตัดทิ้ง เพราะ Figma มีโหมดสว่างอย่างเดียว (theme.css ไม่มีชุดสีมืดแล้ว)

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { session } = useApp()
  if (!session) return null

  return (
    <header className="topbar" style={{
      height: 'var(--topbar-h)', flex: 'none', boxSizing: 'border-box', overflow: 'hidden',
      // header กระจก — โปร่งแสง + เบลอ ให้เห็น content ที่เลื่อนลอดอยู่ด้านหลัง
      background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      padding: 'var(--sp-4) var(--sp-6)',
      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
    }}>
      {onMenu && (
        <Button onClick={onMenu} title="เมนู" variant="soft" size="xs"
          icon={<Icon name="menu" size={18} width={2} />} />
      )}

      <img src="/logo.png" alt="" width={40} height={40}
        style={{ display: 'block', flex: 'none', borderRadius: 'var(--r-lg)' }} />

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...TEXT.h3, color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          BMS FaceEnroll
        </div>
        <div style={{ ...TEXT.sm, color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)' }}>
          แดชบอร์ดติดตามการเข้างาน
        </div>
      </div>

      <Button title="การแจ้งเตือน" variant="accent-soft" size="sm" radius="md"
        icon={<Icon name="bell" size={20} width={1.8} />} />

      <ProfileMenu />
    </header>
  )
}
