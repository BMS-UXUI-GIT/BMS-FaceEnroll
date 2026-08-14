import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Icon } from '../../icons'
import { TEXT } from '../../typography'

// กล่องซ้อน — Figma component set "enrollment-view-modal" (node 254:12305)
// สเปกจริง: กว้าง 720 · radius 20 · พื้นขาว
//   header  padding 20/24 + ปุ่มปิดพื้น #F3F4F6
//   footer  padding 16/24 พื้น surface (#F9FAFB)
//   เนื้อหา padding 24
//
// ⚠️ instance ใน Figma ตั้ง radius 20 ซึ่งไม่มีในสเกล — เอกสาร Section 4 ระบุ
//    "radius/lg (16px) = Cards, modals" จึงยึด --r-lg ตามระบบ ไม่ใช่ค่าที่วาดหลุด

export function Modal({ open, title, subtitle, onClose, children, footer, width = 720 }: {
  open: boolean
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  // ปิดด้วย Esc — ผูกเฉพาะตอนเปิด
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      className="modal-wrap"
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: 'var(--overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-5)',
        animation: 'overlayIn .12s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-card"
        role="dialog" aria-modal="true"
        style={{
          width: '100%', maxWidth: width, maxHeight: 'calc(var(--app-h) * 0.88)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: 'var(--bg)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-lg)',
          animation: 'modalIn .16s ease',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-4)',
          padding: 'var(--sp-5) var(--sp-6)',
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ ...TEXT.h3, color: 'var(--text)' }}>{title}</div>
            {subtitle && <div style={{ ...TEXT.sm, color: 'var(--text-dim)', marginTop: 'var(--sp-1)' }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} title="ปิด" style={{
            width: 32, height: 32, flex: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', borderRadius: 'var(--r-full)', cursor: 'pointer',
            background: 'var(--surface-card)', color: 'var(--text-dim)',
          }}>
            <Icon name="close" size={16} width={2} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '0 var(--sp-6) var(--sp-6)', flex: 1 }}>
          {children}
        </div>

        {footer && (
          <div style={{
            ...TEXT.sm,
            padding: 'var(--sp-4) var(--sp-6)',
            background: 'var(--surface)',
            color: 'var(--text-dim)',
          }}>{footer}</div>
        )}
      </div>
    </div>
  )
}
