import { useRef, type ReactNode } from 'react'
import { TEXT } from '../../typography'

// ชิปตัวกรอง — Figma หน้าลงเวลา node 227:7677 ("Frame 96" > "Frame 29"/"Frame 30")
// สเปกจริง: สูง 48 · r-full · พื้น surface-alt (#F9F9F9) · padding 8/16/8/8 · gap 8
//   ไอคอน: วงกลม 32x32 โปร่ง ไอคอน 24 เส้นสีดำ
//   ข้อความ: label 12-14/400 ดำ 60% + value 14/500 ดำเต็ม (gap 8)
//
// มี 2 ชนิด
//   'select' = ชิปเปิด dropdown (ช่วงวันที่ / เลือกเวร / เลือกแผนก)
//              กดตรงไหนของชิปก็เปิดได้ ไม่ต้องเล็งโดนตัวหนังสือข้างใน
//   'choice' = ชิปเลือก/ไม่เลือก (Figma: "เฉพาะรายงานผิดปกติ") — วงกลม 26 พื้นสีเน้น ไอคอน 14 ขาว
//
// สถานะทั้งหมด (default / hover / focus / open / selected / disabled) อยู่ในคลาส
// .chip กับ .chip-choice ใน theme.css — ที่นี่คุมแค่โครงกับสีของไอคอน

export function FilterChip({
  icon, label, value, variant = 'select', active = false, tone = 'warn', outlined, disabled, onClick, children, iconOnly,
}: {
  icon?: ReactNode
  label: ReactNode
  /** ค่าที่เลือกอยู่ — ตัวหนาต่อท้าย label */
  value?: ReactNode
  /** 'action' = ชื่อเดิมของ 'choice' (ยังรับไว้ให้โค้ดเก่าเรียกได้) */
  variant?: 'select' | 'choice' | 'action'
  /** ใช้กับ choice: เลือกอยู่หรือไม่ */
  active?: boolean
  tone?: 'accent' | 'warn'
  /** มีเส้นขอบ — ใช้ตอนวางบนพื้นเทา (Figma หน้ารายละเอียดพนักงาน) ไม่งั้นชิปจมไปกับพื้น */
  outlined?: boolean
  disabled?: boolean
  /** โชว์แค่ไอคอน — label ไปอยู่ใน title/aria-label แทน (ปุ่มสลับที่ความหมายชัดจากไอคอนอยู่แล้ว) */
  iconOnly?: boolean
  onClick?: () => void
  /** ตัวควบคุมจริง (SearchSelect / DateRangePicker) วางแทนส่วน value */
  children?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const choice = variant === 'choice' || variant === 'action'
  const accent = tone === 'warn' ? 'var(--warn)' : 'var(--accent-active)'

  // ชิป select: คลิกที่ว่างของชิป = คลิก trigger ของ dropdown ข้างใน
  // (ถ้าคลิกโดน control ข้างในอยู่แล้วปล่อยผ่าน ไม่งั้นจะเปิดแล้วปิดทันที)
  const forward = (e: React.MouseEvent) => {
    if (disabled) return
    if (onClick) return onClick()
    if ((e.target as HTMLElement).closest('button')) return
    ref.current?.querySelector('button')?.click()
  }

  const interactive = !disabled && (!!onClick || !choice)

  return (
    <div
      ref={ref}
      className={`chip${choice ? ' chip-choice' : ''}${outlined ? ' chip-outline' : ''}`}
      onClick={forward}
      onKeyDown={choice && onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
      } : undefined}
      role={choice && onClick ? 'button' : undefined}
      title={iconOnly && typeof label === 'string' ? label : undefined}
      aria-label={iconOnly && typeof label === 'string' ? label : undefined}
      tabIndex={choice && onClick && !disabled ? 0 : undefined}
      aria-pressed={choice && onClick ? active : undefined}
      aria-disabled={disabled || undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
        minHeight: 48,
        padding: iconOnly ? 'var(--sp-2)' : 'var(--sp-2) var(--sp-4) var(--sp-2) var(--sp-2)',
        cursor: disabled ? 'not-allowed' : interactive ? 'pointer' : 'default',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {icon && (
        <span aria-hidden style={{
          width: choice ? 26 : 32, height: choice ? 26 : 32, flex: 'none',
          borderRadius: 'var(--r-full)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          // choice ที่ยังไม่ถูกเลือก: วงกลมเทา บอกว่ายังไม่ทำงาน (ไม่ใช้ opacity ทั้งชิป)
          background: choice ? (active ? accent : 'var(--text-dim)') : 'transparent',
          // ชิป select: ไอคอนใช้สี secondary เข้ม ให้เข้าชุดกับพื้นชิป (.chip ใน theme.css)
          color: choice ? 'var(--bg)' : 'var(--secondary-dark)',
          transition: 'background .12s ease',
        }}>{icon}</span>
      )}

      {!iconOnly && (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <span style={{
          ...(choice ? { ...TEXT.sm, fontWeight: 500 } : TEXT.sm),
          color: choice && active ? 'var(--text-faint)' : 'color-mix(in srgb, var(--text-faint) 60%, transparent)',
        }}>{label}</span>
        {children ?? (value != null && (
          <span style={{ ...TEXT.bodyMed, color: 'var(--text-faint)' }}>{value}</span>
        ))}
      </span>
      )}
    </div>
  )
}
