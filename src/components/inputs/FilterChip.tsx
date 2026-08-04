import type { ReactNode } from 'react'
import { TEXT } from '../../typography'

// ชิปตัวกรอง — Figma หน้าลงเวลา node 227:7677 ("Frame 96" > "Frame 29"/"Frame 30")
// สเปกจริง: สูง 48 · r-full · พื้น surface-alt (#F9F9F9) · padding 8/16/8/8 · gap 8
//   ไอคอน: วงกลม 32x32 โปร่ง ไอคอน 24 เส้นสีดำ
//   ข้อความ: label 12-14/400 ดำ 60% + value 14/500 ดำเต็ม (gap 8)
//
// variant 'action' = ชิปกดสลับ (Figma: "เฉพาะรายงานผิดปกติ")
//   วงกลม 26x26 พื้นสีเน้น ไอคอน 14 สีขาว · label 12/500 ดำ 60% ไม่มี value

export function FilterChip({ icon, label, value, variant = 'select', active = false, tone = 'warn', onClick, children }: {
  icon?: ReactNode
  label: ReactNode
  /** ค่าที่เลือกอยู่ — ตัวหนาต่อท้าย label */
  value?: ReactNode
  variant?: 'select' | 'action'
  active?: boolean
  tone?: 'accent' | 'warn'
  onClick?: () => void
  /** ตัวควบคุมจริง (SearchSelect / DatePicker) วางแทนส่วน value */
  children?: ReactNode
}) {
  const accent = tone === 'warn' ? 'var(--warn)' : 'var(--accent-active)'
  const action = variant === 'action'

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-pressed={onClick ? active : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
        minHeight: 48,
        padding: 'var(--sp-2) var(--sp-4) var(--sp-2) var(--sp-2)',
        borderRadius: 'var(--r-full)',
        background: 'var(--surface-alt)',
        cursor: onClick ? 'pointer' : undefined,
        whiteSpace: 'nowrap',
        // ชิปกดสลับ: ตอนปิดอยู่ให้จางลงนิด บอกว่ายังไม่ทำงาน (Figma มีแต่สถานะเปิด)
        opacity: action && !active ? 0.65 : 1,
        transition: 'opacity .12s ease',
      }}
    >
      {icon && (
        <span aria-hidden style={{
          width: action ? 26 : 32, height: action ? 26 : 32, flex: 'none',
          borderRadius: 'var(--r-full)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: action ? accent : 'transparent',
          color: action ? 'var(--bg)' : 'var(--text-faint)',
        }}>{icon}</span>
      )}

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <span style={{
          ...(action ? { ...TEXT.sm, fontWeight: 500 } : TEXT.sm),
          color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)',
        }}>{label}</span>
        {children ?? (value != null && (
          <span style={{ ...TEXT.bodyMed, color: 'var(--text-faint)' }}>{value}</span>
        ))}
      </span>
    </div>
  )
}
