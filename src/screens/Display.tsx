import type { ReactNode } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { SectionPanel } from '../components/layout/SectionPanel'
import { HeroArt } from '../components/HeroArt'
import { StatCard } from '../components/data-display/StatCard'
import { StatusBadge } from '../components/data-display/StatusBadge'
import { Button } from '../components/inputs/Button'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { FONT_SCALES, useApp, type FontScale, type ThemeMode } from '../state'

// ตั้งค่าการแสดงผล — ธีม + ขนาดตัวอักษร
// เป็นค่าของ "เครื่องนี้" ไม่ใช่ของบัญชี (เก็บใน localStorage ผ่าน state.tsx)
// เปลี่ยนแล้วเห็นผลทันทีทั้งแอพ ไม่มีปุ่มบันทึก

// ตัวอย่างสีในการ์ด = พื้น/ตัวอักษร/สีหลัก ของธีมนั้น (ไม่ต้องสลับธีมจริงก็เห็นว่าหน้าตาประมาณไหน)
const THEMES: { mode: ThemeMode; label: string; sub: string; icon: string; swatch: [string, string, string] }[] = [
  { mode: 'light', label: 'สว่าง', sub: 'ชุดสีมาตรฐานตามดีไซน์', icon: 'sun', swatch: ['#FFFFFF', '#F5F7FA', '#3382E7'] },
  { mode: 'dark', label: 'มืด', sub: 'พื้นเทาเข้ม ถนอมสายตาในที่แสงน้อย', icon: 'moon', swatch: ['#161A23', '#222835', '#5682E9'] },
  { mode: 'midnight', label: 'มิดไนต์', sub: 'พื้นน้ำเงินเข้ม โทนเย็นกว่าธีมมืด', icon: 'moon', swatch: ['#101A2E', '#1B2A45', '#6E9BFF'] },
  { mode: 'sepia', label: 'เซเปีย', sub: 'พื้นกระดาษโทนอุ่น ลดแสงฟ้าจ้า', icon: 'haze', swatch: ['#FBF6EC', '#EFE6D5', '#A8763A'] },
  { mode: 'contrast', label: 'คอนทราสต์สูง', sub: 'ขาว-ดำ เส้นขอบเข้ม อ่านง่ายที่สุด', icon: 'eye', swatch: ['#FFFFFF', '#EAEAEA', '#0B4FD1'] },
  { mode: 'hosxp', label: 'HOSxP (คลาสสิก)', sub: 'ฟ้าไล่เฉดมีแสง แบบหน้าจอ uniGUI/ExtJS ที่ HOSxP ใช้', icon: 'hospital', swatch: ['#FFFFFF', '#C6D9F1', '#15428B'] },
  { mode: 'glass', label: 'Liquid Glass', sub: 'กระจกฝ้าแบบ iOS — พื้นผิวโปร่ง เบลอฉากหลัง', icon: 'haze', swatch: ['#DCE9FF', '#F3E9FF', '#0A84FF'] },
  { mode: 'system', label: 'ตามระบบ', sub: 'สลับสว่าง/มืดตามการตั้งค่าของเครื่อง', icon: 'system', swatch: ['#FFFFFF', '#161A23', '#3382E7'] },
]

const FONT_LABEL: Record<number, { label: string; sub: string }> = {
  0.9: { label: 'เล็ก', sub: 'เห็นข้อมูลต่อหน้าจอได้มากที่สุด' },
  1: { label: 'ปกติ', sub: 'ขนาดมาตรฐานตามดีไซน์' },
  1.15: { label: 'ใหญ่', sub: 'อ่านสบายขึ้นบนจอความละเอียดสูง' },
  1.3: { label: 'ใหญ่มาก', sub: 'สำหรับคนที่มองตัวเล็กไม่ชัด' },
}

/** ปุ่มตัวเลือกทรงการ์ด — เลือกอยู่ = ขอบ/พื้นสีหลัก + ติ๊กมุมขวา */
function Choice({ on, onClick, children, minWidth = 200 }: {
  on: boolean
  onClick: () => void
  children: ReactNode
  minWidth?: number
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="lift" style={{
      flex: `1 1 ${minWidth}px`, minWidth: 'min(100%, 200px)',
      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
      padding: 'var(--sp-3) var(--sp-4)', textAlign: 'left', cursor: 'pointer',
      fontFamily: 'var(--sans)', borderRadius: 'var(--r-lg)',
      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--control-border)'}`,
      background: on ? 'var(--accent-light)' : 'var(--bg)',
    }}>
      {children}
      <span aria-hidden style={{
        width: 22, height: 22, flex: 'none', borderRadius: 'var(--r-full)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: on ? 'var(--accent-active)' : 'transparent',
        border: on ? 'none' : '1.5px solid var(--control-border)',
        color: 'var(--bg)',
      }}>
        {on && <Icon name="check" size={13} width={2.5} />}
      </span>
    </button>
  )
}

