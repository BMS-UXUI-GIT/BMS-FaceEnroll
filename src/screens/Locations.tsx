import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { dialog } from '../components/dialog'
import { LocationModal, type GeoLoc } from '../components/LocationModal'
import { ScanMap } from '../components/ScanMap'
import { HospitalArt, PickHospital } from '../components/PickHospital'
import { Info } from '../components/Info'
import { SectionPanel } from '../components/layout/SectionPanel'
import { SearchSelect } from '../components/SearchSelect'
import { Skel } from '../components/Skeleton'
import { Button } from '../components/inputs/Button'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'

// จุดลงเวลา — รายการพื้นที่ที่อนุญาตให้ลงเวลา (โรงใหญ่ปักได้หลายจุด: OPD/ตึกผู้ป่วย/ห้องยา)
// เข้ามาเห็นเป็น "รายการจุด" ก่อน กดเพิ่ม/แก้ = เปิด popup แผนที่
//
// โครงหน้าเดียวกับหน้าอื่น: การ์ดหัวเรื่องไล่สี + ภาพประกอบ แล้วตามด้วย SectionPanel
// เพิ่ม/แก้/ลบจุด = บันทึกทันที (เป็นการกระทำที่ผู้ใช้ยืนยันเองอยู่แล้ว ไม่ต้องมีปุ่มบันทึกซ้ำ)

type Pol = Record<string, any>

/** สวิตช์เปิด/ปิด — ชุดเดียวกับหน้าตั้งค่าแอปสแกน */
function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} disabled={disabled} style={{
      width: 44, height: 24, borderRadius: 'var(--r-full)', border: 'none', flex: 'none', position: 'relative',
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
      background: on ? 'var(--ok)' : 'var(--surface-gray)', transition: 'background .15s',
    }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: 'var(--r-full)',
        background: 'var(--bg)', boxShadow: 'var(--shadow)', transition: 'left .15s',
      }} />
    </button>
  )
}

/** หัวแผงพร้อมไอคอนในกล่องสี (ชุดเดียวกับหน้าตั้งค่าแอปสแกน) */
function PanelTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
      <span aria-hidden style={{
        width: 36, height: 36, flex: 'none', borderRadius: 'var(--r-md)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--accent-light)', color: 'var(--accent-active)',
      }}>
        <Icon name={icon} size={20} width={1.8} />
      </span>
      {title}
    </span>
  )
}

