import { useEffect, useMemo, useState } from 'react'
import { ROLE_TH, useApp } from '../state'
import { nf } from '../hooks'
import { Icon } from '../icons'
import { Info } from '../components/Info'
import { api } from '../api'
import { dialog, toast } from '../components/dialog'
import { PAGE_SIZE, usePaged } from '../components/Pager'
import { Pagination } from '../components/data-display/Pagination'
import { SectionPanel } from '../components/layout/SectionPanel'
import { HeroArt } from '../components/HeroArt'
import { SkelRows } from '../components/Skeleton'
import { StatCard } from '../components/data-display/StatCard'
import { Button } from '../components/inputs/Button'
import { SearchInput } from '../components/inputs/SearchInput'
import { FilterBar } from '../components/inputs/FilterBar'
import { FilterChip } from '../components/inputs/FilterChip'
import { SearchSelect } from '../components/SearchSelect'
import { NewUserModal, genPassword } from '../components/NewUserModal'
import { asset } from '../assets'
import { TEXT } from '../typography'

// จัดการผู้ใช้และสิทธิ์ (superadmin เท่านั้น) — สร้างบัญชี ตั้งบทบาท เลือกแท็บที่เห็นรายคน

// การ์ด popup + ช่องกรอก — ใช้ token ชุดเดียวกับหน้าอื่น
const card: React.CSSProperties = { background: 'var(--bg)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)' }
const field: React.CSSProperties = { padding: 'var(--sp-2) var(--sp-3)', minHeight: 40, border: '1px solid var(--control-border)', borderRadius: 'var(--r-md)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none' }

type User = { username: string; display_name: string; role: string; hcodes: string[]; tabs: string[] | null; effective_tabs: string[]; active: boolean; last_login_at: string | null }
type UsersRes = { users: User[]; roles: string[]; all_tabs: string[]; role_default_tabs: Record<string, string[]>; role_tabs: Record<string, string[]> }

// 1 สิทธิ์ = 1 กลุ่มเมนู — ชื่อตรงกับที่ขึ้นในแถบเมนูซ้าย, tip ขึ้นเป็น tooltip ที่ไอคอน ⓘ
const TAB_INFO: Record<string, { name: string; tip: string; danger?: boolean; icon?: string }> = {
  overview: { name: 'หน้าหลัก', icon: 'overview', tip: 'เปิดเมนู หน้าหลัก' },
  face: { name: 'ลงทะเบียนใบหน้า', icon: 'face', tip: 'เปิดเมนู ลงทะเบียนใบหน้า' },
  attendance: { icon: 'clock', name: 'ลงเวลา', tip: 'เปิดเมนู ลงเวลา และกลุ่มรายงาน·วิเคราะห์ทั้งหมด (รายบุคคล · รายแผนก · รายเวร · การมาสาย/ออกก่อน · รายงาน)' },
  settings: { icon: 'system', name: 'ตั้งค่าโรงพยาบาล', tip: 'เปิดเมนู ตั้งค่าแอปสแกน และ จุดลงเวลา — แก้นโยบายการสแกนของโรงได้' },
  health: { icon: 'health', name: 'สถานะระบบ', tip: 'เปิดเมนู สถานะระบบ — ดูว่าแต่ละโรงพยาบาลเชื่อมต่อได้ปกติไหม' },
  approve: { icon: 'hospital', name: 'อนุมัติโรงพยาบาล', danger: true, tip: 'เปิดเมนู อนุมัติโรงพยาบาล — รับโรงใหม่เข้าระบบ หรือปฏิเสธคำขอได้' },
  tenants: { icon: 'hospital', name: 'จัดการโรงพยาบาล', danger: true, tip: 'เปิดเมนู จัดการโรงพยาบาล — เปิด–ปิดการใช้งานของโรงไหนก็ได้ในระบบ ต่ออายุเดโม ปักธงเตือน' },
  audit: { icon: 'clock', name: 'ประวัติการจัดการ', tip: 'เปิดเมนู ประวัติการจัดการ — ดูอย่างเดียว (admin ของโรงพยาบาลเห็นเฉพาะโรงพยาบาลตัวเอง)' },
  help: { icon: 'info', name: 'ช่วยเหลือ', tip: 'เปิดเมนู ช่วยเหลือ — คู่มือการใช้งาน (เปิดได้ทุกบทบาทอยู่แล้ว)' },
  users: { icon: 'people', name: 'ผู้ใช้และสิทธิ์', danger: true, tip: 'เปิดเมนู ผู้ใช้และสิทธิ์ — สร้าง–ลบบัญชี รีเซ็ตรหัสผ่าน และให้สิทธิ์คนอื่นได้' },
}

