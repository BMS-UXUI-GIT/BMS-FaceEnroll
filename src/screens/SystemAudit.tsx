import { useEffect, useState } from 'react'
import { api } from '../api'
import { nf } from '../hooks'
import { Pager } from '../components/Pager'
import { Loading } from '../components/Spinner'
import { RefreshButton } from '../components/RefreshButton'
import { useApp } from '../state'
import { DataTable, type Column } from '../components/data-display/DataTable'
import { card, td, th, theadTr } from './tenantsCommon'

// ประวัติการจัดการ — audit log + ฟิลเตอร์ (ผู้ทำ/ประเภท/ช่วงวัน)
// super ดูรวมทุกโรงหรือกรองตามโรงที่เลือกใน header · admin โรงถูก backend ล็อกให้เห็นเฉพาะโรงตัวเอง

type AuditRow = { ts: string; actor: string; role: string; action: string; target: string; detail: string; ip: string }

const inputSt: React.CSSProperties = { padding: '7px 11px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface-card)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 12.5, outline: 'none' }

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
    { key: 'no', header: 'ลำดับ', align: 'right', width: 56, thStyle: { padding: '10px 20px' }, tdStyle: { padding: '11px 20px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 12 }, cell: (_r, i) => nf(page * PAGE + i + 1) },
    { key: 'ts', header: 'เวลา', tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 12 }, cell: (r) => r.ts },
    { key: 'actor', header: 'ผู้ทำ', cell: (r) => <>{r.actor} <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>({r.role})</span></> },
    { key: 'action', header: 'การกระทำ', tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-dim)' }, cell: (r) => r.action },
    { key: 'target', header: 'เป้าหมาย', tdStyle: { fontFamily: 'var(--mono)' }, cell: (r) => r.target },
    { key: 'detail', header: 'รายละเอียด', tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-dim)' }, cell: (r) => r.detail },
    { key: 'ip', header: 'IP', thStyle: { padding: '10px 20px' }, tdStyle: { padding: '11px 20px', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-faint)' }, cell: (r) => r.ip || '—' },
  ]

  return (
    <div style={{ maxWidth: 'var(--page-max)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {err && <div style={{ ...card, padding: '12px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {err}</div>}

      <div style={{ ...card }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 500, marginRight: 4 }}>ประวัติการจัดการ</h2>
          <input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="ผู้ทำ…" style={{ ...inputSt, width: 120 }} />
          <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="การกระทำ เช่น approve…" style={{ ...inputSt, width: 160 }} />
          <input value={q2} onChange={(e) => setQ2(e.target.value)} placeholder="ค้นเป้าหมาย/รายละเอียด…" style={{ ...inputSt, width: 160 }} />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputSt} title="ตั้งแต่วันที่" />
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>ถึง</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputSt} title="ถึงวันที่" />
          {(actor || action || q2 || from || to) && (
            <button onClick={() => { setActor(''); setAction(''); setQ2(''); setFrom(''); setTo('') }}
              style={{ fontSize: 11.5, border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', textDecoration: 'underline' }}>ล้าง</button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <Pager page={page} total={total} pageSize={PAGE} onPage={setPage} />
            <RefreshButton busy={loading} onClick={() => setReload((r) => r + 1)} />
          </div>
        </div>
        <DataTable
          columns={cols}
          rows={audit ?? []}
          rowKey={(_r, i) => String(i)}
          divider="top"
          theadRowStyle={theadTr}
          thBase={th}
          tdBase={{ ...td, fontSize: 13 }}
          minWidth={860}
          loading={!audit && !err ? <Loading /> : undefined}
          empty="ไม่พบรายการตามเงื่อนไข"
          emptyStyle={{ ...td, fontSize: 13, padding: '18px 20px', color: 'var(--text-faint)', textAlign: 'center' }}
        />
      </div>
    </div>
  )
}
