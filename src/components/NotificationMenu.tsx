import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMedia } from '../hooks'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp, type Nav } from '../state'
import { Button } from './inputs/Button'
import { BottomSheet } from './feedback/BottomSheet'
import { NotificationList, type Notification } from './data-display/NotificationCard'

// เมนูแจ้งเตือน (ปุ่มกระดิ่งบน Topbar)
//   จอใหญ่ = แผงลอยใต้ปุ่ม (portal ไป body เพราะ Topbar มี overflow:hidden)
//   มือถือ = แผงจากขอบล่างจอ (BottomSheet) กดง่ายกว่าแผงลอยกลางอากาศ
//
// ⚠️ ข้อมูลยังเป็นตัวอย่างในไฟล์นี้ — backend ยังไม่มี endpoint แจ้งเตือน (ดู HANDOFF ข้อ 2)
//    ต่อของจริง: เปลี่ยน SAMPLE เป็น useFetch<Notification[]>('/admin/notifications')
//    แล้วให้ปุ่ม "อ่านทั้งหมด"/ปิดรายการยิง API แทนการเก็บสถานะไว้ในหน่วยความจำ

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

/** รายการแจ้งเตือน + ปลายทางที่จะพาไปเมื่อกด (nav ของหน้าในระบบ) */
type Item = Notification & { nav?: Nav }

const SAMPLE: Item[] = [
  { id: 'n1', kind: 'warn', title: 'มีคำขอลงทะเบียนโรงพยาบาลรออนุมัติ 3 แห่ง',
    body: 'โรงพยาบาลสาธิต · โรงพยาบาลทดสอบ 2 · โรงพยาบาลทดสอบ 3', time: hoursAgo(0.05), nav: 'sys-approve' },
  { id: 'n2', kind: 'danger', title: 'เชื่อมต่อ HOSxP ไม่สำเร็จ 2 แห่ง',
    body: 'ระบบพยายามเชื่อมต่อใหม่อัตโนมัติทุก 5 นาที', time: hoursAgo(2), nav: 'health' },
  { id: 'n3', kind: 'warn', title: 'โรงพยาบาลทดลองใช้ใกล้หมดอายุ 1 แห่ง',
    body: 'เหลือเวลาใช้งานน้อยกว่า 7 วัน', time: hoursAgo(20), nav: 'sys-hospitals' },
  { id: 'n4', kind: 'success', title: 'ลงทะเบียนใบหน้าครบทั้งแผนกการเงิน',
    body: 'พนักงาน 12 คน ลงทะเบียนครบ 3 รูปแล้ว', time: hoursAgo(30), read: true, nav: 'face' },
  { id: 'n5', kind: 'system', title: 'อัปเดตระบบเป็นเวอร์ชัน 1.4.0',
    body: 'เพิ่มรายงานสถิติการเข้า - ออกงาน', time: hoursAgo(72), read: true },
]

export function NotificationMenu() {
  const { setNav } = useApp()
  const phone = useMedia('(max-width: 620px)')
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Item[]>(SAMPLE)
  const unread = items.filter((n) => !n.read).length

  // วางแผงใต้ปุ่ม (ชิดขวาปุ่ม) — Topbar มี overflow:hidden จึงต้อง portal + fixed
  const btnRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  useLayoutEffect(() => {
    if (!open || phone) return
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect()
      if (!r) return
      setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open, phone])

  const markAll = () => setItems((cur) => cur.map((n) => ({ ...n, read: true })))
  const dismiss = (n: Notification) => setItems((cur) => cur.filter((x) => x.id !== n.id))
  const openItem = (n: Notification) => {
    setItems((cur) => cur.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    const to = (n as Item).nav
    if (to) { setNav(to); setOpen(false) }
  }

  const list = (
    <NotificationList items={items} onOpen={openItem} onDismiss={dismiss} />
  )
  const head = (
    <Button variant="ghost" size="xs" onClick={markAll} disabled={unread === 0}
      icon={<Icon name="check" size={16} width={2} />}>อ่านทั้งหมด</Button>
  )

  return (
    <div ref={btnRef} style={{ position: 'relative', flex: 'none' }}>
      {/* backdrop ปิดแผงตอนคลิกที่ว่าง (เฉพาะแผงลอย — BottomSheet มีฉากหลังของตัวเอง) */}
      {open && !phone && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />}

      {/* r-lg เท่าการ์ดเลือกโรง/การ์ดโปรไฟล์ — มุมของทุกอย่างบน header ต้องเท่ากัน
          มีของใหม่ = ปุ่มทึบสีหลัก + วงแหวนกระเพื่อม + ป้ายจำนวน (ไม่มีข้อความ) */}
      <Button className={`noti-btn${unread > 0 ? ' noti-cta' : ''}`}
        title={unread > 0 ? `การแจ้งเตือน (${unread} รายการใหม่)` : 'การแจ้งเตือน'}
        variant={unread > 0 ? 'primary' : 'accent-soft'} size="sm" radius="lg"
        onClick={() => setOpen((v) => !v)}
        // ป้ายจำนวนเกาะมุมขวาบนของกระดิ่ง — เกาะ "ในปุ่ม" ไม่ใช่มุมปุ่ม
        // เพราะ Topbar เป็น overflow:hidden ของที่ยื่นพ้นปุ่มมีโอกาสโดนตัด
        icon={(
          <span style={{ position: 'relative', display: 'inline-flex', flex: 'none' }}>
            <Icon name="bell" size={20} width={1.8} />
            {unread > 0 && (
              <span style={{
                ...TEXT.caption,
                position: 'absolute', top: -5, right: -7,
                fontWeight: 500, minWidth: 16, height: 16, lineHeight: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px', borderRadius: 'var(--r-full)',
                background: 'var(--bg)', color: 'var(--accent-active)',
              }}>{unread > 9 ? '9+' : unread}</span>
            )}
          </span>
        )} />

      {phone ? (
        <BottomSheet open={open} title="การแจ้งเตือน" onClose={() => setOpen(false)} footer={head}>
          {list}
        </BottomSheet>
      ) : open && createPortal((
        <div style={{
          position: 'fixed', top: pos.top, right: pos.right, zIndex: 200,
          width: 'min(400px, calc(100vw - 16px))', maxHeight: 'min(70vh, 560px)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg)', borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
          animation: 'feedIn .14s ease',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
            padding: 'var(--sp-3) var(--sp-3) var(--sp-2) var(--sp-4)',
          }}>
            <span style={{ ...TEXT.bodyMed, color: 'var(--text)', flex: 1, minWidth: 0 }}>การแจ้งเตือน</span>
            {head}
          </div>
          <div style={{ overflowY: 'auto', padding: '0 var(--sp-2) var(--sp-2)', flex: 1 }}>{list}</div>
        </div>
      ), document.body)}
    </div>
  )
}
