import { Icon } from '../icons'
import { asset } from '../assets'

// ภาพประกอบหัวเรื่อง — ชุดเดียวกับหน้าตั้งค่าแอปสแกน
//   ตึกโรงพยาบาลเป็นฉากหลัง (จางลง ลอยขึ้นลงช้า) · พยาบาลสแกนหน้าเป็นฉากหน้า
//   + ไอคอนลอย 2 ตัวข้างภาพ เปลี่ยนตามบริบทของหน้า (prop icon)
//
// วางแบบ absolute ในการ์ดหัวเรื่อง (การ์ดต้อง overflow:hidden) — ส่วนที่ล้นถูก crop เอง

export function HeroArt({ icon, width = 300, bottom = -120 }: {
  /** ไอคอนประจำหน้า (ชื่อจาก src/icons.tsx) */
  icon: string
  width?: number
  /** ระยะล้นพ้นขอบล่างการ์ด */
  bottom?: number
}) {
  return (
    <span aria-hidden className="hide-sm" style={{ position: 'absolute', right: 0, bottom, lineHeight: 0 }}>
      <span className="hero-rise" style={{ display: 'block', lineHeight: 0 }}>
        <img src={asset('/hero-hospital.svg')} alt="" width={width} height={width}
          className="hero-bg pointer-events-none select-none" style={{ opacity: 0.72 }} />
      </span>
      <span className="hero-fg pointer-events-none select-none" style={{ position: 'absolute', right: 0, bottom: 24, lineHeight: 0 }}>
        <img src={asset('/nurse-scan.svg')} alt="" width={Math.round(width * 0.77)} height={Math.round(width * 0.77)} />
      </span>

      {/* ไอคอนลอยข้างภาพ — บอกบริบทของหน้า (ตกแต่งล้วน วางนอกตัวตึก/พยาบาล) */}
      <span className="pointer-events-none select-none" style={{ position: 'absolute', left: -72, top: 56, color: 'var(--accent)', opacity: 0.45 }}>
        <Icon name={icon} size={56} width={1.4} />
      </span>
      <span className="pointer-events-none select-none" style={{ position: 'absolute', left: -28, top: 8, color: 'var(--accent-active)', opacity: 0.28 }}>
        <Icon name={icon} size={32} width={1.6} />
      </span>
    </span>
  )
}
