import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { clock, nf, useFetch } from '../hooks'
import { localISO } from '../components/AttFilters'
import { MonthPicker, thMonth, thShort } from '../components/DatePicker'
import { DayTimeBars, Donut } from '../components/charts'
import { PickHospital } from '../components/PickHospital'
import { Loading } from '../components/Spinner'
import { SectionPanel } from '../components/layout/SectionPanel'
import { EmptyState, ErrorBox } from '../components/feedback/Message'
import { Button } from '../components/inputs/Button'
import { FilterChip } from '../components/inputs/FilterChip'
import { StatCard } from '../components/data-display/StatCard'
import { ShiftBadge, shiftKindOf, type ShiftKind } from '../components/data-display/ShiftBadge'
import { DataTable, type Column } from '../components/data-display/DataTable'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'
import { asset } from '../assets'

// รายเวร — Figma node 114:29745
//   การ์ดหัวเรื่อง (ภาพประกอบ 3 เวร) + การ์ดสรุปเวรละใบ + ชิปเลือกเดือน
//   2 แผง: อัตราเข้างานแยกตามเวร (วงกลม) · เปรียบเทียบเวลาเข้าเฉลี่ย (แถบบนแกน 24 ชม.)
//   แผงล่าง: ตารางสรุปรายเวร
//
// ⚠️ ระบบไม่มีตารางเวรล่วงหน้า (ไม่รู้ว่าใครต้องอยู่เวรไหน) — คอลัมน์ "ขาดงาน/อัตราเข้าทำงาน"
//    ของ Figma จึงคำนวณไม่ได้ ตารางนี้ใช้ตัวเลขที่วัดได้จริงจากการลงเวลาแทน

type ShiftRow = { name: string; persons: number; late: number; early: number; avg_in: string }
type Analytics = { shifts: ShiftRow[] }

const shiftName = (s: string) => (s.trim() === '' ? 'ไม่ระบุเวร' : s)
/** ชื่อสั้นสำหรับป้าย/แกน — ตัดวงเล็บเวลาออก เช่น "เช้า (08:00-16:00)" -> "เช้า" */
const shortName = (s: string) => shiftName(s).replace(/\s*\(.*\)\s*$/, '')
const colorOf = (k: ShiftKind) => `var(--shift-${k}-icon)`
const ICON: Record<ShiftKind, string> = { morning: 'haze', afternoon: 'sun', night: 'moon' }

