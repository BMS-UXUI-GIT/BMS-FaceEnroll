import { useState } from 'react'
import { nf, useFetch } from '../hooks'
import { PAGE_SIZE, usePaged } from '../components/Pager'
import { DataTable, type Column } from '../components/data-display/DataTable'
import { StatCard } from '../components/data-display/StatCard'
import { Pagination } from '../components/data-display/Pagination'
import { SectionPanel } from '../components/layout/SectionPanel'
import { HeroArt } from '../components/HeroArt'
import { Skel, SkelRows } from '../components/Skeleton'
import { Button } from '../components/inputs/Button'
import { Icon } from '../icons'
import { TEXT } from '../typography'

// สถานะระบบ — ตรวจบริการหลัก + ทดสอบเชื่อมต่อระบบของแต่ละโรง
// โครงหน้าเดียวกับหน้าอื่น: การ์ดหัวเรื่องไล่สี + ภาพประกอบ แล้วตามด้วย SectionPanel

type HospCheck = { hcode: string; name: string; ok: boolean; latency_ms: number; error: string }
type Health = {
  face: { status?: string; version?: string; engine?: Record<string, any>; db?: Record<string, any>; error?: string }
  attendance: { dry_run_global: boolean; facescan_configured: boolean }
  dashboard_db: string
  hospitals: HospCheck[]
}

/** ป้ายสถานะ เขียว/แดง — ใช้ทั้งการ์ดบริการและตารางรายโรง */
function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', whiteSpace: 'nowrap',
      padding: '3px 10px', borderRadius: 'var(--r-full)', ...TEXT.sm, fontWeight: 500,
      background: ok ? 'var(--ok-light)' : 'var(--danger-light)', color: ok ? 'var(--ok)' : 'var(--danger)',
    }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 'var(--r-full)', background: 'currentColor', flex: 'none' }} />
      {label}
    </span>
  )
}

/** การ์ดบริการ 1 ตัว: ชื่อ + สถานะ + รายการค่าที่ตรวจได้ */
function ServiceCard({ icon, title, ok, status, rows }: {
  icon: string; title: string; ok: boolean; status: string; rows: [string, any][]
}) {
  return (
    <div className="rounded-xl" style={{ background: 'var(--surface-alt)', padding: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)', flexWrap: 'wrap' }}>
        <span aria-hidden style={{
          width: 36, height: 36, flex: 'none', borderRadius: 'var(--r-md)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: ok ? 'var(--ok-light)' : 'var(--danger-light)', color: ok ? 'var(--ok)' : 'var(--danger)',
        }}>
          <Icon name={icon} size={20} width={1.8} />
        </span>
        <span style={{ ...TEXT.bodyMed, color: 'var(--text)', flex: 1, minWidth: 120 }}>{title}</span>
        <StatusPill ok={ok} label={status} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {rows.map(([k, v], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', ...TEXT.sm }}>
            <span style={{ color: 'var(--text-dim)', flex: 'none' }}>{k}</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** การ์ดบริการหลัก 3 ใบ — ใช้ทั้งหน้าสถานะระบบและสรุปบนหน้าหลักของ super */
export function ServiceGrid({ d }: { d?: Health | null }) {
  const f = d?.face || {}
  const eng = f.engine || {}
  const fdb = f.db || {}
  const engOk = eng.ok === true
  const dbOk = fdb.ok === true
  const faceStatus = f.status

  if (!d) {
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(270px,100%), 1fr))' }}>
        {Array.from({ length: 3 }, (_, i) => <Skel key={i} h={168} r="var(--r-lg)" />)}
      </div>
    )
  }
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(270px,100%), 1fr))' }}>
      <ServiceCard icon="face" title="ตัวประมวลผลใบหน้า (Luxand)" ok={engOk} status={engOk ? 'ปกติ' : 'ต่อไม่ได้'}
        rows={[['ที่อยู่', eng.url || '—'], ...(eng.error ? [['ข้อผิดพลาด', eng.error]] as [string, any][] : [])]} />
      <ServiceCard icon="scan" title="บริการสแกนหน้า" ok={faceStatus === 'ok'}
        status={faceStatus === 'ok' ? 'ปกติ' : faceStatus === 'degraded' ? 'ทำงานได้บางส่วน' : f.error || '—'}
        rows={[['เวอร์ชัน', f.version || '—'], ['ฐานข้อมูลใบหน้า', dbOk ? 'ปกติ' : 'มีปัญหา']]} />
      <ServiceCard icon="clock" title="ระบบลงเวลา" ok={d.attendance.facescan_configured && d.dashboard_db === 'ok'}
        status={d.dashboard_db === 'ok' ? 'ปกติ' : 'ฐานข้อมูลมีปัญหา'}
        rows={[
          ['ฐานข้อมูลระบบลงเวลา', d.dashboard_db === 'ok' ? 'ปกติ' : 'ล่ม'],
          ['เชื่อมระบบสแกนหน้า', d.attendance.facescan_configured ? 'เชื่อมแล้ว' : 'ยังไม่ตั้งค่า'],
          ['โหมดทดสอบ (ไม่บันทึกจริง)', d.attendance.dry_run_global ? 'เปิด' : 'ปิด'],
        ]} />
    </div>
  )
}

