import { useEffect, useMemo, useState } from 'react'
import { DataTable, type Column } from '../components/data-display/DataTable'
import { Pagination } from '../components/data-display/Pagination'
import { api } from '../api'
import { dialog, toast } from '../components/dialog'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { Info } from '../components/Info'
import { PAGE_SIZE, usePaged } from '../components/Pager'
import { HeroArt } from '../components/HeroArt'
import { SkelRows } from '../components/Skeleton'
import { StatCard } from '../components/data-display/StatCard'
import { Button } from '../components/inputs/Button'
import { SearchInput } from '../components/inputs/SearchInput'
import { FilterBar } from '../components/inputs/FilterBar'
import { FilterChip } from '../components/inputs/FilterChip'
import { SearchSelect } from '../components/SearchSelect'
import { nf, thDate } from '../hooks'
import { HospitalDetail } from './HospitalDetail'
import { HEALTH_TH, notifyBadges, Pill, type Tenant } from './tenantsCommon'

// จัดการโรงพยาบาล — โรงที่เปิดใช้งานแล้ว + ฟิลเตอร์ + วันหมดอายุ + สถานะเชื่อมต่อระบบโรง
// (flag โหมดทดสอบ/ตรวจตัวตน/ตรวจสิทธิ์ ย้ายไปอยู่ใน popup รายละเอียดโรง)

const STATUS_FILTERS = [
  ['all', 'ทุกสถานะ'], ['real', 'ใช้งานจริง'], ['demo', 'ทดลองใช้'],
  ['demo_expired', 'หมดอายุทดลอง'], ['paused', 'พักใช้'],
] as const

type HospHealth = { ok: boolean; latency_ms: number; error: string }

