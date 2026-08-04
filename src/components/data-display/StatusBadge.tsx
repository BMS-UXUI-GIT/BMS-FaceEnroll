import { TEXT } from '../../typography'

// ป้ายสถานะการลงเวลา — Figma component set "Status Badge" (node 82:1249)
// สเปกจริง: สูง 36 · radius 999 · gap 6 · label 12/400
// padding: Figma วาดไว้ 5/10/5/8 ซึ่งไม่มีในสเกล -> ใช้ 4/12/4/8 ตาม spacing scale ที่ Figma ประกาศ
// แต่ละสถานะมี 3 สีคนละชุด (พื้น/ไอคอน/ตัวอักษร) ไม่ใช่สี status ตัวเดียวปรับ opacity

export type StatusKind = 'ontime' | 'late' | 'leave' | 'outarea' | 'early'

const LABEL: Record<StatusKind, string> = {
  ontime: 'ตรงเวลา', late: 'มาสาย', leave: 'ลา', outarea: 'นอกพื้นที่', early: 'ออกก่อนเวลา',
}

export function StatusBadge({ status, label }: { status: StatusKind; label?: string }) {
  return (
    <span style={{
      ...TEXT.sm,
      display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)',
      minHeight: 36,
      padding: 'var(--sp-1) var(--sp-3) var(--sp-1) var(--sp-2)',
      borderRadius: 'var(--r-full)',
      whiteSpace: 'nowrap',
      background: `var(--badge-${status}-bg)`,
      color: `var(--badge-${status}-text)`,
    }}>
      <span aria-hidden style={{
        width: 8, height: 8, flex: 'none', borderRadius: 'var(--r-full)',
        background: `var(--badge-${status}-icon)`,
      }} />
      {label ?? LABEL[status]}
    </span>
  )
}
