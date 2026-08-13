// สวิตช์เปิด/ปิด — ราง 44x24 · หัวจับ 18 · เปิด = พื้นเขียว (ok)
// ไม่ส่ง onClick = โหมดอ่านอย่างเดียว (แสดงสถานะเฉย ๆ เช่นตารางสิทธิ์ที่กดที่แถวแทน)
// เดิมก๊อปกันอยู่ 4 หน้า (Settings · Locations · HospitalDetail · Users) — รวมมาไว้ที่นี่

export function Toggle({ on, onClick, disabled, label }: {
  on: boolean
  /** ไม่ส่ง = อ่านอย่างเดียว (render เป็น span ไม่ใช่ปุ่ม) */
  onClick?: () => void
  disabled?: boolean
  /** ชื่อสำหรับ screen reader ตอนสวิตช์ยืนอยู่เดี่ยว ๆ ไม่มีข้อความข้าง ๆ */
  label?: string
}) {
  const track = {
    width: 44, height: 24, borderRadius: 'var(--r-full)', border: 'none', flex: 'none',
    position: 'relative' as const,
    opacity: disabled ? 0.6 : 1,
    background: on ? 'var(--ok)' : 'var(--surface-gray)', transition: 'background .15s',
  }
  const knob = (
    <span style={{
      position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: 'var(--r-full)',
      background: 'var(--bg)', boxShadow: 'var(--shadow)', transition: 'left .15s',
    }} />
  )

  if (!onClick) return <span aria-hidden style={track}>{knob}</span>

  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      onClick={onClick} disabled={disabled}
      style={{ ...track, cursor: disabled ? 'default' : 'pointer' }}>
      {knob}
    </button>
  )
}
