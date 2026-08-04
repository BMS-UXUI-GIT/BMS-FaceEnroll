import { useState } from 'react'
import { api } from '../../api'
import { dialog } from '../../components/dialog'
import { nf, useFetch } from '../../hooks'
import { Loading } from '../../components/Spinner'
import { PAGE_SIZE, usePaged } from '../../components/Pager'
import { DataTable, type Column } from '../../components/data-display/DataTable'
import { Pagination } from '../../components/data-display/Pagination'
import { ShiftBadge, shiftKindOf } from '../../components/data-display/ShiftBadge'
import { Modal } from '../../components/feedback/Modal'
import { Button } from '../../components/inputs/Button'
import { TEXT } from '../../typography'
import { useApp } from '../../state'
import { IssueBadges } from './IssueBadges'
import type { EmpHist, HistRow } from './types'

const mono: React.CSSProperties = { fontFamily: 'var(--mono)' }

// ประวัติการลงเวลารายคน ย้อนหลัง 30 วัน (drill-down จากตารางหลัก)
export function EmployeeModal({ hcode, empId, onClose }: { hcode: string; empId: string; onClose: () => void }) {
  const { session } = useApp()
  const hist = useFetch<EmpHist>(`/admin/attendance/employee?hcode=${encodeURIComponent(hcode)}&emp_id=${encodeURIComponent(empId)}&days=30`)
  const s = hist.data?.stat
  const rows = hist.data?.rows ?? []
  const paged = usePaged(rows)
  const [unlock, setUnlock] = useState<'idle' | 'busy' | 'done'>('idle')
  const [unlockErr, setUnlockErr] = useState<string | null>(null)

  const doUnlock = async () => {
    if (unlock === 'busy') return
    if (!(await dialog.confirm({ title: 'ปลดล็อคแอป', body: 'ปลดล็อคแอปให้พนักงานคนนี้? แอปจะปลดล็อคครั้งถัดไปที่เปิด', confirmText: 'ปลดล็อค' }))) return
    setUnlock('busy'); setUnlockErr(null)
    try { await api.post(`/admin/emp/${hcode}/${encodeURIComponent(empId)}/unlock-pin`, {}); setUnlock('done') }
    catch (e: any) { setUnlock('idle'); setUnlockErr(e?.message || 'ปลดล็อคไม่สำเร็จ') }
  }

  const cols: Column<HistRow>[] = [
    { key: 'no', header: 'ลำดับ', align: 'right', width: 56, cell: (_r, i) => <span style={{ ...mono, color: 'var(--text-dim)' }}>{nf(paged.offset + i + 1)}</span> },
    { key: 'date', header: 'วันที่', cell: (r) => <span style={{ ...mono, color: 'var(--text-dim)' }}>{r.date}</span> },
    { key: 'in', header: 'เข้าเวร', cell: (r) => <span style={{ ...mono, color: r.late ? 'var(--warn)' : 'var(--ok)' }}>{r.in}</span> },
    { key: 'out', header: 'ออกเวร', cell: (r) => <span style={{ ...mono, color: 'var(--text-dim)' }}>{r.out}</span> },
    { key: 'shift', header: 'เวร', cell: (r) => <ShiftBadge shift={shiftKindOf(r.shift)} label={r.shift} /> },
    { key: 'status', header: 'สถานะ', align: 'right', cell: (r) => <IssueBadges r={r} /> },
  ]

  const STATS = [
    ['มาทำงาน', s?.present, 'var(--ok)'], ['สาย', s?.late, 'var(--warn)'], ['ออกก่อน', s?.early, 'var(--warn)'],
    ['ลืมลงเวลาออก', s?.no_out, 'var(--info)'], ['นอกพื้นที่', s?.out_area, 'var(--danger)'],
  ] as const

  return (
    <Modal open title={hist.data ? `${hist.data.name} · ย้อนหลัง 30 วัน` : 'กำลังโหลด…'} onClose={onClose}>
      {hist.err && <div style={{ ...TEXT.body, color: 'var(--danger)' }}>ผิดพลาด: {hist.err}</div>}
      {hist.loading && <Loading text="กำลังโหลด… (ดึงทีละวัน อาจใช้เวลาครู่หนึ่ง)" />}
      {s && (
        <>
          {session?.role !== 'user' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)',
              marginBottom: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-3)',
              background: 'var(--surface-card)', borderRadius: 'var(--r-md)',
            }}>
              <span style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>🔒 แอปคนนี้ถูกล็อคด้วย PIN อยู่? ปลดล็อคให้ได้ที่นี่</span>
              {unlock === 'done'
                ? <span style={{ ...TEXT.sm, fontWeight: 700, color: 'var(--ok)' }}>ส่งคำสั่งปลดล็อคแล้ว ✓</span>
                : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    {unlockErr && <span style={{ ...TEXT.caption, color: 'var(--danger)' }}>{unlockErr}</span>}
                    <Button size="sm" variant="secondary" onClick={doUnlock} disabled={unlock === 'busy'}>
                      {unlock === 'busy' ? 'กำลังปลดล็อค…' : 'ปลดล็อคแอป'}
                    </Button>
                  </span>}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
            {STATS.map(([l, v, c]) => (
              <div key={l} style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)', textAlign: 'center' }}>
                <div style={{ ...TEXT.h2, ...mono, color: c }}>{v}</div>
                <div style={{ ...TEXT.caption, color: 'var(--text-dim)', marginTop: 'var(--sp-0)' }}>{l}</div>
              </div>
            ))}
          </div>

          <DataTable columns={cols} rows={paged.pageRows} rowKey={(r) => `${r.date}:${r.seq ?? 0}`} empty="ไม่มีการลงเวลาในช่วงนี้" />
          {rows.length > PAGE_SIZE && (
            <Pagination page={paged.page} pageSize={PAGE_SIZE} total={rows.length} shown={paged.pageRows.length} onPage={paged.setPage} />
          )}
        </>
      )}
    </Modal>
  )
}