/** ปุ่มจัดการในแถวผู้ใช้ — ทรงแคปซูลพื้นอ่อน ชุดเดียวกับป้ายสถานะหน้าอื่น */
function ActionPill({ label, tone = 'plain', disabled, onClick }: {
  label: string; tone?: 'plain' | 'accent' | 'ok' | 'warn'; disabled?: boolean; onClick: () => void
}) {
  const c = tone === 'accent' ? { bg: 'var(--accent-light)', fg: 'var(--accent-active)' }
    : tone === 'ok' ? { bg: 'var(--ok-light)', fg: 'var(--ok)' }
    : tone === 'warn' ? { bg: 'var(--warn-light)', fg: 'var(--warn)' }
    : { bg: 'var(--bg)', fg: 'var(--text-dim)' }
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      ...TEXT.sm, fontWeight: 500, fontFamily: 'var(--sans)', whiteSpace: 'nowrap',
      padding: 'var(--sp-1) var(--sp-3)', minHeight: 32, borderRadius: 'var(--r-full)', border: 'none',
      background: c.bg, color: c.fg, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
    }}>{label}</button>
  )
}

/** สวิตช์เปิด/ปิด — ชุดเดียวกับหน้าตั้งค่าแอปสแกน */
function Toggle({ on, disabled }: { on: boolean; disabled?: boolean }) {
  return (
    <span aria-hidden style={{
      width: 44, height: 24, borderRadius: 'var(--r-full)', flex: 'none', position: 'relative',
      opacity: disabled ? 0.6 : 1,
      background: on ? 'var(--ok)' : 'var(--surface-gray)', transition: 'background .15s',
    }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: 'var(--r-full)',
        background: 'var(--bg)', boxShadow: 'var(--shadow)', transition: 'left .15s',
      }} />
    </span>
  )
}

// แถวสิทธิ์ 1 กลุ่มเมนู — ไอคอน → ชื่อเมนู → สวิตช์ (สิทธิ์ระดับระบบใช้โทนส้ม)
function PermCard({ tab, on, busy, onClick }: { tab: string; on: boolean; busy: boolean; onClick: () => void }) {
  const info = TAB_INFO[tab] ?? { name: tab, tip: tab, icon: 'info' }
  const hi = info.danger ? 'var(--warn)' : 'var(--accent-active)'
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} disabled={busy} title={info.tip} style={{
      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%', textAlign: 'left',
      padding: 'var(--sp-2) var(--sp-3)', minHeight: 56, cursor: busy ? 'default' : 'pointer',
      fontFamily: 'var(--sans)', border: 'none', borderRadius: 'var(--r-lg)',
      // พื้นเทาเสมอ — สถานะเปิด/ปิดดูจากสวิตช์กับสีไอคอน
      background: 'var(--surface-alt)',
    }}>
      <span aria-hidden style={{
        width: 32, height: 32, flex: 'none', borderRadius: 'var(--r-md)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: on ? hi : 'var(--bg)', color: on ? 'var(--bg)' : 'var(--text-dim)',
      }}>
        <Icon name={info.icon ?? 'info'} size={18} width={1.8} />
      </span>
      <span style={{ flex: 1, minWidth: 0, ...TEXT.bodyMed, color: on ? hi : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {info.name}
      </span>
      <Toggle on={on} disabled={busy} />
    </button>
  )
}


// แท็บใน popup จัดการสิทธิ์
const PERM_TABS: ['scope' | 'perms' | 'account', string][] = [
  ['scope', 'ขอบเขตโรงพยาบาล'],
  ['perms', 'สิทธิ์เมนู'],
  ['account', 'จัดการบัญชี'],
]

