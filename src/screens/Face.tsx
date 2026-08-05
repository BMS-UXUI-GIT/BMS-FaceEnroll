import { useEffect, useState } from 'react'
import { api } from '../api'
import { dialog, toast } from '../components/dialog'
import { nf, useFetch, useServerPage } from '../hooks'
import { Loading } from '../components/Spinner'
import { PAGE_SIZE } from '../components/Pager'
import { Pagination } from '../components/data-display/Pagination'
import { Button } from '../components/inputs/Button'
import { StatCard } from '../components/data-display/StatCard'
import { SearchInput } from '../components/inputs/SearchInput'
import { FilterChip } from '../components/inputs/FilterChip'
import { DataTable, type Column } from '../components/data-display/DataTable'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'

// ลงทะเบียนใบหน้า — Figma node 207:39928 (Enroll Registry)
//   การ์ดหัวเรื่อง (ไล่สีฟ้า→ขาว) + การ์ดตัวเลข 4 ใบ + แถบเตือน
//   ชิปกรอง "ยังไม่ลงทะเบียน" / "ใบหน้าไม่ครบ" + ตารางรายชื่อ + ป้ายจำนวนใบหน้า

const MIN_FACES = 3 // น้อยกว่านี้ = ลงทะเบียนใบหน้าไม่ครบ


type Subject = { subject_id: string; hcode: string; hospital_name?: string; metadata: Record<string, any>; status: string; face_count: number; updated_at: string | null }
type CovData = { active_staff: number; enrolled: number; not_enrolled_count: number; incomplete?: number; total: number; not_enrolled: { emp_id: string; name: string }[] }
type Filter = 'none' | 'notEnrolled' | 'incomplete'

/** ป้ายจำนวนใบหน้า — เขียว(mood-check) = ครบ · ส้ม(mood-cog) = ไม่ครบ
    Figma: ป้าย 100x36 · วงกลมไอคอน 26 · ข้อความ 12 (Status Badge เดียวกับหน้าลงเวลา) */
function FaceBadge({ n }: { n: number }) {
  const ok = n >= MIN_FACES
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)', padding: '5px 10px 5px 4px', borderRadius: 'var(--r-full)', background: ok ? 'var(--ok-light)' : 'var(--warn-light)', color: ok ? 'var(--ok)' : 'var(--warn)', ...TEXT.sm, fontWeight: 500, whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ width: 26, height: 26, flex: 'none', borderRadius: 'var(--r-full)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: ok ? 'var(--ok)' : 'var(--warn)', color: 'var(--bg)' }}>
        <Icon name={ok ? 'mood-check' : 'mood-cog'} size={14} width={2} />
      </span>
      {n} ใบหน้า
    </span>
  )
}

