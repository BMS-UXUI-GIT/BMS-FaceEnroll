import { useState } from 'react'
import { GeoPicker } from './GeoPicker'
import { Icon } from '../icons'

// popup เพิ่ม/แก้จุดลงเวลา — ค้นหาสถานที่ หรือใช้ตำแหน่งปัจจุบัน แทนการเลื่อนแผนที่หาเอง

export type GeoLoc = { name: string; lat: number; lng: number; radius_m: number }

const input: React.CSSProperties = { padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none' }
const btn: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, padding: '8px 13px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer' }

export function LocationModal({ initial, disabled, onSave, onClose }: {
  initial: GeoLoc
  disabled?: boolean
  onSave: (loc: GeoLoc) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [radius, setRadius] = useState(initial.radius_m || 5)
  const [lat, setLat] = useState(initial.lat)
  const [lng, setLng] = useState(initial.lng)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<'search' | 'geo' | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const hasPoint = lat !== 0 || lng !== 0

  const search = async () => {
    if (!q.trim() || busy) return
    setBusy('search'); setNote(null)
    try {
      // timeout 8 วิ กัน busy ค้างล็อกปุ่มตลอดถ้าเน็ตแฮงค์
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=th&q=${encodeURIComponent(q.trim())}`,
        { headers: { 'Accept-Language': 'th' }, signal: AbortSignal.timeout(8000) })
      const j = await r.json()
      if (j?.[0]) { setLat(Number(Number(j[0].lat).toFixed(6))); setLng(Number(Number(j[0].lon).toFixed(6))) }
      else setNote('ไม่พบสถานที่นี้ ลองพิมพ์ชื่อโรงพยาบาล/ตำบล/อำเภอ')
    } catch { setNote('ค้นหาไม่ได้ (เน็ตช้าหรือต่อไม่ได้) — จิ้มบนแผนที่แทนได้') }
    setBusy(null)
  }

  const useMyLocation = () => {
    if (busy || !navigator.geolocation) { setNote('อุปกรณ์นี้ไม่รองรับระบุตำแหน่ง'); return }
    setBusy('geo'); setNote(null)
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(Number(p.coords.latitude.toFixed(6))); setLng(Number(p.coords.longitude.toFixed(6))); setBusy(null) },
      () => { setNote('ระบุตำแหน่งไม่ได้ (ยังไม่อนุญาต หรือปิด GPS)'); setBusy(null) },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const save = () => {
    if (!hasPoint) { setNote('ยังไม่ได้ปักหมุด'); return }
    onSave({ name: name.trim() || 'จุดลงเวลา', lat, lng, radius_m: Math.max(1, radius || 0) })
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 14.5 }}>{disabled ? 'ดูจุดลงเวลา' : hasPoint ? 'แก้ไขจุดลงเวลา' : 'เพิ่มจุดลงเวลา'}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={name} disabled={disabled} placeholder="ชื่อจุด เช่น OPD / ตึกผู้ป่วยใน / ห้องยา"
              onChange={(e) => setName(e.target.value)} style={{ ...input, flex: 1, minWidth: 200 }} />
            <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>รัศมี</span>
            <input type="number" value={radius} min={1} max={100000} disabled={disabled}
              onChange={(e) => setRadius(Math.max(1, Number(e.target.value) || 0))} style={{ ...input, width: 90, fontFamily: 'var(--mono)', textAlign: 'right' }} />
            <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>เมตร</span>
          </div>

          {!disabled && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flex: 1, minWidth: 220, gap: 0 }}>
                <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()}
                  placeholder="ค้นหาโรงพยาบาล/สถานที่ แล้วแผนที่จะเลื่อนไปให้"
                  style={{ ...input, flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }} />
                <button onClick={search} disabled={busy === 'search'} style={{ ...btn, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="search" size={13} width={1.8} />{busy === 'search' ? 'กำลังค้น…' : 'ค้นหา'}
                </button>
              </div>
              <button onClick={useMyLocation} disabled={busy === 'geo'} style={{ ...btn, color: 'var(--accent-strong)', borderColor: 'var(--accent)' }}>
                📍 {busy === 'geo' ? 'กำลังหา…' : 'ใช้ตำแหน่งปัจจุบัน'}
              </button>
            </div>
          )}
          {note && <div style={{ fontSize: 12, color: 'var(--warn)' }}>{note}</div>}

          <GeoPicker lat={lat} lng={lng} radiusM={radius} disabled={disabled}
            onPick={(la, ln) => { setLat(la); setLng(ln) }} />
        </div>

        <div style={{ padding: '13px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, position: 'sticky', bottom: 0, background: 'var(--surface)', zIndex: 1 }}>
          <button onClick={onClose} style={btn}>{disabled ? 'ปิด' : 'ยกเลิก'}</button>
          {!disabled && (
            <button onClick={save} disabled={!hasPoint} style={{ ...btn, background: hasPoint ? 'var(--accent)' : 'var(--surface-3)', color: hasPoint ? '#fff' : 'var(--text-faint)', borderColor: 'transparent', cursor: hasPoint ? 'pointer' : 'default' }}>
              บันทึกจุด
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
