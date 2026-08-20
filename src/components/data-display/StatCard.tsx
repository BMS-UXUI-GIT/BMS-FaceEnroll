import type { ReactNode } from 'react'
import { Icon } from '../../icons'
import { Tip } from '../Info'
import { TEXT } from '../../typography'

// การ์ดตัวเลขสรุป — Figma หน้าลงเวลา (node 227:7677)
// สเปกจริง: 130x138 · พื้นขาว · r-xl (24) · padding 12/40 · gap 8
//   วงกลมไอคอน 50x50 (r-full) พื้นสีตาม tone ไอคอนขาว 24px
//   label  14/500 สีดำ 60%
//   number 24/700 สีเดียวกับวงกลม + หน่วย 12/400 สีดำ 40%
//
// จัดกึ่งกลางทุกชั้น — Figma ตั้ง counterAxisAlignItems: CENTER ทั้ง 3 ระดับ
// และข้อความทุกตัว textAlignHorizontal: CENTER

export type Tone = 'accent' | 'neutral' | 'ok' | 'warn' | 'danger' | 'info'

/** รายการการ์ดสรุปแบบวนลูป (หน้าหลัก/รายบุคคล/รายแผนก ใช้รูปเดียวกัน) */
export type StatItem = { label: string; v?: number; unit?: string; tone: Tone; icon: string; disabled?: boolean }

const TONE: Record<Tone, string> = {
  accent: 'var(--accent)',
  neutral: 'var(--text-dim)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  info: 'var(--info)',
}

export function StatCard({ value, label, unit, icon, tone = 'accent', color: colorProp, layout = 'col', align = 'center', bg = 'var(--bg)', size = 'md', disabled = false, disabledNote = 'อยู่ระหว่างพัฒนา — กำลังพัฒนาการเชื่อมต่อกับระบบ HR เพื่อดึงตารางเวรและวันลามาคำนวณ', className, onClick }: {
  value: ReactNode
  label: ReactNode
  unit?: ReactNode
  icon?: ReactNode
  tone?: Tone
  /** สีเฉพาะกิจ (นอกชุด tone) เช่นสีประจำเวร */
  color?: string
  /** 'col' = ไอคอนบน ข้อความล่าง (หน้าลงเวลา) · 'row' = ไอคอนซ้าย ข้อความขวา (หน้าลงทะเบียนใบหน้า 178x80) */
  layout?: 'col' | 'row'
  /** จัดชิดในแนวขวาง — 'center' (ค่าเริ่มต้น) · 'start' ชิดซ้าย (layout col แบบชิดซ้ายของหน้าหลัก) */
  align?: 'center' | 'start'
  /** พื้นการ์ด — ขาว (ค่าเริ่มต้น) สำหรับวางบนพื้นเทา · เทาไว้วางในแผงพื้นขาว (Figma หน้าหลัก) */
  bg?: string
  /** ขนาดใน bento — 'lg' ใบเด่น (สูง/ไอคอน/ตัวเลขใหญ่) · 'sm' ใบแคบ (ยืดตามช่องกริด) */
  size?: 'sm' | 'md' | 'lg'
  /** ตัวเลขนี้ยังไม่มีข้อมูลจริงจากระบบ — แสดงการ์ดเป็นสีเทาจาง ค่าเป็น "—" พร้อมป้ายกำกับแทนหน่วย */
  disabled?: boolean
  /** คำอธิบายใน tooltip ของแถบมุมขวาบนตอน disabled */
  disabledNote?: string
  /** คลาสสำหรับวางตำแหน่งในกริด (.b-hero / .b-wide / .b-sm) */
  className?: string
  onClick?: () => void
}) {
  // ปิดใช้งาน = ทิ้งสี tone ไปใช้เทาจาง กันคนอ่านเข้าใจผิดว่าเป็นตัวเลขจริง
  const color = disabled ? 'var(--text-faint)' : colorProp ?? TONE[tone]
  const row = layout === 'row'
  const lg = size === 'lg'
  const sm = size === 'sm'
  // row ชิดซ้ายอยู่แล้ว · col เลือกได้ว่ากึ่งกลางหรือชิดซ้าย
  const start = row || align === 'start'
  return (
    <div
      className={[className, onClick && !disabled ? 'lift' : ''].filter(Boolean).join(' ') || undefined}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      style={{
        display: 'flex',
        flexDirection: row ? 'row' : 'column',
        alignItems: start ? 'flex-start' : 'center',
        justifyContent: row ? 'flex-start' : 'center',
        gap: sm ? 'var(--sp-1)' : 'var(--sp-2)',
        minHeight: sm ? 0 : row ? 80 : lg ? 172 : 138,
        padding: sm ? 'var(--sp-2) var(--sp-3)' : row || start ? 'var(--sp-3) var(--sp-4)' : 'var(--sp-3) var(--sp-10)',
        background: bg,
        borderRadius: 'var(--r-xl)',
        textAlign: start ? 'left' : 'center',
        cursor: onClick && !disabled ? 'pointer' : disabled ? 'not-allowed' : undefined,
        position: disabled ? 'relative' : undefined,
        overflow: disabled ? 'hidden' : undefined,
      }}
    >
      {/* ยังไม่มีข้อมูลจริง — แถบเฉียงมุมขวาบนแบบป้ายราคา (ไอคอนอย่างเดียว คำอธิบายอยู่ใน tooltip) */}
      {disabled && (
        <Tip text={disabledNote} style={{
          position: 'absolute', zIndex: 1, top: sm ? 6 : 12, right: sm ? -30 : -34,
          width: sm ? 92 : 110, transform: 'rotate(45deg)', cursor: 'help',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '3px 0', background: 'var(--surface-alt)', color: 'var(--text-faint)',
          boxShadow: '0 1px 2px color-mix(in srgb, var(--text) 12%, transparent)',
        }}>
          <Icon name="flask" size={sm ? 12 : 14} width={1.8} />
        </Tip>
      )}
      {icon && (
        <span aria-hidden style={{
          width: lg ? 62 : sm ? 36 : 50, height: lg ? 62 : sm ? 36 : 50, flex: 'none', borderRadius: 'var(--r-full)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: disabled ? 'var(--surface-alt)' : color,
          color: disabled ? 'var(--text-faint)' : 'var(--bg)',
          opacity: disabled ? 0.5 : undefined,
        }}>{icon}</span>
      )}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: start ? 'flex-start' : 'center', opacity: disabled ? 0.45 : undefined }}>
        <div style={{
          ...TEXT.bodyMed, ...(sm ? { fontSize: 13 } : null),
          color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)',
          // ชื่อยาวให้พับได้ 2 บรรทัดก่อนค่อยตัด — การ์ดแคบแล้วชื่อหายเป็น "พนักงานทั้ง…" อ่านไม่รู้เรื่อง
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: start ? 'flex-start' : 'center', gap: 'var(--sp-1)', marginTop: 'var(--sp-1)' }}>
          <span style={{ ...TEXT.h1, ...(lg ? { fontSize: 40, lineHeight: 1.15 } : sm ? { fontSize: 22, lineHeight: 1.2 } : null), color }}>{disabled ? '—' : value}</span>
          {!disabled && unit && (
            <span style={{ ...TEXT.sm, color: 'color-mix(in srgb, var(--text-faint) 40%, transparent)', whiteSpace: 'nowrap' }}>{unit}</span>
          )}
        </div>
      </div>
    </div>
  )
}
