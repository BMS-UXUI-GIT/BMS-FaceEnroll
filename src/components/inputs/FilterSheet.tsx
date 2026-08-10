import { Children, Fragment, isValidElement, useState, type ReactNode } from 'react'
import { Icon } from '../../icons'
import { TEXT } from '../../typography'
import { BottomSheet } from '../feedback/BottomSheet'
import { FilterChip } from './FilterChip'

// ปุ่ม "ตัวกรอง" ของมือถือ + แผงล่างจอที่เก็บชิปทั้งหมดไว้ข้างใน
// ใช้ร่วมกัน 2 ที่: แถบตัวกรองของหน้า (FilterBar) และแถวหัวแผง (SectionPanel)
// ชิปที่ส่งเข้ามาเป็นตัวเดิมทั้งดุ้น — ในแผงแค่ถูกยืดเต็มความกว้างด้วย .sheet-filters (theme.css)

/** แผ่ children ให้เป็นรายการเดียว — เจอ <>...</> (Fragment) ก็ลงไปเอาข้างในมาด้วย
 *  จำเป็นเพราะหน้าจอส่วนใหญ่ส่งชิปมาเป็น fragment ก้อนเดียว */
function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((c) =>
    isValidElement(c) && c.type === Fragment
      ? flatten((c.props as { children?: ReactNode }).children)
      : [c])
}

/** นับเฉพาะชิปจริง — ปุ่ม/ข้อความอื่นที่ต่อท้ายไม่นับ
 *  (เทียบ type ตรง ๆ ไม่พึ่งชื่อ component เพราะชื่อถูกย่อตอน build) */
export const countChips = (children: ReactNode) =>
  flatten(children).filter((c) => isValidElement(c) && c.type === FilterChip).length

/** ทุกชิ้นเป็นชิปหมดไหม — ใช้ตัดสินว่าเอา actions ของแผงลงไปในแผงล่างจอด้วยได้หรือเปล่า
 *  (ปุ่มดาวน์โหลด/เมนู ไม่ควรถูกยัดเข้าไปในกล่อง "ตัวกรอง") */
export const allChips = (children: ReactNode) => {
  const items = flatten(children)
  return items.length > 0 && items.every((c) => isValidElement(c) && c.type === FilterChip)
}

export function FilterSheetButton({ children, activeCount, title = 'ตัวกรอง' }: {
  children: ReactNode
  /** จำนวนตัวกรองที่เลือกอยู่ — โชว์เป็นป้ายบนปุ่ม */
  activeCount?: number
  title?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="chip" style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
        minHeight: 48, padding: 'var(--sp-2) var(--sp-4) var(--sp-2) var(--sp-2)',
        cursor: 'pointer', fontFamily: 'var(--sans)',
      }}>
        <span aria-hidden style={{
          width: 32, height: 32, flex: 'none', borderRadius: 'var(--r-full)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--secondary-dark)',
        }}>
          <Icon name="filter" size={24} width={1.8} />
        </span>
        <span style={{ ...TEXT.sm, color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)' }}>{title}</span>
        {!!activeCount && (
          <span style={{
            ...TEXT.caption, fontWeight: 500, minWidth: 20, height: 20,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--r-full)', background: 'var(--accent-active)', color: 'var(--bg)',
          }}>{activeCount}</span>
        )}
      </button>

      <BottomSheet open={open} title={title} onClose={() => setOpen(false)}>
        <div className="sheet-filters">{children}</div>
      </BottomSheet>
    </>
  )
}
