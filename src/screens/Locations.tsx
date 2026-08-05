import { useEffect, useRef, useState } from 'react'
import { Loading } from '../components/Spinner'
import { api } from '../api'
import { dialog, toast } from '../components/dialog'
import { LocationModal, type GeoLoc } from '../components/LocationModal'
import { ScanMap } from '../components/ScanMap'
import { PickHospital } from '../components/PickHospital'
import { Info } from '../components/Info'
import { useApp } from '../state'

// จุดลงเวลา — รายการพื้นที่ที่อนุญาตให้ลงเวลา (โรงใหญ่ปักได้หลายจุด: OPD/ตึกผู้ป่วย/ห้องยา)
// เข้ามาเห็นเป็น "รายการจุด" ก่อน กดเพิ่ม/แก้ = เปิด popup แผนที่

type Pol = Record<string, any>

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)', overflow: 'hidden' }
const btn: React.CSSProperties = { fontSize: 12.5, fontWeight: 500, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer' }

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 40, height: 22, borderRadius: 20, border: 'none', cursor: disabled ? 'default' : 'pointer', position: 'relative', flex: 'none',
      background: on ? 'var(--ok)' : 'var(--surface-gray)', transition: 'background .15s', opacity: disabled ? 0.6 : 1,
    }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'var(--bg)', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .15s' }} />
    </button>
  )
}

