// Type scale — ตรงกับ Figma Design System (page 146:5136)
//
// วิธีใช้: spread เข้า inline style แล้วใส่สีแยก (สีมาจาก CSS variable เสมอ)
//   <h2 style={{ ...TEXT.h2, color: 'var(--text)' }}>หัวข้อ</h2>
//
// ห้าม hardcode fontSize / lineHeight นอกไฟล์นี้ — ถ้าขนาดที่ต้องการไม่มีในสเกล
// ให้เพิ่ม entry ใหม่ที่นี่ (แล้วอัปเดต Figma ให้ตรงกัน) ไม่ใช่เขียนตัวเลขลอยในหน้าจอ

export const TEXT = {
  displayLg:   { fontSize: 32, fontWeight: 700, lineHeight: '40px' },
  displayStat: { fontSize: 28, fontWeight: 700, lineHeight: '36px' },
  h1:          { fontSize: 24, fontWeight: 700, lineHeight: '32px' },
  h2:          { fontSize: 20, fontWeight: 700, lineHeight: '28px' },
  h3:          { fontSize: 16, fontWeight: 700, lineHeight: '24px' },
  bodyLg:      { fontSize: 16, fontWeight: 400, lineHeight: '24px' },
  body:        { fontSize: 14, fontWeight: 400, lineHeight: '20px' },
  bodyMed:     { fontSize: 14, fontWeight: 500, lineHeight: '20px' },
  bodyBold:    { fontSize: 14, fontWeight: 700, lineHeight: '20px' },
  sm:          { fontSize: 12, fontWeight: 400, lineHeight: '16px' },
  caption:     { fontSize: 11, fontWeight: 400, lineHeight: '14px' },
} as const

export type TextStyle = keyof typeof TEXT