export function Display() {
  const { theme, themeMode, setThemeMode, fontScale, setFontScale } = useApp()
  const current = THEMES.find((t) => t.mode === theme)

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      <PageHeader
        title="การแสดงผล"
        desc="เลือกธีมและขนาดตัวอักษรให้อ่านสบายตา — เป็นค่าของเครื่องนี้เท่านั้น ไม่กระทบผู้ใช้คนอื่น"
        art={<HeroArt icon="haze" />}
      />

      {/* ---------- ธีม ---------- */}
      <SectionPanel title="ธีม" meta={`กำลังใช้: ${current?.label ?? theme}`}>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          {THEMES.map((t) => (
            <Choice key={t.mode} on={themeMode === t.mode} onClick={() => setThemeMode(t.mode)}>
              {/* ตัวอย่างสีของธีมนั้น — พื้น / พื้นการ์ด / สีหลัก */}
              <span aria-hidden style={{
                width: 44, height: 44, flex: 'none', borderRadius: 'var(--r-md)', overflow: 'hidden',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr',
                border: '1px solid var(--control-border)',
              }}>
                <span style={{ background: t.swatch[0] }} />
                <span style={{ background: t.swatch[1] }} />
                <span style={{ background: t.swatch[2] }} />
                <span style={{
                  background: t.swatch[0], color: t.swatch[2],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={t.icon} size={12} width={2} />
                </span>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ ...TEXT.bodyMed, color: 'var(--text)', display: 'block' }}>{t.label}</span>
                <span style={{ ...TEXT.sm, color: 'var(--text-dim)', display: 'block' }}>{t.sub}</span>
              </span>
            </Choice>
          ))}
        </div>
      </SectionPanel>

      {/* ---------- ขนาดตัวอักษร ---------- */}
      <SectionPanel title="ขนาดตัวอักษร" meta={`${Math.round(fontScale * 100)}% ของขนาดมาตรฐาน`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            {FONT_SCALES.map((sc) => (
              <Choice key={sc} on={fontScale === sc} onClick={() => setFontScale(sc as FontScale)} minWidth={170}>
                <span aria-hidden style={{
                  width: 40, height: 40, flex: 'none', borderRadius: 'var(--r-md)',
                  display: 'inline-flex', alignItems: 'baseline', justifyContent: 'center',
                  background: 'var(--surface-alt)', color: 'var(--accent-active)',
                  fontFamily: 'var(--sans)', fontWeight: 500, paddingTop: 8,
                }}>
                  <span style={{ fontSize: Math.round(11 * sc + 5) }}>ก</span>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ ...TEXT.bodyMed, color: 'var(--text)', display: 'block' }}>{FONT_LABEL[sc].label}</span>
                  <span style={{ ...TEXT.sm, color: 'var(--text-dim)', display: 'block' }}>{FONT_LABEL[sc].sub}</span>
                </span>
              </Choice>
            ))}
          </div>

          {(themeMode !== 'light' || fontScale !== 1) && (
            <span>
              <Button variant="ghost" size="sm" onClick={() => { setThemeMode('light'); setFontScale(1) }}
                icon={<Icon name="recon" size={16} width={1.8} />}>คืนค่าเริ่มต้น</Button>
            </span>
          )}
        </div>
      </SectionPanel>

      {/* ---------- ตัวอย่าง ---------- */}
      <SectionPanel title="ตัวอย่าง" meta="ของจริงจากหน้าอื่นในระบบ">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="grid gap-4 stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px,100%), 1fr))' }}>
            <StatCard tone="accent" layout="row" label="พนักงาน" unit="คน" value="48"
              icon={<Icon name="person" size={24} color="currentColor" />} />
            <StatCard tone="ok" layout="row" label="ลงเวลาแล้ว" unit="คน" value="315"
              icon={<Icon name="scan" size={24} color="currentColor" />} />
            <StatCard tone="warn" layout="row" label="มาสาย" unit="คน" value="23"
              icon={<Icon name="clock-alert" size={24} color="currentColor" />} />
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <StatusBadge status="ontime" />
            <StatusBadge status="late" label="มาสาย 12 นาที" />
            <StatusBadge status="early" />
          </div>

          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: 'var(--text-dim)', maxWidth: '68ch' }}>
            ข้อความตัวอย่างสำหรับดูขนาดและความคมชัด — ระบบสแกนใบหน้าเพื่อลงเวลาปฏิบัติงานของโรงพยาบาล
            เชื่อมตรงเข้า HOSxP ตรวจสอบการเข้า-ออกงานของพนักงานได้ทั้งรายวันและรายเดือน
          </p>
        </div>
      </SectionPanel>
    </div>
  )
}