/** โหลดผลตรวจสถานะระบบ — ใช้ทั้งหน้าสถานะระบบและหน้าหลักของ super (เรียกครั้งเดียวต่อหน้า) */
export function useHealth(reload = 0, enabled = true) {
  // enabled=false (บัญชีไม่ใช่ส่วนกลาง) -> ไม่ยิง endpoint เลย
  return useFetch<Health>(enabled ? '/admin/health' : null, reload)
}

/** การ์ดสรุปการเชื่อมต่อรายโรงพยาบาล — ชุดเดียวกับหัวเรื่องหน้าสถานะระบบ
    total = โชว์ใบ "โรงพยาบาลทั้งหมด" ด้วย (หน้าหลักมีใบนี้จาก PlatformStats อยู่แล้ว จึงปิดไว้) */
export function HealthStats({ d, loading, total = true }: { d?: Health | null; loading?: boolean; total?: boolean }) {
  const hospitals = d?.hospitals ?? []
  const downCount = hospitals.filter((h) => !h.ok).length
  const cards = [
    ...(total ? [{ label: 'โรงพยาบาลทั้งหมด', v: d ? hospitals.length : undefined, tone: 'accent' as const, icon: 'hospital' }] : []),
    { label: 'เชื่อมต่อได้', v: d ? hospitals.length - downCount : undefined, tone: 'ok' as const, icon: 'health' },
    { label: 'ต่อไม่ได้', v: d ? downCount : undefined, tone: 'danger' as const, icon: 'alert' },
  ]
  return (
    <>
      {cards.map((k) => (
        <StatCard key={k.label} tone={k.tone} label={k.label} unit="แห่ง"
          icon={<Icon name={k.icon} size={24} color="currentColor" />}
          value={k.v != null ? nf(k.v) : loading ? '…' : '—'} />
      ))}
    </>
  )
}

/** สรุปสถานะระบบบนหน้าหลัก (แท็บภาพรวมระบบของ super) — เรื่องที่ super อยากเห็นก่อนใคร
    รายละเอียดเต็ม (การเชื่อมต่อรายโรงพยาบาล) อยู่ที่เมนู "สถานะระบบ"
    ข้อมูลรับมาจากหน้าแม่ เพราะการ์ดสรุปในหัวเรื่องใช้ชุดเดียวกัน */
export function HealthSummary({ d, err, loading, onReload, onOpen }: {
  d?: Health | null
  err?: string | null
  loading?: boolean
  onReload: () => void
  onOpen: () => void
}) {
  const hospitals = d?.hospitals ?? []
  const downCount = hospitals.filter((h) => !h.ok).length

  return (
    <SectionPanel
      title="สถานะระบบ"
      meta={d ? (downCount > 0 ? `เชื่อมต่อไม่ได้ ${nf(downCount)} แห่ง` : `เชื่อมต่อได้ทุกแห่ง (${nf(hospitals.length)})`) : undefined}
      actions={
        <>
          <Button variant="ghost" size="sm" pill onClick={onReload}
            icon={<Icon name="recon" size={16} style={loading ? { animation: 'spin .7s linear infinite' } : undefined} />}>
            ตรวจใหม่
          </Button>
          <Button variant="ghost" size="sm" pill onClick={onOpen}
            iconRight={<Icon name="chevron-down" size={16} width={2} style={{ transform: 'rotate(-90deg)' }} />}>
            ดูรายโรงพยาบาล
          </Button>
        </>
      }>
      {err
        ? <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">ตรวจสถานะระบบไม่สำเร็จ: {err}</div>
        : <ServiceGrid d={d} />}
    </SectionPanel>
  )
}

