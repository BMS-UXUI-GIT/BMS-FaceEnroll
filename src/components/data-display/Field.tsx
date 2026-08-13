import type { ReactNode } from 'react'
import { Icon } from '../../icons'
import { TEXT } from '../../typography'

// ข้อมูล 1 ช่อง (ป้ายกำกับเล็ก + ค่าตัวหนา) — ใช้ในการ์ดโปรไฟล์พนักงาน/รายละเอียดโรงพยาบาล
// เดิมก๊อปกันอยู่ 2 หน้า ต่างกันแค่ค่ายาวจะตัด … หรือขึ้นบรรทัดใหม่ -> รวมเป็น prop `wrap`

export function Field({ label, value, mono, wrap }: {
  label: ReactNode
  value: ReactNode
  /** ค่าเป็นตัวเลข/รหัส — ใช้ฟอนต์ mono */
  mono?: boolean
  /** ค่ายาวให้ขึ้นบรรทัดใหม่แทนตัดเป็น … (ค่าเริ่มต้น = ตัด) */
  wrap?: boolean
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>{label}</div>
      <div style={{
        ...TEXT.bodyMed, color: 'var(--text)',
        fontFamily: mono ? 'var(--mono)' : undefined,
        ...(wrap
          ? { wordBreak: 'break-word' as const }
          : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }),
      }}>{value || '—'}</div>
    </div>
  )
}

/** ป้ายติดต่อ (อีเมล/เบอร์โทร) — Figma: พื้น surface-blue · r-xl · padding 4/12 · ไอคอน + ข้อความสี accent */
export function ContactPill({ icon, text }: { icon: string; text: ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
      padding: 'var(--sp-1) var(--sp-3)', borderRadius: 'var(--r-xl)',
      background: 'var(--surface-blue)', ...TEXT.sm, color: 'var(--accent)', whiteSpace: 'nowrap',
      maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      <Icon name={icon} size={16} width={1.8} style={{ flex: 'none' }} />{text}
    </span>
  )
}
