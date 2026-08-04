import { useEffect, useRef, useState } from 'react'

// กรอบแผนที่ที่กดขยายเต็มจอได้ — แผนที่เล็กเลื่อน/ซูมลำบาก
// ขยาย = เปลี่ยนแค่ style ของกรอบ (map instance เดิม) แล้วให้ leaflet คำนวณขนาดใหม่ผ่าน onResize

export const mapBtn: React.CSSProperties = {
  position: 'absolute', right: 10, zIndex: 1000, cursor: 'pointer',
  fontSize: 12, fontWeight: 600, fontFamily: 'var(--sans)', padding: '6px 11px',
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text)', boxShadow: 'var(--shadow)',
}

export function MapShell({ height, onResize, children, overlay }: {
  height: number
  onResize: () => void          // เรียกหลังขยาย/ย่อ (invalidateSize)
  children: React.ReactNode     // ตัวแผนที่ — ต้องสูง 100% ของกรอบ
  overlay?: React.ReactNode     // ปุ่ม/ป้ายที่ลอยบนแผนที่ (ปุ่มขยายอยู่ top:10 — เริ่มวางที่ top:47)
}) {
  const [big, setBig] = useState(false)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    const t = setTimeout(onResize, 80)
    if (!big) return () => clearTimeout(t)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setBig(false) }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [big])

  return (
    <div style={big
      ? { position: 'fixed', inset: 0, zIndex: 350, background: 'var(--overlay)', padding: 16, display: 'flex' }
      : { position: 'relative', zIndex: 0 }}>
      <div style={{ position: 'relative', ...(big ? { flex: 1, minWidth: 0 } : { height }) }}>
        {children}
        <button onClick={() => setBig(!big)} title={big ? 'ย่อกลับ (Esc)' : 'ขยายแผนที่เต็มจอ'} style={{ ...mapBtn, top: 10 }}>
          {big ? '✕ ย่อกลับ' : '⤢ ขยาย'}
        </button>
        {overlay}
      </div>
    </div>
  )
}
