import { TEXT } from '../../typography'

// หัวข้อกลุ่มเมนูในแถบข้าง — ตรงกับ Figma component "Section Header" (node 83:1690)
// สเปกจริงจาก Figma: Google Sans 14/400 · line-height 20 · สีดำ 60% · ไม่ใช่ตัวพิมพ์ใหญ่
// tag = ป้ายเล็กท้ายหัวข้อ (เช่น SUPER) — ส่วนขยายของโค้ด ไม่มีใน Figma

export function SectionHeader({ children, tag }: { children: React.ReactNode; tag?: string }) {
  return (
    <div style={{
      ...TEXT.body,
      display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
      color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)',
    }}>
      {children}
      {tag && (
        <span style={{
          ...TEXT.caption,
          fontWeight: 700, letterSpacing: '.4px',
          padding: '0 var(--sp-1)',
          borderRadius: 'var(--r-sm)',
          background: 'var(--accent-light)',
          color: 'var(--accent-active)',
        }}>{tag}</span>
      )}
    </div>
  )
}
