import { useState, type ReactNode } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { SectionPanel } from '../components/layout/SectionPanel'
import { MenuItem } from '../components/layout/MenuItem'
import { Button } from '../components/inputs/Button'
import { Toggle } from '../components/inputs/Toggle'
import { SearchInput } from '../components/inputs/SearchInput'
import { FilterChip } from '../components/inputs/FilterChip'
import { DateRangePicker } from '../components/inputs/DateRangePicker'
import { SearchSelect } from '../components/SearchSelect'
import { DatePicker } from '../components/DatePicker'
import { Avatar } from '../components/data-display/Avatar'
import { StatCard } from '../components/data-display/StatCard'
import { StatusBadge } from '../components/data-display/StatusBadge'
import { ShiftBadge } from '../components/data-display/ShiftBadge'
import { DataTable, type Column } from '../components/data-display/DataTable'
import { Pagination } from '../components/data-display/Pagination'
import { NotificationCard } from '../components/data-display/NotificationCard'
import { ContactPill, Field } from '../components/data-display/Field'
import { EmptyState, ErrorBox } from '../components/feedback/Message'
import { Modal } from '../components/feedback/Modal'
import { BottomSheet } from '../components/feedback/BottomSheet'
import { Donut, MeterRow, PercentBars, SegmentBar, StackedColumns, TrendLine } from '../components/charts'
import { Skel, SkelRows } from '../components/Skeleton'
import { Loading, Spinner } from '../components/Spinner'
import { Info } from '../components/Info'
import { dialog, toast } from '../components/dialog'
import { Icon, ICON_NAMES } from '../icons'
import { TEXT } from '../typography'
import { localISO } from '../components/AttFilters'

// Design System — แคตตาล็อกของทุกอย่างที่ประกอบหน้าจอในระบบนี้
//   1. Token   : สี · ตัวอักษร · ระยะ · มุม · เงา (ค่าจริงจาก theme.css ไม่ใช่ค่าที่พิมพ์ซ้ำ)
//   2. Component: ทุกตัวใน src/components พร้อม variant ที่ใช้งานจริง
//   3. Icon    : ไอคอนทั้งชุด (Tabler) พร้อมชื่อที่ใช้เรียก
//
// หน้านี้ "ไม่มีข้อมูลจริง" — ทุกอย่างเป็นตัวอย่างในไฟล์ ไม่ยิง API
// เพิ่ม component ใหม่เข้าระบบแล้ว ให้มาเพิ่มตัวอย่างที่นี่ด้วย ไม่งั้นแคตตาล็อกจะไม่ตรงของจริง

/** กล่องตัวอย่าง 1 ชิ้น: ชื่อ + คำอธิบายสั้น + ของจริง */
function Demo({ name, note, children, dark }: { name: string; note?: ReactNode; children: ReactNode; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        <code style={{ ...TEXT.sm, fontFamily: 'var(--mono)', fontWeight: 500, color: 'var(--accent-active)' }}>{name}</code>
        {note && <span style={{ ...TEXT.caption, color: 'var(--text-dim)' }}>{note}</span>}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap',
        padding: 'var(--sp-4)', borderRadius: 'var(--r-lg)',
        background: dark ? 'var(--surface-blue)' : 'var(--surface-alt)',
      }}>{children}</div>
    </div>
  )
}