export function Health() {
  const [reload, setReload] = useState(0)
  const { data: d, err, loading } = useHealth(reload)

  const hospitals = d?.hospitals ?? []
  const paged = usePaged(hospitals)

  const cols: Column<HospCheck>[] = [
    { key: 'no', header: 'ลำดับ', align: 'right', width: 64, tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-faint)' }, cell: (_h, i) => nf(paged.offset + i + 1) },
    { key: 'hcode', header: 'รหัสโรงพยาบาล', width: 110, tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-dim)' }, cell: (h) => h.hcode },
    { key: 'name', header: 'ชื่อโรงพยาบาล', tdStyle: { fontWeight: 500 }, cell: (h) => h.name || '—' },
    { key: 'status', header: 'สถานะ', width: 150, cell: (h) => <StatusPill ok={h.ok} label={h.ok ? 'เชื่อมต่อได้' : 'ต่อไม่ได้'} /> },
    {
      key: 'latency', header: 'ความเร็วตอบ', width: 140,
      tdStyle: (h) => ({ fontFamily: 'var(--mono)', color: h.latency_ms > 3000 ? 'var(--warn)' : 'var(--text-dim)', whiteSpace: 'nowrap' }),
      cell: (h) => `${nf(h.latency_ms)} ms`,
    },
    { key: 'error', header: 'ปัญหา', tdStyle: { color: 'var(--danger)' }, cell: (h) => h.error || '—' },
  ]

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      {/* ---------- การ์ดหัวเรื่อง ---------- */}
      <div className="relative overflow-hidden rounded-xl p-6" style={{ background: 'linear-gradient(to top, var(--surface-blue), var(--bg) 65%)' }}>
        <HeroArt icon="health" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-h2 m-0 text-text">สถานะระบบ</h1>
            <p className="text-body mt-2 mb-0 text-[color-mix(in_srgb,var(--text-faint)_50%,transparent)]">
              ตรวจบริการหลักของระบบ และทดสอบเชื่อมต่อระบบของแต่ละโรงพยาบาลพร้อมกัน
            </p>
          </div>
          <Button className="btn-refresh" variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
            icon={<Icon name="recon" size={20} style={loading ? { animation: 'spin .7s linear infinite' } : undefined} />}>
            ตรวจใหม่อีกครั้ง
          </Button>
        </div>

        {/* สรุปการเชื่อมต่อรายโรง */}
        <div className="relative mt-4 flex gap-2 flex-wrap">
          <HealthStats d={d} loading={loading} />
        </div>
      </div>

      {err && <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">ผิดพลาด: {err}</div>}

      {/* ---------- บริการหลัก ---------- */}
      <SectionPanel title="บริการหลัก" meta={!d && !err ? 'กำลังตรวจทุกระบบ…' : undefined}>
        <ServiceGrid d={d} />
      </SectionPanel>

      {/* ---------- การเชื่อมต่อรายโรง ---------- */}
      <div className="flex gap-2 items-baseline flex-wrap">
        <span style={{ ...TEXT.h3, color: 'var(--text)' }}>การเชื่อมต่อรายโรงพยาบาล</span>
        <span style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>แต่ละโรงพยาบาลอยู่คนละเซิร์ฟเวอร์ — ทดสอบดึงข้อมูลจริงทีละแห่ง</span>
      </div>

      {/* ตารางกรอบบาง ไม่ห่อการ์ด (ทรงเดียวกับหน้ารายบุคคล) */}
      <div className="bg-bg border border-control-border rounded-lg">
        {!d ? (
          <div style={{ padding: 'var(--sp-4)' }}><SkelRows rows={6} avatar={false} /></div>
        ) : (
          <>
            <DataTable columns={cols} rows={paged.pageRows} rowKey={(h) => h.hcode} minWidth={900}
              empty="ยังไม่มีโรงพยาบาลเปิดใช้งาน"
              emptyStyle={{ ...TEXT.body, padding: '28px 20px', color: 'var(--text-dim)', textAlign: 'center' }} />
            <Pagination page={paged.page} pageSize={PAGE_SIZE} total={paged.total} shown={paged.pageRows.length} onPage={paged.setPage} />
          </>
        )}
      </div>
    </div>
  )
}