/** "HH:MM" -> นาทีตั้งแต่เที่ยงคืน (ค่าพัง = null) */
const toMinutes = (t: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec((t ?? '').trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** ช่วงวันของเดือนที่เลือก (ไม่เลยวันนี้) */
function monthRange(ym: string): { from: string; to: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(ym)
  const now = new Date()
  const y = m ? Number(m[1]) : now.getFullYear()
  const mo = m ? Number(m[2]) - 1 : now.getMonth()
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const end = iso(new Date(y, mo + 1, 0))
  const today = localISO()
  return { from: iso(new Date(y, mo, 1)), to: end > today ? today : end }
}

export function ReportShift() {
  const { currentHcode } = useApp()
  const hcode = currentHcode === '*' ? '' : currentHcode
  const [reload, setReload] = useState(0)
  const [month, setMonth] = useState(localISO().slice(0, 7))

  // สลับโรง = กลับมาดูเดือนนี้
  useEffect(() => { setMonth(localISO().slice(0, 7)) }, [hcode])

  const range = useMemo(() => monthRange(month), [month])
  const anaF = useFetch<Analytics>(
    hcode ? `/admin/attendance/analytics?hcode=${encodeURIComponent(hcode)}&date_from=${range.from}&date_to=${range.to}` : null, reload)
  const ana = anaF.data

  if (currentHcode === '*') return <PickHospital />

  const shifts = ana?.shifts ?? []
  const total = shifts.reduce((s, x) => s + x.persons, 0)
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0)
  const kindOf = (s: ShiftRow) => shiftKindOf(s.name)

  const cols: Column<ShiftRow>[] = [
    {
      key: 'shift', header: 'เวร', width: 140,
      thStyle: { textAlign: 'center' }, tdStyle: { padding: 'var(--sp-3) var(--sp-6)' },
      cell: (s) => <ShiftBadge shift={kindOf(s)} label={shortName(s.name)} />,
    },
    { key: 'persons', header: 'ลงเวลา', tdStyle: { color: 'var(--table-row-text)' }, cell: (s) => nf(s.persons) },
    { key: 'late', header: 'มาสาย', tdStyle: { color: 'var(--table-row-text)' }, cell: (s) => nf(s.late) },
    { key: 'early', header: 'ออกก่อน', tdStyle: { color: 'var(--table-row-text)' }, cell: (s) => nf(s.early) },
    { key: 'avg', header: 'เวลาเข้าเฉลี่ย', tdStyle: { fontFamily: 'var(--mono)', color: 'var(--table-row-text)' }, cell: (s) => clock(s.avg_in) },
    {
      key: 'share', header: 'สัดส่วนของทั้งหมด',
      cell: (s) => <span style={{ ...TEXT.bodyMed, color: colorOf(kindOf(s)) }}>{total > 0 ? `${pct(s.persons).toFixed(2)}%` : '—'}</span>,
    },
  ]

  // ป้ายมุมขวาหัวแผง — บอกช่วงวันจริงที่ดึงมา (เดือนปัจจุบันจะจบที่วันนี้ ไม่ใช่สิ้นเดือน)
  const filterMeta = `${thMonth(month)} · ${thShort(range.from)} – ${thShort(range.to)}`

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      {/* ---------- การ์ดหัวเรื่อง (Figma Frame 128:3610) ---------- */}
      <PageHeader
        title="รายเวร"
        desc="ดูสถิติการเข้า-ออกงานแยกตามเวรการทำงาน"
        art={<>
        {/* ภาพประกอบ 3 เวร (Figma node 114:30977) — ยึดขวา ส่วนที่เกินถูก crop ตามดีไซน์ */}
        <img src={asset("/hero-shift.svg")} alt="" aria-hidden width={397} height={251}
          className="hide-sm pointer-events-none select-none"
          style={{ position: 'absolute', right: 0, bottom: 0 }} />
        </>}
        actions={<>
          <span className="inline-flex gap-2 items-center flex-wrap">
            <Button className="btn-refresh" variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
              icon={<Icon name="recon" size={20} style={anaF.loading ? { animation: 'spin .7s linear infinite' } : undefined} />}>
              รีเฟรชข้อมูลล่าสุด
            </Button>
            <FilterChip icon={<Icon name="calendar-week" size={24} width={1.8} />} label="เลือกเดือน">
              <MonthPicker bare value={month} onChange={setMonth} max={localISO().slice(0, 7)} />
            </FilterChip>
          </span>
        </>}
      >

        {/* การ์ดสรุปเวรละใบ — ตัวเลขคือคนที่ลงเวลาในเวรนั้น + สัดส่วน */}
        <div className="relative mt-4 flex gap-2 flex-wrap stat-grid">
          {shifts.map((s) => (
            <StatCard key={s.name} label={`เวร${shortName(s.name)}`} color={colorOf(kindOf(s))}
              icon={<Icon name={ICON[kindOf(s)]} size={24} color="currentColor" />}
              value={nf(s.persons)} unit={`คน (${pct(s.persons).toFixed(0)}%)`} />
          ))}
          {shifts.length === 0 && (
            <div className="bg-bg rounded-xl text-body text-text-dim" style={{ padding: 'var(--sp-4) var(--sp-6)' }}>
              {anaF.loading ? 'กำลังโหลด…' : 'ไม่มีข้อมูลในเดือนที่เลือก'}
            </div>
          )}
        </div>
      </PageHeader>

      {anaF.err && <ErrorBox>ผิดพลาด: {anaF.err}</ErrorBox>}

      {/* ---------- 2 แผงกราฟ ---------- */}
      <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px,100%), 1fr))' }}>
        <SectionPanel title="อัตราเข้างานแยกตามเวร" meta={filterMeta}>
          {!ana && !anaF.err
            ? <Loading />
            : total === 0
              ? <EmptyState text="ไม่มีข้อมูลในเดือนที่เลือก" />
              : (
                /* เวรมีแค่ 2-3 กะ = legend สั้นมาก ถ้าปล่อยขนาดเดิมจะเหลือที่ว่างครึ่งการ์ด
                   -> ขยายวงตามจำนวนเวรแล้วจัดกึ่งกลางเต็มความสูง (แผงคู่กันสูงกว่า) */
                <div style={{ height: '100%', padding: 'var(--sp-4) 0' }}>
                  <Donut stretch pie unit="คน" legendSize={15} centerLabel="รวม" centerValue={nf(total)}
                    size={shifts.length <= 3 ? 260 : shifts.length <= 6 ? 230 : 200}
                    segs={shifts.map((s) => ({ v: s.persons, color: colorOf(kindOf(s)), label: shortName(s.name) }))} />
                </div>
              )}
        </SectionPanel>

        <SectionPanel title="เปรียบเทียบเวลาเข้าเฉลี่ย" meta={filterMeta}>
          {!ana && !anaF.err
            ? <Loading />
            : (
              <div style={{ padding: 'var(--sp-2) 0' }}>
                <DayTimeBars rows={shifts.map((s) => ({
                  label: shortName(s.name), minutes: toMinutes(s.avg_in), value: clock(s.avg_in), color: colorOf(kindOf(s)),
                }))} />
              </div>
            )}
        </SectionPanel>
      </div>

      {/* ---------- ตารางสรุปรายเวร ---------- */}
      <SectionPanel title="สรุปจำนวนพนักงานเวร" meta={filterMeta}>
        <div className="table-rounded rounded-lg" style={{ border: '1px solid var(--control-border)' }}>
          <DataTable
            columns={cols}
            rows={shifts}
            rowKey={(s, i) => s.name || String(i)}
            minWidth={760}
            loading={anaF.loading && !ana ? <Loading /> : undefined}
            empty="ไม่มีข้อมูลในเดือนที่เลือก"
            emptyStyle={{ ...TEXT.body, padding: '28px 20px', color: 'var(--text-dim)', textAlign: 'center' }}
          />
        </div>
        <p className="text-sm-fig mt-3 mb-0 text-text-dim">
          ไม่มีคอลัมน์ ขาดงาน/อัตราเข้าทำงาน — ระบบไม่มีตารางเวรล่วงหน้า จึงไม่ทราบว่าแต่ละคนต้องอยู่เวรใด
        </p>
      </SectionPanel>
    </div>
  )
}

