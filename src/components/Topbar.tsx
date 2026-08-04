import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'

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
      flex: 'none', zIndex: 20, background: 'var(--bg)',
      padding: 'var(--sp-6)', minHeight: 112,
      display: 'flex', alignItems: 'center', gap: 'var(--sp-4)',
    }}>
      {onMenu && (
        <button onClick={onMenu} title="เมนู" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, flex: 'none', borderRadius: 'var(--r-md)',
          border: 'none', background: 'var(--surface-alt)', color: 'var(--text-dim)', cursor: 'pointer',
        }}>
          <Icon name="menu" size={20} width={2} />
        </button>
      )}

      <img src="/logo.png" alt="" width={64} height={64}
        style={{ display: 'block', flex: 'none', borderRadius: 'var(--r-xl)' }} />

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...TEXT.h2, color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          BMS FaceEnroll
        </div>
        <div style={{ ...TEXT.body, color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)', marginTop: 'var(--sp-1)' }}>
          แดชบอร์ดติดตามการเข้างาน
        </div>
      </div>

      <button title="การแจ้งเตือน" style={{
        width: 56, height: 56, flex: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: 'var(--r-lg)',
        background: 'var(--accent-light)', color: 'var(--accent)', cursor: 'pointer',
      }}>
        <Icon name="bell" size={24} width={1.8} />
      </button>
    </header>
  )
}
