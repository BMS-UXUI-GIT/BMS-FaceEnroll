import { useEffect, useState } from 'react'
import { api } from '../api'
import { dialog } from '../components/dialog'
import { nf, useFetch, useServerPage } from '../hooks'
import { Loading } from '../components/Spinner'
import { Pager, PAGE_SIZE, SearchInput } from '../components/Pager'
import { PickHospital } from '../components/PickHospital'
import { RefreshButton } from '../components/RefreshButton'
import { Icon } from '../icons'
import { useApp } from '../state'

// ลงทะเบียนใบหน้า — รายชื่อผู้ลงทะเบียน + ใครยังไม่ลงทะเบียน (ข้อมูลอ่านจาก facehub)

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }
const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 600 }
const td: React.CSSProperties = { padding: '11px 12px' }
const theadTr: React.CSSProperties = { textAlign: 'left', color: 'var(--text-faint)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', background: 'var(--surface-2)' }

type Subject = { subject_id: string; hcode: string; hospital_name?: string; metadata: Record<string, any>; status: string; face_count: number; updated_at: string | null }

type Tab = 'inv' | 'cov'

function Tabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: [Tab, string][] = [['inv', 'รายชื่อผู้ลงทะเบียน'], ['cov', 'ยังไม่ลงทะเบียน']]
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 11, border: '1px solid var(--border)', width: 'fit-content' }}>
      {items.map(([id, label]) => (
        <button key={id} onClick={() => setTab(id)} style={{ padding: '7px 15px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: 'none', fontFamily: 'var(--sans)', whiteSpace: 'nowrap', fontWeight: tab === id ? 600 : 500, background: tab === id ? 'var(--surface)' : 'transparent', color: tab === id ? 'var(--text)' : 'var(--text-dim)', boxShadow: tab === id ? 'var(--shadow)' : 'none' }}>{label}</button>
      ))}
    </div>
  )
}

