import type { ReactNode } from 'react'
import { Icon } from '../../icons'
import { TEXT } from '../../typography'

// ข้อความสถานะในหน้า — ใช้แทนกล่องข้อความที่เคยเขียนซ้ำอยู่ทั่วระบบ
//   <ErrorBox>   แถบแดงบอกว่าโหลด/บันทึกไม่สำเร็จ (เดิมเขียน div bg-danger-light ซ้ำ 18 จุด)
//   <EmptyState> ที่ว่างกลางแผงตอนไม่มีข้อมูล (เดิมมี Empty ของใครของมันในหลายหน้า)

export function ErrorBox({ children, prefix }: {
  children: ReactNode
  /** ข้อความนำหน้า เช่น "ผิดพลาด" · "ดาวน์โหลดไม่สำเร็จ" */
  prefix?: string
}) {
  return (
    <div role="alert" className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">
      {prefix ? `${prefix}: ` : ''}{children}
    </div>
  )
}

export function EmptyState({ text = 'ไม่มีข้อมูล', icon, compact }: {
  text?: ReactNode
  /** ไอคอนวงกลมเหนือข้อความ — ไม่ส่ง = ข้อความอย่างเดียว (ใช้ในแผงเล็ก/ในตาราง) */
  icon?: string
  /** ระยะบน-ล่างน้อยลง (ใช้ในกล่องเตี้ย เช่น dropdown) */
  compact?: boolean
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 'var(--sp-2)', padding: compact ? 'var(--sp-4)' : 'var(--sp-10) var(--sp-5)', textAlign: 'center',
    }}>
      {icon && (
        <span aria-hidden style={{
          width: 56, height: 56, borderRadius: 'var(--r-full)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface-alt)', color: 'var(--text-dim)',
        }}>
          <Icon name={icon} size={28} width={1.6} />
        </span>
      )}
      <span style={{ ...TEXT.body, color: 'var(--text-dim)' }}>{text}</span>
    </div>
  )
}