export function Locations() {
  const { currentHcode, session, setHcode, isSuper } = useApp()
  const readOnly = session?.role === 'user'
  const [pol, setPol] = useState<Pol | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const seqRef = useRef(0)
  const [editing, setEditing] = useState<{ idx: number; loc: GeoLoc } | null>(null)

  // เลือกโรงได้จากในหน้าเลย (เหมือนหน้าตั้งค่าแอปสแกน) — เฉพาะบัญชีที่ดูแลหลายโรง
  const hospOpts = (session?.hospitals ?? []).map((h) => ({ value: h.value, label: h.label, sub: h.value }))
  const canSwitch = isSuper || hospOpts.length > 1

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
  const addPoint = () => setEditing({ idx: -1, loc: { name: `จุดที่ ${locations.length + 1}`, lat: 0, lng: 0, radius_m: 5 } })

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      {/* ---------- การ์ดหัวเรื่อง ---------- */}
      <div className="relative overflow-hidden rounded-xl p-6" style={{ background: 'linear-gradient(to top, var(--surface-blue), var(--bg) 65%)' }}>
        {/* ภาพประกอบชุดเดียวกับหน้าเลือกโรงพยาบาล (ตึก + blob + หมุด) */}
        <span aria-hidden className="hide-sm hero-rise" style={{ position: 'absolute', right: 24, bottom: -150, lineHeight: 0 }}>
          <HospitalArt width={300} />
        </span>

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-h2 m-0 text-text">จุดลงเวลา</h1>
            <p className="text-body mt-2 mb-0 text-[color-mix(in_srgb,var(--text-faint)_50%,transparent)]">
              โรงพยาบาล {currentHcode} · พนักงานลงเวลาได้เฉพาะในรัศมีของจุดที่กำหนด
            </p>
            {canSwitch && (
              <div className="mt-3">
                {/* ทรงเดียวกับปุ่มหลัก — ตัวเลือกเด่นของหน้านี้ */}
                <SearchSelect hideCaret value={currentHcode} onChange={setHcode} options={hospOpts}
                  searchPlaceholder="ค้นชื่อ/รหัสโรงพยาบาล…"
                  triggerStyle={{
                    display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
                    minHeight: 48, padding: 'var(--sp-2) var(--sp-4)', borderRadius: 'var(--r-full)',
                    background: 'var(--accent-active)', color: 'var(--bg)', ...TEXT.bodyMed,
                  }}
                  renderTrigger={(sel) => (
                    <>
                      <Icon name="hospital" size={20} width={1.8} />
                      <span style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sel?.label ?? 'เลือกโรงพยาบาล'}
                      </span>
                      <Icon name="chevron-down" size={16} width={2} style={{ flex: 'none' }} />
                    </>
                  )} />
              </div>
            )}
          </div>
          {readOnly && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
              padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-full)',
              background: 'var(--warn-light)', color: 'var(--warn)', ...TEXT.sm, fontWeight: 500,
            }}>
              <Icon name="eye" size={16} width={1.8} />ดูอย่างเดียว
            </span>
          )}
        </div>
      </div>

      {err && <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">ผิดพลาด: {err}</div>}

      {/* ---------- สวิตช์บังคับ GPS ---------- */}
      <SectionPanel title={<PanelTitle icon="map-pin" title="พื้นที่ลงเวลา" />}>
        {!pol ? <Skel h={60} r="var(--r-lg)" /> : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap',
            padding: 'var(--sp-3) var(--sp-4)', minHeight: 60,
            background: 'var(--surface-alt)', borderRadius: 'var(--r-lg)',
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ ...TEXT.bodyMed, color: 'var(--text)' }}>
                บังคับ GPS ตอนลงเวลา
                <Info text="เปิด = พนักงานต้องเปิด GPS และอยู่ในรัศมีของจุดใดจุดหนึ่งจึงลงเวลาได้ · ปิด = ไม่ตรวจพื้นที่" />
              </div>
              <div style={{ ...TEXT.sm, color: 'var(--text-dim)', marginTop: 2 }}>ไม่ปักจุดเลย = มีพิกัดก็พอ ไม่จำกัดพื้นที่</div>
            </div>
            <Toggle on={!!pol.gps_required} disabled={readOnly} onClick={() => updMany({ gps_required: !pol.gps_required })} />
          </div>
        )}
      </SectionPanel>

      {/* ---------- รายการจุด + แผนที่ ---------- */}
      <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px,100%), 1fr))' }}>
        <SectionPanel title={<PanelTitle icon="map-pin" title="รายการจุดลงเวลา" />}
          meta={pol ? `${locations.length} จุด` : undefined}
          actions={!readOnly && pol
            ? <Button variant="primary" size="md" pill onClick={addPoint} icon={<Icon name="map-pin" size={18} width={1.8} />}>เพิ่มจุด</Button>
            : undefined}>
          {!pol ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {Array.from({ length: 3 }, (_, i) => <Skel key={i} h={72} r="var(--r-lg)" />)}
            </div>
          ) : locations.length === 0 ? (
            <div style={{ ...TEXT.body, padding: '40px 20px', color: 'var(--text-dim)', textAlign: 'center' }}>
              ยังไม่มีจุดลงเวลา
              {!readOnly && (
                <div className="mt-4 flex justify-center">
                  <Button variant="primary" size="md" pill onClick={addPoint} icon={<Icon name="map-pin" size={18} width={1.8} />}>เพิ่มจุดแรก</Button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {locations.map((l, i) => {
                const la = Number(l.lat ?? 0), ln = Number(l.lng ?? 0)
                const placed = la !== 0 || ln !== 0
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap',
                    padding: 'var(--sp-3) var(--sp-4)', minHeight: 72,
                    background: 'var(--surface-alt)', borderRadius: 'var(--r-lg)',
                  }}>
                    <span aria-hidden style={{
                      width: 36, height: 36, flex: 'none', borderRadius: 'var(--r-md)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: placed ? 'var(--accent-light)' : 'var(--warn-light)',
                      color: placed ? 'var(--accent-active)' : 'var(--warn)',
                    }}>
                      <Icon name="map-pin" size={20} width={1.8} />
                    </span>

                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ ...TEXT.bodyMed, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                        {l.name || `จุดที่ ${i + 1}`}
                        {!placed && (
                          <span style={{
                            ...TEXT.caption, fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--r-full)',
                            background: 'var(--warn-light)', color: 'var(--warn)',
                          }}>ยังไม่ปักหมุด</span>
                        )}
                      </div>
                      <div style={{ ...TEXT.sm, fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginTop: 2 }}>
                        {placed ? `${la.toFixed(5)}, ${ln.toFixed(5)}` : '—'} · รัศมี {l.radius_m} ม.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--sp-2)', flex: 'none' }}>
                      <Button variant="secondary" size="sm" pill onClick={() => setEditing({ idx: i, loc: l })}>
                        {readOnly ? 'ดู' : 'แก้ไข'}
                      </Button>
                      {!readOnly && (
                        <Button variant="ghost-danger" size="sm" pill onClick={() => remove(i)}>ลบ</Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionPanel>

        {/* แผนที่รวมทุกจุดของโรง */}
        <SectionPanel title={<PanelTitle icon="map-question" title="แผนที่จุดลงเวลา" />}
          meta={pol ? `ปักหมุดแล้ว ${placedLocs.length} จุด` : undefined}>
          {!pol ? <Skel h={380} r="var(--r-lg)" />
            : placedLocs.length > 0 ? <ScanMap fences={placedLocs} points={[]} height={380} />
            : (
              <div style={{ ...TEXT.body, padding: '40px 20px', color: 'var(--text-dim)', textAlign: 'center' }}>
                ยังไม่มีจุดที่ปักหมุดแล้ว
              </div>
            )}
        </SectionPanel>
      </div>

      {editing && (
        <LocationModal initial={editing.loc} disabled={readOnly} onSave={upsert} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
