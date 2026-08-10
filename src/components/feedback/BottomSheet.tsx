import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../icons'
import { TEXT } from '../../typography'

// แผงเลื่อนขึ้นจากขอบล่างจอ — ใช้แทน modal บนมือถือ (นิ้วเอื้อมถึงง่ายกว่ากล่องกลางจอ)
// ปิดได้ 3 ทาง: แตะฉากหลัง · ปุ่มกากบาท · Esc
// ⚠️ ต้อง render ผ่าน portal ไปที่ <body> — การ์ด/หน้าที่ครอบอยู่มี transform (อนิเมชัน .page-in/.tab-in)
//    ซึ่งทำให้ position:fixed ยึดกับกล่องนั้นแทนที่จะเป็นทั้งจอ (แผงจะโผล่อยู่ในการ์ด)
// สูงไม่เกิน 85vh · เนื้อหาข้างในเลื่อนเองได้ · เว้น safe-area ของ iOS ให้แล้ว

export function BottomSheet({ open, title, onClose, children, footer }: {
  open: boolean
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'var(--overlay)',
      display: 'flex', alignItems: 'flex-end', animation: 'overlayIn .12s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{
        width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        background: 'var(--bg)', borderRadius: 'var(--r-xl) var(--r-xl) 0 0',
        boxShadow: 'var(--shadow-lg)', animation: 'sheetUp .2s cubic-bezier(.16,.84,.28,1)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {/* ขีดจับด้านบน — สัญญาณว่าแผงนี้มาจากขอบล่าง (ตกแต่ง ไม่ใช่ปุ่ม) */}
        <span aria-hidden style={{
          width: 40, height: 4, borderRadius: 'var(--r-full)', background: 'var(--control-border)',
          margin: 'var(--sp-2) auto 0', flex: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3) var(--sp-4) var(--sp-2)' }}>
          <span style={{ ...TEXT.h3, color: 'var(--text)', flex: 1, minWidth: 0 }}>{title}</span>
          <button onClick={onClose} title="ปิด" style={{
            width: 32, height: 32, flex: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', borderRadius: 'var(--r-full)', cursor: 'pointer',
            background: 'var(--surface-card)', color: 'var(--text-dim)',
          }}>
            <Icon name="close" size={16} width={2} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '0 var(--sp-4) var(--sp-4)', flex: 1 }}>{children}</div>

        {footer && (
          <div style={{ padding: 'var(--sp-3) var(--sp-4)', borderTop: '1px solid var(--control-border)' }}>{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}
