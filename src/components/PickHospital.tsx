import { useEffect, useMemo, useState } from 'react'
import { TEXT } from '../typography'
import { useApp } from '../state'
import { asset } from '../assets'
import { Button } from './inputs/Button'
import { SearchInput } from './inputs/SearchInput'

// ขึ้นเมื่อยังไม่ได้เลือกโรง (currentHcode = '*') บนหน้าที่แสดงข้อมูลรายโรง
// เลย์เอาต์อิงภาพอ้างอิง Figma 379:19905 — การ์ดใบเดียว 2 คอลัมน์ (คลาส .pick-hosp):
//   หัวเรื่องบนสุด · ซ้าย = ช่องค้นหา → รายการโรง (ปุ่ม "เลือก" ท้ายแถว) · ขวา = ภาพตึกบน blob ฟ้า
// เลือกโรงได้ในหน้านี้เลย (ไม่ต้องไปเปิดการ์ดเลือกโรงบน header)

/** โรงเยอะกว่านี้ → มีช่องค้นหาเหนือรายการ */
const SEARCH_FROM = 3

/** หมุดปักแผนที่รอบภาพประกอบ (ตกแต่ง) — ทรงหยดน้ำทึบ + วงกลมขาวตรงกลาง
    ขนาด/ตำแหน่งเป็น % ของกรอบภาพ → ยืดหดตามภาพเวลาจอเปลี่ยนขนาด */
function Pin({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg width={`${size}%`} viewBox="0 0 24 31" fill="none" aria-hidden
      className="pointer-events-none select-none" style={{ position: 'absolute', height: 'auto', ...style }}>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 8.4 10.2 17.85 10.635 18.247a2 2 0 0 0 2.73 0C13.8 29.85 24 20.4 24 12 24 5.373 18.627 0 12 0Z"
        fill="currentColor" />
      <circle cx="12" cy="11.5" r="4.6" fill="var(--bg)" />
    </svg>
  )
}

// ตำแหน่ง/ขนาด/ความทึบของหมุดแต่ละอัน (อิงภาพอ้างอิง Figma 379:19905)
// size = % ของความกว้างกรอบภาพ · ตำแหน่งเป็น % ทั้งหมด (อิงภาพอ้างอิง Figma 379:19905)
const PINS: { size: number; style: React.CSSProperties }[] = [
  { size: 6, style: { left: '-6%', top: '38%', color: 'var(--accent-active)' } },
  { size: 7, style: { right: '16%', top: '10%', color: 'var(--accent)', opacity: 0.28 } },
  { size: 6, style: { right: '6%', bottom: '18%', color: 'var(--accent-active)' } },
]

/** ภาพประกอบชุด "เลือกโรงพยาบาล" — ตึกบน blob ฟ้า + หมุดปักแผนที่ (ใช้ซ้ำได้หลายหน้า)
    width: px หรือ CSS length ก็ได้ · blob/หมุดวางเป็น % ของกรอบ จึงย่อขยายตามอัตโนมัติ */
export function HospitalArt({ width = 380 }: { width?: number | string }) {
  return (
    <span aria-hidden className="pick-hosp-figure" style={{ width, margin: 0 }}>
      <span className="pick-hosp-blob" />
      <img src={asset('/hero-hospital.svg')} alt="" className="pick-hosp-img pointer-events-none select-none" />
      {PINS.map((p, i) => <Pin key={i} size={p.size} style={p.style} />)}
    </span>
  )
}

