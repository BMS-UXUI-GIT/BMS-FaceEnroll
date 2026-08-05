import type { ReactNode } from 'react'
import { TEXT } from '../../typography'

// แผงเนื้อหา 1 ส่วน — Figma หน้ารายละเอียดพนักงาน (node 95:25395 "Group 19")
//
//   ┌ กรอบนอกพื้นเทา (#F9F9F9) ขอบขาว r-xl · padding 8 ────────────────┐
//   │  [title]  [filters…]                            [actions…]       │  ← แถวหัว สูง 60 เยื้อง 16
//   │  ┌ การ์ดขาว r-xl · padding 16 ─────────────────────────────────┐  │
//   │  │  children (ตาราง / กราฟ / อะไรก็ได้)                        │  │
//   │  └────────────────────────────────────────────────────────────┘  │
//   └──────────────────────────────────────────────────────────────────┘
//
// ส่วนที่เปลี่ยนได้: title · filters (ชิดซ้ายต่อจากหัวข้อ) · actions (ชิดขวา) · children
// Figma ใช้แพตเทิร์นนี้ซ้ำหลายที่ (ประวัติเข้า-ออกงาน · สถิติรายสัปดาห์) จึงแยกเป็น component

export function SectionPanel({ title, filters, meta, actions, children, bodyPadding = true }: {
  title?: ReactNode
  /** ชิป/ปุ่มกรอง — วางต่อจากหัวข้อทางซ้าย */
  filters?: ReactNode
  /** สรุปตัวกรองที่ใช้อยู่ (ข้อความสั้น) — มุมขวาของแถวหัว บอกว่าเลขที่เห็นมาจากเงื่อนไขไหน */
  meta?: ReactNode
  /** ชิป/ปุ่มด้านขวาสุดของแถวหัว (เช่น ตัวเลือกช่วงวัน) */
  actions?: ReactNode
  children: ReactNode
  /** false = ให้เนื้อหาชนขอบการ์ดขาว (เช่นตารางที่จัดระยะเองแล้ว) */
  bodyPadding?: boolean
}) {
  const hasHeader = title != null || filters != null || actions != null || meta != null

  return (
    // flex column + body flex:1 -> วางคู่กันใน grid แล้วสูงเท่ากัน (การ์ดขาวยืดเต็มความสูงแถว)
    <div className="rounded-xl" style={{
      background: 'var(--surface-alt)',
      border: '1px solid var(--bg)',
      padding: 'var(--sp-2)',
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {hasHeader && (
        // เยื้องเข้ามา 16 → รวมกับ padding 8 ของกรอบ = 24 ตามที่ Figma วางไว้
        <div className="flex items-center gap-2 flex-wrap" style={{ minHeight: 60, padding: '0 var(--sp-4)' }}>
          {title != null && <span style={{ ...TEXT.h3, color: 'var(--text)', marginRight: 'var(--sp-2)' }}>{title}</span>}
          {filters}
          {(actions != null || meta != null) && (
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
              {meta != null && (
                <span style={{ ...TEXT.sm, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{meta}</span>
              )}
              {actions}
            </span>
          )}
        </div>
      )}

      <div className="bg-bg rounded-xl" style={{ padding: bodyPadding ? 'var(--sp-4)' : 0, flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  )
}
