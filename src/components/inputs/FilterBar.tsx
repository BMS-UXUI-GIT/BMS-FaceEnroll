import type { ReactNode } from 'react'
import { useMedia } from '../../hooks'
import { countChips, FilterSheetButton } from './FilterSheet'

// แถบตัวกรองของทุกหน้า — ช่องค้นหา + ชิปตัวกรอง
//   จอใหญ่/แท็บเล็ต : เรียงต่อกันบรรทัดเดียว (ตกบรรทัดเองเมื่อที่ไม่พอ)
//   มือถือ          : ชิป 1 ใบ = อยู่แถวเดียวกับช่องค้นหา
//                     ชิป 2 ใบ = ช่องค้นหากินเต็มบรรทัด ชิปตกลงแถวล่าง (.filter-bar ใน theme.css)
//                     ชิป ≥3 ใบ = ยุบเหลือปุ่ม "ตัวกรอง" กดแล้วเปิดแผงจากขอบล่างจอ

const COLLAPSE_FROM = 3   // ชิปตั้งแต่กี่ใบขึ้นไปถึงยุบเป็นปุ่มเดียว
const WRAP_FROM = 2       // ชิปตั้งแต่กี่ใบขึ้นไปถึงดันช่องค้นหาให้เต็มบรรทัด (ชิปเดียว = แถวเดียวกันได้)

export function FilterBar({ search, children, activeCount, className, sticky = true }: {
  /** ช่องค้นหา (ถ้ามี) — บนมือถือจะกินเต็มบรรทัดแรกเสมอ */
  search?: ReactNode
  /** ชิปตัวกรอง + ปุ่มล้างตัวกรอง */
  children?: ReactNode
  /** จำนวนตัวกรองที่เลือกอยู่ — โชว์เป็นป้ายบนปุ่ม "ตัวกรอง" ของมือถือ */
  activeCount?: number
  className?: string
  /** ค้างไว้ใต้แถบบนตอนเลื่อนหน้า (ค่าเริ่มต้น) — เห็นตลอดว่าข้อมูลที่ดูอยู่ถูกกรองด้วยอะไร
      และกดเปลี่ยนตัวกรองได้ทันทีโดยไม่ต้องเลื่อนกลับขึ้นบนสุด */
  sticky?: boolean
}) {
  const phone = useMedia('(max-width: 620px)')

  const chips = countChips(children)
  const collapse = phone && chips >= COLLAPSE_FROM
  // .filter-bar = ช่องค้นหากินเต็มบรรทัด ชิปตกลงแถวล่าง — ใช้ตอนมีชิปตั้งแต่ 2 ใบ
  // ชิปใบเดียว (หรือยุบเป็นปุ่มตัวกรองแล้ว) อยู่แถวเดียวกับช่องค้นหาได้สบาย
  const wrap = !collapse && (!phone || chips >= WRAP_FROM)
  const row = `flex items-center gap-2${wrap ? ' flex-wrap filter-bar' : ''}${sticky ? ' filter-sticky' : ''}${className ? ` ${className}` : ''}`

  if (!collapse) {
    return <div className={row}>{search}{children}</div>
  }

  return (
    <div className={row}>
      {search}
      <FilterSheetButton activeCount={activeCount}>{children}</FilterSheetButton>
    </div>
  )
}
