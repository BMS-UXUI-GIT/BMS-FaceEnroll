import { useEffect, useState } from 'react'
import { api } from '../../api'
import { dialog, toast } from '../../components/dialog'
import { clock, nf, useFetch } from '../../hooks'
import { Loading } from '../../components/Spinner'
import { PAGE_SIZE, usePaged } from '../../components/Pager'
import { DataTable, type Column } from '../../components/data-display/DataTable'
import { Pagination } from '../../components/data-display/Pagination'
import { ShiftBadge, shiftKindOf, type ShiftKind } from '../../components/data-display/ShiftBadge'
import { StatusBadge, type StatusKind } from '../../components/data-display/StatusBadge'
import { ScanMap, type Fence } from '../../components/ScanMap'
import { Tip } from '../../components/Info'
import { Button } from '../../components/inputs/Button'
import { Icon } from '../../icons'
import { TEXT } from '../../typography'
import { useApp } from '../../state'
import { IssueBadges } from './IssueBadges'
import type { DailyRow, EmpHist, HistRow } from './types'

const mono: React.CSSProperties = { fontFamily: 'var(--mono)' }

const SHIFT_ICON: Record<ShiftKind, string> = { morning: 'haze', afternoon: 'sun', night: 'moon' }
const SHIFT_LABEL: Record<ShiftKind, string> = { morning: 'เช้า', afternoon: 'บ่าย', night: 'ดึก' }

/** สถานะหลักของแถว (ป้ายเดียว) — เรียงความสำคัญ นอกพื้นที่ > สาย > ออกก่อน > ยังไม่ออก > ปกติ */
function primaryStatus(r: DailyRow): { kind: StatusKind; label: string; color: string } {
  if (r.out_area === true) return { kind: 'outarea', label: 'นอกพื้นที่', color: 'var(--danger)' }
  if (r.late) return { kind: 'late', label: 'มาสาย', color: 'var(--warn)' }
  if (r.early) return { kind: 'early', label: 'ออกก่อนเวลา', color: 'var(--warn)' }
  if (r.no_out) return { kind: 'leave', label: 'ยังไม่ออกเวร', color: 'var(--info)' }
  return { kind: 'ontime', label: 'ปกติ', color: 'var(--ok)' }
}

const gpsText = (r: DailyRow): string | null => {
  const p = r.coords[0]
  return p ? `GPS: ${p.lat.toFixed(4)}° N, ${p.lng.toFixed(4)}° E` : null
}

