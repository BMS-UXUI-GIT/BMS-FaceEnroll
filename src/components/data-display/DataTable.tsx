import type { ReactNode } from 'react'
import { TEXT } from '../../typography'

// ตาราง — Figma หน้าลงเวลา (node 227:6394 > "table")
// สเปกจริง: header สูง 39 พื้น surface (#F9FAFB) ตัวอักษร 12/500 สี text-secondary pad 12/16
//           row สูง 60 พื้นขาว pad 12/16 gap 12
//           ไม่มีเส้นคั่น (no borders) — แยกแถวด้วยพื้นหลังตอน hover
// (ตารางใน node 66:23558 ใช้ค่าต่างออกไป — ยึดของหน้าลงเวลาเป็นหลัก)

export type Column<T> = {
  key: string
  header: ReactNode
  /** ค่าที่จะแสดงในเซลล์ — คืน ReactNode ได้ (เช่น <StatusBadge/>) */
  cell: (row: T, index: number) => ReactNode
  width?: string | number
  align?: 'left' | 'right' | 'center'
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, empty = 'ไม่มีข้อมูล' }: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  onRowClick?: (row: T, index: number) => void
  empty?: ReactNode
}) {
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead>
          <tr style={{ background: 'var(--surface)' }}>
            {columns.map((c) => (
              <th key={c.key} style={{
                ...TEXT.sm, fontWeight: 500,
                textAlign: c.align ?? 'left',
                color: 'var(--text-dim)',
                padding: 'var(--sp-3) var(--sp-4)',
                width: c.width,
                whiteSpace: 'nowrap',
              }}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{
                ...TEXT.body, color: 'var(--text-dim)', textAlign: 'center',
                padding: 'var(--sp-10) var(--sp-4)', background: 'var(--bg)',
              }}>{empty}</td>
            </tr>
          ) : rows.map((r, i) => (
            <tr key={rowKey(r, i)} className="row-hover"
              onClick={onRowClick ? () => onRowClick(r, i) : undefined}
              style={{ background: 'var(--bg)', cursor: onRowClick ? 'pointer' : undefined }}>
              {columns.map((c) => (
                <td key={c.key} style={{
                  ...TEXT.body,
                  textAlign: c.align ?? 'left',
                  color: 'var(--table-row-text)',
                  padding: 'var(--sp-3) var(--sp-4)',
                  verticalAlign: 'middle',
                }}>{c.cell(r, i)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