export function SystemHospitals() {
  const [tenants, setTenants] = useState<Tenant[] | null>(null)
  const [health, setHealth] = useState<Record<string, HospHealth> | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [statusF, setStatusF] = useState<string>('all')
  const [detail, setDetail] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let alive = true
    setTenants(null); setErr(null)
    api.get<{ tenants: Tenant[] }>('/admin/tenants')
      .then((d) => alive && setTenants(d.tenants))
      .catch((e) => alive && setErr(e?.message || 'โหลดไม่สำเร็จ'))
    return () => { alive = false }
  }, [reload])

  // สถานะ pharm ต่อโรง — เช็คสดทีหลัง ไม่บล็อกตาราง (ล้มก็แค่โชว์ —)
  useEffect(() => {
    let alive = true
    api.get<{ hospitals: (HospHealth & { hcode: string })[] }>('/admin/health')
      .then((d) => alive && setHealth(Object.fromEntries((d.hospitals ?? []).map((h) => [h.hcode, h]))))
      .catch(() => alive && setHealth({}))
    return () => { alive = false }
  }, [reload])

  const act = async (key: string, path: string, body: unknown, confirmMsg?: string) => {
    if (busy) return
    if (confirmMsg && !(await dialog.confirm({ body: confirmMsg }))) return
    setBusy(key); setErr(null)
    try {
      const r = await api.post<{ tenants: Tenant[] }>(path, body)
      setTenants(r.tenants); notifyBadges(); toast.success('บันทึกแล้ว')
    } catch (e: any) { setErr(e?.message || 'ทำรายการไม่สำเร็จ') } finally { setBusy(null) }
  }

  const rows = useMemo(() => {
    let list = (tenants ?? []).filter((t) => t.status !== 'pending')
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      list = list.filter((t) => t.hcode.includes(s) || (t.name || '').toLowerCase().includes(s)
        || (t.province || '').toLowerCase().includes(s) || (t.contact_name || '').toLowerCase().includes(s))
    }
    if (statusF === 'real') list = list.filter((t) => t.request_type === 'real' && t.active)
    if (statusF === 'demo') list = list.filter((t) => t.request_type === 'demo' && !t.demo_expired && t.active)
    if (statusF === 'demo_expired') list = list.filter((t) => t.demo_expired)
    if (statusF === 'paused') list = list.filter((t) => !t.active)
    return list
  }, [tenants, q, statusF])
  const paged = usePaged(rows)

  // การ์ดสรุปในหัวเรื่อง (นับจากโรงที่เปิดใช้งานแล้วทั้งหมด ไม่ใช่เฉพาะที่กรองอยู่)
  const all = (tenants ?? []).filter((t) => t.status !== 'pending')
  const HERO = [
    { label: 'โรงพยาบาลทั้งหมด', v: tenants ? all.length : undefined, tone: 'accent' as const, icon: 'hospital' },
    { label: 'ใช้งานจริง', v: tenants ? all.filter((t) => t.request_type === 'real' && t.active).length : undefined, tone: 'ok' as const, icon: 'rosette-check' },
    { label: 'ทดลองใช้', v: tenants ? all.filter((t) => t.request_type === 'demo' && !t.demo_expired && t.active).length : undefined, tone: 'info' as const, icon: 'flask' },
    { label: 'พักใช้ / หมดอายุ', v: tenants ? all.filter((t) => !t.active || t.demo_expired).length : undefined, tone: 'danger' as const, icon: 'player-pause' },
  ]

  const hs = (hcode: string) => {
    if (health === null) return <span style={{ ...TEXT.sm, color: 'var(--text-faint)' }}>กำลังเช็ค…</span>
    const h = health[hcode]
    if (!h) return <span style={{ ...TEXT.sm, color: 'var(--text-faint)' }}>—</span>
    return (
      <span title={h.ok ? `ตอบใน ${nf(h.latency_ms)} ms` : h.error} style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', whiteSpace: 'nowrap',
        padding: '3px 10px', borderRadius: 'var(--r-full)', ...TEXT.sm, fontWeight: 500,
        background: h.ok ? 'var(--ok-light)' : 'var(--danger-light)', color: h.ok ? 'var(--ok)' : 'var(--danger)',
      }}>
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: 'var(--r-full)', flex: 'none', background: 'currentColor' }} />
        {h.ok ? `ปกติ · ${nf(h.latency_ms)} ms` : 'ต่อไม่ได้'}
      </span>
    )
  }

  const cols: Column<Tenant>[] = [
    {
      key: 'no', header: 'ลำดับ', align: 'right', width: 64,
      tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-faint)' },
      cell: (_t, i) => nf(paged.offset + i + 1),
    },
    {
      key: 'code', header: 'รหัส', width: 100,
      tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-dim)' },
      cell: (t) => t.hcode,
    },
    {
      key: 'name', header: 'ชื่อโรงพยาบาล',
      cell: (t) => (
        <span style={{ ...TEXT.bodyMed, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={`การติดตามลูกค้า: ${HEALTH_TH[t.health ?? 'ok'].label}`}>{t.name || '—'}</span>
      ),
    },
    {
      key: 'province', header: 'จังหวัด',
      tdStyle: { color: 'var(--text-dim)' },
      cell: (t) => t.province || '—',
    },
    {
      key: 'type',
      header: <>ประเภท<Info text="ทดลองใช้ = มีวันหมดอายุ (ต่อได้ทีละ 60 วัน) · ใช้งานจริง = ถาวรหรือถึงวันที่กำหนด — โชว์วันหมด + เหลือกี่วัน" /></>,
      // เหลือแค่ป้ายประเภท — วันหมด/เหลือกี่วันดูได้ในหน้ารายละเอียดโรง (tooltip บอกไว้)
      cell: (t) => (
        t.request_type === 'demo' ? (
          <span title={`ถึง ${thDate(t.demo_expires_at)}`} style={{ ...TEXT.sm, fontWeight: 500, padding: '3px 10px', borderRadius: 'var(--r-full)', whiteSpace: 'nowrap', color: t.demo_expired ? 'var(--danger)' : 'var(--info)', background: t.demo_expired ? 'var(--danger-light)' : 'var(--info-light)' }}>
            {t.demo_expired ? 'หมดอายุทดลอง' : 'ทดลองใช้'}
          </span>
        ) : (
          <span title={t.prod_expires_at ? `ถึง ${thDate(t.prod_expires_at)}` : 'ถาวร'} style={{ ...TEXT.sm, fontWeight: 500, padding: '3px 10px', borderRadius: 'var(--r-full)', whiteSpace: 'nowrap', color: 'var(--accent-active)', background: 'var(--accent-light)' }}>
            ใช้งานจริง
          </span>
        )
      ),
    },
    {
      key: 'health',
      header: <>ระบบโรงพยาบาล<Info text="เช็คการเชื่อมต่อระบบของโรงพยาบาล (HOSxP ผ่าน pharm) แบบสดตอนเปิดหน้านี้ — ต่อไม่ได้ = แอปของโรงพยาบาลนั้นลงเวลาไม่เข้า" /></>,
      cell: (t) => hs(t.hcode),
    },
    {
      key: 'status', align: 'right',
      header: <>สถานะ<Info text="ใช้งาน / พักใช้ (ปิดชั่วคราว ข้อมูลไม่หาย) — กดปุ่มเพื่อสลับ" /></>,
      width: 120,
      cell: (t) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Pill label={busy === `ac:${t.hcode}` ? '…' : t.active ? 'ใช้งาน' : 'พัก'}
            tone={t.active ? 'ok' : 'off'} disabled={!!busy}
            onClick={() => act(`ac:${t.hcode}`, `/admin/tenants/${t.hcode}/active`, { active: !t.active })} />
        </span>
      ),
    },
  ]

  // เปิดรายละเอียดโรง = เปลี่ยนเป็นอีกหน้า (ไม่ใช่ popup) เหมือนหน้ารายละเอียดพนักงาน
  if (detail) {
    return <HospitalDetail hcode={detail} onClose={() => setDetail(null)}
      onChanged={() => api.get<{ tenants: Tenant[] }>('/admin/tenants').then((d) => setTenants(d.tenants)).catch((e) => setErr(e?.message || 'โหลดไม่สำเร็จ'))} />
  }

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      {/* ---------- การ์ดหัวเรื่อง ---------- */}
      <div className="relative overflow-hidden rounded-xl p-6" style={{ background: 'linear-gradient(to top, var(--surface-blue), var(--bg) 65%)' }}>
        <HeroArt icon="hospital" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-h2 m-0 text-text">จัดการโรงพยาบาล</h1>
            <p className="text-body mt-2 mb-0 text-[color-mix(in_srgb,var(--text-faint)_50%,transparent)]">
              โรงที่เปิดใช้งานแล้ว · คลิกชื่อโรงเพื่อดูรายละเอียด ผู้ติดต่อ ผู้ใช้ และตั้งค่าความปลอดภัยรายโรง
            </p>
          </div>
          <Button className="btn-refresh" variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
            icon={<Icon name="recon" size={20} style={!tenants && !err ? { animation: 'spin .7s linear infinite' } : undefined} />}>
            รีเฟรชข้อมูลล่าสุด
          </Button>
        </div>

        <div className="relative mt-4 flex gap-2 flex-wrap stat-grid">
          {HERO.map((k) => (
            <StatCard key={k.label} tone={k.tone} label={k.label} unit="แห่ง"
              icon={<Icon name={k.icon} size={24} color="currentColor" />}
              value={k.v != null ? nf(k.v) : '…'} />
          ))}
        </div>
      </div>

      {err && <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">ผิดพลาด: {err}</div>}

      {/* ---------- แถวตัวกรอง ---------- */}
      <FilterBar activeCount={(statusF !== 'all' ? 1 : 0)}
        search={<SearchInput grow value={q} onChange={setQ} placeholder="ค้นหา รหัส / ชื่อโรงพยาบาล / จังหวัด / ผู้ติดต่อ" />}>
        <FilterChip icon={<Icon name="rosette-check" size={24} width={1.8} />} label="สถานะ">
          <SearchSelect bare hideCaret value={statusF} onChange={setStatusF} maxTriggerWidth={130}
            options={STATUS_FILTERS.map(([v, l]) => ({ value: v, label: l }))} />
        </FilterChip>
        {(q || statusF !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setQ(''); setStatusF('all') }}>ล้างตัวกรอง</Button>
        )}
      </FilterBar>

      {/* ---------- ตาราง (ทรงเดียวกับหน้ารายบุคคล — ตารางในกรอบบาง ไม่ห่อการ์ด) ---------- */}
      <div className="bg-bg border border-control-border rounded-lg">
        {!tenants ? <div style={{ padding: 'var(--sp-4)' }}><SkelRows rows={8} avatar={false} /></div> : (
          <>
            <DataTable columns={cols} rows={paged.pageRows} rowKey={(t) => t.hcode} minWidth={1040}
              onRowClick={(t) => setDetail(t.hcode)}
              empty={q || statusF !== 'all'
                ? 'ไม่พบโรงพยาบาลที่ตรงเงื่อนไข'
                : 'ยังไม่มีโรงพยาบาลเปิดใช้งาน — โรงพยาบาลยื่นคำขอผ่านฟอร์ม แล้วอนุมัติที่เมนู "อนุมัติโรงพยาบาล"'}
              emptyStyle={{ ...TEXT.body, padding: '28px 20px', color: 'var(--text-dim)', textAlign: 'center' }} />
            <Pagination page={paged.page} pageSize={PAGE_SIZE} total={paged.total} shown={paged.pageRows.length} onPage={paged.setPage} />
          </>
        )}
      </div>

    </div>
  )
}
