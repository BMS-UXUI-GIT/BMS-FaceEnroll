import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapShell, mapBtn } from './MapShell'

// แผนที่เลือกจุด + รัศมี (geofence) — จิ้มบนแผนที่ = ย้ายหมุด, วงกลม = พื้นที่ที่ลงเวลาได้
// ใช้ OpenStreetMap + วาดหมุดเป็น circleMarker

const THAILAND: [number, number] = [13.75, 100.52] // จุดเริ่มถ้ายังไม่เคยปัก

// หมุดตัวใหญ่ เห็นชัดทุกระดับซูม (จุดกลมเล็กเดิมจมหายตอนซูมเข้า)
const PIN = L.divIcon({
  html: '<div style="font-size:30px;line-height:30px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">📍</div>',
  className: '', iconSize: [30, 30], iconAnchor: [15, 28],
})

export function GeoPicker({ lat, lng, radiusM, disabled, onPick }: {
  lat: number; lng: number; radiusM: number; disabled?: boolean
  onPick: (lat: number, lng: number) => void
}) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const pinRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled

  const hasPoint = lat !== 0 || lng !== 0

  // สร้างแผนที่ครั้งเดียว
  useEffect(() => {
    if (!divRef.current || mapRef.current) return
    const map = L.map(divRef.current, { zoomControl: true })
      .setView(hasPoint ? [lat, lng] : THAILAND, hasPoint ? 16 : 6)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (disabledRef.current) return
      onPickRef.current(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)))
    })
    mapRef.current = map
    // ใน modal ขนาดจริงมาหลัง mount — คำนวณใหม่ กัน tile เทา/แสดงครึ่งเดียว
    const t = setTimeout(() => map.invalidateSize(), 60)
    return () => { clearTimeout(t); map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // วาด/ย้ายหมุด + วงรัศมี ตามค่าปัจจุบัน
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    pinRef.current?.remove(); pinRef.current = null
    circleRef.current?.remove(); circleRef.current = null
    if (!hasPoint) return
    // พิกัดใหม่ (ค้นหา/ตำแหน่งปัจจุบัน/จิ้ม) → ซูมเข้าไปเลยถ้ายังมองภาพกว้าง, เลื่อนตามถ้าจุดหลุดขอบจอ
    if (map.getZoom() < 15) map.setView([lat, lng], 16)
    else if (!map.getBounds().pad(-0.2).contains([lat, lng])) map.panTo([lat, lng])
    pinRef.current = L.marker([lat, lng], { icon: PIN, interactive: false }).addTo(map)
    if (radiusM > 0) {
      circleRef.current = L.circle([lat, lng], {
        radius: radiusM, color: '#3a4fd6', weight: 1.5, fillColor: '#3a4fd6', fillOpacity: 0.12,
      }).addTo(map)
      // ซูมให้เห็นทั้งวง (เฉพาะตอนวงหลุดจอ)
      const b = circleRef.current.getBounds()
      if (!map.getBounds().contains(b)) map.fitBounds(b, { padding: [24, 24] })
    }
  }, [lat, lng, radiusM, hasPoint])

  return (
    <MapShell height={320} onResize={() => mapRef.current?.invalidateSize()}
      overlay={
        <>
          {hasPoint && (
            <button
              onClick={() => { const m = mapRef.current; if (m) m.setView([lat, lng], Math.max(m.getZoom(), 16)) }}
              title="เลื่อนกลับไปหาหมุด" style={{ ...mapBtn, top: 47 }}>
              📍 ไปที่หมุด
            </button>
          )}
          <div style={{
            position: 'absolute', bottom: 10, left: 10, zIndex: 1000, pointerEvents: 'none',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '6px 10px', fontSize: 11.5, color: 'var(--text-dim)', boxShadow: 'var(--shadow)',
          }}>
            {disabled ? 'ดูอย่างเดียว' : hasPoint ? `หมุด: ${lat.toFixed(5)}, ${lng.toFixed(5)} — จิ้มแผนที่เพื่อย้าย` : 'จิ้มบนแผนที่เพื่อปักหมุดจุดลงเวลา'}
          </div>
        </>
      }>
      <div ref={divRef} style={{ height: '100%', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }} />
    </MapShell>
  )
}
