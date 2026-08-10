import { useEffect, useRef, useState } from 'react'
import { Icon } from '../icons'
import { refreshAll } from '../hooks'
import { TEXT } from '../typography'

// ลากลงจากหัวหน้าจอเพื่อรีเฟรช — ใช้แทนปุ่มรีเฟรชในหัวเรื่องบนมือถือ
// ทำงานคู่กับ refreshAll() ใน hooks.ts: ยิงอีเวนต์กลาง แล้วทุก useFetch ที่ยัง mount โหลดใหม่พร้อมกัน
//
// เงื่อนไขให้เริ่มลาก: <main> เลื่อนอยู่บนสุด (scrollTop <= 0) เท่านั้น
//   ไม่งั้นจะแย่ง scroll ปกติของหน้า — ระหว่างลากถึงค่อย preventDefault
// ระยะ: ลากเกิน THRESHOLD แล้วปล่อย = รีเฟรช · ลากได้สูงสุด MAX (หนืดขึ้นเรื่อย ๆ)

const THRESHOLD = 72
const MAX = 120
/** ยิ่งลาก ยิ่งฝืด — ลาก 2 เท่าของ MAX ถึงจะถึง MAX */
const damp = (d: number) => MAX * (1 - Math.exp(-d / MAX))

export function PullToRefresh({ enabled }: { enabled: boolean }) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const start = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    const main = document.querySelector('main')
    if (!main) return

    const onStart = (e: TouchEvent) => {
      if (busy || e.touches.length !== 1 || main.scrollTop > 0) { start.current = null; return }
      start.current = e.touches[0].clientY
    }
    const onMove = (e: TouchEvent) => {
      if (start.current == null) return
      const d = e.touches[0].clientY - start.current
      // ปัดขึ้น = เลิกท่านี้ คืน scroll ให้หน้าเว็บตามปกติ
      if (d <= 0) { start.current = null; setPull(0); return }
      if (e.cancelable) e.preventDefault()
      setPull(damp(d))
    }
    const onEnd = () => {
      if (start.current == null) return
      start.current = null
      setPull((cur) => {
        if (cur >= THRESHOLD) {
          setBusy(true)
          refreshAll()
          // ไม่มีสัญญาณ "โหลดเสร็จ" รวมของทั้งหน้า — โชว์ตัวหมุนพอให้รู้ว่ารับคำสั่งแล้ว
          setTimeout(() => { setBusy(false); setPull(0) }, 900)
          return THRESHOLD
        }
        return 0
      })
    }

    main.addEventListener('touchstart', onStart, { passive: true })
    main.addEventListener('touchmove', onMove, { passive: false })
    main.addEventListener('touchend', onEnd)
    main.addEventListener('touchcancel', onEnd)
    return () => {
      main.removeEventListener('touchstart', onStart)
      main.removeEventListener('touchmove', onMove)
      main.removeEventListener('touchend', onEnd)
      main.removeEventListener('touchcancel', onEnd)
    }
  }, [enabled, busy])

  if (!enabled || (pull === 0 && !busy)) return null

  const ready = pull >= THRESHOLD
  return (
    <div aria-hidden style={{
      position: 'fixed', left: 0, right: 0, top: 'calc(var(--topbar-h) - 8px)', zIndex: 40,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      transform: `translateY(${Math.min(pull, MAX) * 0.5}px)`,
      transition: start.current == null ? 'transform .2s ease' : undefined,
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
        ...TEXT.sm, color: 'var(--accent-active)',
        background: 'var(--bg)', border: '1px solid var(--control-border)',
        borderRadius: 'var(--r-full)', padding: 'var(--sp-2) var(--sp-4)',
        boxShadow: 'var(--shadow-md)',
        opacity: Math.min(1, pull / 40 || 1),
      }}>
        <Icon name="recon" size={18} width={2}
          style={busy
            ? { animation: 'spin .7s linear infinite' }
            : { transform: `rotate(${Math.min(pull / MAX, 1) * 270}deg)`, transition: 'transform .1s linear' }} />
        {busy ? 'กำลังโหลด…' : ready ? 'ปล่อยเพื่อรีเฟรช' : 'ลากลงเพื่อรีเฟรช'}
      </span>
    </div>
  )
}
