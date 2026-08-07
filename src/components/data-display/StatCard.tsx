import type { ReactNode } from 'react'
import { TEXT } from '../../typography'

// การ์ดตัวเลขสรุป — Figma หน้าลงเวลา (node 227:7677)
// สเปกจริง: 130x138 · พื้นขาว · r-xl (24) · padding 12/40 · gap 8
//   วงกลมไอคอน 50x50 (r-full) พื้นสีตาม tone ไอคอนขาว 24px
//   label  14/500 สีดำ 60%
//   number 24/700 สีเดียวกับวงกลม + หน่วย 12/400 สีดำ 40%
//
// จัดกึ่งกลางทุกชั้น — Figma ตั้ง counterAxisAlignItems: CENTER ทั้ง 3 ระดับ
// และข้อความทุกตัว textAlignHorizontal: CENTER

type Tone = 'accent' | 'neutral' | 'ok' | 'warn' | 'danger' | 'info'

const TONE: Record<Tone, string> = {
  accent: 'var(--accent)',
  neutral: 'var(--text-dim)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  info: 'var(--info)',
}

export function StatCard({ value, label, unit, icon, tone = 'accent', color: colorProp, layout = 'col', align = 'center', bg = 'var(--bg)', size = 'md', className, onClick }: {
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
  /** คลาสสำหรับวางตำแหน่งในกริด (.b-hero / .b-wide / .b-sm) */
  className?: string
  onClick?: () => void
}) {
  const color = colorProp ?? TONE[tone]
  const row = layout === 'row'
  const lg = size === 'lg'
  const sm = size === 'sm'
  // row ชิดซ้ายอยู่แล้ว · col เลือกได้ว่ากึ่งกลางหรือชิดซ้าย
  const start = row || align === 'start'
  return (
    <div
      className={[className, onClick ? 'lift' : ''].filter(Boolean).join(' ') || undefined}
      onClick={onClick}
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
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {icon && (
        <span aria-hidden style={{
          width: lg ? 62 : sm ? 36 : 50, height: lg ? 62 : sm ? 36 : 50, flex: 'none', borderRadius: 'var(--r-full)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: color, color: 'var(--bg)',
        }}>{icon}</span>
      )}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: start ? 'flex-start' : 'center' }}>
        <div style={{
          ...TEXT.bodyMed, ...(sm ? { fontSize: 13 } : null),
          color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)',
          whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: start ? 'flex-start' : 'center', gap: 'var(--sp-1)', marginTop: 'var(--sp-1)' }}>
          <span style={{ ...TEXT.h1, ...(lg ? { fontSize: 40, lineHeight: 1.15 } : sm ? { fontSize: 22, lineHeight: 1.2 } : null), color }}>{value}</span>
          {unit && <span style={{ ...TEXT.sm, color: 'color-mix(in srgb, var(--text-faint) 40%, transparent)', whiteSpace: 'nowrap' }}>{unit}</span>}
        </div>
      </div>
    </div>
  )
}
