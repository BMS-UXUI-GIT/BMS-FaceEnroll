import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapShell, mapBtn } from './MapShell'
import { cssVar } from '../tokens'

// แผนที่ดูจุดสแกน (read-only) — วงรัศมี = จุดลงเวลาที่กำหนด, หมุด = จุดที่สแกนจริง
// เขียว = ในพื้นที่, แดง = นอกพื้นที่

export type Fence = { name?: string; lat: number; lng: number; radius_m: number }

// หมุดขนาดคงที่ (พิกเซล) — วงรัศมีเป็นหน่วยเมตร ซูมออกแล้วหด แต่หมุดต้องเห็นเสมอ
const PIN = L.divIcon({
  html: '<div style="font-size:26px;line-height:26px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">📍</div>',
  className: '', iconSize: [26, 26], iconAnchor: [13, 24],
})
export type ScanPoint = { lat: number; lng: number; time?: string }

function distM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371000, toRad = (x: number) => (x * Math.PI) / 180
  const dp = toRad(lat2 - lat1), dl = toRad(lng2 - lng1)
  const a = Math.sin(dp / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dl / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

export function ScanMap({ fences, points, height = 300 }: { fences: Fence[]; points: ScanPoint[]; height?: number }) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const fitRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!divRef.current || mapRef.current) return
    // ต้องมี view เริ่มต้นก่อน add layer — ไม่งั้น circle.getBounds() พัง (จอดำทั้งแอป)
    const map = L.map(divRef.current, { zoomControl: true }).setView([13.75, 100.52], 6)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map)
    mapRef.current = map
    // ใน modal ขนาดจริงมาหลัง mount — คำนวณใหม่ กัน tile เทา
    const t = setTimeout(() => map.invalidateSize(), 60)
    return () => { clearTimeout(t); map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const layers: L.Layer[] = []
    const bounds = L.latLngBounds([])

    for (const f of fences) {
      const c = L.circle([f.lat, f.lng], { radius: f.radius_m, color: cssVar('--accent'), weight: 1.5, fillColor: cssVar('--accent'), fillOpacity: 0.1 }).addTo(map)
      const pin = L.marker([f.lat, f.lng], { icon: PIN }).addTo(map)
      if (f.name) pin.bindTooltip(f.name)
      layers.push(c, pin)
      bounds.extend(c.getBounds())
    }
    for (const p of points) {
      const inside = fences.length === 0
        || fences.some((f) => distM(p.lat, p.lng, f.lat, f.lng) <= f.radius_m)
      const m = L.circleMarker([p.lat, p.lng], {
        radius: 9, color: cssVar('--bg'), weight: 2.5,
        fillColor: cssVar(inside ? '--ok' : '--danger'), fillOpacity: 1,
      }).addTo(map)
      const near = fences.length
        ? Math.round(Math.min(...fences.map((f) => distM(p.lat, p.lng, f.lat, f.lng))))
        : null
      m.bindTooltip(`${p.time ?? ''} ${inside ? 'ในพื้นที่' : 'นอกพื้นที่'}${near != null ? ` · ห่างจุดใกล้สุด ${near} ม.` : ''}`.trim())
      layers.push(m)
      bounds.extend([p.lat, p.lng])
    }
    const fit = () => {
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 })
      else map.setView([13.75, 100.52], 6)
    }
    fitRef.current = fit
    fit()
    // เผื่ออยู่ใน modal ที่ขนาดเพิ่งนิ่ง — fit ซ้ำหลังคำนวณขนาดใหม่
    const t = setTimeout(() => { map.invalidateSize(); fit() }, 90)
    return () => { clearTimeout(t); layers.forEach((l) => l.remove()) }
  }, [fences, points])

  return (
    <MapShell height={height} onResize={() => { mapRef.current?.invalidateSize(); fitRef.current?.() }}
      overlay={(fences.length > 0 || points.length > 0) && (
        <button onClick={() => fitRef.current?.()} title="ซูมกลับมาเห็นครบทุกจุด" style={{ ...mapBtn, top: 47 }}>
          ⛶ ดูทั้งหมด
        </button>
      )}>
      <div ref={divRef} style={{ height: '100%', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }} />
    </MapShell>
  )
}
