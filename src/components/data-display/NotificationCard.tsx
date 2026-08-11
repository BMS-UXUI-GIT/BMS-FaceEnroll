import type { ReactNode } from 'react'
import { Icon } from '../../icons'
import { thDateTime } from '../../hooks'
import { TEXT } from '../../typography'

// การ์ดแจ้งเตือน 1 รายการ — ใช้ในเมนูกระดิ่งบน Topbar และหน้ารวมการแจ้งเตือน
//
//   ┌ พื้นขาว (ยังไม่อ่าน = พื้น accent จาง) · r-lg · padding 12/16 ──────────┐
//   │  ◯ ไอคอน 40   หัวข้อ 14/500                       • จุดยังไม่อ่าน  ✕   │
//   │               รายละเอียด 14/400 สีจาง (ตัดที่ 2 บรรทัด)                │
//   │               เวลา 11/400 + ปุ่มการกระทำ (ถ้ามี)                       │
//   └────────────────────────────────────────────────────────────────────────┘
//
// ชนิดของการแจ้งเตือนคุมแค่ "สีวงไอคอน + ไอคอน" — โครงการ์ดเหมือนกันหมด
// สีทุกตัวมาจาก token ใน theme.css (ห้ามใส่ hex ตรงนี้)

export type NotifyKind = 'info' | 'success' | 'warn' | 'danger' | 'system'

const TONE: Record<NotifyKind, { color: string; icon: string }> = {
  info: { color: 'var(--accent-active)', icon: 'info' },
  success: { color: 'var(--ok)', icon: 'rosette-check' },
  warn: { color: 'var(--warn)', icon: 'alert' },
  danger: { color: 'var(--danger)', icon: 'progress-alert' },
  system: { color: 'var(--text-dim)', icon: 'system' },
}

export type Notification = {
  id: string
  kind?: NotifyKind
  title: string
  body?: string
  /** ISO จาก backend หรือข้อความสำเร็จรูป ("เมื่อสักครู่") ก็ได้ */
  time?: string
  read?: boolean
}

/** ISO -> "เมื่อสักครู่ / 5 นาทีที่แล้ว / 3 ชม.ที่แล้ว / เมื่อวาน" · เกิน 7 วันเป็นวันที่เต็ม
 *  ข้อความที่ไม่ใช่ ISO ส่งกลับตามเดิม (backend บางตัวส่งข้อความมาให้แล้ว) */
export function agoTH(time?: string): string {
  if (!time) return ''
  const t = new Date(time).getTime()
  if (isNaN(t)) return time
  const min = Math.floor((Date.now() - t) / 60000)
  if (min < 1) return 'เมื่อสักครู่'
  if (min < 60) return `${min} นาทีที่แล้ว`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} ชม.ที่แล้ว`
  const day = Math.floor(hr / 24)
  if (day === 1) return 'เมื่อวาน'
  if (day < 7) return `${day} วันที่แล้ว`
  return thDateTime(time)
}

export function NotificationCard({
  kind = 'info', title, body, time, read = false, actions, onClick, onDismiss,
}: {
  kind?: NotifyKind
  title: ReactNode
  body?: ReactNode
  /** ISO หรือข้อความ — ISO จะถูกแปลงเป็น "x นาทีที่แล้ว" ให้เอง */
  time?: string
  /** อ่านแล้ว = พื้นขาวธรรมดา ไม่มีจุดสีข้างขวา */
  read?: boolean
  /** ปุ่มท้ายการ์ด (เช่น "ดูรายละเอียด") — วางใต้เวลา */
  actions?: ReactNode
  onClick?: () => void
  /** มีค่า = โชว์ปุ่มปิดมุมขวาบน (ไม่ทำให้ทั้งการ์ดถูกกดตาม) */
  onDismiss?: () => void
}) {
  const tone = TONE[kind]
  const clickable = !!onClick

  return (
    <div
      className={clickable ? 'row-hover' : undefined}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
      } : undefined}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)',
        padding: 'var(--sp-3) var(--sp-4)',
        borderRadius: 'var(--r-lg)',
        // ยังไม่อ่าน = พื้นฟ้าจาง (อ่านแล้วพื้นขาว) — .row-hover คุมพื้นตอน hover ให้เอง
        ...(read ? null : { background: 'var(--accent-light)' }),
        cursor: clickable ? 'pointer' : undefined,
      }}
    >
      <span aria-hidden style={{
        width: 40, height: 40, flex: 'none', borderRadius: 'var(--r-full)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: `color-mix(in srgb, ${tone.color} 12%, transparent)`, color: tone.color,
      }}>
        <Icon name={tone.icon} size={20} width={1.8} />
      </span>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ ...TEXT.bodyMed, color: 'var(--text)' }}>{title}</span>
        {body && (
          // ตัดที่ 2 บรรทัด — รายการยาวไม่ดันการ์ดใบอื่นตกจอ
          <span style={{
            ...TEXT.body, color: 'var(--text-dim)',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{body}</span>
        )}
        {time && (
          <span style={{ ...TEXT.caption, color: 'color-mix(in srgb, var(--text-faint) 40%, transparent)', marginTop: 2 }}>
            {agoTH(time)}
          </span>
        )}
        {actions && <span style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>{actions}</span>}
      </div>

      <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        {!read && (
          <span aria-label="ยังไม่อ่าน" style={{
            width: 8, height: 8, borderRadius: 'var(--r-full)', background: 'var(--accent-active)', flex: 'none',
          }} />
        )}
        {onDismiss && (
          <button type="button" title="ปิดการแจ้งเตือนนี้"
            onClick={(e) => { e.stopPropagation(); onDismiss() }}
            style={{
              width: 28, height: 28, flex: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', borderRadius: 'var(--r-full)', cursor: 'pointer',
              background: 'transparent', color: 'var(--text-dim)',
            }}>
            <Icon name="close" size={14} width={2} />
          </button>
        )}
      </span>
    </div>
  )
}

/** รายการการ์ดแจ้งเตือน + สถานะว่าง — ใช้ทั้งในเมนูกระดิ่งและหน้ารวม */
export function NotificationList({ items, onOpen, onDismiss, empty = 'ยังไม่มีการแจ้งเตือน' }: {
  items: Notification[]
  onOpen?: (n: Notification) => void
  onDismiss?: (n: Notification) => void
  empty?: ReactNode
}) {
  if (items.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 'var(--sp-2)', padding: 'var(--sp-10) var(--sp-4)', textAlign: 'center',
      }}>
        <span aria-hidden style={{
          width: 56, height: 56, borderRadius: 'var(--r-full)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface-alt)', color: 'var(--text-dim)',
        }}>
          <Icon name="bell" size={28} width={1.6} />
        </span>
        <span style={{ ...TEXT.body, color: 'var(--text-dim)' }}>{empty}</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
      {items.map((n) => (
        <NotificationCard key={n.id} kind={n.kind} title={n.title} body={n.body} time={n.time} read={n.read}
          onClick={onOpen ? () => onOpen(n) : undefined}
          onDismiss={onDismiss ? () => onDismiss(n) : undefined} />
      ))}
    </div>
  )
}