// modal รายละเอียดพนักงาน (Figma enrollment-view-modal · node 254:12305)
// รวม 3 มุมมองไว้ที่เดียว: รายวัน (การ์ดสรุป + แผนที่ GPS) · รายเดือน (สถิติ 30 วัน + ตาราง)
// และฟอร์มแก้ไขเวลาย้อนหลัง (เปิดจากปุ่ม "แก้ไขเวลา" ในมุมมองรายวัน)
export function EmployeeModal({ hcode, row, fences, initialTab = 'daily', onClose, onSaved }: {
  hcode: string
  row: DailyRow
  fences: Fence[]
  initialTab?: 'daily' | 'monthly'
  onClose: () => void
  onSaved: () => void
}) {
  const { session } = useApp()
  const [tab, setTab] = useState<'daily' | 'monthly'>(initialTab)
  const [editing, setEditing] = useState(false)
  const canEdit = session?.role !== 'user'
  const kind = shiftKindOf(row.shift)
  const st = primaryStatus(row)
  const gps = gpsText(row)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'var(--overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-5)',
      animation: 'overlayIn .12s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{
        width: '100%', maxWidth: 720, height: 'min(703px, calc(var(--app-h) * 0.88))',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--bg)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)',
        animation: 'modalIn .16s ease',
      }}>
        {/* ---------- header ---------- */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)', padding: 'var(--sp-5) var(--sp-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: 0 }}>
            <span aria-hidden style={{
              width: 64, height: 64, flex: 'none', borderRadius: 'var(--r-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--surface-card)', color: 'var(--text-dim)', ...TEXT.h2,
            }}>{row.name.trim().charAt(0) || '?'}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...TEXT.h3, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</div>
              <div style={{ ...TEXT.body, color: 'var(--text-dim)', marginTop: 'var(--sp-1)' }}>
                {row.dept || 'ไม่ระบุแผนก'} • {row.date}
              </div>
            </div>
            {tab === 'daily' && !editing && canEdit && (
              <Button variant="secondary" size="sm" pill onClick={() => setEditing(true)}
                icon={<Icon name="clock" size={16} width={1.8} />}>แก้ไขเวลา</Button>
            )}
          </div>
          <button onClick={onClose} title="ปิด" style={{
            width: 32, height: 32, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', borderRadius: 'var(--r-full)', cursor: 'pointer', background: 'var(--surface-card)', color: 'var(--text-dim)',
          }}><Icon name="close" size={16} width={2} /></button>
        </div>

        {/* ---------- tab bar (ซ่อนตอนแก้ไข) ---------- */}
        {!editing && (
          <div style={{ display: 'flex', alignItems: 'flex-start', padding: '0 var(--sp-6)' }}>
            {(['daily', 'monthly'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)',
                padding: 'var(--sp-3) var(--sp-4) 0', border: 'none', background: 'transparent', cursor: 'pointer',
              }}>
                <span style={{ ...TEXT.bodyMed, color: tab === t ? 'var(--accent-active)' : 'var(--text-dim)' }}>
                  {t === 'daily' ? 'รายวัน' : 'รายเดือน'}
                </span>
                <span style={{ width: 48, height: 3, borderRadius: 2, background: tab === t ? 'var(--accent-active)' : 'transparent' }} />
              </button>
            ))}
          </div>
        )}

        {/* ---------- body ---------- */}
        {editing ? (
          <EditView hcode={hcode} row={row} kind={kind} st={st}
            onCancel={() => setEditing(false)}
            onSaved={() => { setEditing(false); onSaved() }} />
        ) : tab === 'daily' ? (
          <DailyView row={row} kind={kind} st={st} fences={fences} gps={gps} />
        ) : (
          <MonthlyView hcode={hcode} empId={row.emp} canUnlock={canEdit} />
        )}
      </div>
    </div>
  )
}

/** การ์ดสรุปในแถบข้อมูล (เข้าเวร/ออกเวร/เวร/สถานะ) */
function InfoCard({ color, icon, label, value }: { color: string; icon: string; label: string; value: React.ReactNode }) {
  return (
    <div style={{ flex: '1 0 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)', background: 'var(--bg)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4) var(--sp-2)' }}>
      <span aria-hidden style={{ width: 40, height: 40, flex: 'none', borderRadius: 'var(--r-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: color, color: 'var(--bg)' }}>
        <Icon name={icon} size={22} width={1.8} />
      </span>
      <div style={{ ...TEXT.sm, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ ...TEXT.bodyMed, color: 'var(--text)', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  )
}

function DailyView({ row, kind, st, fences, gps }: {
  row: DailyRow; kind: ShiftKind; st: ReturnType<typeof primaryStatus>; fences: Fence[]; gps: string | null
}) {
  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'stretch', padding: 'var(--sp-4) var(--sp-6)', background: 'var(--surface)', borderTop: '1px solid var(--control-border)', borderBottom: '1px solid var(--control-border)' }}>
        <InfoCard color="var(--accent-active)" icon="clock" label="เข้าเวร" value={<span style={mono}>{clock(row.in)}</span>} />
        <InfoCard color="var(--danger)" icon="logout" label="ออกเวร" value={<span style={mono}>{clock(row.out)}</span>} />
        <InfoCard color={`var(--shift-${kind}-icon)`} icon={SHIFT_ICON[kind]} label="เวร" value={SHIFT_LABEL[kind]} />
        <InfoCard color={st.color} icon={st.kind === 'ontime' ? 'scan' : st.kind === 'outarea' ? 'map-question' : st.kind === 'leave' ? 'clock-play' : st.kind === 'early' ? 'time-duration-off' : 'clock-alert'} label="สถานะ" value={st.label} />
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: 'var(--sp-6)', display: 'flex' }}>
        {row.coords.length > 0
          ? <div style={{ flex: 1, minHeight: 240 }}><ScanMap fences={fences} points={row.coords} height={330} /></div>
          : <div style={{ flex: 1, minHeight: 240, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-card)', border: '1px solid var(--control-border)', borderRadius: 'var(--r-md)', color: 'var(--text-faint)' }}>
              <Icon name="map-pin" size={40} width={1.6} />
              <span style={{ ...TEXT.bodyMed }}>รายการนี้ไม่มีพิกัด GPS</span>
            </div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)', padding: 'var(--sp-4) var(--sp-6)', background: 'var(--surface)', borderTop: '1px solid var(--control-border)' }}>
        <span style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>
          หมุด = จุดที่สแกนจริง (เขียว = ในพื้นที่ • แดง = นอกพื้นที่) • วงกลม = จุดลงเวลาที่โรงกำหนด
        </span>
        {gps && <span style={{ ...TEXT.sm, fontWeight: 500, color: 'var(--accent-active)', whiteSpace: 'nowrap' }}>{gps}</span>}
      </div>
    </>
  )
}

