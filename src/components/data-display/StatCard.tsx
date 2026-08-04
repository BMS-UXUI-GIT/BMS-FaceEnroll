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

export function StatCard({ value, label, unit, icon, tone = 'accent', onClick }: {
  value: ReactNode
  label: ReactNode
  unit?: ReactNode
  icon?: ReactNode
  tone?: Tone
  onClick?: () => void
}) {
  const color = TONE[tone]
  return (
    <div
      className={onClick ? 'lift' : undefined}
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 'var(--sp-2)',
        minHeight: 138,
        padding: 'var(--sp-3) var(--sp-10)',
        background: 'var(--bg)',
        borderRadius: 'var(--r-xl)',
        textAlign: 'center',
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {icon && (
        <span aria-hidden style={{
          width: 50, height: 50, flex: 'none', borderRadius: 'var(--r-full)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: color, color: 'var(--bg)',
        }}>{icon}</span>
      )}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ ...TEXT.bodyMed, color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)', whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 'var(--sp-1)', marginTop: 'var(--sp-1)' }}>
          <span style={{ ...TEXT.h1, color }}>{value}</span>
          {unit && <span style={{ ...TEXT.sm, color: 'color-mix(in srgb, var(--text-faint) 40%, transparent)' }}>{unit}</span>}
        </div>
      </div>
    </div>
  )
}
