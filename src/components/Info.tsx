import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../icons'

// เครื่องหมาย ⓘ ท้ายหัวข้อ — ชี้แล้วขึ้นคำอธิบาย
// tooltip วาดลง body ตรงๆ (portal) จะได้ไม่โดนการ์ด overflow:hidden / ตาราง scroll ตัดขอบ

/** ครอบอะไรก็ได้ให้มี tooltip แบบเดียวกับ ⓘ (ชี้ = ขึ้น, แตะบนมือถือ = สลับเปิด/ปิด) */
export function Tip({ text, children, style }: { text: string; children: ReactNode; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  const show = () => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    // กันหลุดขอบจอซ้าย/ขวา (tooltip กว้างสุด 280)
    const x = Math.min(Math.max(r.left + r.width / 2, 150), window.innerWidth - 150)
    setPos({ x, y: r.top })
  }
  const hide = () => setPos(null)

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={(e) => { e.stopPropagation(); pos ? hide() : show() }}
      style={style}
    >
      {children}
      {pos && createPortal(
        <span
          role="tooltip"
          style={{
            position: 'fixed', left: pos.x, top: pos.y - 9, transform: 'translate(-50%, -100%)',
            zIndex: 10000, width: 'max-content', maxWidth: 280, whiteSpace: 'normal', textAlign: 'left',
            background: 'var(--text)', color: 'var(--surface)', fontSize: 11.5, lineHeight: 1.5, fontWeight: 500,
            padding: '8px 11px', borderRadius: 9, boxShadow: 'var(--shadow-lg)', pointerEvents: 'none',
          }}
        >
          {text}
        </span>,
        document.body,
      )}
    </span>
  )
}

export function Info({ text, size = 14 }: { text: string; size?: number }) {
  return (
    <Tip text={text} style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle', marginLeft: 5, cursor: 'help' }}>
      <Icon name="info" size={size} width={1.9} color="var(--text-faint)" />
    </Tip>
  )
}
