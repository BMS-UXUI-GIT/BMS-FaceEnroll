import { useState } from 'react'
import { Icon } from '../../icons'
import { TEXT } from '../../typography'

// เมนู 1 รายการในแถบข้าง — ตรงกับ Figma component set "Menu Item" (node 83:1689)
// สเปกจริงจาก Figma: สูง 48 · radius 16 · padding 12/16 · gap 16 · label 16/400
//
// States (variant "State" ใน Figma):
//   Default = พื้นโปร่ง            + ตัวอักษร #3382E7 (accent-active)
//   Hover   = พื้น accent-active 10% + ตัวอักษร #3382E7
//   Active  = พื้น accent-active     + ตัวอักษรขาว
//
// ⚠️ หมายเหตุ: variant "Active" ใน Figma ตั้งพื้นเป็น #FFFFFF คู่กับตัวอักษร #FFFFFF
//    (ขาวบนขาว = มองไม่เห็น) — เป็นข้อผิดพลาดในไฟล์ Figma เอง
//    ที่นี่ใช้พื้น accent-active ตามสีตัวอักษรขาวที่ Figma ระบุไว้ ถ้าแก้ Figma แล้วบอกได้

export function MenuItem({ icon, label, active = false, badge, onClick }: {
  icon: string
  label: string
  active?: boolean
  badge?: number
  onClick?: () => void
}) {
  const [hover, setHover] = useState(false)

  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...TEXT.bodyLg,
        display: 'flex', alignItems: 'center', gap: 'var(--sp-4)',
        minHeight: 48,
        padding: 'var(--sp-3) var(--sp-4)',
        borderRadius: 'var(--r-lg)',
        width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--sans)', whiteSpace: 'nowrap',
        color: active ? 'var(--bg)' : 'var(--accent-active)',
        background: active ? 'var(--accent-active)'
          : hover ? 'color-mix(in srgb, var(--accent-active) 10%, transparent)'
          : 'transparent',
        transition: 'background .12s ease, color .12s ease',
      }}
    >
      {/* flex:none ทั้งไอคอนและ badge — ไม่งั้นเมนูที่ข้อความยาว (หรือมี badge)
          จะโดน flexbox หดไอคอนให้เล็กลงกว่าเมนูอื่น ส่วนข้อความให้ตัด ... แทน */}
      <Icon name={icon} size={24} style={{ flex: 'none' }} />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {!!badge && (
        <span style={{
          ...TEXT.sm,
          flex: 'none', fontWeight: 700, minWidth: 20, textAlign: 'center',
          padding: '0 var(--sp-1)',
          borderRadius: 'var(--r-full)',
          background: active ? 'var(--bg)' : 'var(--warn)',
          color: active ? 'var(--accent-active)' : 'var(--bg)',
        }}>{badge}</span>
      )}
    </button>
  )
}
