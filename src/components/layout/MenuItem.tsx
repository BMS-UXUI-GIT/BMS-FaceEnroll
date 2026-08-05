import { Icon } from '../../icons'
import { TEXT } from '../../typography'
import { Button } from '../inputs/Button'

// เมนู 1 รายการในแถบข้าง — ตรงกับ Figma component set "Menu Item" (node 83:1689)
// Figma วาดไว้ที่ สูง 48 · padding 12/16 · gap 16 · label 16/400
// ที่นี่ย่อลงเป็นแบบ compact: สูง 36 · padding 4/12 · gap 8 · label 14 · ไอคอน 18
// (เมนูมี 10-14 รายการ ของเดิมกินความสูงเกินจอบนโน้ตบุ๊ก)
//
// States (variant "State" ใน Figma):
//   Default = พื้นโปร่ง            + ตัวอักษร #3382E7 (accent-active)
//   Hover   = พื้น accent-active 10% + ตัวอักษร #3382E7   (คลาส .btn-ghost:hover)
//   Active  = พื้น accent-active     + ตัวอักษรขาว        (variant primary)
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
  return (
    <Button
      onClick={onClick}
      variant={active ? 'primary' : 'ghost'}
      size="xs" align="start" radius="md" fullWidth
      ariaCurrent={active ? 'page' : undefined}
      // flex:none ทั้งไอคอนและ badge — ไม่งั้นเมนูที่ข้อความยาว (หรือมี badge)
      // จะโดน flexbox หดไอคอนให้เล็กลงกว่าเมนูอื่น ส่วนข้อความให้ตัด ... แทน
      icon={<Icon name={icon} size={18} style={{ flex: 'none' }} />}
      iconRight={!!badge && (
        <span style={{
          ...TEXT.caption,
          flex: 'none', fontWeight: 500, minWidth: 18, textAlign: 'center',
          padding: '0 var(--sp-1)',
          borderRadius: 'var(--r-full)',
          background: active ? 'var(--bg)' : 'var(--warn)',
          color: active ? 'var(--accent-active)' : 'var(--bg)',
        }}>{badge}</span>
      )}
    >
      <span style={{ ...TEXT.body, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </Button>
  )
}