export function PickHospital() {
  const { session, setHcode } = useApp()
  const hospitals = session?.hospitals ?? []
  const [q, setQ] = useState('')

  // หน้านี้พอดีจอเสมอ — ล็อกไม่ให้พื้นที่เนื้อหา scroll ระหว่างที่ยังไม่ได้เลือกโรง
  // (รายการโรงเลื่อนในคอลัมน์ตัวเองแทน)
  useEffect(() => {
    document.body.classList.add('no-page-scroll')
    return () => document.body.classList.remove('no-page-scroll')
  }, [])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return hospitals
    return hospitals.filter((h) => h.label.toLowerCase().includes(t) || h.value.includes(t))
  }, [hospitals, q])

  return (
    <div className="max-w-(--page-max)" style={{ width: '100%' }}>
      <div className="rounded-xl pick-hosp overflow-hidden" style={{
        background: 'var(--surface-alt)', padding: 'var(--sp-6)', // #F9F9F9
      }}>
        {/* หัวเรื่องมุมซ้ายบน กินเต็มความกว้างการ์ด */}
        <div className="pick-hosp-head">
          <h1 className="text-h1 m-0 text-text">เลือกโรงพยาบาล</h1>
          <p className="text-body mt-2 mb-0 text-text-dim">ค้นหาและเลือกโรงพยาบาลที่คุณต้องการ</p>
        </div>

        {/* ซ้าย = ค้นหา + รายการโรง · ขวา = ภาพประกอบ */}
        <div className="pick-hosp-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', minWidth: 0, alignSelf: 'stretch' }}>
          {hospitals.length > SEARCH_FROM && (
            <SearchInput grow value={q} onChange={setQ} placeholder="ค้นหาโรงพยาบาล" />
          )}

        {hospitals.length === 0 ? (
          <div style={{ ...TEXT.body, padding: '32px 20px', color: 'var(--text-dim)', textAlign: 'center' }}>
            บัญชีนี้ยังไม่มีโรงพยาบาลในสิทธิ์
          </div>
        ) : shown.length === 0 ? (
          <div style={{ ...TEXT.body, padding: '32px 20px', color: 'var(--text-dim)', textAlign: 'center' }}>
            ไม่พบโรงพยาบาลที่ตรงกับที่ค้นหา
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {shown.map((h) => (
              <div key={h.value} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                padding: 'var(--sp-2)', background: 'var(--bg)',
                borderRadius: 'var(--r-lg)',
              }}>
                {/* รูปย่อของตึก — crop จากภาพประกอบชุดเดียวกัน */}
                <span aria-hidden style={{
                  width: 72, height: 56, flex: 'none', borderRadius: 'var(--r-md)', overflow: 'hidden',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--surface-blue)',
                }}>
                  <img src={asset('/hero-hospital.svg')} alt="" width={72} height={72}
                    className="pointer-events-none select-none" style={{ objectFit: 'cover', marginTop: 6 }} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ ...TEXT.bodyMed, color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.value === session?.demo_hcode ? `${h.label} · ตัวอย่าง` : h.label}
                  </span>
                  <span style={{ ...TEXT.sm, fontFamily: 'var(--mono)', color: 'var(--text-dim)', display: 'block' }}>
                    {h.value}
                  </span>
                </span>
                <Button variant="primary" size="md" pill onClick={() => setHcode(h.value)}>เลือก</Button>
              </div>
            ))}
          </div>
        )}
        </div>

        {/* ภาพใหญ่ ล้นออกนอกขอบล่าง/ขวาของการ์ด (การ์ดตัด overflow ไว้แล้ว)
            ขนาด/ตำแหน่งคุมด้วย CSS (.pick-hosp-art) จะได้ยืดหดตามขนาดจอ */}
        <div aria-hidden className="pick-hosp-art">
          {/* กรอบภาพ = ตัวอ้างอิงของทั้ง blob และหมุด (ทุกอย่างวางเป็น % ของกรอบนี้) */}
          <span className="pick-hosp-figure">
            <span className="pick-hosp-blob" />
            <img src={asset('/hero-hospital.svg')} alt="" className="pick-hosp-img pointer-events-none select-none" />
            {PINS.map((p, i) => <Pin key={i} size={p.size} style={p.style} />)}
          </span>
        </div>
      </div>
    </div>
  )
}
