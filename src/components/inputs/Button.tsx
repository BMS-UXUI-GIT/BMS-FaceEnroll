import type { ReactNode } from 'react'
import { TEXT } from '../../typography'

// ปุ่ม — 3 แบบตาม Design System
//   primary   = พื้น accent-active + ตัวอักษรขาว   (การกระทำหลัก 1 ปุ่มต่อหน้า)
//   secondary = พื้นขาว + ขอบ control-border      (การกระทำรอง)
//   ghost     = โปร่งใส + ตัวอักษร accent-active   (การกระทำที่ไม่เน้น)
// ขนาดอิงสเปก Figma: md = สูง 40 (ปุ่มทั่วไป) · sm = สูง 36 (เท่า cell ของ Pagination)

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, React.CSSProperties> = {
  primary: { background: 'var(--accent-active)', color: 'var(--bg)', border: '1px solid transparent' },
  secondary: { background: 'var(--bg)', color: 'var(--text-dark)', border: '1px solid var(--control-border)' },
  ghost: { background: 'transparent', color: 'var(--accent-active)', border: '1px solid transparent' },
  // soft = พื้นเทาอ่อนไม่มีขอบ (Figma: ปุ่ม "รีเฟรชข้อมูลล่าสุด" บนการ์ดหัวเรื่อง)
  soft: { background: 'var(--surface-alt)', color: 'var(--text-dark)', border: '1px solid transparent' },
}
const HEIGHT: Record<Size, number> = { sm: 36, md: 40, lg: 48 }

export function Button({
  children, onClick, variant = 'primary', size = 'md',
  icon, iconRight, pill, disabled, title, type = 'button', fullWidth,
}: {
  children?: ReactNode
  onClick?: () => void
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  /** ทรงแคปซูล (r-full) — Figma ใช้กับปุ่มบนการ์ดหัวเรื่อง */
  pill?: boolean
  disabled?: boolean
  title?: string
  type?: 'button' | 'submit'
  fullWidth?: boolean
}) {
  return (
    <button
      type={type} onClick={onClick} disabled={disabled} title={title}
      style={{
        ...(size === 'sm' ? TEXT.sm : TEXT.bodyMed),
        ...VARIANT[variant],
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-2)',
        minHeight: HEIGHT[size],
        padding: size === 'sm' ? 'var(--sp-1) var(--sp-3)' : 'var(--sp-2) var(--sp-4)',
        borderRadius: pill ? 'var(--r-full)' : 'var(--r-md)',
        width: fullWidth ? '100%' : undefined,
        fontFamily: 'var(--sans)', whiteSpace: 'nowrap', cursor: 'pointer',
      }}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  )
}
