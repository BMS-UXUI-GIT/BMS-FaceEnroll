import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'
import { Button } from './inputs/Button'
import { SearchSelect } from './SearchSelect'
import { NotificationMenu } from './NotificationMenu'
import { asset } from '../assets'

// แถบบนสุด — Figma node 227:6401 ("Group 18")
// สเปกจริง: 1408x112 · พื้นขาว · มุมบน [24,24,0,0] (มุมมาจากการ์ดแม่ใน App.tsx)
//   ซ้าย: โลโก้ 64x64 r-xl · gap 16 · "BMS FaceEnroll" 20/700 · คำบรรยาย 14/400 ดำ 60% (gap 5)
//   ขวา: ช่องค้นหาทั้งระบบ + การ์ดเลือกโรง + ปุ่มกระดิ่ง (การ์ดโปรไฟล์ย้ายไปท้าย Sidebar)
//   padding 24 รอบด้าน
//
// ⚠️ ดีไซน์นี้ไม่มี: ชื่อหน้า · เปลี่ยนรหัสผ่าน · สลับธีม · ออกจากระบบ
//    (เปลี่ยนรหัสผ่าน / ออกจากระบบ อยู่ในเมนูโปรไฟล์)
//    ตัวเลือกโรงพยาบาลเพิ่มเข้ามานอกดีไซน์ — จำเป็นเพราะเกือบทุกหน้าเป็นข้อมูลรายโรง
//    ส่วนปุ่มสลับธีมตัดทิ้ง เพราะ Figma มีโหมดสว่างอย่างเดียว (theme.css ไม่มีชุดสีมืดแล้ว)

// ตัวเลือกโรงพยาบาลบน header — เดิมซ่อนอยู่ในเมนูโปรไฟล์ ย้ายออกมาให้เห็น/กดได้ทันที
// เพราะเกือบทุกหน้าดูข้อมูลรายโรง ถ้ายังไม่เลือกจะไม่มีข้อมูลแสดง
function HospitalSelect() {
  const { session, currentHcode, setHcode, isSuper } = useApp()
  if (!session) return null
  const many = isSuper || session.hospitals.length > 1
  const opts = [
    ...(isSuper ? [{ value: '*', label: 'ทุกโรงพยาบาล' }] : []),
    ...session.hospitals.map((h) => ({
      value: h.value,
      label: h.value === session.demo_hcode ? `${h.label} · ตัวอย่าง` : h.label,
      sub: h.value,
    })),
  ]
  const cur = opts.find((o) => o.value === currentHcode)

  // การ์ดตาม Figma node 379:13946 — 333x62 · r-lg · ขอบบางจาง (control-border)
  //   พื้นไล่สีขาว → ฟ้า (Figma #CCE3FF = token --surface-wash เพื่อให้ธีมมืดสลับตามได้)
  //   ภาพตึกโรงพยาบาล 64 ชิดขวา มุมขวาล่างมน 24 (ใช้ไฟล์เดียวกับภาพประกอบหน้าภาพรวมระบบ)
  const card: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', flex: 'none',
    width: 333, height: 62, paddingLeft: 'var(--sp-4)', overflow: 'hidden',
    borderRadius: 'var(--r-lg)', border: '0.5px solid var(--control-border)',
    background: 'linear-gradient(to right, var(--bg), var(--surface-wash))',
  }
  // ภาพวางในกรอบ 77x60 ชิดขวา ล้นขอบล่างแล้วถูก crop ตามที่ Figma วางไว้ (frame 379:13950)
  const art = (
    <span aria-hidden style={{ position: 'relative', flex: 'none', width: 77, height: 60, overflow: 'hidden', borderBottomRightRadius: 'var(--r-xl)' }}>
      <img src={asset('/hero-hospital.svg')} alt="" width={64} height={64}
        className="pointer-events-none select-none"
        style={{ position: 'absolute', left: 1, top: 4 }} />
    </span>
  )
  const caption = (
    <span style={{ ...TEXT.caption, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>ฐานข้อมูลปัจจุบัน</span>
  )

  // มีโรงเดียว → ไม่ต้องเลือก แสดงชื่อโรงเฉยๆ
  if (!many) {
    if (!cur) return null
    return (
      <span className="hide-sm" style={card}>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minWidth: 0, flex: 1 }}>
          {caption}
          <span style={{ ...TEXT.bodyMed, color: 'var(--text)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cur.label}
          </span>
        </span>
        {art}
      </span>
    )
  }

  // ทั้งการ์ดเป็นปุ่มเปิดเมนู (ไม่ใช่แค่บรรทัดชื่อโรง)
  return (
    <div className="hide-sm" style={{ flex: 'none' }}>
      <SearchSelect hideCaret value={currentHcode} onChange={setHcode} options={opts}
        searchPlaceholder="ค้นชื่อ/รหัสโรงพยาบาล…" triggerStyle={card}
        renderTrigger={(sel) => (
          <>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minWidth: 0, flex: 1 }}>
              {caption}
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', maxWidth: '100%', minWidth: 0 }}>
                <span style={{ ...TEXT.bodyMed, color: sel ? 'var(--text)' : 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sel?.label ?? 'เลือกโรงพยาบาล…'}
                </span>
                <Icon name="chevron-down" size={16} width={2} color="var(--text-faint)" style={{ flex: 'none' }} />
              </span>
            </span>
            {art}
          </>
        )} />
    </div>
  )
}

