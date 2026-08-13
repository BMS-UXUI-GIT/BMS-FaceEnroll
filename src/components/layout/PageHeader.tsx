import type { CSSProperties, ReactNode, Ref } from 'react'

// การ์ดหัวเรื่องของทุกหน้า — Figma: พื้นไล่สีฟ้าจากล่างขึ้นบน (#F0F6FD → ขาว หยุดที่ 65%)
// r-xl · padding 24 · overflow hidden (ภาพประกอบที่ล้นขอบถูก crop ตรงนี้)
//
//   [ ชื่อหน้า (h1) ]                         [ actions — ปุ่มรีเฟรช/ดาวน์โหลด ]
//   [ คำอธิบายสั้น ]
//   [ children — การ์ดตัวเลขสรุป / แท็บ (ถ้ามี) ]
//   (ภาพประกอบ art วางแบบ absolute ชิดขวา ซ่อนบนจอเล็กด้วย .hide-sm)
//
// ⚠️ ชื่อหน้า (title) ต้องตรงกับชื่อเมนูใน Sidebar — เปลี่ยนที่ใดที่หนึ่งต้องแก้อีกที่ด้วย
// มือถือ: หัวเรื่องกับ actions เรียงลงเป็นคอลัมน์ (กฎ .flex.items-start.justify-between ใน theme.css)

/** เปลือกการ์ดหัวเรื่อง (พื้นไล่สีฟ้า + crop ภาพที่ล้น) — ใช้ตรง ๆ ตอนหัวเรื่องไม่ใช่ทรงมาตรฐาน
 *  เช่นหน้าหลักที่เอาแท็บมาไว้แทนชื่อหน้า หรือหน้ารายละเอียดที่ขึ้นต้นด้วยปุ่มย้อนกลับ */
export function HeroCard({ children, cardRef, style }: {
  children: ReactNode
  /** ref ของการ์ด — หน้ารายละเอียดใช้เฝ้าดูว่าการ์ดเลื่อนพ้นจอหรือยัง (แถบย่อแบบติดบน) */
  cardRef?: Ref<HTMLDivElement>
  style?: CSSProperties
}) {
  return (
    <div ref={cardRef} className="relative overflow-hidden rounded-xl p-6"
      style={{ background: 'linear-gradient(to top, var(--surface-blue), var(--bg) 65%)', ...style }}>
      {children}
    </div>
  )
}

export function PageHeader({ title, desc, actions, art, children }: {
  title: ReactNode
  desc?: ReactNode
  /** ปุ่มมุมขวาบน (ปุ่มเดียวหรือกลุ่มปุ่มก็ได้) */
  actions?: ReactNode
  /** ภาพประกอบประจำหน้า — ส่ง <img absolute> หรือ <HeroArt/> เข้ามา (ตัวมันเองคุมตำแหน่ง) */
  art?: ReactNode
  /** เนื้อหาใต้หัวเรื่องในการ์ดเดียวกัน เช่นการ์ดตัวเลขสรุป */
  children?: ReactNode
}) {
  return (
    <HeroCard>
      {art}

      <div className="relative flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-h2 m-0 text-text">{title}</h1>
          {desc && (
            <p className="text-body mt-2 mb-0 text-[color-mix(in_srgb,var(--text-faint)_50%,transparent)]">{desc}</p>
          )}
        </div>
        {actions && <div className="flex gap-2 items-center flex-wrap">{actions}</div>}
      </div>

      {children}
    </HeroCard>
  )
}
