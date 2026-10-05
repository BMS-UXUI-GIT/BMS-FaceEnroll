import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../icons'

// เครื่องหมาย ⓘ ท้ายหัวข้อ — ชี้แล้วขึ้นคำอธิบาย
// tooltip วาดลง body ตรงๆ (portal) จะได้ไม่โดนการ์ด overflow:hidden / ตาราง scroll ตัดขอบ

/** ครอบอะไรก็ได้ให้มี tooltip แบบเดียวกับ ⓘ (ชี้ = ขึ้น, แตะบนมือถือ = สลับเปิด/ปิด) */
export function Tip({ text, children, style, className, card = false, width = 280 }: {
  text: ReactNode
  children: ReactNode
  style?: CSSProperties
  className?: string
  /** true = การ์ดพื้นสว่างมีขอบ (เนื้อหาหลายบรรทัด/มีไอคอน) · false = ป้ายดำสั้น ๆ แบบ ⓘ */
  card?: boolean
  /** ความกว้างสูงสุดของ tooltip */
  width?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number; below: boolean } | null>(null)

  const show = () => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    // กันหลุดขอบจอซ้าย/ขวา (ครึ่งความกว้าง tooltip + ระยะเผื่อ)
    const half = width / 2 + 10
    const x = Math.min(Math.max(r.left + r.width / 2, half), window.innerWidth - half)
    // ใกล้ขอบบนจอ (เช่นแถวแรกของตารางใต้แถบตัวกรอง) = กลับไปขึ้นด้านล่างแทน ไม่ให้ทะลุขอบ
    const below = r.top < (card ? 260 : 80)
    setPos({ x, y: below ? r.bottom : r.top, below })
  }
  const hide = () => setPos(null)

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={(e) => { e.stopPropagation(); pos ? hide() : show() }}
      style={style}
      className={className}
    >
      {children}
      {pos && createPortal(
        <span
          role="tooltip"
          style={{
            position: 'fixed', left: pos.x, top: pos.below ? pos.y + 9 : pos.y - 9, transform: pos.below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            zIndex: 10000, width: 'max-content', maxWidth: width, whiteSpace: 'normal', textAlign: 'left',
            fontSize: 11.5, lineHeight: 1.5, fontWeight: 500, boxShadow: 'var(--shadow-lg)', pointerEvents: 'none',
            ...(card
              ? { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--control-border)', padding: '10px 12px', borderRadius: 12 }
              : { background: 'var(--text)', color: 'var(--surface)', padding: '8px 11px', borderRadius: 9 }),
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
