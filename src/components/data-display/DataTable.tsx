import type { CSSProperties, ReactNode } from 'react'
import { TEXT } from '../../typography'

// ตาราง — Figma หน้าลงเวลา (node 227:6394 > "table")
// สเปกจริง: header สูง 39 พื้น surface (#F9FAFB) ตัวอักษร 12/500 สี text-secondary pad 12/16
//           row สูง 60 พื้นขาว pad 12/16 gap 12
//           ทุกแถว (รวม header) มีเส้นคั่นล่าง 1px สี #E5E7EB
// (ตารางใน node 66:23558 ใช้ค่าต่างออกไป — ยึดของหน้าลงเวลาเป็นหลัก)
//
// รองรับ 2 หน้าตา:
//   default (card)  = แบบหน้าลงเวลา — header พื้น surface, เส้นคั่นล่างทุกเซลล์
//   divider 'top'   = แบบหน้ารายงาน — header uppercase (theadRowStyle), เส้นคั่นบนแต่ละแถว
// คุมรายละเอียดต่อหน้าได้ผ่าน theadRowStyle/thBase/tdBase + thStyle/tdStyle ราย column
// เพื่อคงหน้าตาเดิมของแต่ละหน้าเป๊ะตอนย้ายมาใช้ component นี้

export type Column<T> = {
  key: string
  header: ReactNode
  /** ค่าที่จะแสดงในเซลล์ — คืน ReactNode ได้ (เช่น <StatusBadge/>) */
  cell: (row: T, index: number) => ReactNode
  width?: string | number
  align?: 'left' | 'right' | 'center'
  /** สไตล์เพิ่มของหัวคอลัมน์นี้ (ทับ thBase) — เช่น padding/มุมซ้าย-ขวาของตารางรายงาน */
  thStyle?: CSSProperties
  /** สไตล์เพิ่มของเซลล์คอลัมน์นี้ (ทับ tdBase) — คงที่ หรือคำนวณต่อแถว */
  tdStyle?: CSSProperties | ((row: T, index: number) => CSSProperties)
}

const BORDER = '1px solid var(--control-border)'

