import { useState } from 'react'
import { MOCK } from '../../mock'

// รูปพนักงาน — Figma วางเป็นรูปถ่ายจริง แต่ระบบยังไม่เก็บรูปโปรไฟล์
//
// โหมด mock/demo  : ยืมรูปคนจาก Unsplash มาโชว์ให้เห็นภาพตามดีไซน์ (ไม่ใช่คนจริงของโรงพยาบาล)
// โหมดใช้งานจริง  : ขึ้นอักษรย่อบนพื้น accent อ่อน — ไม่ยิงขอไฟล์ออกอินเทอร์เน็ตเด็ดขาด
// โหลดรูปไม่ได้   : ตกกลับไปใช้อักษรย่อเหมือนกัน (onError)
//
// รูปที่ใช้เป็น Unsplash photo id คงที่ + crop เฉพาะใบหน้า (fit=facearea)
// เลือกด้วย hash ของ seed -> คนเดิมได้รูปเดิมทุกครั้ง ไม่สลับไปมาตอน re-render

const PHOTOS = [
  '1494790108377-be9c29b29330', '1500648767791-00dcc994a43e',
  '1534528741775-53994a69daeb', '1506794778202-cad84cf45f1d',
  '1544005313-94ddf0286df2', '1552374196-c4e7ffc6e126',
  '1517841905240-472988babdf9', '1547425260-76bcadfb4f2c',
  '1546961329-78bef0414d7c', '1573497019940-1c28c88b4f3e',
  '1580489944761-15a19d654956', '1568602471122-7832951cc4c5',
]

/** อักษรย่อจากชื่อ (ตัวแรกของชื่อ + ตัวแรกของสกุล) */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  return parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]
}

/** hash สั้นๆ ให้ seed เดิมได้รูปเดิมเสมอ */
function pick(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return PHOTOS[h % PHOTOS.length]
}

export function Avatar({ name, seed, size = 36 }: {
  name: string
  /** ใช้เลือกรูปให้คงที่ต่อคน (ปกติส่ง emp_id) — ไม่ส่ง = ใช้ชื่อ */
  seed?: string
  size?: number
}) {
  const [broken, setBroken] = useState(false)
  const photo = MOCK && !broken ? pick(seed || name) : null

  const box: React.CSSProperties = {
    width: size, height: size, borderRadius: 'var(--r-full)', flex: 'none',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  }

  if (photo) {
    return (
      <img
        src={`https://images.unsplash.com/photo-${photo}?auto=format&fit=facearea&facepad=2.5&w=${size * 2}&h=${size * 2}&q=80`}
        alt="" aria-hidden loading="lazy" onError={() => setBroken(true)}
        style={{ ...box, objectFit: 'cover' }}
      />
    )
  }

  return (
    <span style={{
      ...box,
      background: 'var(--accent-light)', color: 'var(--accent-active)',
      fontSize: size < 40 ? 12 : Math.round(size / 2.9), fontWeight: 500,
    }}>{initials(name)}</span>
  )
}