/** popup ตั้งสิทธิ์ของผู้ใช้ 1 คน — ขอบเขตโรง + กลุ่มเมนูที่เปิดใช้ได้ */
function PermissionsModal({ u, data, busy, isMe, patch, onResetPassword, onRemove, hospOpts, searchHospitals, onClose }: {
  u: User
  data: UsersRes | null
  busy: boolean
  /** บัญชีของตัวเอง — ลบไม่ได้ */
  isMe: boolean
  patch: (username: string, body: Record<string, unknown>) => void
  onResetPassword: () => void
  onRemove: () => void
  hospOpts: { value: string; label: string; sub?: string }[]
  searchHospitals: (q: string) => Promise<{ value: string; label: string; sub?: string }[]>
  onClose: () => void
}) {
  // แก้ในหน้าต่างก่อน แล้วบันทึกทีเดียวตอนกด "เสร็จสิ้น"
  const [hcodes, setHcodes] = useState<string[]>(u.hcodes)
  const [tabs, setTabs] = useState<string[]>(u.effective_tabs)
  const [useRoleDefault, setUseRoleDefault] = useState(false)   // กด reset แล้วให้ backend ล้าง tabs ที่ตั้งเอง
  const [tab, setTab] = useState<'scope' | 'perms' | 'account'>('scope')

  const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))
  const dirty = !sameSet(hcodes, u.hcodes) || !sameSet(tabs, u.effective_tabs) || useRoleDefault

  const done = () => {
    if (dirty) {
      const body: Record<string, unknown> = {}
      if (!sameSet(hcodes, u.hcodes)) body.hcodes = hcodes
      if (useRoleDefault) body.clear_tabs = true
      else if (!sameSet(tabs, u.effective_tabs)) body.tabs = tabs
      if (Object.keys(body).length) patch(u.username, body)
    }
    onClose()
  }

  // รายการโรงที่จะโชว์เป็นการ์ดใต้ช่องเลือก
  const central = u.role === 'superadmin' || u.role === 'bmsadmin'
  const allHospitals = hcodes.includes('*') || (central && hcodes.length === 0)
  const previewCodes = allHospitals ? hospOpts.map((h) => h.value) : hcodes

  const toggle = (t: string) => {
    setUseRoleDefault(false)
    setTabs((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="rounded-xl" style={{
        background: 'var(--bg)', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--r-xl)',
        width: '100%', maxWidth: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        position: 'relative',
      }}>
        <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--control-border)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <span aria-hidden style={{
            width: 40, height: 40, flex: 'none', borderRadius: 'var(--r-full)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--accent-light)', color: 'var(--accent-active)', ...TEXT.bodyMed,
          }}>{(u.display_name || u.username).slice(0, 2).toUpperCase()}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...TEXT.h3, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>สิทธิ์ของ {u.display_name || u.username}</div>
            <div style={{ ...TEXT.sm, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>@{u.username} · {ROLE_TH[u.role] ?? u.role}</div>
          </div>
          <button onClick={onClose} title="ปิด" style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', lineHeight: 0, padding: 'var(--sp-1)' }}>
            <Icon name="close" size={18} width={2} />
          </button>
        </div>

        {/* แท็บแบบขีดเส้นใต้ (ชุดเดียวกับ modal รายละเอียดพนักงาน) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', padding: '0 var(--sp-5)', borderBottom: '1px solid var(--control-border)' }}>
          {PERM_TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)',
              padding: 'var(--sp-3) var(--sp-4) 0', border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: 'var(--sans)',
            }}>
              <span style={{ ...TEXT.bodyMed, color: tab === k ? 'var(--accent-active)' : 'var(--text-dim)', whiteSpace: 'nowrap' }}>{label}</span>
              <span style={{ width: '100%', minWidth: 48, height: 3, borderRadius: 2, background: tab === k ? 'var(--accent-active)' : 'transparent' }} />
            </button>
          ))}
        </div>

        {/* ความสูงคงที่ทุกแท็บ — สลับแท็บแล้ว popup ไม่กระโดด (เนื้อหายาวเกินก็เลื่อนในนี้) */}
        <div style={{ padding: 'var(--sp-5)', paddingBottom: 84, overflowY: 'auto', height: 380 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* ---------- แท็บ: ขอบเขตโรง ---------- */}
                {tab === 'scope' && (<>
                {/* ค่าเริ่มต้นของบัญชีส่วนกลางคือทุกโรง จำกัดทีหลังได้ */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  <span style={{ ...TEXT.bodyMed, color: 'var(--text)' }}>โรงพยาบาลที่ดูได้</span>
                  <Info size={13} text={u.role === 'superadmin' || u.role === 'bmsadmin'
                    ? 'บัญชีส่วนกลางเริ่มต้นเห็นทุกโรงพยาบาล — เลือกเฉพาะบางแห่งได้ถ้าต้องการจำกัด (ล้างจนหมด = กลับไปเห็นทุกแห่ง)'
                    : 'บัญชีของโรงพยาบาล เห็นเฉพาะโรงพยาบาลที่เลือกไว้เท่านั้น'} />
                </div>
                {/* ช่องเดียวจบ: เลือก "ทุกโรงพยาบาล" หรือเลือกโรงทีละโรงก็ได้ */}
                <div style={{ marginBottom: 16 }}>
                  <SearchSelect
                    multi allowCustom
                    values={hcodes}
                    onToggle={(v) => setHcodes((cur) => {
                      if (v === '*') return cur.includes('*') ? [] : ['*']
                      const rest = cur.filter((x) => x !== '*' && x !== v)
                      return cur.includes(v) ? rest : [...rest, v]
                    })}
                    onClear={() => setHcodes([])} clearLabel="เลือกทุกโรงพยาบาล"
                    options={[{ value: '*', label: 'ทุกโรงพยาบาล' }, ...hospOpts]}
                    onSearch={searchHospitals}
                    placeholder={u.role === 'superadmin' || u.role === 'bmsadmin' ? 'ทุกโรงพยาบาล (ไม่จำกัด)' : 'เลือกโรงพยาบาล…'}
                  />
                </div>

                {/* รายการโรงที่เลือกไว้ — การ์ดชุดเดียวกับหน้าเลือกโรงพยาบาล (ไม่มีปุ่ม) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  {/* ดูได้ทุกโรง (เลือก '*' หรือบัญชีส่วนกลางที่ไม่ได้จำกัดโรง) -> โชว์ทุกโรงที่มีในระบบ */}
                  {previewCodes.length === 0 ? (
                    <div style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>ยังไม่ได้เลือกโรงพยาบาล</div>
                  ) : previewCodes.map((h) => (
                    <div key={h} style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                      padding: 'var(--sp-2)', background: 'var(--surface-alt)', borderRadius: 'var(--r-lg)',
                    }}>
                      <span aria-hidden style={{
                        width: 72, height: 56, flex: 'none', borderRadius: 'var(--r-md)', overflow: 'hidden',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-blue)',
                      }}>
                        <img src={asset('/hero-hospital.svg')} alt="" width={72} height={72}
                          className="pointer-events-none select-none" style={{ objectFit: 'cover', marginTop: 6 }} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ ...TEXT.bodyMed, color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {hospOpts.find((o2) => o2.value === h)?.label ?? h}
                        </span>
                        <span style={{ ...TEXT.sm, fontFamily: 'var(--mono)', color: 'var(--text-dim)', display: 'block' }}>{h}</span>
                      </span>
                    </div>
                  ))}
                </div>

                </>)}

                {/* ---------- แท็บ: สิทธิ์เมนู ---------- */}
                {/* เลย์เอาต์: 1 กลุ่ม = 1 แถว (หัวข้อกลุ่มซ้าย · รายการเมนูขวา) */}
                {tab === 'perms' && (() => {
                  const mine = data?.role_tabs?.[u.role] ?? data?.all_tabs ?? []
                  const plain = mine.filter((t) => !TAB_INFO[t]?.danger)
                  const risky = mine.filter((t) => TAB_INFO[t]?.danger)

                  const group = (title: React.ReactNode, hint: React.ReactNode, list: string[]) => (
                    <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <div style={{ flex: '0 0 168px', minWidth: 140 }}>
                        {title}
                        <div style={{ ...TEXT.sm, color: 'var(--text-dim)', marginTop: 2 }}>{hint}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 'min(280px, 100%)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                        {list.map((t) => (
                          <PermCard key={t} tab={t} on={tabs.includes(t)} busy={busy} onClick={() => toggle(t)} />
                        ))}
                      </div>
                    </div>
                  )

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
                      {/* ปุ่มคืนค่ามาตรฐานอยู่มุมขวาบนของแท็บ */}
                      {(u.tabs !== null || useRoleDefault) && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button onClick={() => {
                            setUseRoleDefault(true)
                            setTabs(data?.role_default_tabs?.[u.role] ?? [])
                          }} disabled={busy} title="ล้างที่ตั้งเอง กลับไปใช้ค่ามาตรฐานของบทบาทนี้"
                            style={{ ...TEXT.sm, fontWeight: 500, padding: 'var(--sp-1) var(--sp-3)', minHeight: 32, borderRadius: 'var(--r-full)', border: 'none', background: 'var(--surface-alt)', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'var(--sans)', whiteSpace: 'nowrap' }}>
                            ใช้ค่ามาตรฐานของบทบาท
                          </button>
                        </div>
                      )}

                      {group(
                        <span style={{ ...TEXT.bodyMed, color: 'var(--text)' }}>สิทธิ์การเข้าถึง</span>,
                        'กลุ่มเมนูที่บัญชีนี้เปิดใช้ได้',
                        plain,
                      )}

                      {/* สิทธิ์ที่แก้ข้อมูลระดับระบบได้ — แยกกลุ่มให้เห็นชัดว่าคนละชั้นกับด้านบน */}
                      {risky.length > 0 && group(
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', ...TEXT.bodyMed, color: 'var(--warn)' }}>
                          <Icon name="alert" size={16} width={2} />สิทธิ์ระดับระบบ
                        </span>,
                        'ให้เฉพาะคนที่ดูแลระบบจริง',
                        risky,
                      )}
                    </div>
                  )
                })()}

                {/* ---------- แท็บ: จัดการบัญชี ---------- */}
                {tab === 'account' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap',
                      padding: 'var(--sp-3) var(--sp-4)', minHeight: 60,
                      background: 'var(--surface-alt)', borderRadius: 'var(--r-lg)',
                    }}>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ ...TEXT.bodyMed, color: 'var(--text)' }}>รีเซ็ตรหัสผ่าน</div>
                        <div style={{ ...TEXT.sm, color: 'var(--text-dim)', marginTop: 2 }}>ตั้งรหัสใหม่ให้ผู้ใช้ — รหัสจะแสดงครั้งเดียวให้คัดลอกส่งต่อ</div>
                      </div>
                      <ActionPill label="รีเซ็ตรหัสผ่าน" tone="plain" disabled={busy} onClick={onResetPassword} />
                    </div>

                    {!isMe && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap',
                        padding: 'var(--sp-3) var(--sp-4)', minHeight: 60,
                        background: 'var(--danger-light)', borderRadius: 'var(--r-lg)',
                      }}>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ ...TEXT.bodyMed, color: 'var(--danger)' }}>ลบบัญชีนี้</div>
                          <div style={{ ...TEXT.sm, color: 'var(--text-dim)', marginTop: 2 }}>ลบถาวร กู้คืนไม่ได้ — ถ้าแค่พักการใช้งานให้กด "พักใช้" ในรายการแทน</div>
                        </div>
                        <button type="button" title="ลบบัญชี" disabled={busy} onClick={onRemove} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
                          ...TEXT.sm, fontWeight: 500, fontFamily: 'var(--sans)',
                          padding: 'var(--sp-1) var(--sp-3)', minHeight: 32, borderRadius: 'var(--r-full)', border: 'none',
                          background: 'var(--danger)', color: 'var(--bg)',
                          cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
                        }}>
                          <Icon name="trash" size={16} width={1.8} />ลบบัญชี
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
          {/* แถบปุ่มกระจก — ยึดก้น modal เสมอ เนื้อหาเลื่อนลอดใต้แถบ (เห็นเบลอจริง) */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1,
            padding: 'var(--sp-4) var(--sp-5)', borderTop: '1px solid var(--control-border)',
            display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap',
            background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            borderBottomLeftRadius: 'var(--r-xl)', borderBottomRightRadius: 'var(--r-xl)',
          }}>
            {/* คืนค่าเริ่มต้น = ล้างที่ตั้งเอง กลับไปใช้ค่ามาตรฐานของบทบาท */}
            <Button variant="secondary" size="md" pill disabled={busy}
              icon={<Icon name="recon" size={18} width={1.8} />}
              onClick={() => {
                setUseRoleDefault(true)
                setTabs(data?.role_default_tabs?.[u.role] ?? [])
              }}>
              คืนค่าเริ่มต้น
            </Button>
            <span style={{ marginLeft: 'auto' }} />
            <Button variant="secondary" size="md" pill onClick={onClose}>ยกเลิก</Button>
            <Button variant="primary" size="md" pill onClick={done} disabled={busy}>
              {dirty ? 'บันทึกและปิด' : 'เสร็จสิ้น'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}

