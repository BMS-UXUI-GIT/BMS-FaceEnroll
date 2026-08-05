import { TEXT } from '../../typography'
import { Icon } from '../../icons'

// ป้ายเวร — Figma component set "Shift Badge" (node 120:3190)
// สเปกจริง: สูง 36 · radius 999 · gap 6 · label 12/400
//   ไอคอน = วงกลมทึบ 26px สีตามเวร + ไอคอน tabler 14px สีขาวข้างใน
// padding: Figma วาดไว้ 5/10/5/8 ซึ่งไม่มีในสเกล -> ใช้ 4/12/4/8 ตาม spacing scale ที่ Figma ประกาศ

export type ShiftKind = 'morning' | 'afternoon' | 'night'

const LABEL: Record<ShiftKind, string> = { morning: 'เช้า', afternoon: 'บ่าย', night: 'ดึก' }

// เช้า = haze, บ่าย = sun-high, ดึก = moon-stars (ตาม Figma)
const ICON: Record<ShiftKind, string> = { morning: 'haze', afternoon: 'sun', night: 'moon' }

/** เดาเวรจากชื่อที่ backend ส่งมา (เช่น "เช้า (08:00-16:00)") — ไม่รู้จัก = เช้า */
export function shiftKindOf(name: string): ShiftKind {
  if (name.includes('ดึก')) return 'night'
  if (name.includes('บ่าย')) return 'afternoon'
  return 'morning'
}

export function ShiftBadge({ shift, label }: { shift: ShiftKind; label?: string }) {
  return (
    <span style={{
      ...TEXT.sm,
      display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)',
      minHeight: 36,
      padding: 'var(--sp-1) var(--sp-3) var(--sp-1) var(--sp-2)',
      borderRadius: 'var(--r-full)',
      whiteSpace: 'nowrap',
      background: `var(--shift-${shift}-bg)`,
      color: `var(--shift-${shift}-text)`,
    }}>
      <span aria-hidden style={{
        width: 26, height: 26, flex: 'none', borderRadius: 'var(--r-full)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: `var(--shift-${shift}-icon)`, color: 'var(--bg)',
      }}>
        <Icon name={ICON[shift]} size={14} width={2} />
      </span>
      {label ?? LABEL[shift]}
    </span>
  )
}