function EditView({ hcode, row, kind, st, onCancel, onSaved }: {
  hcode: string; row: DailyRow; kind: ShiftKind; st: ReturnType<typeof primaryStatus>; onCancel: () => void; onSaved: () => void
}) {
  const clean = (s?: string) => { const v = (s || '').replace('(+1)', '').trim(); return v === '—' ? '' : v }
  const [orig] = useState(() => ({ in: clean(row.in), out: clean(row.out) }))
  const [tin, setTin] = useState(orig.in)
  const [tout, setTout] = useState(orig.out)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const changedIn = !!tin && tin !== orig.in
  const changedOut = !!tout && tout !== orig.out

  const save = async () => {
    if (busy || (!changedIn && !changedOut)) return
    setBusy(true); setErr(null)
    try {
      await api.post('/admin/attendance/correction', {
        hcode, emp_id: row.emp, date: row.date,
        in_time: changedIn ? tin : null,
        out_time: changedOut ? tout : null,
        reason: reason.trim(), seq: row.seq ?? 0,
        expect_in: orig.in || '—', expect_out: orig.out || '—',
      })
      toast.success('บันทึกเวลาใหม่แล้ว')
      onSaved()
    } catch (e: any) { setErr(e?.message || 'บันทึกไม่สำเร็จ'); setBusy(false) }
  }

  const lb: React.CSSProperties = { ...TEXT.bodyMed, color: 'var(--text-dim)', marginBottom: 'var(--sp-2)', display: 'block' }
  const fld: React.CSSProperties = {
    ...TEXT.bodyLg, ...mono, width: '100%', padding: 'var(--sp-3) var(--sp-4)',
    border: '1px solid var(--control-border)', borderRadius: 'var(--r-md)', background: 'var(--bg)', color: 'var(--text)', outline: 'none',
  }

  return (
    <>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <span style={{ ...TEXT.bodyMed, color: 'var(--text-dim)' }}>วันที่ {row.date}</span>
          <span style={{ color: 'var(--text-faint)' }}>•</span>
          <ShiftBadge shift={kind} label={SHIFT_LABEL[kind]} />
          <StatusBadge status={st.kind} label={st.label} />
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
          <div style={{ flex: '1 0 0', minWidth: 0 }}>
            <label style={lb}>เวลาเข้า {orig.in && <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>(เดิม {clock(orig.in)})</span>}</label>
            <input type="time" value={tin} onChange={(e) => setTin(e.target.value)} style={fld} />
          </div>
          <div style={{ flex: '1 0 0', minWidth: 0 }}>
            <label style={lb}>เวลาออก {orig.out && <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>(เดิม {clock(orig.out)})</span>}</label>
            <input type="time" value={tout} onChange={(e) => setTout(e.target.value)} style={fld} />
          </div>
        </div>

        <div>
          <label style={lb}>เหตุผลที่แก้ (ลงประวัติการจัดการ)</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="เช่น ลืมสแกนออก มีใบรับรองหัวหน้าเวร"
            style={{ ...fld, fontFamily: 'var(--sans)', resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', padding: 'var(--sp-3) var(--sp-4)', background: 'var(--warn-light)', borderRadius: 'var(--r-md)' }}>
          <Icon name="info" size={18} color="var(--warn)" />
          <span style={{ ...TEXT.sm, fontWeight: 500, color: 'var(--warn)' }}>
            เมื่อบันทึกแล้วระบบจะบันทึกว่าคุณเป็นผู้แก้ไขข้อมูลล่าสุด
          </span>
        </div>
        {err && <div style={{ ...TEXT.body, color: 'var(--danger)' }}>ผิดพลาด: {err}</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)', padding: 'var(--sp-4) var(--sp-6)', background: 'var(--surface)', borderTop: '1px solid var(--control-border)' }}>
        <Button variant="secondary" pill onClick={onCancel}>ยกเลิก</Button>
        <Button variant="primary" pill onClick={save} disabled={busy || (!changedIn && !changedOut)}>
          {busy ? 'กำลังบันทึก…' : 'บันทึกเวลาใหม่'}
        </Button>
      </div>
    </>
  )
}

function MonthlyView({ hcode, empId, canUnlock }: { hcode: string; empId: string; canUnlock: boolean }) {
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
    try { await api.post(`/admin/emp/${hcode}/${encodeURIComponent(empId)}/unlock-pin`, {}); setUnlock('done'); toast.success('ส่งคำสั่งปลดล็อคแอปแล้ว') }
    catch (e: any) { setUnlock('idle'); setUnlockErr(e?.message || 'ปลดล็อคไม่สำเร็จ') }
  }

  const cols: Column<HistRow>[] = [
    { key: 'no', header: 'ลำดับ', align: 'right', width: 52, cell: (_r, i) => <span style={{ ...mono, color: 'var(--text-dim)' }}>{nf(paged.offset + i + 1)}</span> },
    { key: 'date', header: 'วันที่', width: 116, cell: (r) => <span style={{ ...mono, color: 'var(--text-dim)' }}>{r.date}</span> },
    { key: 'in', header: 'เข้าเวร', width: 96, cell: (r) => <span style={{ ...mono, color: r.late ? 'var(--warn)' : 'var(--ok)' }}>{clock(r.in)}</span> },
    { key: 'out', header: 'ออกเวร', width: 96, cell: (r) => <span style={{ ...mono, color: 'var(--text-dim)' }}>{clock(r.out)}</span> },
    { key: 'shift', header: 'เวร', width: 64, cell: (r) => <span style={{ color: 'var(--text-dim)' }}>{r.shift ? SHIFT_LABEL[shiftKindOf(r.shift)] : '—'}</span> },
    { key: 'status', header: 'สถานะ', align: 'center', cell: (r) => <IssueBadges r={r} /> },
  ]

  const days = hist.data?.days ?? 0
  const STATS: { l: string; v: number; c: string; icon: string; suffix: string; off?: boolean }[] = s ? [
    { l: 'มาทำงาน', v: s.present, c: 'var(--ok)', icon: 'scan', suffix: `จาก ${days} วัน` },
    { l: 'มาสาย', v: s.late, c: 'var(--warn)', icon: 'clock-alert', suffix: 'วัน' },
    // ขาดงาน — ระบบยังไม่มีตารางเวร/วันลา ตัวเลขที่มีคือ "ลืมลงเวลาออก" คนละความหมาย จึงปิดไว้ก่อน
    { l: 'ขาดงาน', v: s.no_out, c: 'var(--danger)', icon: 'clock-play', suffix: 'วัน', off: true },
    { l: 'ออกก่อนเวลา', v: s.early, c: 'var(--badge-early-icon)', icon: 'time-duration-off', suffix: 'วัน' },
    { l: 'นอกพื้นที่', v: s.out_area, c: 'var(--text-dim)', icon: 'map-question', suffix: 'วัน' },
  ] : []

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {(hist.err || hist.loading) && (
        <div style={{ padding: 'var(--sp-5) var(--sp-6)' }}>
          {hist.err && <div style={{ ...TEXT.body, color: 'var(--danger)' }}>ผิดพลาด: {hist.err}</div>}
          {hist.loading && <Loading text="กำลังโหลด… (ดึงทีละวัน อาจใช้เวลาครู่หนึ่ง)" />}
        </div>
      )}
      {s && (
        <>
          {canUnlock && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)', margin: 'var(--sp-5) var(--sp-6) 0', padding: 'var(--sp-2) var(--sp-3)', background: 'var(--surface-card)', borderRadius: 'var(--r-md)' }}>
              <span style={{ ...TEXT.sm, color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <Icon name="lock" size={14} /> แอปคนนี้ถูกล็อคด้วย PIN อยู่? ปลดล็อคให้ได้ที่นี่
              </span>
              {unlock === 'done'
                ? <span style={{ ...TEXT.sm, fontWeight: 500, color: 'var(--ok)' }}>ส่งคำสั่งปลดล็อคแล้ว ✓</span>
                : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    {unlockErr && <span style={{ ...TEXT.caption, color: 'var(--danger)' }}>{unlockErr}</span>}
                    <Button size="sm" variant="secondary" onClick={doUnlock} disabled={unlock === 'busy'}>
                      {unlock === 'busy' ? 'กำลังปลดล็อค…' : 'ปลดล็อคแอป'}
                    </Button>
                  </span>}
            </div>
          )}

          {/* stats — การ์ดแนวตั้ง จัดกึ่งกลาง (Figma node 286:6684) เต็มขอบ ไม่มี side margin */}
          <div style={{ display: 'flex', gap: 'var(--sp-3)', margin: 'var(--sp-4) 0', padding: 'var(--sp-4) var(--sp-6)', background: 'var(--surface)' }}>
            {STATS.map((it) => (
              <div key={it.l} aria-disabled={it.off || undefined} style={{ position: 'relative', overflow: 'hidden', flex: '1 0 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)', background: 'var(--bg)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4) var(--sp-2)' }}>
                {/* ยังไม่มีข้อมูลจริง — แถบเฉียงมุมขวาบนแบบเดียวกับ StatCard */}
                {it.off && (
                  <Tip text="อยู่ระหว่างพัฒนา — กำลังพัฒนาการเชื่อมต่อกับระบบ HR เพื่อดึงตารางเวรและวันลามาคำนวณ" style={{ position: 'absolute', zIndex: 1, top: 8, right: -32, width: 100, transform: 'rotate(45deg)', cursor: 'help', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3px 0', background: 'var(--surface-alt)', color: 'var(--text-faint)', boxShadow: '0 1px 2px color-mix(in srgb, var(--text) 12%, transparent)' }}>
                    <Icon name="flask" size={13} width={1.8} />
                  </Tip>
                )}
                <span aria-hidden style={{ width: 40, height: 40, flex: 'none', borderRadius: 'var(--r-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: it.off ? 'var(--surface-alt)' : it.c, color: it.off ? 'var(--text-faint)' : 'var(--bg)', opacity: it.off ? 0.5 : undefined }}>
                  <Icon name={it.icon} size={22} width={1.8} />
                </span>
                <div style={{ ...TEXT.body, color: 'var(--text-dim)', whiteSpace: 'nowrap', opacity: it.off ? 0.45 : undefined }}>{it.l}</div>
                <div style={{ textAlign: 'center', whiteSpace: 'nowrap', opacity: it.off ? 0.45 : undefined }}>
                  <span style={{ ...TEXT.h2, ...mono, color: it.off ? 'var(--text-faint)' : it.c }}>{it.off ? '—' : it.v}</span>
                  {!it.off && <span style={{ ...TEXT.sm, color: 'var(--text-dim)', marginLeft: 4 }}>{it.suffix}</span>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '0 var(--sp-6) var(--sp-6)' }}>
            <DataTable columns={cols} rows={paged.pageRows} rowKey={(r) => `${r.date}:${r.seq ?? 0}`} stickyTop={0} empty="ไม่มีการลงเวลาในช่วงนี้" />
            {rows.length > PAGE_SIZE && (
              <Pagination page={paged.page} pageSize={PAGE_SIZE} total={rows.length} shown={paged.pageRows.length} onPage={paged.setPage} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
