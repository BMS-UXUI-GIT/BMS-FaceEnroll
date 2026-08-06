import { useEffect, useState } from 'react'
import { api } from '../api'
import { nf } from '../hooks'
import { useApp } from '../state'
import { DataTable, type Column } from '../components/data-display/DataTable'
import { Pagination } from '../components/data-display/Pagination'
import { HeroArt } from '../components/HeroArt'
import { SkelRows } from '../components/Skeleton'
import { StatCard } from '../components/data-display/StatCard'
import { Button } from '../components/inputs/Button'
import { SearchInput } from '../components/inputs/SearchInput'
import { FilterChip } from '../components/inputs/FilterChip'
import { DateRangePicker } from '../components/inputs/DateRangePicker'
import { Icon } from '../icons'
import { TEXT } from '../typography'

// ประวัติการจัดการ — audit log + ฟิลเตอร์ (ผู้ทำ/ประเภท/ช่วงวัน)
// super ดูรวมทุกโรงหรือกรองตามโรงที่เลือกใน header · admin โรงถูก backend ล็อกให้เห็นเฉพาะโรงตัวเอง
// โครงหน้าเดียวกับหน้าอื่น: การ์ดหัวเรื่องไล่สี + ภาพประกอบ แล้วตามด้วย SectionPanel

type AuditRow = { ts: string; actor: string; role: string; action: string; target: string; detail: string; ip: string }

const chipInput: React.CSSProperties = {
  border: 'none', background: 'transparent', outline: 'none',
  fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, color: 'var(--text)', minWidth: 0,
}

