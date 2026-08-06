import { TEXT } from '../../typography'

// หัวข้อกลุ่มเมนูในแถบข้าง — ตรงกับ Figma component "Section Header" (node 83:1690)
// Figma วาดไว้ 14/400 line-height 20 · สีดำ 60% · ไม่ใช่ตัวพิมพ์ใหญ่
// ที่นี่ย่อเป็น 12/400 ให้เข้าชุดกับเมนูแบบ compact + เว้นบนไว้คั่นกลุ่มแทนการเพิ่ม gap
// tag = ป้ายเล็กท้ายหัวข้อ (เช่น SUPER) — ส่วนขยายของโค้ด ไม่มีใน Figma

export function SectionHeader({ children, tag }: { children: React.ReactNode; tag?: string }) {
  return (
    <div style={{
      ...TEXT.sm,
      display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
      padding: 'var(--sp-3) var(--sp-3) var(--sp-1)',
      color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)',
    }}>
      {children}
      {tag && (
        <span style={{
          ...TEXT.caption,
          fontWeight: 500, letterSpacing: '.4px',
          // จัดตัวอักษรกึ่งกลางป้าย (line-height ของสเกลทำให้ลอยขึ้นเมื่อป้ายเตี้ย)
          height: 18, lineHeight: 1, display: 'inline-flex', alignItems: 'center',
          padding: '0 var(--sp-2)',
          borderRadius: 'var(--r-sm)',
          background: 'var(--accent-light)',
          color: 'var(--accent-active)',
        }}>{tag}</span>
      )}
    </div>
  )
}