export function Topbar({ onMenu, onSearch }: { onMenu?: () => void; onSearch?: () => void }) {
  const { session, isDark } = useApp()
  if (!session) return null

  return (
    <header className="topbar" style={{
      height: 'var(--topbar-h)', flex: 'none', boxSizing: 'border-box', overflow: 'hidden',
      // header กระจก — โปร่งแสง + เบลอ ให้เห็น content ที่เลื่อนลอดอยู่ด้านหลัง
      background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      padding: 'var(--sp-4) var(--sp-6)',
      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
    }}>
      {onMenu && (
        <Button onClick={onMenu} title="เมนู" variant="soft" size="xs"
          icon={<Icon name="menu" size={18} width={2} />} />
      )}

      {/* โลโก้เฉพาะสัญลักษณ์ (ไม่มีตัวอักษร) — ชื่อระบบเป็นข้อความข้าง ๆ อยู่แล้ว
          ธีมมืดใช้ชุดสีขาวจาก Figma (node 535:233) เพราะชุดสีน้ำเงินจมไปกับพื้นเข้ม */}
      <img className="topbar-logo" src={asset(isDark ? '/logo-mark-dark.svg' : '/logo-mark.svg')}
        alt="" width={56} height={56}
        style={{ display: 'block', flex: 'none' }} />

      {/* ชื่อระบบใช้ wordmark จาก Figma (node 401:21401) แทนข้อความ
          ธีมมืดใช้ไฟล์คนละใบ (Figma node 535:233 — ชุดสีขาวสำหรับพื้นเข้ม) */}
      <img className="hide-sm" src={asset(isDark ? '/wordmark-dark.svg' : '/wordmark.svg')} alt="BMS FaceEnroll"
        style={{ display: 'block', flex: 'none', height: 34, width: 'auto' }} />

      {/* ตัวเว้นสองข้างช่องค้นหา — ดันช่องค้นหาให้อยู่กลางที่ว่างที่เหลือเสมอ */}
      <span aria-hidden style={{ flex: 1, minWidth: 0 }} />

      {/* ค้นหาทั้งระบบ — กดที่นี่หรือ ⌘K/Ctrl+K ก็เปิดหน้าต่างค้นหาเดียวกัน */}
      {onSearch && (
        <button type="button" onClick={onSearch} title="ค้นหาทั้งระบบ (⌘K)" className="hide-sm" style={{
          // อยู่ในโฟลว์ปกติ (absolute แล้วทับการ์ดเลือกโรงตอนจอแคบ)
          // flex:1 + maxWidth -> กินที่ตรงกลางที่เหลือ แล้วยุบตัวเองก่อนของอื่นเสมอ
          flex: '0 1 520px', minWidth: 120,
          display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
          minHeight: 48, padding: '0 var(--sp-2) 0 var(--sp-4)', borderRadius: 'var(--r-full)',
          border: '0.5px solid var(--control-border)', background: 'var(--surface-alt)',
          color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'var(--sans)',
        }}>
          <Icon name="search" size={20} width={1.8} />
          {/* บอกขอบเขตตั้งแต่ยังไม่กด — ผู้ใช้ไม่รู้ว่า "ทั้งระบบ" ค้นอะไรได้บ้าง */}
          <span style={{ ...TEXT.sm, flex: 1, minWidth: 0, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>ค้นหาเมนู · โรงพยาบาล · พนักงาน…</span>
          <kbd style={{
            ...TEXT.caption, fontFamily: 'var(--mono)', color: 'var(--text-dim)',
            padding: '2px 8px', borderRadius: 'var(--r-sm)', background: 'var(--bg)', whiteSpace: 'nowrap',
          }}>⌘K</kbd>
        </button>
      )}

      <span aria-hidden style={{ flex: 1, minWidth: 0 }} />

      {/* กลุ่มขวาสุด — การ์ดเลือกโรง + กระดิ่ง */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-3)', flex: 'none' }}>
      <HospitalSelect />

      <NotificationMenu />
      </span>

    </header>
  )
}
