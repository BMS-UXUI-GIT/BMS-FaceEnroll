// โครงร่างระหว่างโหลด (skeleton) — ใช้แทนวงหมุนในแผงที่รู้หน้าตาผลลัพธ์อยู่แล้ว
// เลย์เอาต์ต้องใกล้เคียงของจริง หน้าจะได้ไม่กระโดดตอนข้อมูลมา (คลาส .skel อยู่ใน theme.css)

/** บล็อกเทาก้อนเดียว — ใช้ประกอบ skeleton แบบอื่น */
export function Skel({ w = '100%', h = 12, r, style }: {
  w?: number | string
  h?: number | string
  /** รัศมีมุม (ค่าเริ่ม = --r-md จากคลาส .skel) */
  r?: number | string
  style?: React.CSSProperties
}) {
  return <span className="skel" style={{ display: 'block', width: w, height: h, borderRadius: r, ...style }} />
}

/** รายการแถว (คนล่าสุด / อันดับมาสาย / คำขอลงทะเบียน) — ทรงเดียวกับแถวจริง */
export function SkelRows({ rows = 4, avatar = true, h = 40 }: { rows?: number; avatar?: boolean; h?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
          padding: 'var(--sp-2) var(--sp-3)',
          border: '1px solid var(--control-border)', borderRadius: 'var(--r-lg)',
        }}>
          {avatar && <Skel w={h} h={h} r="var(--r-full)" style={{ flex: 'none' }} />}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skel w="42%" h={13} />
            <Skel w="26%" h={11} />
          </div>
          <Skel w={84} h={13} style={{ flex: 'none' }} />
        </div>
      ))}
    </div>
  )
}

/** กราฟ (แท่ง/เส้น) — บล็อกสูงเท่ากราฟจริง */
export function SkelChart({ height = 185 }: { height?: number }) {
  return <Skel h={height} r="var(--r-lg)" style={{ margin: 'var(--sp-2) 0' }} />
}

/** โดนัท — วงกลม + คำอธิบายด้านล่าง */
export function SkelDonut({ size = 200 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-4) 0' }}>
      <Skel w={size} h={size} r="var(--r-full)" />
      <Skel w="70%" h={12} />
    </div>
  )
}

/** หัวสรุป 2 ฝั่ง + แถบสัดส่วน + การ์ดย่อย (แผง "แบ่งตามเวร" / "สถานะการมาทำงาน") */
export function SkelSummary({ cards = 3 }: { cards?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '38%' }}>
          <Skel w="60%" h={11} /><Skel w="85%" h={20} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '28%', alignItems: 'flex-end' }}>
          <Skel w="60%" h={11} /><Skel w="80%" h={20} />
        </div>
      </div>
      <div style={{ margin: 'var(--sp-4) 0' }}><Skel h={16} r="var(--r-full)" /></div>
      <div className="grid gap-2" style={{ flex: 1, gridTemplateColumns: `repeat(${cards}, minmax(0,1fr))` }}>
        {Array.from({ length: cards }, (_, i) => <Skel key={i} h={92} r="var(--r-lg)" />)}
      </div>
    </div>
  )
}