export function DataTable<T>({
  columns, rows, rowKey, onRowClick, layout = 'auto', empty = 'ไม่มีข้อมูล',
  divider = 'bottom', theadRowStyle, thBase, tdBase, minWidth, loading, emptyStyle, hover = true,
  sticky = true, stickyTop = 'var(--topbar-h)',
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  onRowClick?: (row: T, index: number) => void
  /** 'fixed' = คอลัมน์ที่ไม่ระบุ width แบ่งที่ว่างเท่ากัน (Figma ใช้ flex:1 0 0 ทุกคอลัมน์) */
  layout?: 'auto' | 'fixed'
  empty?: ReactNode
  /** เส้นคั่นแถว: 'bottom' = ล่างทุกเซลล์ (card) · 'top' = บนแต่ละแถว (รายงาน) */
  divider?: 'bottom' | 'top'
  /** สไตล์แถวหัวตาราง (ทับ default) — เช่น theadTr uppercase ของหน้ารายงาน */
  theadRowStyle?: CSSProperties
  /** ฐานสไตล์หัวคอลัมน์ทุกอัน (ทับ default typography/padding) */
  thBase?: CSSProperties
  /** ฐานสไตล์เซลล์ทุกอัน (ทับ default typography/padding) */
  tdBase?: CSSProperties
  minWidth?: number
  /** โชว์แทนเนื้อตารางตอนกำลังโหลด (เช่น <Loading/>) — มีค่า = ยังไม่โชว์ empty */
  loading?: ReactNode
  /** สไตล์ของเซลล์ว่าง (ทับ default) */
  emptyStyle?: CSSProperties
  /** ไฮไลต์แถวตอน hover (default true) — ปิดสำหรับตารางที่ไม่ได้ให้กดแถว */
  hover?: boolean
  /** thead ติดบนตอน scroll (default true) */
  sticky?: boolean
  /** ระยะบนของ sticky thead — หน้าเพจ = ใต้ header กระจก (default) · ใน modal ส่ง 0 */
  stickyTop?: number | string
}) {
  const thBaseSt: CSSProperties = thBase ?? { ...TEXT.sm, fontWeight: 500, color: 'var(--text-dim)', padding: 'var(--sp-3) var(--sp-4)' }
  const tdBaseSt: CSSProperties = tdBase ?? { ...TEXT.body, color: 'var(--table-row-text)', padding: 'var(--sp-3) var(--sp-4)' }
  // เส้นคั่น: card = เส้นล่างทุกเซลล์ · report(top) = เส้นบนทุกเซลล์ตัว (ยกเว้น header)
  // border อยู่ที่ "เซลล์" ไม่ใช่ tr — เพราะใช้ border-collapse:separate (จำเป็นให้ sticky th ทำงานบน Chrome)
  const thBorder = divider === 'bottom' ? { borderBottom: BORDER } : {}
  const tdBorder = divider === 'bottom' ? { borderBottom: BORDER } : { borderTop: '1px solid var(--border)' }
  // sticky header — พื้นทึบของ th เอามาจากพื้นแถวหัว (ไม่งั้น content ที่เลื่อนลอดจะทะลุขึ้นมา)
  const headBg = (theadRowStyle?.background as string) ?? 'var(--surface)'
  const stickySt: CSSProperties = sticky
    ? { position: 'sticky', top: stickyTop, zIndex: 5, background: headBg }
    : {}

  return (
    // จอใหญ่: overflow visible — ปล่อยให้ scroll container แม่ (main/modal body) คุม เพื่อให้ sticky ทำงาน
    // จอเล็ก: .table-scroll (theme.css) เปิด overflow-x ให้เลื่อนเฉพาะตาราง + ปิด sticky thead
    <div className="table-scroll" style={{ width: '100%' }}>
      {/* border-collapse:separate — collapse ทำให้ sticky บน th ไม่ทำงานใน Chrome */}
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: layout, minWidth }}>
        <thead>
          <tr style={theadRowStyle ?? { background: 'var(--surface)' }}>
            {columns.map((c, i) => (
              <th key={c.key} style={{
                textAlign: c.align ?? 'left',
                width: c.width,
                whiteSpace: 'nowrap',
                ...thBorder,
                ...thBaseSt,
                ...c.thStyle,
                ...stickySt,
                ...(i === 0 ? { borderTopLeftRadius: 'var(--r-lg)' } : {}),
                ...(i === columns.length - 1 ? { borderTopRightRadius: 'var(--r-lg)' } : {}),
              }}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length} style={{ padding: 0 }}>{loading}</td></tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={emptyStyle ?? {
                ...TEXT.body, color: 'var(--text-dim)', textAlign: 'center',
                padding: 'var(--sp-10) var(--sp-4)', background: 'var(--bg)',
              }}>{empty}</td>
            </tr>
          ) : rows.map((r, i) => (
            // สีพื้นแถวมาจากคลาส .row-hover (theme.css) ห้ามใส่ background ตรงนี้
            // — inline style ชนะ CSS class เสมอ ใส่แล้วสถานะ hover จะไม่ขึ้น
            <tr key={rowKey(r, i)} className={hover ? 'row-hover' : undefined}
              onClick={onRowClick ? () => onRowClick(r, i) : undefined}
              style={{ cursor: onRowClick ? 'pointer' : undefined }}>
              {columns.map((c) => (
                <td key={c.key} style={{
                  textAlign: c.align ?? 'left',
                  verticalAlign: 'middle',
                  ...tdBorder,
                  ...tdBaseSt,
                  ...(typeof c.tdStyle === 'function' ? c.tdStyle(r, i) : c.tdStyle),
                }}>{c.cell(r, i)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