export function Users({ me }: { me: string }) {
  const { session } = useApp()
  const [data, setData] = useState<UsersRes | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [q, setQ] = useState('')
  const [hf, setHf] = useState('')   // ฟิลเตอร์โรง: '' = ทุกโรง · '*' = บัญชีส่วนกลาง · อื่น = hcode
  const [editing, setEditing] = useState<string | null>(null)
  // ฟอร์มสร้างใหม่ — เปิด popup แล้วเจนรหัสให้เลย
  // โชว์บัญชี+รหัสหลังสร้าง/รีเซ็ตสำเร็จ (รหัสเห็นครั้งเดียว — ให้ copy ส่งผู้ใช้)
  const [created, setCreated] = useState<{ username: string; password: string; reset?: boolean } | null>(null)
  const [copied, setCopied] = useState(false)
  const [reload, setReload] = useState(0)

  const hospOpts = (session?.hospitals ?? []).filter((h) => h.value !== '*').map((h) => ({ value: h.value, label: h.label, sub: h.value }))
  // ค้นสดจากทะเบียนโรงทั้งประเทศ (ไม่จำกัดแค่โรงที่ลงทะเบียนแล้ว)
  const searchHospitals = (q: string) =>
    api.get<{ hospitals: { hcode: string; name: string }[] }>(`/admin/hospitals/search?q=${encodeURIComponent(q)}&limit=30`)
      .then((d) => (d.hospitals ?? []).map((h) => ({ value: h.hcode, label: h.name || '(ไม่มีชื่อ)', sub: h.hcode })))

  useEffect(() => {
    let alive = true
    setData(null); setErr(null)
    api.get<UsersRes>('/admin/users')
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(e?.message || 'โหลดไม่สำเร็จ'))
    return () => { alive = false }
  }, [reload])

  const run = async (fn: () => Promise<UsersRes>) => {
    if (busy) return
    setBusy(true); setErr(null)
    try { setData(await fn()); toast.success('บันทึกแล้ว') } catch (e: any) { setErr(e?.message || 'ทำรายการไม่สำเร็จ') } finally { setBusy(false) }
  }

  const patch = (username: string, body: Record<string, unknown>) =>
    run(() => api.patch<UsersRes>(`/admin/users/${encodeURIComponent(username)}`, body))

  const resetPassword = async (u: User) => {
    const pw = await dialog.prompt({
      title: `ตั้งรหัสผ่านใหม่ให้ ${u.username}`, label: 'รหัสผ่านใหม่ (สุ่มให้แล้ว แก้ได้)', initial: genPassword(), mono: true, confirmText: 'รีเซ็ตรหัส',
      validate: (v) => (v.trim().length >= 6 ? null : 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว'),
    })
    if (pw === null) return
    run(async () => {
      const r = await api.patch<UsersRes>(`/admin/users/${encodeURIComponent(u.username)}`, { password: pw.trim() })
      // เด้ง popup ให้ copy อีเมล+รหัสใหม่ส่งผู้ใช้ (จังหวะเดียวที่รหัสยังอ่านได้)
      setCopied(false); setCreated({ username: u.username, password: pw.trim(), reset: true })
      return r
    })
  }

  // ลบถาวร — ต้องพิมพ์ชื่อบัญชีให้ตรงก่อน (กันกดพลาด/กดผิดคน)
  const remove = async (u: User) => {
    const typed = await dialog.prompt({
      title: `ลบบัญชี ${u.username}`,
      label: `พิมพ์ "${u.username}" เพื่อยืนยันการลบถาวร (กู้คืนไม่ได้)`,
      initial: '', mono: true, confirmText: 'ลบบัญชี', danger: true,
      validate: (v) => (v.trim().toLowerCase() === u.username.toLowerCase() ? null : 'ชื่อบัญชีไม่ตรง'),
    })
    if (typed === null) return
    run(() => api.del<UsersRes>(`/admin/users/${encodeURIComponent(u.username)}`))
  }

  // ตัวเลือกฟิลเตอร์ = เฉพาะโรงที่มีบัญชีอยู่จริง (ชื่อโรงจาก scope ของคนที่ login)
  const hospName = (h: string) => (session?.hospitals ?? []).find((x) => x.value === h)?.label || h
  const hospFilters = useMemo(() => {
    const set = new Set<string>()
    for (const u of data?.users ?? []) for (const h of u.hcodes) if (h !== '*') set.add(h)
    return [...set].map((h) => ({ value: h, label: `${hospName(h)} · ${h}` }))
      .sort((a, b) => a.label.localeCompare(b.label, 'th'))
  }, [data, session])
  const hasCentral = (data?.users ?? []).some((u) => u.hcodes.includes('*'))

  const shown = (data?.users ?? []).filter((u) => {
    const t = q.trim().toLowerCase()
    const okQ = !t || u.username.toLowerCase().includes(t) || (u.display_name || '').toLowerCase().includes(t) || u.hcodes.join(',').includes(t)
    const okH = !hf || (hf === '*' ? u.hcodes.includes('*') : u.hcodes.includes(hf))
    return okQ && okH
  })
  const paged = usePaged(shown)

  // การ์ดสรุปในหัวเรื่อง (นับจากบัญชีทั้งหมด ไม่ใช่เฉพาะที่กรองอยู่)
  const allUsers = data?.users ?? []
  const HERO = [
    { label: 'บัญชีทั้งหมด', v: data ? allUsers.length : undefined, tone: 'accent' as const, icon: 'people' },
    { label: 'ใช้งานอยู่', v: data ? allUsers.filter((x) => x.active).length : undefined, tone: 'ok' as const, icon: 'rosette-check' },
    { label: 'ปิดใช้งาน', v: data ? allUsers.filter((x) => !x.active).length : undefined, tone: 'danger' as const, icon: 'ban' },
  ]

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      {/* ---------- การ์ดหัวเรื่อง ---------- */}
      <div className="relative overflow-hidden rounded-xl p-6" style={{ background: 'linear-gradient(to top, var(--surface-blue), var(--bg) 65%)' }}>
        <HeroArt icon="people" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-h2 m-0 text-text">ผู้ใช้และสิทธิ์</h1>
            <p className="text-body mt-2 mb-0 text-[color-mix(in_srgb,var(--text-faint)_50%,transparent)]">
              สร้างบัญชี ตั้งบทบาท และเลือกกลุ่มเมนูที่เห็นได้รายคน (Super Admin เห็นครบเสมอ)
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Button className="btn-refresh" variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
              icon={<Icon name="recon" size={20} style={!data && !err ? { animation: 'spin .7s linear infinite' } : undefined} />}>
              รีเฟรชข้อมูลล่าสุด
            </Button>
          </div>
        </div>

        <div className="relative mt-4 flex gap-2 flex-wrap stat-grid">
          {HERO.map((k) => (
            <StatCard key={k.label} tone={k.tone} label={k.label} unit="บัญชี"
              icon={<Icon name={k.icon} size={24} color="currentColor" />}
              value={k.v != null ? nf(k.v) : '…'} />
          ))}
        </div>
      </div>

      {err && !showNew && <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">ผิดพลาด: {err}</div>}

      {/* ---------- แถวตัวกรอง ---------- */}
      <FilterBar activeCount={(hf ? 1 : 0)}
        search={<SearchInput grow value={q} onChange={setQ} placeholder="ค้นหา ชื่อ / บัญชี / รหัสโรงพยาบาล" />}>
        <FilterChip icon={<Icon name="hospital" size={24} width={1.8} />} label="โรงพยาบาล">
          <SearchSelect bare hideCaret value={hf} onChange={setHf} maxTriggerWidth={190}
            searchPlaceholder="ค้นชื่อ/รหัสโรงพยาบาล…"
            options={[
              { value: '', label: 'ทุกโรงพยาบาล' },
              ...(hasCentral ? [{ value: '*', label: 'ส่วนกลาง (ดูแลทุกโรงพยาบาล)' }] : []),
              ...hospFilters,
            ]} />
        </FilterChip>
        {(q || hf) && <Button variant="ghost" size="sm" onClick={() => { setQ(''); setHf('') }}>ล้างตัวกรอง</Button>}
      </FilterBar>

      {/* ---------- รายการผู้ใช้ ---------- */}
      <SectionPanel title="บัญชีผู้ใช้" meta={data ? `${nf(shown.length)} บัญชี` : undefined}
        actions={
          <Button variant="primary" size="md" pill icon={<Icon name="person" size={18} width={1.8} />}
            onClick={() => { setErr(null); setShowNew(true) }}>
            เพิ่มผู้ใช้
          </Button>
        }>


      {!data ? <SkelRows rows={6} /> : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {paged.pageRows.map((u, i) => (
          <div key={u.username} style={{ background: 'var(--surface-alt)', borderRadius: 'var(--r-lg)' }}>
            <div style={{ padding: 'var(--sp-3) var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
              <span style={{ width: 22, textAlign: 'right', fontFamily: 'var(--mono)', ...TEXT.sm, color: 'var(--text-faint)', flex: 'none' }}>{nf(paged.offset + i + 1)}</span>
              <div style={{ width: 40, height: 40, flex: 'none', borderRadius: 'var(--r-full)', background: 'var(--accent-light)', color: 'var(--accent-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...TEXT.bodyMed }}>
                {(u.display_name || u.username).slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  <span style={{ ...TEXT.bodyMed, color: 'var(--text)' }}>{u.display_name || u.username}</span>
                  <span style={{ fontFamily: 'var(--mono)', ...TEXT.sm, color: 'var(--text-faint)' }}>@{u.username}</span>
                  {u.username === me && <span style={{ ...TEXT.caption, fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--ok-light)', color: 'var(--ok)' }}>คุณ</span>}
                  {!u.active && <span style={{ ...TEXT.caption, fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--danger-light)', color: 'var(--danger)' }}>ปิดใช้งาน</span>}
                </div>
                <div style={{ ...TEXT.sm, color: 'var(--text-dim)', marginTop: 2 }}>
                  {ROLE_TH[u.role] ?? u.role} · โรงพยาบาล: {u.hcodes.includes('*') ? 'ทุกโรงพยาบาล' : u.hcodes.join(', ') || '—'}
                  <span style={{ color: 'var(--text-faint)' }}> · เข้าระบบล่าสุด: {u.last_login_at ? new Date(u.last_login_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : 'ยังไม่เคย'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap', flex: 'none' }}>
                {u.role !== 'superadmin' && (
                  <ActionPill label={editing === u.username ? 'ปิด' : 'จัดการสิทธิ์'} tone={editing === u.username ? 'accent' : 'plain'}
                    onClick={() => setEditing(editing === u.username ? null : u.username)} />
                )}
                {u.username !== me && (
                  <ActionPill label={u.active ? 'พักใช้' : 'เปิดใช้'} tone={u.active ? 'warn' : 'ok'} disabled={busy}
                    onClick={() => patch(u.username, { active: !u.active })} />
                )}
              </div>
            </div>

          </div>
        ))}
        {shown.length === 0 && (
          <div style={{ ...TEXT.body, padding: '40px 20px', color: 'var(--text-dim)', textAlign: 'center' }}>
            {q || hf ? 'ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข' : 'ยังไม่มีผู้ใช้'}
          </div>
        )}
        <Pagination page={paged.page} pageSize={PAGE_SIZE} total={paged.total} shown={paged.pageRows.length} onPage={paged.setPage} />
      </div>
      )}
      </SectionPanel>

    {/* popup ตั้งสิทธิ์ */}
    {editing && (() => {
      const u = (data?.users ?? []).find((x) => x.username === editing)
      return u ? (
        <PermissionsModal u={u} data={data} busy={busy} isMe={u.username === me} patch={patch}
          onResetPassword={() => resetPassword(u)}
          onRemove={() => { setEditing(null); remove(u) }}
          hospOpts={hospOpts} searchHospitals={searchHospitals}
          onClose={() => setEditing(null)} />
      ) : null
    })()}

    {/* popup เพิ่มผู้ใช้ — ฟอร์มแบบ stepper (ใช้ร่วมกับหน้ารายละเอียดโรงพยาบาล) */}
    {showNew && (
      <NewUserModal
        onClose={() => setShowNew(false)}
        onCreated={() => { setShowNew(false); setReload((r) => r + 1) }} />
    )}
    </div>
  )
}