export function Face() {
  const { currentHcode, session } = useApp()
  const canEdit = session?.role !== 'user' // role user (รวมพนักงาน HOSxP) = ดูอย่างเดียว
  const hq = currentHcode === '*' ? '' : `&hcode=${encodeURIComponent(currentHcode)}`
  const [tab, setTab] = useState<Tab>('inv')
  const [q, setQ] = useState('')
  const [qDeb, setQDeb] = useState('') // debounce กันยิง backend ทุก keystroke
  const [covQ, setCovQ] = useState('')
  const [actErr, setActErr] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [reload, setReload] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const PAGE = 20

  useEffect(() => { const t = setTimeout(() => setQDeb(q), 300); return () => clearTimeout(t) }, [q])
  useEffect(() => { setPage(0); setActErr(null) }, [qDeb, currentHcode, tab])
  const inv = useFetch<{ total: number; subjects: Subject[] }>(tab === 'inv' ? `/admin/face/subjects?status=all&limit=${PAGE}&offset=${page * PAGE}${hq}${qDeb ? `&q=${encodeURIComponent(qDeb)}` : ''}` : null, reload)
  // ยังไม่ลงทะเบียน — ค้นหา (debounce) + แบ่งหน้าฝั่งเซิร์ฟเวอร์
  const [covDeb, setCovDeb] = useState('')
  useEffect(() => { const t = setTimeout(() => setCovDeb(covQ.trim()), 300); return () => clearTimeout(t) }, [covQ])
  const covJoin = useServerPage<{ active_staff: number; enrolled: number; not_enrolled_count: number; total: number; not_enrolled: { emp_id: string; name: string }[] }>(
    tab === 'cov' && currentHcode !== '*' ? `/admin/face/coverage?hcode=${encodeURIComponent(currentHcode)}${covDeb ? `&q=${encodeURIComponent(covDeb)}` : ''}` : null, reload)
  const covRows = covJoin.data?.not_enrolled ?? []

  // ลบแถวสุดท้ายของหน้าสุดท้าย → total หด → เด้งกลับหน้าที่มีข้อมูล (กันค้างหน้าว่าง)
  const invPages = Math.max(1, Math.ceil((inv.data?.total ?? 0) / PAGE))
  useEffect(() => { if (inv.data && page > 0 && page >= invPages) setPage(invPages - 1) }, [inv.data, page, invPages])

  const name = (m: Record<string, any>) => m?.name || '—'
  const emp = (m: Record<string, any>) => m?.emp_id || '—'

  const toggleSubj = async (s: Subject) => {
    if (busyId) return
    setBusyId(s.subject_id)
    setActErr(null)
    try { await api.patch(`/admin/face/subjects/${s.subject_id}`, { status: s.status === 'active' ? 'inactive' : 'active' }); setReload((r) => r + 1) } catch (e: any) { setActErr(e?.message || 'สั่งเปิด/ปิดไม่สำเร็จ') } finally { setBusyId(null) }
  }
  const delSubj = async (s: Subject) => {
    if (busyId) return
    if (!(await dialog.confirm({ title: 'ลบใบหน้า', body: `ลบใบหน้าของ ${s.metadata?.name || s.subject_id}? ลบถาวร กู้คืนไม่ได้`, confirmText: 'ลบถาวร', danger: true }))) return
    setBusyId(s.subject_id)
    setActErr(null)
    try { await api.del(`/admin/face/subjects/${s.subject_id}`); setReload((r) => r + 1) } catch (e: any) { setActErr(e?.message || 'ลบไม่สำเร็จ') } finally { setBusyId(null) }
  }

  return (
    <div style={{ maxWidth: 'var(--page-max)' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><Tabs tab={tab} setTab={setTab} /><RefreshButton busy={tab === 'inv' ? inv.loading : covJoin.loading} onClick={() => setReload((r) => r + 1)} /></div>

      {/* รายชื่อผู้ลงทะเบียน */}
      {tab === 'inv' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-2)' }}>
              <Icon name="search" size={15} color="var(--text-faint)" width={2} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นด้วย emp_id หรือ ชื่อ…" style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13, width: '100%' }} />
            </div>
            {inv.data && <Pager page={page} total={inv.data.total} pageSize={PAGE} onPage={setPage} />}
          </div>
          {(inv.err || actErr) && <div style={{ padding: '14px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {inv.err || actErr}</div>}
          {!inv.err && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
                <thead><tr style={theadTr}><th style={{ ...th, padding: '10px 20px', textAlign: 'right', width: 56 }}>ลำดับ</th><th style={th}>emp_id</th><th style={th}>ชื่อ</th><th style={th}>โรงพยาบาล</th><th style={th}>สถานะ</th><th style={th}>ใบหน้า</th><th style={{ ...th, ...(canEdit ? {} : { padding: '10px 20px' }) }}>แก้ล่าสุด</th>{canEdit && <th style={{ ...th, padding: '10px 20px', textAlign: 'right' }}>จัดการ</th>}</tr></thead>
                <tbody>
                  {inv.data?.subjects.map((s, i) => (
                    <tr key={s.subject_id} className="row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ ...td, padding: '11px 20px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 12 }}>{nf(page * PAGE + i + 1)}</td>
                      <td style={{ ...td, padding: '11px 20px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{emp(s.metadata)}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{name(s.metadata)}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700, color: 'var(--accent-strong)', background: 'var(--accent-soft)', padding: '2px 7px', borderRadius: 6, flex: 'none' }}>{s.hcode}</span>
                          <span style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{s.hospital_name || '—'}</span>
                        </div>
                      </td>
                      <td style={td}><span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 9px', borderRadius: 20, color: s.status === 'active' ? 'var(--ok)' : 'var(--text-dim)', background: s.status === 'active' ? 'var(--ok-soft)' : 'var(--surface-3)' }}>{s.status === 'active' ? 'ใช้งาน' : 'ปิด'}</span></td>
                      <td style={{ ...td, fontFamily: 'var(--mono)', fontWeight: 600, color: s.face_count >= 3 ? 'var(--ok)' : 'var(--warn)' }}>{s.face_count} {s.face_count < 3 && <span style={{ fontSize: 11, fontWeight: 400 }}>ไม่ครบ</span>}</td>
                      <td style={{ ...td, fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 12 }}>{s.updated_at?.slice(0, 10) ?? '—'}</td>
                      {canEdit && (
                        <td style={{ ...td, padding: '11px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button onClick={() => toggleSubj(s)} disabled={busyId === s.subject_id} style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer' }}>{busyId === s.subject_id ? '…' : s.status === 'active' ? 'ปิด' : 'เปิด'}</button>
                          <button onClick={() => delSubj(s)} disabled={busyId === s.subject_id} style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--danger)', cursor: 'pointer', marginLeft: 6 }}>ลบ</button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {inv.data && inv.data.subjects.length === 0 && <tr><td colSpan={canEdit ? 8 : 7} style={{ ...td, padding: '18px 20px', color: 'var(--text-faint)', textAlign: 'center' }}>ไม่พบข้อมูล</td></tr>}
                  {inv.loading && !inv.data && <tr><td colSpan={canEdit ? 8 : 7} style={{ padding: 0 }}><Loading /></td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ยังไม่ลงทะเบียน */}
      {tab === 'cov' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {currentHcode === '*' ? (
            <PickHospital />
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                {[
                  { v: covJoin.data?.active_staff, t: 'พนักงานทั้งหมด', c: 'var(--accent)' },
                  { v: covJoin.data?.enrolled, t: 'ลงทะเบียนหน้าแล้ว', c: 'var(--ok)' },
                  { v: covJoin.data?.not_enrolled_count, t: 'ยังไม่ลงทะเบียน', c: 'var(--warn)' },
                ].map((k, i) => (
                  <div key={i} className="lift" style={{ ...card, padding: '18px 20px' }}>
                    <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--mono)', color: k.c }}>{k.v != null ? nf(k.v) : (covJoin.loading ? '…' : '—')}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 5 }}>{k.t}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...card, overflow: 'hidden' }}>
                <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>พนักงานที่ยังไม่มีใบหน้า</span>
                  <SearchInput value={covQ} onChange={setCovQ} placeholder="ค้นชื่อ / emp_id…" width={170} />
                  <div style={{ marginLeft: 'auto' }}><Pager page={covJoin.page} total={covJoin.data?.total ?? 0} onPage={covJoin.setPage} /></div>
                </div>
                {covJoin.err && <div style={{ padding: '14px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {covJoin.err}</div>}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={theadTr}><th style={{ ...th, padding: '10px 20px', textAlign: 'right', width: 56 }}>ลำดับ</th><th style={th}>emp_id</th><th style={th}>ชื่อ</th><th style={{ ...th, padding: '10px 20px', textAlign: 'right' }}>สถานะ</th></tr></thead>
                  <tbody>
                    {covRows.map((n, i) => (
                      <tr key={n.emp_id} className="row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ ...td, padding: '11px 20px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 12 }}>{nf(covJoin.page * PAGE_SIZE + i + 1)}</td>
                        <td style={{ ...td, padding: '11px 20px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{n.emp_id}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{n.name}</td>
                        <td style={{ ...td, padding: '11px 20px', textAlign: 'right' }}><span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 9px', borderRadius: 20, color: 'var(--warn)', background: 'var(--warn-soft)' }}>ยังไม่ลงทะเบียน</span></td>
                      </tr>
                    ))}
                    {covJoin.data && covRows.length === 0 && <tr><td colSpan={4} style={{ ...td, padding: '18px 20px', color: covDeb ? 'var(--text-faint)' : 'var(--ok)', textAlign: 'center' }}>{covDeb ? 'ไม่พบที่ตรงกับคำค้น' : 'ลงทะเบียนครบ 🎉'}</td></tr>}
                    {covJoin.loading && !covJoin.data && <tr><td colSpan={4} style={{ padding: 0 }}><Loading /></td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