/** แถวของ Demo หลายชิ้นในแผงเดียว */
function Stack({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>{children}</div>
}

/** ตัวอย่างสี 1 ช่อง — โชว์ค่าตัวแปรที่ต้องเรียกใช้ (ห้ามพิมพ์ hex ในโค้ดหน้าจอ) */
function Swatch({ token, name }: { token: string; name?: string }) {
  return (
    <div style={{ width: 132, minWidth: 0 }}>
      <div style={{
        height: 52, borderRadius: 'var(--r-md)', background: `var(${token})`,
        border: '1px solid var(--control-border)',
      }} />
      <div style={{ ...TEXT.caption, color: 'var(--text)', marginTop: 'var(--sp-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name ?? token.replace('--', '')}
      </div>
      <code style={{ ...TEXT.caption, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{token}</code>
    </div>
  )
}

const COLOR_GROUPS: [string, string[]][] = [
  ['Primary', ['--accent', '--accent-active', '--accent-sidebar', '--accent-light']],
  ['Secondary', ['--secondary-teal', '--secondary-blue', '--secondary-dark', '--secondary-navy']],
  ['Neutral', ['--bg', '--surface', '--surface-alt', '--surface-card', '--border', '--control-border', '--text', '--text-dim', '--text-dark']],
  ['Status', ['--ok', '--warn', '--danger', '--info']],
  ['Status @10%', ['--ok-light', '--warn-light', '--danger-light', '--info-light']],
  ['Surface tint', ['--surface-blue', '--surface-wash', '--surface-gray', '--hero-bg']],
  ['Chart', ['--cat-1', '--cat-2', '--cat-3', '--cat-4', '--cat-5', '--cat-6', '--cat-7', '--cat-8']],
]

const TYPE_SCALE: [string, keyof typeof TEXT, string][] = [
  ['h1', 'h1', '24 / 500'],
  ['h2 (คลาส text-h2)', 'h3', '20 / 500'],
  ['h3', 'h3', '16 / 500'],
  ['body', 'body', '14 / 400'],
  ['bodyMed', 'bodyMed', '14 / 500'],
  ['sm', 'sm', '12 / 400'],
  ['caption', 'caption', '11 / 400'],
]

const SPACING = ['--sp-1', '--sp-2', '--sp-3', '--sp-4', '--sp-5', '--sp-6', '--sp-8', '--sp-10', '--sp-12', '--sp-16']
const RADIUS = ['--r-sm', '--r-md', '--r-lg', '--r-xl', '--r-full']
const SHADOW = ['--shadow-sm', '--shadow', '--shadow-md', '--shadow-lg']

type DemoRow = { name: string; dept: string; time: string }
const TABLE_ROWS: DemoRow[] = [
  { name: 'ภูมิ แสงทอง', dept: 'การเงิน', time: '08:02 - 17:05' },
  { name: 'ณิชา ทองดี', dept: 'พยาบาล', time: '08:31 - 17:00' },
]

export function DesignSystem() {
  const [tab, setTab] = useState<'token' | 'component' | 'icon'>('token')
  const [on, setOn] = useState(true)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState('a')
  const [multi, setMulti] = useState<string[]>(['a'])
  const [date, setDate] = useState(localISO)
  const [from, setFrom] = useState(localISO)
  const [to, setTo] = useState(localISO)
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [iconQ, setIconQ] = useState('')

  const OPTS = [
    { value: 'a', label: 'เวรเช้า' },
    { value: 'b', label: 'เวรบ่าย' },
    { value: 'c', label: 'เวรดึก' },
  ]

  const cols: Column<DemoRow>[] = [
    { key: 'avatar', header: 'รูป', width: 72, cell: (r) => <Avatar name={r.name} seed={r.name} /> },
    { key: 'name', header: 'ชื่อ-นามสกุล', tdStyle: { ...TEXT.bodyMed }, cell: (r) => r.name },
    { key: 'dept', header: 'แผนก', tdStyle: { color: 'var(--text-dim)' }, cell: (r) => r.dept },
    { key: 'time', header: 'เวลาเข้า-ออก', tdStyle: { color: 'var(--text-dim)' }, cell: (r) => r.time },
    { key: 'st', header: 'สถานะ', cell: (_, i) => <StatusBadge status={i === 0 ? 'ontime' : 'late'} /> },
  ]

  const icons = ICON_NAMES.filter((n) => n.includes(iconQ.trim().toLowerCase()))

  const TABS: [typeof tab, string, string][] = [
    ['token', 'Token', 'haze'],
    ['component', 'Component', 'overview'],
    ['icon', 'ไอคอน', 'scan'],
  ]

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      <PageHeader
        title="ระบบดีไซน์"
        desc="ของทุกชิ้นที่ประกอบหน้าจอในระบบนี้ — token สี/ตัวอักษร/ระยะ · component ทุกตัวพร้อม variant · ไอคอนทั้งชุด"
      >
        <div className="relative mt-4">
          <span className="inline-flex gap-2 items-center tab-strip no-scrollbar" style={{
            background: 'var(--bg)', padding: 'var(--sp-2)',
            borderRadius: 'var(--r-full)', border: '1px solid var(--control-border)',
            maxWidth: '100%', overflowX: 'auto',
          }}>
            {TABS.map(([k, label, icon]) => (
              <Button key={k} variant={tab === k ? 'primary' : 'soft'} size="md" pill
                onClick={() => setTab(k)} icon={<Icon name={icon} size={24} width={1.8} />}>
                {label}
              </Button>
            ))}
          </span>
        </div>
      </PageHeader>

      <div key={tab} className="tab-in flex flex-col gap-4">
        {/* ══════════ 1. TOKEN ══════════ */}
        {tab === 'token' && (
          <>
            <SectionPanel title="สี">
              <Stack>
                {COLOR_GROUPS.map(([group, tokens]) => (
                  <div key={group} style={{ minWidth: 0 }}>
                    <div style={{ ...TEXT.bodyMed, color: 'var(--text)', marginBottom: 'var(--sp-2)' }}>{group}</div>
                    <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                      {tokens.map((t) => <Swatch key={t} token={t} />)}
                    </div>
                  </div>
                ))}
              </Stack>
            </SectionPanel>

            <SectionPanel title="ตัวอักษร" meta="Noto Sans Thai Looped · ตัวเลขใช้ Nunito (var(--mono))">
              <Stack>
                {TYPE_SCALE.map(([label, key, spec]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
                    <code style={{ ...TEXT.sm, fontFamily: 'var(--mono)', color: 'var(--accent-active)', width: 150, flex: 'none' }}>TEXT.{key}</code>
                    <span style={{ ...TEXT[key], color: 'var(--text)' }}>ลงเวลาด้วยการสแกนใบหน้า 1234</span>
                    <span style={{ ...TEXT.caption, color: 'var(--text-dim)' }}>{spec} · {label}</span>
                  </div>
                ))}
              </Stack>
            </SectionPanel>

            <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px,100%), 1fr))' }}>
              <SectionPanel title="ระยะ (spacing)">
                <Stack>
                  {SPACING.map((t) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                      <code style={{ ...TEXT.sm, fontFamily: 'var(--mono)', color: 'var(--text-dim)', width: 72, flex: 'none' }}>{t}</code>
                      <span style={{ height: 12, width: `var(${t})`, background: 'var(--accent)', borderRadius: 2, flex: 'none' }} />
                    </div>
                  ))}
                </Stack>
              </SectionPanel>

              <div className="flex flex-col gap-4">
                <SectionPanel title="มุม (radius)">
                  <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                    {RADIUS.map((t) => (
                      <div key={t} style={{ textAlign: 'center' }}>
                        <div style={{ width: 72, height: 56, background: 'var(--surface-blue)', borderRadius: `var(${t})` }} />
                        <code style={{ ...TEXT.caption, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{t}</code>
                      </div>
                    ))}
                  </div>
                </SectionPanel>

                <SectionPanel title="เงา (elevation)">
                  <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
                    {SHADOW.map((t) => (
                      <div key={t} style={{ textAlign: 'center' }}>
                        <div style={{ width: 96, height: 56, background: 'var(--bg)', borderRadius: 'var(--r-md)', boxShadow: `var(${t})` }} />
                        <code style={{ ...TEXT.caption, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{t}</code>
                      </div>
                    ))}
                  </div>
                </SectionPanel>
              </div>
            </div>
          </>
        )}

        {/* ══════════ 2. COMPONENT ══════════ */}
        {tab === 'component' && (
          <>
            <SectionPanel title="ปุ่ม · สวิตช์">
              <Stack>
                <Demo name="<Button variant>" note="primary · secondary · soft · ghost · outline-accent · accent-soft · ghost-danger">
                  <Button>primary</Button>
                  <Button variant="secondary">secondary</Button>
                  <Button variant="soft">soft</Button>
                  <Button variant="ghost">ghost</Button>
                  <Button variant="outline-accent">outline</Button>
                  <Button variant="accent-soft" icon={<Icon name="bell" size={18} />} />
                  <Button variant="ghost-danger">ghost-danger</Button>
                  <Button disabled>disabled</Button>
                </Demo>
                <Demo name="<Button size>" note="xs 32 · sm 36 · md 40 · lg 48 · pill = แคปซูล">
                  <Button size="xs">xs</Button>
                  <Button size="sm">sm</Button>
                  <Button size="md">md</Button>
                  <Button size="lg" pill icon={<Icon name="recon" size={20} />}>lg + pill</Button>
                </Demo>
                <Demo name="<Toggle>" note="ส่ง onClick = กดได้ · ไม่ส่ง = อ่านอย่างเดียว">
                  <Toggle on={on} onClick={() => setOn((v) => !v)} label="ตัวอย่างสวิตช์" />
                  <Toggle on={!on} onClick={() => setOn((v) => !v)} />
                  <Toggle on disabled />
                  <Toggle on={false} />
                </Demo>
              </Stack>
            </SectionPanel>

            <SectionPanel title="ช่องกรอก · ตัวกรอง">
              <Stack>
                <Demo name="<SearchInput>" note="grow = ยืดเต็มที่ว่าง (เพดาน 420)">
                  <SearchInput value={q} onChange={setQ} placeholder="ค้นหา ชื่อ-นามสกุล / รหัสพนักงาน" />
                </Demo>
                <Demo name="<FilterChip>" note="select = เปิด dropdown · choice = เลือก/ไม่เลือก">
                  <FilterChip icon={<Icon name="calendar-week" size={24} width={1.8} />} label="ช่วงวันที่">
                    <DateRangePicker bare from={from} to={to} onFrom={setFrom} onTo={setTo} max={localISO()} />
                  </FilterChip>
                  <FilterChip icon={<Icon name="calendar-time" size={24} width={1.8} />} label="เลือกเวร">
                    <SearchSelect bare hideCaret multi values={multi} options={OPTS}
                      onToggle={(v) => setMulti((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))}
                      onClear={() => setMulti([])} clearLabel="เลือกทุกเวร" placeholder="ทั้งหมด" maxTriggerWidth={120} />
                  </FilterChip>
                  <FilterChip variant="choice" active={on} onClick={() => setOn((v) => !v)}
                    icon={<Icon name="progress-alert" size={14} width={2.2} />} label="เฉพาะรายงานผิดปกติ" />
                </Demo>
                <Demo name="<SearchSelect> · <DatePicker>" note="dropdown ค้นหาได้ · ปฏิทินเลือกวันเดียว">
                  <SearchSelect value={sel} onChange={setSel} options={OPTS} width={180} />
                  <DatePicker value={date} onChange={setDate} max={localISO()} />
                </Demo>
              </Stack>
            </SectionPanel>

            <SectionPanel title="ป้าย · การ์ดข้อมูล">
              <Stack>
                <Demo name="<StatusBadge>" note="สถานะการลงเวลา 5 แบบ">
                  <StatusBadge status="ontime" />
                  <StatusBadge status="late" label="มาสาย 12 นาที" />
                  <StatusBadge status="early" />
                  <StatusBadge status="outarea" />
                  <StatusBadge status="leave" label="ลืมลงเวลาออก" />
                </Demo>
                <Demo name="<ShiftBadge>" note="เวรเช้า · บ่าย · ดึก">
                  <ShiftBadge shift="morning" />
                  <ShiftBadge shift="afternoon" />
                  <ShiftBadge shift="night" />
                </Demo>
                <Demo name="<Avatar>" note="ไม่มีรูป = อักษรย่อ + สีจาก seed">
                  <Avatar name="ภูมิ แสงทอง" seed="10001" size={56} />
                  <Avatar name="ณิชา ทองดี" seed="10002" />
                  <Avatar name="สมชาย ใจดี" seed="10003" size={28} />
                </Demo>
                <Demo name="<Field> · <ContactPill>">
                  <Field label="รหัสพนักงาน" value="10001" mono />
                  <Field label="แผนก" value="การเงิน" />
                  <ContactPill icon="mail" text="staff10001@hospital.example.com" />
                  <ContactPill icon="phone" text="081-482-3705" />
                </Demo>
                <Demo name="<StatCard>" note="col (ค่าเริ่มต้น) · row · size sm/md/lg">
                  <div style={{ width: 220 }}>
                    <StatCard tone="accent" label="พนักงาน" unit="คน" value="48"
                      icon={<Icon name="person" size={24} color="currentColor" />} />
                  </div>
                  <div style={{ width: 240 }}>
                    <StatCard tone="ok" layout="row" label="ลงทะเบียนแล้ว" unit="คน" value="34"
                      icon={<Icon name="mood-check" size={24} color="currentColor" />} />
                  </div>
                </Demo>
                <Demo name="<NotificationCard>" note="info · success · warn · danger · system">
                  <div style={{ width: 'min(420px, 100%)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
                    <NotificationCard kind="warn" title="มีคำขอลงทะเบียนรออนุมัติ 3 แห่ง"
                      body="โรงพยาบาลสาธิต · โรงพยาบาลทดสอบ 2" time={new Date(Date.now() - 6e5).toISOString()} />
                    <NotificationCard kind="success" read title="ลงทะเบียนใบหน้าครบทั้งแผนก"
                      body="พนักงาน 12 คน ครบ 3 รูปแล้ว" time={new Date(Date.now() - 9e7).toISOString()} />
                  </div>
                </Demo>
              </Stack>
            </SectionPanel>

            <SectionPanel title="ตาราง · แบ่งหน้า" bodyPadding={false}>
              <DataTable columns={cols} rows={TABLE_ROWS} rowKey={(r) => r.name} sticky={false} minWidth={640} />
              <Pagination page={page} pageSize={10} total={48} shown={TABLE_ROWS.length} onPage={setPage} />
            </SectionPanel>

            <SectionPanel title="สถานะระหว่างทาง">
              <Stack>
                <Demo name="<Spinner> · <Loading>">
                  <Spinner />
                  <Loading pad={0} />
                </Demo>
                <Demo name="<Skel> · <SkelRows>">
                  <div style={{ width: 'min(420px,100%)' }}><SkelRows rows={2} /></div>
                  <Skel w={120} h={32} />
                </Demo>
                <Demo name="<EmptyState> · <ErrorBox>">
                  <div style={{ width: 'min(300px,100%)' }}><EmptyState compact icon="bell" text="ยังไม่มีการแจ้งเตือน" /></div>
                  <div style={{ flex: 1, minWidth: 240 }}><ErrorBox prefix="ผิดพลาด">เชื่อมต่อฐานข้อมูลไม่สำเร็จ</ErrorBox></div>
                </Demo>
                <Demo name="<Info>" note="เครื่องหมายคำถามอธิบายศัพท์ในหัวข้อ">
                  <span style={{ ...TEXT.bodyMed }}>อัตราเข้าทำงาน<Info text="สัดส่วนพนักงานที่ลงเวลาเข้างานเทียบกับพนักงานทั้งหมดในช่วงที่เลือก" /></span>
                </Demo>
              </Stack>
            </SectionPanel>

            <SectionPanel title="กล่องซ้อน · แจ้งผล">
              <Demo name="<Modal> · <BottomSheet> · dialog · toast" note="แผงล่างจอใช้แทน modal บนมือถือ">
                <Button variant="secondary" onClick={() => setModal(true)}>เปิด Modal</Button>
                <Button variant="secondary" onClick={() => setSheet(true)}>เปิด BottomSheet</Button>
                <Button variant="secondary" onClick={() => dialog.confirm({ title: 'ยืนยันการทำรายการ?', body: 'ตัวอย่างกล่องยืนยันของระบบ' })}>dialog.confirm</Button>
                <Button variant="secondary" onClick={() => toast.success('บันทึกเรียบร้อย')}>toast.success</Button>
              </Demo>
            </SectionPanel>

            <SectionPanel title="กราฟ">
              <Stack>
                <Demo name="<PercentBars fit>" note="แท่งพอดีความกว้าง · ชี้ legend = เน้นแท่งนั้น">
                  <div style={{ width: '100%' }}>
                    <PercentBars fit height={220} rows={[
                      { label: 'การเงิน', pct: 92 }, { label: 'พยาบาล', pct: 78 },
                      { label: 'เภสัช', pct: 64 }, { label: 'ธุรการ', pct: 51 },
                    ]} />
                  </div>
                </Demo>
                <Demo name="<Donut> · <Donut pie>">
                  <Donut centerLabel="รวม" centerValue="120 คน" size={140} unit="คน" segs={[
                    { label: 'ตรงเวลา', v: 82, color: 'var(--ok)' },
                    { label: 'มาสาย', v: 26, color: 'var(--warn)' },
                    { label: 'ขาดงาน', v: 12, color: 'var(--danger)' },
                  ]} />
                </Demo>
                <Demo name="<StackedColumns>">
                  <div style={{ width: '100%' }}>
                    <StackedColumns height={200} groups={[
                      { label: '04/08', values: { ontime: 32, late: 8, absent: 4 } },
                      { label: '05/08', values: { ontime: 30, late: 10, absent: 3 } },
                      { label: '06/08', values: { ontime: 35, late: 6, absent: 2 } },
                    ]} series={[
                      { key: 'ontime', label: 'ตรงเวลา', color: 'var(--ok)' },
                      { key: 'late', label: 'มาสาย', color: 'var(--warn)' },
                      { key: 'absent', label: 'ขาดงาน', color: 'var(--danger)' },
                    ]} />
                  </div>
                </Demo>
                <Demo name="<TrendLine> · <SegmentBar> · <MeterRow>">
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                    <TrendLine height={160} points={[
                      { label: '04/08', v: 24 }, { label: '05/08', v: 25 }, { label: '06/08', v: 21 },
                      { label: '07/08', v: 30 }, { label: '08/08', v: 36 }, { label: '09/08', v: 32 },
                    ]} />
                    <SegmentBar segs={[
                      { v: 2, color: 'var(--danger)', label: 'เชื่อมต่อไม่ได้' },
                      { v: 8, color: 'var(--ok)', label: 'เชื่อมต่อได้' },
                    ]} />
                    <MeterRow label="การเงิน" value="92%" pct={92} color="var(--ok)" dot />
                  </div>
                </Demo>
              </Stack>
            </SectionPanel>

            <SectionPanel title="เมนู · หัวเรื่อง">
              <Stack>
                <Demo name="<MenuItem>" note="เมนูใน Sidebar — active = แคปซูลสีหลัก · badge = งานค้าง">
                  <div style={{ width: 'min(280px,100%)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
                    <MenuItem icon="overview" label="หน้าหลัก" active />
                    <MenuItem icon="hospital" label="อนุมัติโรงพยาบาล" badge={3} />
                    <MenuItem icon="health" label="สถานะระบบ" />
                  </div>
                </Demo>
                <Demo name="<PageHeader> · <SectionPanel>" note="หัวเรื่องหน้า = การ์ดไล่สีฟ้า · แผงเนื้อหา = กรอบเทา + การ์ดขาว">
                  <div style={{ width: '100%' }}>
                    <PageHeader title="ชื่อหน้า" desc="คำอธิบายสั้น ๆ ว่าหน้านี้ใช้ทำอะไร"
                      actions={<Button variant="soft" size="lg" pill icon={<Icon name="recon" size={20} />}>รีเฟรช</Button>} />
                  </div>
                </Demo>
              </Stack>
            </SectionPanel>
          </>
        )}

        {/* ══════════ 3. ICON ══════════ */}
        {tab === 'icon' && (
          <SectionPanel title="ไอคอน" meta={`${icons.length} จาก ${ICON_NAMES.length} ตัว · Tabler Icons (outline)`}
            filters={<SearchInput value={iconQ} onChange={setIconQ} placeholder="ค้นชื่อไอคอน…" width={240} />}>
            {icons.length === 0 ? (
              <EmptyState text="ไม่พบไอคอนที่ค้นหา" />
            ) : (
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                {icons.map((n) => (
                  <div key={n} title={n} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 'var(--sp-2)', padding: 'var(--sp-3)', minWidth: 0,
                    borderRadius: 'var(--r-lg)', background: 'var(--surface-alt)', color: 'var(--text)',
                  }}>
                    <Icon name={n} size={24} width={1.8} />
                    <code style={{
                      ...TEXT.caption, fontFamily: 'var(--mono)', color: 'var(--text-dim)',
                      maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{n}</code>
                  </div>
                ))}
              </div>
            )}
          </SectionPanel>
        )}
      </div>

      <Modal open={modal} title="ตัวอย่าง Modal" subtitle="กล่องซ้อนกลางจอ (จอใหญ่)" onClose={() => setModal(false)}
        footer={<span>ส่วนท้ายไว้ใส่ปุ่มยืนยัน/ยกเลิก</span>}>
        <p style={{ ...TEXT.body, color: 'var(--text-dim)', margin: 0 }}>
          เนื้อหาในกล่องเลื่อนเองได้เมื่อยาวเกิน 88% ของความสูงจอ
        </p>
      </Modal>

      <BottomSheet open={sheet} title="ตัวอย่าง BottomSheet" onClose={() => setSheet(false)}>
        <p style={{ ...TEXT.body, color: 'var(--text-dim)', margin: 0 }}>
          แผงเลื่อนขึ้นจากขอบล่างจอ — ใช้แทน modal บนมือถือ และใช้เก็บตัวกรองตอนชิปเยอะ
        </p>
      </BottomSheet>
    </div>
  )
}
