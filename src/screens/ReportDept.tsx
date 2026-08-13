import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { nf, useFetch } from '../hooks'
import { daysAgoISO, localISO, selLabel, toggle } from '../components/AttFilters'
import { thShort } from '../components/DatePicker'
import { Donut, PercentBars } from '../components/charts'
import { PickHospital } from '../components/PickHospital'
import { Loading } from '../components/Spinner'
import { SectionPanel } from '../components/layout/SectionPanel'
import { EmptyState, ErrorBox } from '../components/feedback/Message'
import { SearchSelect } from '../components/SearchSelect'
import { Button } from '../components/inputs/Button'
import { FilterChip } from '../components/inputs/FilterChip'
import { StatCard } from '../components/data-display/StatCard'
import { DataTable, type Column } from '../components/data-display/DataTable'
import { Pagination } from '../components/data-display/Pagination'
import { PAGE_SIZE, usePaged } from '../components/Pager'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'
import { asset } from '../assets'

// รายแผนก — Figma node 114:28921
//   การ์ดหัวเรื่อง (พื้นไล่สีฟ้า + ภาพประกอบทีมแพทย์) + การ์ดสรุป 5 ใบ + ปุ่มรีเฟรช/เลือกแผนก
//   2 แผง: เปรียบเทียบการมาทำงานของแต่ละแผนก (แท่งแนวนอน %) · สัดส่วนการมาสาย (โดนัท)
//   แผงล่าง: ตารางสรุปจำนวนพนักงานรายแผนก
//
// ⚠️ backend ไม่มีตัวเลข "ขาดงาน" ตรง ๆ — คำนวณเป็น พนักงานในแผนก − คนที่มาอย่างน้อย 1 วัน

type DeptRow = { dept: string; staff: number; present: number; person_days: number; late: number; early: number; no_out: number; rate: number | null }
type Analytics = {
  summary: { date_from: string; date_to: string; days: number; punched: number; done: number; open: number; late: number; early: number; out_area: number }
  total_staff: number
  depts: DeptRow[]
}

// สีวนของโดนัทแยกแผนก (pastel ต่างกันชัด)
const CYCLE = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)', 'var(--cat-7)', 'var(--cat-8)']

const deptName = (d: string) => (d.trim() === '' ? 'ไม่ระบุแผนก' : d)
const fmtRate = (r: number | null) => (r != null ? `${r.toFixed(2)}%` : '—')
/** สีอัตราเข้าทำงานตาม Figma: ≥90 เขียว · ≥80 ฟ้า · ต่ำกว่านั้นส้ม */
const rateColor = (r: number | null) => (r == null ? 'var(--text-faint)' : r >= 90 ? 'var(--ok)' : r >= 80 ? 'var(--accent)' : 'var(--warn)')
const absentOf = (d: DeptRow) => Math.max(0, d.staff - d.present)

