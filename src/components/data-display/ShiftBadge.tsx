import { TEXT } from '../../typography'

// ป้ายเวร — Figma component set "Shift Badge" (node 120:3190)
// สเปกจริง: สูง 36 · radius 999 · gap 6 · label 12/400
// padding: Figma วาดไว้ 5/10/5/8 ซึ่งไม่มีในสเกล -> ใช้ 4/12/4/8 ตาม spacing scale ที่ Figma ประกาศ

export type ShiftKind = 'morning' | 'afternoon' | 'night'

const LABEL: Record<ShiftKind, string> = { morning: 'เช้า', afternoon: 'บ่าย', night: 'ดึก' }

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
        width: 8, height: 8, flex: 'none', borderRadius: 'var(--r-full)',
        background: `var(--shift-${shift}-icon)`,
      }} />
      {label ?? LABEL[shift]}
    </span>
  )
}