export function Face() {
  const { currentHcode, session } = useApp()
  const canEdit = session?.role !== 'user'
  const hq = currentHcode === '*' ? '' : `&hcode=${encodeURIComponent(currentHcode)}`
  const covHq = currentHcode === '*' ? '' : `hcode=${encodeURIComponent(currentHcode)}`

  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('none')
  const [page, setPage] = useState(0)
  const [reload, setReload] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actErr, setActErr] = useState<string | null>(null)

  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 300); return () => clearTimeout(t) }, [search])
  useEffect(() => { setPage(0); setActErr(null) }, [q, currentHcode, filter])

  // สถิติ (ไม่กรองด้วยคำค้น) — 4 การ์ดหัวเรื่อง
  const stats = useFetch<CovData>(`/admin/face/coverage?${covHq}`, reload)

  // ตารางรายชื่อผู้ลงทะเบียน (ค่าเริ่ม + ชิป "ใบหน้าไม่ครบ")
  const inv = useFetch<{ total: number; subjects: Subject[] }>(
    filter !== 'notEnrolled'
      ? `/admin/face/subjects?status=all&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}${hq}${q ? `&q=${encodeURIComponent(q)}` : ''}${filter === 'incomplete' ? '&incomplete=1' : ''}`
      : null, reload)

  // ยังไม่ลงทะเบียน (ชิป) — แบ่งหน้าฝั่งเซิร์ฟเวอร์
  const cov = useServerPage<CovData>(
    filter === 'notEnrolled' ? `/admin/face/coverage?${covHq}${q ? `&q=${encodeURIComponent(q)}` : ''}` : null, reload)

  const name = (m: Record<string, any>) => m?.name || '—'
  const emp = (m: Record<string, any>) => m?.emp_id || '—'

  const toggleSubj = async (s: Subject) => {
    if (busyId) return
    setBusyId(s.subject_id); setActErr(null)
    try { await api.patch(`/admin/face/subjects/${s.subject_id}`, { status: s.status === 'active' ? 'inactive' : 'active' }); setReload((r) => r + 1); toast.success(s.status === 'active' ? 'ปิดใช้งานแล้ว' : 'เปิดใช้งานแล้ว') }
    catch (e: any) { setActErr(e?.message || 'สั่งเปิด/ปิดไม่สำเร็จ') } finally { setBusyId(null) }
  }
  const delSubj = async (s: Subject) => {
    if (busyId) return
    if (!(await dialog.confirm({ title: 'ลบใบหน้า', body: `ลบใบหน้าของ ${s.metadata?.name || s.subject_id}? ลบถาวร กู้คืนไม่ได้`, confirmText: 'ลบถาวร', danger: true }))) return
    setBusyId(s.subject_id); setActErr(null)
    try { await api.del(`/admin/face/subjects/${s.subject_id}`); setReload((r) => r + 1); toast.success('ลบใบหน้าแล้ว') }
    catch (e: any) { setActErr(e?.message || 'ลบไม่สำเร็จ') } finally { setBusyId(null) }
  }

  const invCols: Column<Subject>[] = [
    // Figma: EMP_ID 80 · ชื่อ 220 · โรงพยาบาล 300 · สถานะ 80 · ใบหน้า 100 · แก้ล่าสุด 174
    // (Figma วาดลำดับเป็นวงกลม avatar 40 — ที่นี่ใช้ตัวเลขล้วนตามที่ทีมเลือก)
    { key: 'no', header: 'ลำดับ', width: 72, align: 'center', thStyle: { padding: '10px 16px' }, tdStyle: { padding: '12px 16px', color: 'var(--text-dim)' }, cell: (_s, i) => nf(page * PAGE_SIZE + i + 1) },
    { key: 'emp', header: 'EMP_ID', width: 92, tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-dim)' }, cell: (s) => emp(s.metadata) },
    { key: 'name', header: 'ชื่อ', width: 232, tdStyle: { fontWeight: 500 }, cell: (s) => name(s.metadata) },
    {
      key: 'hosp', header: 'โรงพยาบาล', width: 312, cell: (s) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          {/* Figma โชว์ชื่อโรงอย่างเดียว — รหัสโรงมีประโยชน์เฉพาะตอนดูข้ามโรง (ส่วนกลาง) */}
          {currentHcode === '*' && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 500, color: 'var(--accent-active)', background: 'var(--accent-light)', padding: '2px 7px', borderRadius: 6, flex: 'none' }}>{s.hcode}</span>
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.hospital_name || '—'}</span>
        </div>
      ),
    },
    { key: 'status', header: 'สถานะ', width: 92, cell: (s) => <span style={{ color: s.status === 'active' ? 'var(--ok)' : 'var(--text-dim)' }}>{s.status === 'active' ? 'ใช้งาน' : 'ปิด'}</span> },
    { key: 'face', header: 'ใบหน้า', width: 112, cell: (s) => <FaceBadge n={s.face_count} /> },
    { key: 'updated', header: 'แก้ล่าสุด', width: 132, tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-faint)', whiteSpace: 'nowrap' }, cell: (s) => s.updated_at?.slice(0, 10) ?? '—' },
    ...(canEdit ? [{
      key: 'manage', header: 'จัดการ', align: 'right', thStyle: { padding: '10px 20px' }, tdStyle: { padding: '11px 20px', whiteSpace: 'nowrap' }, cell: (s: Subject) => (
        <>
          <button onClick={() => toggleSubj(s)} disabled={busyId === s.subject_id} style={{ fontSize: 11.5, fontWeight: 500, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer' }}>{busyId === s.subject_id ? '…' : s.status === 'active' ? 'ปิด' : 'เปิด'}</button>
          <button onClick={() => delSubj(s)} disabled={busyId === s.subject_id} style={{ fontSize: 11.5, fontWeight: 500, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--danger)', cursor: 'pointer', marginLeft: 6 }}>ลบ</button>
        </>
      ),
    } as Column<Subject>] : []),
  ]

  const covCols: Column<{ emp_id: string; name: string }>[] = [
    { key: 'no', header: 'ลำดับ', width: 72, align: 'center', thStyle: { padding: '10px 16px' }, tdStyle: { padding: '12px 16px', color: 'var(--text-dim)' }, cell: (_n, i) => nf(cov.page * PAGE_SIZE + i + 1) },
    { key: 'emp', header: 'EMP_ID', width: 92, tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-dim)' }, cell: (n) => n.emp_id },
    { key: 'name', header: 'ชื่อ', tdStyle: { fontWeight: 500 }, cell: (n) => n.name },
    {
      key: 'status', header: 'ใบหน้า', align: 'right', width: 200, cell: () => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)', padding: '5px 10px 5px 4px', borderRadius: 'var(--r-full)', color: 'var(--warn)', background: 'var(--warn-light)', ...TEXT.sm, fontWeight: 500, whiteSpace: 'nowrap' }}>
          <span aria-hidden style={{ width: 26, height: 26, flex: 'none', borderRadius: 'var(--r-full)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--warn)', color: 'var(--bg)' }}>
            <Icon name="mood-x" size={14} width={2} />
          </span>
          ยังไม่ลงทะเบียน
        </span>
      ),
    },
  ]

  const s = stats.data
  // ไอคอนตรงกับที่ Figma ใช้ (tabler: user / mood-check / mood-x / mood-cog)
  const SUMMARY = [
    { label: 'พนักงาน', v: s?.active_staff, tone: 'accent' as const, icon: 'person' },
    { label: 'ลงทะเบียนแล้ว', v: s?.enrolled, tone: 'ok' as const, icon: 'mood-check' },
    { label: 'ยังไม่ลงทะเบียน', v: s?.not_enrolled_count, tone: 'neutral' as const, icon: 'mood-x' },
    { label: 'ลงทะเบียนไม่ครบ', v: s?.incomplete, tone: 'warn' as const, icon: 'mood-cog' },
  ]

  const busyLoad = filter === 'notEnrolled' ? cov.loading : inv.loading

  return (
    <div className="max-w-[var(--page-max)] flex flex-col gap-4">
      {/* ---------- หัวเรื่อง + ตัวเลขสรุป (Figma 284:3189 — การ์ดสูง 245) ---------- */}
      <div className="relative overflow-hidden rounded-xl p-6" style={{ background: 'linear-gradient(to top, var(--surface-blue), var(--bg) 65%)' }}>
        {/* ภาพประกอบพยาบาล (Figma node 220:5938) — 256x256 ชิดขวา 24
            เยื้องลงนอกการ์ด 64 แล้วถูก crop ด้วย overflow-hidden ของการ์ดตามดีไซน์ */}
        <img src="/hero-face.svg" alt="" aria-hidden width={256} height={256}
          className="hide-sm pointer-events-none select-none"
          style={{ position: 'absolute', right: 'var(--sp-6)', bottom: -64 }} />

        {/* Figma: บล็อกซ้ายกว้าง 760 คงที่ — ที่เหลือด้านขวาเว้นไว้ให้ภาพประกอบ */}
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-h2 m-0 text-text">ลงทะเบียนใบหน้า</h1>
            <p className="text-body mt-2 mb-0 text-[color-mix(in_srgb,var(--text-faint)_50%,transparent)]">
              ตรวจสอบการลงทะเบียนใบหน้าของพนักงานทั้งหมด
            </p>
          </div>
          {/* Figma: ปุ่มแคปซูล 140x48 พื้นเทาอ่อน + ไอคอน rotate — ชุดเดียวกับหน้าลงเวลา */}
          <Button variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
            icon={<Icon name="recon" size={20} style={busyLoad || stats.loading ? { animation: 'spin .7s linear infinite' } : undefined} />}>
            รีเฟรชข้อมูลล่าสุด
          </Button>
        </div>

        {/* การ์ดตัวเลข 4 ใบ — Figma 178x80 ไอคอนซ้าย ข้อความขวา */}
        {/* 4 คอลัมน์กว้างเท่ากันเสมอ (minmax(0,1fr) — ไม่ให้การ์ดที่ข้อความยาวดันคอลัมน์ตัวเอง)
            กว้างสุด = ที่ว่างหักภาพประกอบ 256 + ระยะห่าง 24 · จอแคบค่อยตกลงมาเป็น 2 คอลัมน์ */}
        <div className="relative grid gap-4 mt-4 max-w-[calc(100%-264px)] grid-cols-4 max-md:grid-cols-2 max-md:max-w-full">
          {SUMMARY.map((k) => (
            <StatCard key={k.label} tone={k.tone} label={k.label} unit="คน" layout="row"
              icon={<Icon name={k.icon} size={24} color="currentColor" />}
              value={k.v != null ? nf(k.v) : stats.loading ? '…' : '—'} />
          ))}
        </div>

        {/* แถบเตือน — Figma อยู่ในการ์ดหัวเรื่อง (Frame 17: 760x34 · padding 4/12 · r-full) */}
        <div className="relative max-w-190" style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
          marginTop: 'var(--sp-4)',
          padding: 'var(--sp-1) var(--sp-3)',
          borderRadius: 'var(--r-full)',
          background: 'var(--warn-light)',
        }}>
          <span aria-hidden style={{
            width: 26, height: 26, flex: 'none', borderRadius: 'var(--r-full)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--warn)', color: 'var(--bg)',
          }}>
            <Icon name="info" size={14} width={2} />
          </span>
          <span style={{ ...TEXT.sm, fontWeight: 500, color: 'var(--warn)' }}>
            หากพนักงานลงทะเบียนจำนวนใบหน้าน้อยกว่า {MIN_FACES} รูป จะนับว่าลงทะเบียนใบหน้าไม่ครบ
          </span>
        </div>
      </div>

      {/* ---------- แถบตัวกรอง ---------- */}
      <div className="flex items-center gap-2 flex-wrap">
        <SearchInput grow value={search} onChange={setSearch} placeholder="ค้นหา ชื่อ-นามสกุล / รหัสพนักงาน" />
        <FilterChip variant="choice" active={filter === 'notEnrolled'} onClick={() => setFilter((f) => f === 'notEnrolled' ? 'none' : 'notEnrolled')}
          icon={<Icon name="mood-x" size={14} width={2} />} label="ยังไม่ลงทะเบียน" />
        <FilterChip variant="choice" active={filter === 'incomplete'} onClick={() => setFilter((f) => f === 'incomplete' ? 'none' : 'incomplete')}
          icon={<Icon name="mood-cog" size={14} width={2} />} label="ใบหน้าไม่ครบ" />
      </div>

      {actErr && <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">ผิดพลาด: {actErr}</div>}

      {/* ---------- ตาราง ---------- */}
      <div className="bg-bg border border-control-border rounded-lg">
        {filter === 'notEnrolled' ? (
          cov.err
            ? <div className="text-body p-4 text-danger">ผิดพลาด: {cov.err}</div>
            : (
              <>
                <DataTable columns={covCols} rows={cov.data?.not_enrolled ?? []} rowKey={(n) => n.emp_id}
                  loading={cov.loading && !cov.data ? <Loading /> : undefined}
                  empty={q ? 'ไม่พบที่ตรงกับคำค้น' : 'ลงทะเบียนครบทุกคน 🎉'}
                  emptyStyle={{ ...TEXT.body, padding: '28px 20px', color: q ? 'var(--text-dim)' : 'var(--ok)', textAlign: 'center' }} />
                <Pagination page={cov.page} pageSize={PAGE_SIZE} total={cov.data?.total ?? 0} shown={cov.data?.not_enrolled.length} onPage={cov.setPage} />
              </>
            )
        ) : (
          inv.err
            ? <div className="text-body p-4 text-danger">ผิดพลาด: {inv.err}</div>
            : (
              <>
                <DataTable columns={invCols} rows={inv.data?.subjects ?? []} rowKey={(s) => s.subject_id}
                  minWidth={980}
                  loading={inv.loading && !inv.data ? <Loading /> : undefined}
                  empty={q ? 'ไม่พบที่ตรงกับคำค้น' : filter === 'incomplete' ? 'ทุกคนลงทะเบียนใบหน้าครบแล้ว 🎉' : 'ยังไม่มีผู้ลงทะเบียน'}
                  emptyStyle={{ ...TEXT.body, padding: '28px 20px', color: 'var(--text-dim)', textAlign: 'center' }} />
                <Pagination page={page} pageSize={PAGE_SIZE} total={inv.data?.total ?? 0} shown={inv.data?.subjects.length} onPage={setPage} />
              </>
            )
        )}
      </div>
    </div>
  )
}