export function ReportDept() {
  const { currentHcode } = useApp()
  const hcode = currentHcode === '*' ? '' : currentHcode
  const [reload, setReload] = useState(0)
  // เลือกได้หลายแผนก (ว่าง = ทุกแผนก)
  const [fDepts, setFDepts] = useState<string[]>([])
  // default = 7 วันล่าสุด (ภาพรวม/เทียบสัดส่วน ต้องมีหลายวันถึงจะมีความหมาย)
  const [from, setFrom] = useState(daysAgoISO(6))
  const [to, setTo] = useState(localISO())

  // สลับโรง = กลับไปช่วงตั้งต้น + ล้างตัวกรองแผนก
  useEffect(() => { setFrom(daysAgoISO(6)); setTo(localISO()); setFDepts([]) }, [hcode])

  const anaF = useFetch<Analytics>(
    hcode ? `/admin/attendance/analytics?hcode=${encodeURIComponent(hcode)}&date_from=${from}&date_to=${to}` : null, reload)
  const ana = anaF.data

  // เรียงอัตรามาทำงานมาก→น้อย (แบบเดียวกับดีไซน์) ใช้ทั้งกราฟเทียบ + ตาราง
  const all = useMemo(() => [...(ana?.depts ?? [])].sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1)), [ana])
  const depts = fDepts.length ? all.filter((d) => fDepts.includes(deptName(d.dept))) : all
  const dPaged = usePaged(depts)

  const deptOpts = useMemo(
    () => all.map((d) => ({ value: deptName(d.dept), label: deptName(d.dept) })),
    [all],
  )

  if (currentHcode === '*') return <PickHospital />

  const presentSum = depts.reduce((s, d) => s + d.present, 0)
  const lateSum = depts.reduce((s, d) => s + d.late, 0)
  const earlySum = depts.reduce((s, d) => s + d.early, 0)
  const staffSum = depts.reduce((s, d) => s + d.staff, 0)
  // ตัวเลขบนหัวเรื่อง: กรองแผนกอยู่ = นับเฉพาะแผนกนั้น / ไม่กรอง = ใช้ยอดรวมของทั้งโรง
  const staffTotal = fDepts.length ? staffSum : (ana?.total_staff ?? staffSum)

  // โดนัทมาสาย: เฉพาะแผนกที่มีคนสาย เรียงมาก→น้อย สีวนตามลำดับ
  const lateSegs = depts.filter((d) => d.late > 0).sort((a, b) => b.late - a.late)
    .map((d, i) => ({ v: d.late, color: CYCLE[i % CYCLE.length], label: deptName(d.dept) }))

  // backend นับ มาสาย/ออกก่อน เป็น "ครั้ง" (คน-วัน) ส่วน พนักงาน/ขาดงาน เป็น "คน"
  // ช่วงวันเดียวสองอย่างนี้เท่ากัน จึงใช้ คน ทั้งหมด — หลายวันต้องแยกหน่วยไม่งั้นเลขขัดกันเอง
  const multiDay = (ana?.summary.days ?? 1) > 1
  const times = multiDay ? 'ครั้ง' : 'คน'
  const personDays = depts.reduce((s, d) => s + d.person_days, 0)
  const HERO = [
    { label: 'พนักงาน', v: ana ? staffTotal : undefined, unit: 'คน', tone: 'accent' as const, icon: 'person' },
    { label: 'ตรงเวลา', v: ana ? Math.max(0, personDays - lateSum) : undefined, unit: times, tone: 'ok' as const, icon: 'scan' },
    { label: 'มาสาย', v: ana ? lateSum : undefined, unit: times, tone: 'warn' as const, icon: 'clock-alert' },
    { label: 'ขาดงาน', v: ana ? Math.max(0, staffTotal - presentSum) : undefined, unit: 'คน', tone: 'danger' as const, icon: 'clock-x' },
    { label: 'ออกก่อนเวลา', v: ana ? earlySum : undefined, unit: times, tone: 'info' as const, icon: 'time-duration-off' },
  ]

  // ป้ายสรุปตัวกรองมุมขวาของหัวแผง — ให้รู้ว่าเลขที่เห็นมาจากช่วงวัน/แผนกไหน
  const filterMeta = `${thShort(from)} – ${thShort(to)} · ${selLabel(deptOpts, fDepts, 'ทุกแผนก', 'แผนก')}`

  // Figma: header สูง 40 · แถวสูง 53 · ชิดซ้ายทุกคอลัมน์ · แผนกตัวหนา · อัตราเข้าทำงานมีสีตามเกณฑ์
  const cols: Column<DeptRow>[] = [
    { key: 'dept', header: 'แผนก', tdStyle: { ...TEXT.bodyMed, color: 'var(--text)' }, cell: (d) => deptName(d.dept) },
    { key: 'staff', header: 'ทั้งหมด', tdStyle: { color: 'var(--table-row-text)' }, cell: (d) => nf(d.staff) },
    { key: 'present', header: 'มาทำงาน', tdStyle: { color: 'var(--table-row-text)' }, cell: (d) => nf(d.present) },
    { key: 'late', header: 'มาสาย', tdStyle: { color: 'var(--table-row-text)' }, cell: (d) => nf(d.late) },
    { key: 'absent', header: 'ขาดงาน', tdStyle: { color: 'var(--table-row-text)' }, cell: (d) => nf(absentOf(d)) },
    { key: 'early', header: 'ออกก่อน', tdStyle: { color: 'var(--table-row-text)' }, cell: (d) => nf(d.early) },
    {
      key: 'rate', header: 'อัตราเข้าทำงาน',
      cell: (d) => <span style={{ ...TEXT.bodyMed, color: rateColor(d.rate) }}>{fmtRate(d.rate)}</span>,
    },
  ]

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      {/* ---------- การ์ดหัวเรื่อง (Figma Frame 93) ---------- */}
      <PageHeader
        title="รายแผนก"
        desc="ดูสถิติและเปรียบเทียบข้อมูลการเข้า-ออกงานของแต่ละแผนก"
        art={<>
        {/* ภาพประกอบทีมแพทย์ (Figma image 10) — 328x328 ยึดขวา ส่วนที่เกินถูก crop ตามดีไซน์ */}
        <img src={asset("/hero-dept.png")} alt="" aria-hidden width={328} height={328}
          className="hide-sm pointer-events-none select-none"
          style={{ position: 'absolute', right: 8, top: 0 }} />
        </>}
        actions={<>
          <span className="inline-flex gap-2 items-center flex-wrap">
            <Button className="btn-refresh" variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
              icon={<Icon name="recon" size={20} style={anaF.loading ? { animation: 'spin .7s linear infinite' } : undefined} />}>
              รีเฟรชข้อมูลล่าสุด
            </Button>
            <FilterChip icon={<Icon name="briefcase" size={24} width={1.8} />} label="เลือกแผนก">
              <SearchSelect bare hideCaret multi values={fDepts} onToggle={(v) => setFDepts(toggle(fDepts, v))} onClear={() => setFDepts([])} clearLabel="เลือกทุกแผนก" options={deptOpts}
                placeholder="ทั้งหมด" searchPlaceholder="ค้นแผนก…" maxTriggerWidth={120} />
            </FilterChip>
          </span>
        </>}
      >

        {/* การ์ดสรุป 5 ใบ (Figma 130x142 · เรียงแถวเดียว ห่าง 8) */}
        <div className="relative mt-4 flex gap-2 flex-wrap stat-grid">
          {HERO.map((k) => (
            <StatCard key={k.label} tone={k.tone} label={k.label} unit={k.unit}
              icon={<Icon name={k.icon} size={24} color="currentColor" />}
              value={k.v != null ? nf(k.v) : anaF.loading ? '…' : '—'} />
          ))}
        </div>
      </PageHeader>

      {anaF.err && <ErrorBox>ผิดพลาด: {anaF.err}</ErrorBox>}

      {/* ---------- 2 แผงกราฟ (Figma Frame 117) ---------- */}
      <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px,100%), 1fr))' }}>
        <SectionPanel title="เปรียบเทียบการมาทำงานของแต่ละแผนก" meta={filterMeta}>
          {!ana && !anaF.err
            ? <Loading />
            : depts.length === 0
              ? <EmptyState text="ไม่มีข้อมูลในช่วงที่เลือก" />
              : <PercentBars fit colors={CYCLE} rows={depts.map((d) => ({ label: deptName(d.dept), pct: d.rate ?? 0 }))} />}
        </SectionPanel>

        <SectionPanel title="สัดส่วนการมาสาย" meta={filterMeta}>
          {!ana && !anaF.err
            ? <Loading />
            : lateSegs.length === 0
              ? <EmptyState text="ไม่มีการมาสายในช่วงที่เลือก" />
              // เลือกแผนกไว้น้อย = legend สั้น เหลือที่ว่างเยอะ → ขยายวงโดนัทแล้วจัดกึ่งกลางแทน
              : <Donut stretch segs={lateSegs} centerLabel="รวม" centerValue={`${nf(lateSum)} คน`}
                  size={lateSegs.length <= 3 ? 260 : lateSegs.length <= 6 ? 230 : 200} />}
        </SectionPanel>
      </div>

      {/* ---------- ตารางสรุปรายแผนก (Figma Group 21) ---------- */}
      <SectionPanel title="สรุปจำนวนพนักงานรายแผนก">
        <div className="table-rounded rounded-lg" style={{ border: '1px solid var(--control-border)' }}>
          <DataTable
            columns={cols}
            rows={dPaged.pageRows}
            rowKey={(d) => d.dept || '(none)'}
            minWidth={880}
            loading={anaF.loading && !ana ? <Loading /> : undefined}
            empty="ไม่มีข้อมูลในช่วงที่เลือก"
            emptyStyle={{ ...TEXT.body, padding: '28px 20px', color: 'var(--text-dim)', textAlign: 'center' }}
          />
          {depts.length > PAGE_SIZE && (
            <Pagination page={dPaged.page} pageSize={PAGE_SIZE} total={dPaged.total}
              shown={dPaged.pageRows.length} onPage={dPaged.setPage} />
          )}
        </div>
        <p className="text-sm-fig mt-3 mb-0 text-text-dim">
          โรงพยาบาลที่ยังไม่กรอกแผนกใน HOSxP จะรวมอยู่ใน "ไม่ระบุแผนก" · ขาดงาน = พนักงานในแผนก − คนที่มาอย่างน้อย 1 วัน
        </p>
      </SectionPanel>
    </div>
  )
}

