import { DatePicker, thShort } from '../DatePicker'
import { TEXT } from '../../typography'

// ช่วงวันที่ — "12 ธ.ค. 69 - 30 ธ.ค. 69"
// ประกอบจาก DatePicker เดิม 2 ตัว (ไม่เขียนปฏิทินใหม่) + แถบสรุปช่วงที่เลือก
// บังคับความสัมพันธ์ให้เอง: from ห้ามเกิน to, to ห้ามน้อยกว่า from

export function DateRangePicker({ from, to, onFrom, onTo, max, bare }: {
  from: string
  to: string
  onFrom: (v: string) => void
  onTo: (v: string) => void
  max?: string
  /** ข้อความล้วนไม่มีกรอบ — ใช้ตอนฝังในชิปตัวกรอง (Figma: "12 ก.ค. 69 - 30 ก.ค. 69") */
  bare?: boolean
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: bare ? 'var(--sp-1)' : 'var(--sp-2)' }}>
      <DatePicker bare={bare} value={from} onChange={(v) => { onFrom(v); if (v > to) onTo(v) }} max={max} />
      <span style={{ ...TEXT.bodyMed, color: 'var(--text-faint)' }}>-</span>
      <DatePicker bare={bare} value={to} onChange={(v) => { onTo(v); if (v < from) onFrom(v) }} min={from} max={max} />
    </span>
  )
}

/** ป้ายสรุปช่วงวันที่ — พื้น surface-blue + ตัวอักษร accent (Figma: Date badge) */
export function DateRangeBadge({ from, to }: { from: string; to: string }) {
  return (
    <span style={{
      ...TEXT.sm,
      display: 'inline-flex', alignItems: 'center',
      padding: 'var(--sp-1) var(--sp-3)',
      borderRadius: 'var(--r-md)',
      background: 'var(--surface-blue)',
      color: 'var(--accent-active)',
      whiteSpace: 'nowrap',
    }}>
      {from === to ? thShort(from) : `${thShort(from)} - ${thShort(to)}`}
    </span>
  )
}