export function SystemAudit() {
  const PAGE = 20
  const { currentHcode } = useApp()
  const [audit, setAudit] = useState<AuditRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [actor, setActor] = useState('')
  const [action, setAction] = useState('')
  const [q2, setQ2] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => { setPage(0) }, [actor, action, q2, from, to, currentHcode])
  useEffect(() => {
    let alive = true
    setLoading(true); setErr(null)
    const t = setTimeout(() => {
      const q = new URLSearchParams()
      if (actor.trim()) q.set('actor', actor.trim())
      if (action.trim()) q.set('action', action.trim())
      if (q2.trim()) q.set('q', q2.trim())
      if (from) q.set('date_from', from)
      if (to) q.set('date_to', to)
      if (currentHcode !== '*') q.set('hcode', currentHcode)
      q.set('limit', String(PAGE)); q.set('offset', String(page * PAGE))
      api.get<{ rows: AuditRow[]; total: number }>(`/admin/audit?${q}`)
        .then((d) => { if (alive) { setAudit(d.rows); setTotal(d.total) } })
        .catch((e) => alive && setErr(e?.message || 'โหลดไม่สำเร็จ'))
        .finally(() => alive && setLoading(false))
    }, 300)
    return () => { alive = false; clearTimeout(t) }
  }, [reload, actor, action, q2, from, to, page, currentHcode])

  const cols: Column<AuditRow>[] = [
    { key: 'no', header: 'ลำดับ', align: 'right', width: 64, tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-faint)' }, cell: (_r, i) => nf(page * PAGE + i + 1) },
    { key: 'ts', header: 'เวลา', width: 160, tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-dim)', whiteSpace: 'nowrap' }, cell: (r) => r.ts },
    {
      key: 'actor', header: 'ผู้ทำ', width: 190, cell: (r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: 0 }}>
          <span style={{ ...TEXT.bodyMed, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.actor}</span>
          <span style={{ ...TEXT.caption, color: 'var(--text-dim)', background: 'var(--surface-alt)', padding: '2px 8px', borderRadius: 'var(--r-full)', flex: 'none' }}>{r.role}</span>
        </span>
      ),
    },
    {
      key: 'action', header: 'การกระทำ', width: 200, cell: (r) => (
        <span style={{
          ...TEXT.sm, fontFamily: 'var(--mono)', fontWeight: 500, whiteSpace: 'nowrap',
          padding: '3px 10px', borderRadius: 'var(--r-full)',
          background: 'var(--accent-light)', color: 'var(--accent-active)',
        }}>{r.action}</span>
      ),
    },
    { key: 'target', header: 'เป้าหมาย', width: 140, tdStyle: { fontFamily: 'var(--mono)' }, cell: (r) => r.target },
    { key: 'detail', header: 'รายละเอียด', tdStyle: { color: 'var(--text-dim)' }, cell: (r) => r.detail },
    { key: 'ip', header: 'IP', width: 132, tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-faint)', whiteSpace: 'nowrap' }, cell: (r) => r.ip || '—' },
  ]

  const hasFilter = !!(actor || action || q2 || from || to)
  const clear = () => { setActor(''); setAction(''); setQ2(''); setFrom(''); setTo('') }

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      {/* ---------- การ์ดหัวเรื่อง ---------- */}
      <div className="relative overflow-hidden rounded-xl p-6" style={{ background: 'linear-gradient(to top, var(--surface-blue), var(--bg) 65%)' }}>
        <HeroArt icon="clock" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-h2 m-0 text-text">ประวัติการจัดการ</h1>
            <p className="text-body mt-2 mb-0 text-[color-mix(in_srgb,var(--text-faint)_50%,transparent)]">
              บันทึกทุกการกระทำของผู้ดูแล — ใครทำอะไร กับใคร เมื่อไร
              {currentHcode !== '*' ? ` · เฉพาะโรงพยาบาล ${currentHcode}` : ' · ทุกโรงพยาบาล'}
            </p>
          </div>
          <Button variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
            icon={<Icon name="recon" size={20} style={loading ? { animation: 'spin .7s linear infinite' } : undefined} />}>
            รีเฟรชข้อมูลล่าสุด
          </Button>
        </div>

        <div className="relative mt-4 flex gap-2 flex-wrap">
          <StatCard tone="accent" label="รายการทั้งหมด" unit="รายการ"
            icon={<Icon name="report" size={24} color="currentColor" />}
            value={audit ? nf(total) : '…'} />
          <StatCard tone="info" label="แสดงอยู่หน้านี้" unit="รายการ"
            icon={<Icon name="clock" size={24} color="currentColor" />}
            value={audit ? nf(audit.length) : '…'} />
        </div>
      </div>

      {err && <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">ผิดพลาด: {err}</div>}

      {/* ---------- แถวตัวกรอง ---------- */}
      <div className="flex gap-2 items-center flex-wrap">
        <SearchInput grow value={q2} onChange={setQ2} placeholder="ค้นหา เป้าหมาย / รายละเอียด" />
        <FilterChip icon={<Icon name="person" size={24} width={1.8} />} label="ผู้ทำ">
          <input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="ทั้งหมด" style={{ ...chipInput, width: 100 }} />
        </FilterChip>
        <FilterChip icon={<Icon name="progress-alert" size={24} width={1.8} />} label="การกระทำ">
          <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="ทั้งหมด" style={{ ...chipInput, width: 130 }} />
        </FilterChip>
        <FilterChip icon={<Icon name="calendar-week" size={24} width={1.8} />} label="ช่วงวันที่">
          <DateRangePicker bare from={from} to={to} onFrom={setFrom} onTo={setTo} />
        </FilterChip>
        {hasFilter && <Button variant="ghost" size="sm" onClick={clear}>ล้างตัวกรอง</Button>}
      </div>

      {/* ---------- ตาราง (กรอบบาง ไม่ห่อการ์ด — ทรงเดียวกับหน้ารายบุคคล) ---------- */}
      <div className="bg-bg border border-control-border rounded-lg">
        {!audit ? (
          <div style={{ padding: 'var(--sp-4)' }}><SkelRows rows={8} avatar={false} /></div>
        ) : (
          <>
            <DataTable columns={cols} rows={audit} rowKey={(_r, i) => String(i)} minWidth={1040}
              empty={hasFilter ? 'ไม่พบรายการตามเงื่อนไข' : 'ยังไม่มีประวัติการจัดการ'}
              emptyStyle={{ ...TEXT.body, padding: '28px 20px', color: 'var(--text-dim)', textAlign: 'center' }} />
            <Pagination page={page} pageSize={PAGE} total={total} shown={audit.length} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