export function Locations() {
  const { currentHcode, session } = useApp()
  const readOnly = session?.role === 'user'
  const [pol, setPol] = useState<Pol | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const seqRef = useRef(0)
  const [editing, setEditing] = useState<{ idx: number; loc: GeoLoc } | null>(null)

  useEffect(() => {
    if (currentHcode === '*') return
    let alive = true // กันสลับโรงแล้ว response โรงเก่ามาทับ (จะอ่าน/เขียนผิดโรง)
    seqRef.current++ // ตัด save ที่ค้างของโรงเก่าด้วย
    setPol(null); setErr(null)
    api.get<{ policy: Pol }>(`/admin/policy?hcode=${encodeURIComponent(currentHcode)}`)
      .then((d) => alive && setPol(d.policy)).catch((e) => alive && setErr(e?.message || 'โหลดไม่สำเร็จ'))
    return () => { alive = false }
  }, [currentHcode])

  const updMany = async (patch: Record<string, any>) => {
    if (!pol || readOnly) return
    const prev = pol
    const my = ++seqRef.current // รับเฉพาะ response ล่าสุด (กันกดติดกันแล้วอันเก่ามาทับ)
    setPol({ ...pol, ...patch })
    setErr(null)
    try {
      const d = await api.post<{ policy: Pol }>(`/admin/policy/${currentHcode}`, patch)
      if (my !== seqRef.current) return
      setPol(d.policy)
      setSaved(true); setTimeout(() => setSaved(false), 1500)
    } catch (e: any) {
      if (my !== seqRef.current) return
      setErr(e?.message || 'บันทึกไม่สำเร็จ')
      // ดึงค่าจริงจาก server แทนการเดา rollback (กัน save ซ้อนกันแล้ว state ค้างผิด)
      try {
        const d = await api.get<{ policy: Pol }>(`/admin/policy?hcode=${encodeURIComponent(currentHcode)}`)
        if (my === seqRef.current) setPol(d.policy)
      } catch { if (my === seqRef.current) setPol(prev) }
    }
  }

  if (currentHcode === '*') return <PickHospital />

  // จุดหลายจุด — ถ้ายังไม่มีแต่เคยตั้งจุดเดียวแบบเดิม ให้โชว์เป็นจุดแรก
  const locations: GeoLoc[] = (pol?.gps_locations?.length ? pol.gps_locations
    : (pol && pol.gps_radius_m > 0 && (pol.gps_lat || pol.gps_lng))
      ? [{ name: 'จุดลงเวลา', lat: pol.gps_lat, lng: pol.gps_lng, radius_m: pol.gps_radius_m }]
      : [])

  const saveList = (locs: GeoLoc[]) => {
    const first = locs[0]
    updMany({ gps_locations: locs, gps_lat: first?.lat ?? 0, gps_lng: first?.lng ?? 0, gps_radius_m: first?.radius_m ?? 0 })
  }
  const upsert = (loc: GeoLoc) => {
    if (!editing) return
    const locs = editing.idx < 0 ? [...locations, loc] : locations.map((l, i) => (i === editing.idx ? loc : l))
    saveList(locs); setEditing(null)
  }
  const placedLocs = locations.filter((l) => l.lat !== 0 || l.lng !== 0)
  const remove = async (i: number) => {
    if (!(await dialog.confirm({ title: 'ลบจุดลงเวลา', body: `ลบจุด "${locations[i].name}"?`, confirmText: 'ลบจุดนี้', danger: true }))) return
    saveList(locations.filter((_, x) => x !== i))
  }

  return (
    <div style={{ maxWidth: 'var(--page-max)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
          โรง {currentHcode} · พนักงานลงเวลาได้เฉพาะในรัศมีของจุดที่กำหนด
          {readOnly && <span style={{ color: 'var(--warn)' }}> · ดูอย่างเดียว (User)</span>}
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ok)', opacity: saved ? 1 : 0, transition: 'opacity .25s' }}>บันทึกแล้ว ✓</span>
      </div>
      {err && <div style={{ ...card, padding: '12px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {err}</div>}
      {!pol && !err && <div style={card}><Loading /></div>}

      {pol && (
        <>
          <div style={{ ...card, padding: '15px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>บังคับ GPS ตอนลงเวลา<Info text="เปิด = พนักงานต้องเปิด GPS และอยู่ในรัศมีของจุดใดจุดหนึ่งจึงลงเวลาได้ · ปิด = ไม่ตรวจพื้นที่" /></div>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 1 }}>ไม่ปักจุดเลย = มีพิกัดก็พอ ไม่จำกัดพื้นที่</div>
            </div>
            <Toggle on={!!pol.gps_required} disabled={readOnly} onClick={() => updMany({ gps_required: !pol.gps_required })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: 16, alignItems: 'start' }}>
          <div style={card}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>จุดลงเวลา <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>({locations.length})</span></h2>
              {!readOnly && <button onClick={() => setEditing({ idx: -1, loc: { name: `จุดที่ ${locations.length + 1}`, lat: 0, lng: 0, radius_m: 5 } })} style={{ ...btn, color: 'var(--accent-active)', borderColor: 'var(--accent)' }}>+ เพิ่มจุด</button>}
            </div>

            {locations.length === 0 ? (
              <div style={{ padding: '34px 20px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
                ยังไม่มีจุดลงเวลา<br />
                {!readOnly && <button onClick={() => setEditing({ idx: -1, loc: { name: 'จุดที่ 1', lat: 0, lng: 0, radius_m: 5 } })} style={{ ...btn, color: 'var(--accent-active)', borderColor: 'var(--accent)', marginTop: 12 }}>+ เพิ่มจุดแรก</button>}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
                <tbody>
                  {locations.map((l, i) => {
                    const la = Number(l.lat ?? 0), ln = Number(l.lng ?? 0)
                    const placed = la !== 0 || ln !== 0
                    return (
                      <tr key={i} className="row-hover" style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '13px 20px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 12, width: 40 }}>{i + 1}</td>
                        <td style={{ padding: '13px 12px', fontWeight: 500 }}>
                          {l.name || `จุดที่ ${i + 1}`}
                          {!placed && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--warn)', fontWeight: 500 }}>ยังไม่ปักหมุด</span>}
                        </td>
                        <td style={{ padding: '13px 12px', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-dim)' }}>
                          {placed ? `${la.toFixed(5)}, ${ln.toFixed(5)}` : '—'}
                        </td>
                        <td style={{ padding: '13px 12px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>รัศมี {l.radius_m} ม.</td>
                        <td style={{ padding: '13px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button onClick={() => setEditing({ idx: i, loc: l })} style={{ ...btn, padding: '5px 12px' }}>{readOnly ? 'ดู' : 'แก้ไข'}</button>
                          {!readOnly && <button onClick={() => remove(i)} style={{ ...btn, padding: '5px 12px', color: 'var(--danger)', marginLeft: 8 }}>ลบ</button>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>

          {/* แผนที่รวมทุกจุดของโรง */}
          <div style={card}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 500, fontSize: 15 }}>แผนที่จุดลงเวลา</div>
            <div style={{ padding: 14 }}>
              {placedLocs.length > 0
                ? <ScanMap fences={placedLocs} points={[]} height={380} />
                : <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>ยังไม่มีจุดที่ปักหมุดแล้ว</div>}
            </div>
          </div>
          </div>
        </>
      )}

      {editing && (
        <LocationModal initial={editing.loc} disabled={readOnly} onSave={upsert} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
