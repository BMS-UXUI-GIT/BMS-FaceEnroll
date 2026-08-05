import type { ReactNode } from 'react'
import { TEXT } from '../../typography'

// ปุ่ม — 3 แบบตาม Design System
//   primary   = พื้น accent-active + ตัวอักษรขาว   (การกระทำหลัก 1 ปุ่มต่อหน้า)
//   secondary = พื้นขาว + ขอบ control-border      (การกระทำรอง)
//   ghost     = โปร่งใส + ตัวอักษร accent-active   (การกระทำที่ไม่เน้น)
// ขนาดอิงสเปก Figma: md = สูง 40 (ปุ่มทั่วไป) · sm = สูง 36 (เท่า cell ของ Pagination)

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'accent-soft' | 'outline-accent' | 'ghost-danger'
type Size = 'xs' | 'sm' | 'md' | 'lg'

// สี/พื้น/ขอบ ของแต่ละ variant อยู่ในคลาส .btn-<variant> ที่ theme.css ทั้งหมด
//   ⚠️ ห้ามย้ายกลับมาเป็น inline style — inline ชนะ CSS class เสมอ
//      แล้ว :hover / :active / [aria-current] จะไม่มีผล (เคยพลาดมาแล้วทั้งแถวตารางและเมนู)
//   soft        = พื้นเทาอ่อนไม่มีขอบ (Figma: ปุ่ม "รีเฟรชข้อมูลล่าสุด" บนการ์ดหัวเรื่อง)
//   accent-soft = พื้น accent 10% + ไอคอน accent (Figma: ปุ่มกระดิ่งบน Topbar)
//   outline-accent = พื้นขาว + ขอบ/ตัวอักษรสี accent (Figma: ปุ่ม "ย้อนกลับ" หน้ารายละเอียด)
//   ghost-danger= เมนูอันตราย เช่น "ออกจากระบบ"
const HEIGHT: Record<Size, number> = { xs: 32, sm: 36, md: 40, lg: 48 }
const RADIUS = { md: 'var(--r-md)', lg: 'var(--r-lg)', full: 'var(--r-full)' }

export function Button({
  children, onClick, variant = 'primary', size = 'md', align = 'center', radius,
  icon, iconRight, pill, disabled, title, type = 'button', fullWidth, active, ariaCurrent,
}: {
  children?: ReactNode
  onClick?: () => void
  variant?: Variant
  size?: Size
  /** จัดเนื้อหาในปุ่ม — 'start' ใช้กับปุ่มเต็มความกว้าง เช่นเมนูในแถบข้าง */
  align?: 'center' | 'start'
  radius?: keyof typeof RADIUS
  icon?: ReactNode
  iconRight?: ReactNode
  /** ทรงแคปซูล (r-full) — Figma ใช้กับปุ่มบนการ์ดหัวเรื่อง */
  pill?: boolean
  disabled?: boolean
  title?: string
  type?: 'button' | 'submit'
  fullWidth?: boolean
  /** สถานะ "กำลังอยู่ที่นี่" (เมนู) — ใช้คู่กับ variant primary */
  active?: boolean
  ariaCurrent?: 'page' | true
}) {
  return (
    <button
      type={type} onClick={onClick} disabled={disabled} title={title}
      aria-current={ariaCurrent}
      // คลาสไว้ให้ theme.css คุม hover ของแต่ละ variant (พื้นโปร่งใช้ filter ไม่ขึ้น)
      className={`btn btn-${variant}${active ? ' is-active' : ''}`}
      style={{
        ...(size === 'sm' || size === 'xs' ? TEXT.sm : TEXT.bodyMed),
        display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
        justifyContent: align === 'start' ? 'flex-start' : 'center',
        textAlign: align === 'start' ? 'left' : 'center',
        minHeight: HEIGHT[size],
        padding: size === 'sm' || size === 'xs' ? 'var(--sp-1) var(--sp-3)' : 'var(--sp-2) var(--sp-4)',
        borderRadius: pill ? RADIUS.full : radius ? RADIUS[radius] : 'var(--r-md)',
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
