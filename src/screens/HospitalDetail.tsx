import { useEffect, useRef, useState } from 'react'
import { HeroCard } from '../components/layout/PageHeader'
import { ErrorBox } from '../components/feedback/Message'
import { ROLE_TH } from '../state'
import { thDate, thDateTime, nf } from '../hooks'
import { DataTable } from '../components/data-display/DataTable'
import { StatCard } from '../components/data-display/StatCard'
import { ContactPill, Field } from '../components/data-display/Field'
import { SectionPanel } from '../components/layout/SectionPanel'
import { Skel } from '../components/Skeleton'
import { SearchSelect } from '../components/SearchSelect'
import { NewUserModal } from '../components/NewUserModal'
import { FilterChip } from '../components/inputs/FilterChip'
import { Button } from '../components/inputs/Button'
import { Icon } from '../icons'
import { Toggle } from '../components/inputs/Toggle'
import { TEXT } from '../typography'
import { dialog, toast } from '../components/dialog'
import { api } from '../api'
import { HEALTH_TH, type Tenant } from './tenantsCommon'

// รายละเอียดโรงพยาบาล — หน้าเต็ม (เดิมเป็น modal) เลย์เอาต์ชุดเดียวกับหน้ารายละเอียดพนักงาน:
//   การ์ดหัวเรื่องไล่สี = ปุ่มย้อนกลับ + การ์ดข้อมูลโรง + การ์ดตัวเลขการใช้งาน
//   แล้วตามด้วย SectionPanel: ค่าความปลอดภัย · ผู้ใช้ · โน้ตภายใน · ประวัติ

type User = { username: string; display_name: string; role: string; active: boolean; last_login_at: string | null }
type AuditRow = { ts: string; actor: string; action: string; detail: string }
type Detail = {
  tenant: Tenant
  users: User[]
  audit: AuditRow[]
  usage: { active_staff: number | null; enrolled: number | null; punched_today: number | null }
}

// flag ที่ตั้งรายโรงได้ (โหมดทดสอบตั้งผ่านระบบ ไม่อยู่ในนี้)
type FlagKey = 'auth_enforce' | 'eligibility_check' | 'has_status'
const FLAGS: { key: FlagKey; label: string; sub: string }[] = [
  { key: 'auth_enforce', label: 'ตรวจตัวตน', sub: 'ตรวจสิทธิ์ผู้ใช้ก่อนเรียก API ของโรงพยาบาล' },
  { key: 'eligibility_check', label: 'ตรวจสิทธิ์', sub: 'ตรวจว่าพนักงานคนนั้นลงเวลาที่โรงพยาบาลนี้ได้จริง' },
  { key: 'has_status', label: 'เก็บสถานะลงเวลา', sub: 'เปิดได้เมื่อโรงพยาบาลรัน SQL เพิ่มคอลัมน์ emp_in_out_status_id / emp_in_out_diff_minute แล้ว · ปิด = ระบบคำนวณสาย/นาทีเองจากเวลาเวร' },
]

/** ค่าที่บันทึกไว้ -> ฉบับร่าง (ไม่ได้ตั้งเอง = null = ใช้ค่ากลาง) */
const draftOf = (t: Tenant) => ({
  health: t.health ?? 'ok',
  flags: Object.fromEntries(FLAGS.map(({ key }) => [key, t[key].override ? t[key].value : null])) as Record<FlagKey, boolean | null>,
})

const COMPACT_H = 60   // ความสูงแถบโปรไฟล์ย่อที่ลอยอยู่ล่างจอ
const TOPBAR = 80      // = --topbar-h (header ลอยทับพื้นที่เนื้อหา)

// แท็บของหน้ารายละเอียดโรง
const TABS: [ 'settings' | 'users' | 'note' | 'audit', string, string ][] = [
  ['settings', 'ตั้งค่ารายโรงพยาบาล', 'system'],
  ['users', 'ผู้ใช้', 'people'],
  ['note', 'โน้ตภายใน', 'report'],
  ['audit', 'ประวัติ', 'clock'],
]

/** ช่องข้อมูล 1 ค่า (ป้ายเล็กบน · ค่าใหญ่ล่าง) — ชุดเดียวกับหน้ารายละเอียดพนักงาน */
/** แถวตั้งค่า 1 ข้อ — ป้าย/คำอธิบายซ้าย · ตัวควบคุมขวา (ทรงเดียวกับหน้าตั้งค่าแอปสแกน) */
function FlagRow({ label, sub, override, onReset, busy, children }: {
  label: string; sub?: string; override?: boolean; onReset?: () => void; busy?: boolean; children: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap',
      padding: 'var(--sp-3) var(--sp-4)', minHeight: 60,
      background: 'var(--surface-alt)', borderRadius: 'var(--r-lg)',
    }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ ...TEXT.bodyMed, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          {label}
          {override && (
            <span style={{ ...TEXT.caption, fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--accent-light)', color: 'var(--accent-active)' }}>
              ตั้งเฉพาะโรงนี้
            </span>
          )}
        </div>
        {sub && <div style={{ ...TEXT.sm, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>}
      </div>
      {onReset && <Button variant="ghost" size="sm" disabled={busy} onClick={onReset}>ใช้ค่ากลาง</Button>}
      {children}
    </div>
  )
}

export function HospitalDetail({ hcode, onClose, onChanged }: { hcode: string; onClose: () => void; onChanged: () => void }) {
  const [d, setD] = useState<Detail | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  // ฉบับร่างของแท็บ "ตั้งค่ารายโรง" — แก้ในหน้าแล้วกดบันทึกทีเดียว (null = ใช้ค่ากลางของระบบ)
  const [draft, setDraft] = useState<{ health: string; flags: Record<FlagKey, boolean | null> } | null>(null)
  const [savingCfg, setSavingCfg] = useState(false)
  const [addUser, setAddUser] = useState(false)   // popup เพิ่มผู้ใช้ (เติมโรงนี้ให้อัตโนมัติ)
  // การ์ดข้อมูลโรงเลื่อนพ้นใต้ header เมื่อไหร่ -> โชว์แถบย่อลอยล่างจอแทน (ยังรู้ว่าดูโรงไหนอยู่)
  const heroRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const el = heroRef.current
    if (!el) { setCompact(false); return }
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting),
      { root: el.closest('main'), rootMargin: `-${TOPBAR + 8}px 0px 0px 0px`, threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [d])

  // แยกเนื้อหาเป็นแท็บ — หน้าเดียวยาวเกินไป (ตั้งค่า/ผู้ใช้/โน้ต/ประวัติ คนละงานกัน)
  const [tab, setTab] = useState<'settings' | 'users' | 'note' | 'audit'>('settings')

  useEffect(() => {
    let alive = true
    setD(null); setErr(null)
    api.get<Detail>(`/admin/tenants/${hcode}/detail`)
      .then((r) => { if (alive) { setD(r); setNote(r.tenant?.note ?? ''); setDraft(draftOf(r.tenant)) } })
      .catch((e) => alive && setErr(e?.message || 'โหลดไม่สำเร็จ'))
    return () => { alive = false }
  }, [hcode])

  const saveMeta = async (body: { note?: string; health?: string }) => {
    if (busy) return
    setBusy(true); setErr(null)
    try {
      await api.post(`/admin/tenants/${hcode}/meta`, body)
      setSaved(true); setTimeout(() => setSaved(false), 1500)
      toast.success('บันทึกแล้ว')
      onChanged()
      if (d) setD({ ...d, tenant: { ...d.tenant,
        ...(body.health ? { health: body.health as Tenant['health'] } : {}),
        ...(body.note !== undefined ? { note: body.note } : {}) } })
    } catch (e: any) { setErr(e?.message || 'บันทึกไม่สำเร็จ') } finally { setBusy(false) }
  }

  // แก้ค่าในหน้า (ยังไม่ส่ง server จนกว่าจะกดบันทึก)
  const setDraftFlag = (key: FlagKey, value: boolean | null) =>
    setDraft((s2) => (s2 ? { ...s2, flags: { ...s2.flags, [key]: value } } : s2))

  const base = d ? draftOf(d.tenant) : null
  const dirtyCfg = !!base && !!draft
    && (draft.health !== base.health || FLAGS.some(({ key }) => draft.flags[key] !== base.flags[key]))

  // บันทึกเฉพาะสิ่งที่เปลี่ยน (flag ทีละตัวตาม API เดิม + ธงติดตามผ่าน meta)
  const saveCfg = async () => {
    if (!d || !draft || !base || !dirtyCfg || savingCfg) return
    setSavingCfg(true); setErr(null)
    try {
      let tenant = d.tenant
      for (const { key } of FLAGS) {
        if (draft.flags[key] === base.flags[key]) continue
        const r = await api.post<{ tenants: Tenant[] }>(`/admin/tenants/${hcode}/flag`, { flag: key, value: draft.flags[key] })
        tenant = r.tenants.find((x) => x.hcode === hcode) ?? tenant
      }
      if (draft.health !== base.health) await api.post(`/admin/tenants/${hcode}/meta`, { health: draft.health })
      const next = { ...tenant, health: draft.health as Tenant['health'] }
      setD({ ...d, tenant: next }); setDraft(draftOf(next))
      onChanged()
      toast.success('บันทึกการตั้งค่าแล้ว')
    } catch (e: any) { setErr(e?.message || 'บันทึกไม่สำเร็จ') } finally { setSavingCfg(false) }
  }

  // ต่ออายุทดลองใช้ — ทำทันที (ไม่ผ่านฉบับร่าง เพราะเป็นการกระทำที่ผู้ใช้ยืนยันเองแล้ว)
  const extendDemo = async () => {
    if (!d || busy) return
    const raw = await dialog.prompt({
      title: `ต่ออายุทดลองใช้ ${d.tenant.name}`,
      label: 'จำนวนวัน (1-365)', initial: '60', mono: true, confirmText: 'ต่ออายุ',
      validate: (v) => { const n = Number(v.trim()); return Number.isInteger(n) && n >= 1 && n <= 365 ? null : 'ใส่จำนวนวัน 1-365' },
    })
    if (raw === null) return
    setBusy(true); setErr(null)
    try {
      const r = await api.post<{ tenants: Tenant[] }>(`/admin/tenants/${hcode}/extend-demo`, { days: Number(raw.trim()) })
      const me = r.tenants.find((x) => x.hcode === hcode)
      if (me) { setD({ ...d, tenant: me }); setDraft(draftOf(me)) }
      onChanged()
      toast.success('ต่ออายุแล้ว')
    } catch (e: any) { setErr(e?.message || 'ต่ออายุไม่สำเร็จ') } finally { setBusy(false) }
  }

  // คืนค่าเริ่มต้น = ทุก flag กลับไปใช้ค่ากลางของระบบ (ยังไม่แตะ server จนกว่าจะกดบันทึก)
  const restoreCfg = async () => {
    if (!draft) return
    const ok = await dialog.confirm({
      title: 'คืนค่าเริ่มต้น',
      body: 'ค่าความปลอดภัยของโรงพยาบาลนี้จะกลับไปใช้ค่ากลางของระบบทั้งหมด — ยังไม่บันทึกจนกว่าจะกด "บันทึกการตั้งค่า"',
      confirmText: 'คืนค่าเริ่มต้น',
    })
    if (!ok) return
    setDraft({ ...draft, flags: Object.fromEntries(FLAGS.map(({ key }) => [key, null])) as Record<FlagKey, boolean | null> })
  }

  const t = d?.tenant
  const USAGE = [
    { label: 'พนักงานทั้งหมด', v: d?.usage.active_staff, tone: 'accent' as const, icon: 'person' },
    { label: 'ลงทะเบียนหน้าแล้ว', v: d?.usage.enrolled, tone: 'ok' as const, icon: 'face' },
    { label: 'ลงเวลาวันนี้', v: d?.usage.punched_today, tone: 'info' as const, icon: 'scan' },
  ]

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      {/* ---------- แถบโปรไฟล์ย่อ ลอยกลางล่างจอ (fixed -> ไม่กินที่ในโฟลว์) ---------- */}
      <div className="float-bottom">
        <div aria-hidden={!compact} style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
          height: COMPACT_H, padding: '0 var(--sp-4)',
          background: 'var(--bg)', border: '1px solid var(--control-border)',
          borderRadius: 'var(--r-full)', boxShadow: 'var(--shadow-lg)',
          opacity: compact ? 1 : 0,
          transform: compact ? 'none' : 'translateY(12px)',
          pointerEvents: compact ? 'auto' : 'none',
          transition: 'opacity .16s ease, transform .16s ease',
        }}>
          <span aria-hidden style={{
            width: 36, height: 36, flex: 'none', borderRadius: 'var(--r-md)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--accent-light)', color: 'var(--accent-active)',
          }}>
            <Icon name="hospital" size={20} width={1.8} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.25 }}>
            <span style={{ ...TEXT.bodyMed, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t?.name ?? hcode}</span>
            <span style={{ ...TEXT.sm, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{hcode}</span>
          </span>
          {/* ตัวเลขการใช้งานชุดเดียวกับการ์ดใบใหญ่ ย่อเหลือตัวเลข + ป้าย */}
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 'var(--sp-4)' }} className="hide-sm">
            {USAGE.map((k) => (
              <span key={k.label} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 'var(--sp-1)', whiteSpace: 'nowrap' }}>
                <span style={{ ...TEXT.bodyMed, color: 'var(--text)' }}>{k.v != null ? nf(k.v) : '—'}</span>
                <span style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>{k.label}</span>
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* ---------- การ์ดหัวเรื่อง: ย้อนกลับ + ข้อมูลโรง + ตัวเลขการใช้งาน ---------- */}
      <HeroCard cardRef={heroRef}>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline-accent" size="xs" radius="lg" onClick={onClose}
            icon={<Icon name="chevron-left" size={20} width={2} />}>
            ย้อนกลับ
          </Button>
          <span style={{ ...TEXT.sm, fontWeight: 500, color: 'var(--ok)', opacity: saved ? 1 : 0, transition: 'opacity .25s', marginLeft: 'auto' }}>
            บันทึกแล้ว ✓
          </span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
          {/* การ์ดข้อมูลโรง */}
          <div className="bg-bg rounded-xl" style={{ flex: '1 1 480px', minWidth: 'min(480px,100%)', padding: 'var(--sp-4)' }}>
            {!t ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                <Skel h={56} r="var(--r-lg)" /><Skel h={72} r="var(--r-lg)" />
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                  <span aria-hidden style={{
                    width: 56, height: 56, flex: 'none', borderRadius: 'var(--r-lg)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--accent-light)', color: 'var(--accent-active)',
                  }}>
                    <Icon name="hospital" size={30} width={1.8} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ ...TEXT.h3, color: 'var(--text)' }}>{t.name || '—'}</div>
                    <div style={{ ...TEXT.sm, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{hcode}</div>
                  </div>
                  <span style={{ display: 'inline-flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                    {t.contact_email && <ContactPill icon="mail" text={t.contact_email} />}
                    {t.contact_phone && <ContactPill icon="phone" text={t.contact_phone} />}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(170px,100%), 1fr))', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
                  <Field label="ผู้ติดต่อ" value={t.contact_name} />
                  <Field label="จังหวัด" value={t.province} />
                  <Field label="ประเภท" value={t.request_type === 'demo'
                    ? `ทดลองใช้ ถึง ${thDate(t.demo_expires_at)}`
                    : t.prod_expires_at ? `ใช้งานจริง ถึง ${thDate(t.prod_expires_at)}` : 'ใช้งานจริง (ถาวร)'} />
                  <Field label="อนุมัติโดย" value={t.approved_by ? `${t.approved_by} · ${thDate(t.approved_at)}` : '—'} />
                  <Field label="ยื่นคำขอเมื่อ" value={thDate(t.requested_at)} />
                </div>
              </>
            )}
          </div>

          {/* การ์ดตัวเลขการใช้งาน */}
          <div className="grid gap-4 stat-grid" style={{ flex: '0 1 362px', minWidth: 'min(362px,100%)', gridTemplateColumns: 'repeat(auto-fit, minmax(min(170px,100%), 1fr))', alignContent: 'start' }}>
            {USAGE.map((k) => (
              <StatCard key={k.label} tone={k.tone} label={k.label} layout="row"
                icon={<Icon name={k.icon} size={24} color="currentColor" />}
                value={k.v != null ? nf(k.v) : d ? '—' : '…'} />
            ))}
          </div>
        </div>
      </HeroCard>

      {err && <ErrorBox>ผิดพลาด: {err}</ErrorBox>}

      {/* ---------- แท็บ (ชุดเดียวกับหน้าหลัก) + ปุ่มสั่งงานของแท็บตั้งค่า ---------- */}
      {/* ค้างไว้ใต้ header ตอนเลื่อน — top วัดจากขอบบนของ main (header เป็นเลเยอร์ลอยทับ) */}
      <div className="flex gap-2 items-center flex-wrap"
        style={{
          position: 'sticky', top: 'calc(var(--topbar-h) + var(--sp-2))', zIndex: 20,
          // ติดขอบบนแล้ว (การ์ดหัวเรื่องเลื่อนพ้นจอ) = ใส่เงาให้ดูลอยเหนือเนื้อหา
          filter: compact ? 'drop-shadow(0 8px 20px rgba(17,24,39,.18))' : 'none',
          transition: 'filter .18s ease',
        }}>
        <span className="inline-flex gap-2 items-center flex-wrap" style={{
          background: 'var(--bg)', padding: 'var(--sp-2)',
          borderRadius: 'var(--r-full)', border: '1px solid rgba(0,0,0,0.1)',
        }}>
          {TABS.map(([k, label, icon]) => (
            <Button key={k} variant={tab === k ? 'primary' : 'soft'} size="md" pill
              onClick={() => setTab(k)} icon={<Icon name={icon} size={24} width={1.8} />}>
              {label}
            </Button>
          ))}
        </span>

        {/* ปุ่มค้างอยู่ทุกแท็บ — แก้ค่าในแท็บตั้งค่าแล้วกดบันทึกได้จากทุกที่ */}
        <span className="inline-flex gap-2 items-center flex-wrap" style={{ marginLeft: 'auto' }}>
          <Button variant="secondary" size="lg" pill onClick={restoreCfg} disabled={!draft || savingCfg}
            icon={<Icon name="recon" size={20} width={1.8} />}>
            คืนค่าเริ่มต้น
          </Button>
          <Button variant="primary" size="lg" pill onClick={saveCfg} disabled={!dirtyCfg || savingCfg}>
            {savingCfg ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}
          </Button>
        </span>
      </div>

      {/* ---------- แท็บ: ตั้งค่า ---------- */}
      {tab === 'settings' && (
      <SectionPanel title="ค่าความปลอดภัยรายโรงพยาบาล" meta="ไม่ได้ตั้งเอง = ใช้ค่ากลางของระบบ">
        {!t ? <Skel h={60} r="var(--r-lg)" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {/* ธงติดตามลูกค้า — มุมมองทีมดูแล (ไม่ใช่ค่าที่ส่งลงแอปของโรง) */}
            <FlagRow label="ธงติดตามลูกค้า" sub="ใช้จัดลำดับการติดตามของทีมดูแล — โรงพยาบาลไม่เห็นค่านี้">
              {/* เลือกจากชิปได้เลย (3 ค่า ไม่ต้องเปิด dropdown) */}
              <span style={{ display: 'inline-flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                {Object.entries(HEALTH_TH).map(([v, h]) => {
                  const on = (draft?.health ?? t.health) === v
                  return (
                    <FilterChip key={v} variant="choice" active={on} disabled={savingCfg}
                      tone={v === 'ok' ? 'accent' : 'warn'}
                      icon={<Icon name={v === 'ok' ? 'rosette-check' : v === 'watch' ? 'progress-alert' : 'alert'} size={14} width={2} />}
                      label={h.label}
                      onClick={() => setDraft((s2) => (s2 ? { ...s2, health: v } : s2))} />
                  )
                })}
              </span>
            </FlagRow>

            {/* อายุการใช้งาน — ทดลองใช้ต่ออายุได้จากตรงนี้ */}
            <FlagRow label="อายุการใช้งาน"
              sub={t.request_type === 'demo'
                ? `ทดลองใช้ ถึง ${thDate(t.demo_expires_at)}${t.demo_expired ? ' · หมดอายุแล้ว' : ''}`
                : t.prod_expires_at ? `ใช้งานจริง ถึง ${thDate(t.prod_expires_at)}` : 'ใช้งานจริง (ถาวร)'}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                <span style={{
                  ...TEXT.sm, fontWeight: 500, padding: '4px 14px', borderRadius: 'var(--r-full)', whiteSpace: 'nowrap',
                  background: t.request_type === 'demo'
                    ? (t.demo_expired ? 'var(--danger-light)' : 'var(--info-light)')
                    : 'var(--accent-light)',
                  color: t.request_type === 'demo'
                    ? (t.demo_expired ? 'var(--danger)' : 'var(--info)')
                    : 'var(--accent-active)',
                }}>{t.request_type === 'demo' ? (t.demo_expired ? 'หมดอายุทดลอง' : 'ทดลองใช้') : 'ใช้งานจริง'}</span>
                {t.request_type === 'demo' && (
                  <Button variant="secondary" size="sm" pill disabled={busy} onClick={extendDemo}>
                    {busy ? '…' : 'ต่ออายุ'}
                  </Button>
                )}
              </span>
            </FlagRow>

            {/* โหมดทดสอบตั้งผ่านระบบ (deploy) — แสดงอย่างเดียว */}
            <FlagRow label="โหมดทดสอบ"
              sub="ตั้งผ่านระบบ (deploy) — เปิด = ลงเวลาผ่านทุกขั้นแต่ไม่บันทึกฐานข้อมูลจริงของโรงพยาบาล">
              <span style={{
                ...TEXT.sm, fontWeight: 500, padding: '4px 14px', borderRadius: 'var(--r-full)', whiteSpace: 'nowrap',
                background: t.dry_run.value ? 'var(--danger-light)' : 'var(--ok-light)',
                color: t.dry_run.value ? 'var(--danger)' : 'var(--ok)',
              }}>{t.dry_run.value ? 'ทดสอบ' : 'ใช้จริง'}{t.dry_run.override ? ' •' : ''}</span>
            </FlagRow>

            {FLAGS.map((it) => {
              const v = draft?.flags[it.key] ?? null
              return (
                <FlagRow key={it.key} label={it.label} sub={it.sub} override={v !== null}
                  onReset={v !== null ? () => setDraftFlag(it.key, null) : undefined} busy={savingCfg}>
                  {/* ยังไม่ตั้งเอง = โชว์ค่ากลางที่ backend ส่งมา */}
                  <Toggle on={v ?? t[it.key].value} disabled={savingCfg}
                    onClick={() => setDraftFlag(it.key, !(v ?? t[it.key].value))} />
                </FlagRow>
              )
            })}

          </div>
        )}
      </SectionPanel>

      )}

      {/* ---------- แท็บ: ผู้ใช้ ---------- */}
      {tab === 'users' && (
      <SectionPanel title="ผู้ใช้ dashboard ของโรงพยาบาลนี้" meta={d ? `${nf(d.users.length)} บัญชี` : undefined}>
        {!d ? <Skel h={140} r="var(--r-lg)" /> : d.users.length === 0 ? (
          <div style={{ ...TEXT.body, padding: '32px 20px', color: 'var(--text-dim)', textAlign: 'center' }}>
            ยังไม่มีผู้ใช้ของโรงนี้
            <div className="mt-4 flex justify-center">
              <Button variant="primary" size="md" pill onClick={() => setAddUser(true)}
                icon={<Icon name="person" size={18} width={1.8} />}>เพิ่มผู้ใช้</Button>
            </div>
          </div>
        ) : (
          <DataTable<User>
            rows={d.users} rowKey={(u) => u.username} hover={false} minWidth={720}
            columns={[
              { key: 'no', header: 'ลำดับ', align: 'right', width: 64, tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-faint)' }, cell: (_u, i) => i + 1 },
              {
                key: 'user', header: 'ผู้ใช้',
                cell: (u) => (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: 0 }}>
                    <span style={{ ...TEXT.bodyMed }}>{u.display_name || u.username}</span>
                    <span style={{ fontFamily: 'var(--mono)', ...TEXT.sm, color: 'var(--text-faint)' }}>@{u.username}</span>
                  </span>
                ),
              },
              { key: 'role', header: 'บทบาท', width: 160, cell: (u) => ROLE_TH[u.role] ?? u.role },
              {
                key: 'active', header: 'สถานะ', width: 120,
                cell: (u) => (
                  <span style={{
                    ...TEXT.sm, fontWeight: 500, padding: '3px 10px', borderRadius: 'var(--r-full)', whiteSpace: 'nowrap',
                    background: u.active ? 'var(--ok-light)' : 'var(--danger-light)', color: u.active ? 'var(--ok)' : 'var(--danger)',
                  }}>{u.active ? 'ใช้งาน' : 'ปิด'}</span>
                ),
              },
              {
                key: 'last', header: 'เข้าระบบล่าสุด', align: 'right', width: 180,
                tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-dim)', whiteSpace: 'nowrap' },
                cell: (u) => (u.last_login_at ? thDateTime(u.last_login_at) : 'ยังไม่เคย'),
              },
            ]}
          />
        )}

        {/* ปุ่มอยู่ในการ์ดขาวของแผงนี้ (ไม่ใช่แถวหัวแผง) */}
        {d && d.users.length > 0 && (
          <div className="flex justify-end" style={{ marginTop: 'var(--sp-3)' }}>
            <Button variant="primary" size="md" pill onClick={() => setAddUser(true)}
              icon={<Icon name="person" size={18} width={1.8} />}>เพิ่มผู้ใช้</Button>
          </div>
        )}
      </SectionPanel>

      )}

      {/* ---------- แท็บ: โน้ต ---------- */}
      {tab === 'note' && (
      <SectionPanel title="โน้ตภายใน" meta="ทีมดูแลเห็นเท่านั้น โรงพยาบาลไม่เห็น">
        {!t ? <Skel h={96} r="var(--r-lg)" /> : (
          <>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="เช่น โทรคุยแล้ว สนใจเปิดใช้งานจริง รอใบเสนอราคา…"
              style={{
                width: '100%', padding: 'var(--sp-3)', border: '1px solid var(--control-border)',
                borderRadius: 'var(--r-lg)', background: 'var(--bg)', color: 'var(--text)',
                fontFamily: 'var(--sans)', fontSize: 13, outline: 'none', resize: 'vertical',
              }} />
            <div style={{ marginTop: 'var(--sp-3)', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" size="md" pill onClick={() => saveMeta({ note })} disabled={busy || note === (t.note ?? '')}>
                {busy ? 'กำลังบันทึก…' : 'บันทึกโน้ต'}
              </Button>
            </div>
          </>
        )}
      </SectionPanel>

      )}

      {/* ---------- แท็บ: ประวัติ ---------- */}
      {tab === 'audit' && (
      <SectionPanel title="ประวัติการจัดการล่าสุด" meta={d ? `${nf(d.audit.length)} รายการ` : undefined}>
        {!d ? <Skel h={120} r="var(--r-lg)" /> : d.audit.length === 0 ? (
          <div style={{ ...TEXT.body, padding: '32px 20px', color: 'var(--text-dim)', textAlign: 'center' }}>ยังไม่มีรายการ</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {d.audit.map((a, i) => (
              <div key={i} style={{
                display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', flexWrap: 'wrap',
                padding: 'var(--sp-2) var(--sp-3)', background: 'var(--surface-alt)', borderRadius: 'var(--r-lg)',
              }}>
                <span style={{ fontFamily: 'var(--mono)', ...TEXT.sm, color: 'var(--text-faint)', flex: 'none' }}>{a.ts}</span>
                <span style={{ ...TEXT.bodyMed, color: 'var(--text)' }}>{a.actor}</span>
                <span style={{
                  ...TEXT.sm, fontFamily: 'var(--mono)', fontWeight: 500, whiteSpace: 'nowrap',
                  padding: '3px 10px', borderRadius: 'var(--r-full)',
                  background: 'var(--accent-light)', color: 'var(--accent-active)',
                }}>{a.action}</span>
                <span style={{ ...TEXT.sm, color: 'var(--text-dim)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.detail}</span>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>
      )}

      {/* เว้นที่ให้แถบลอยล่างจอ ไม่ให้ทับเนื้อหาท้ายหน้า */}
      <div aria-hidden style={{ height: COMPACT_H + 40, flex: 'none' }} />

      {addUser && (
        <NewUserModal hcodes={[hcode]} hospitalNames={{ [hcode]: t?.name || hcode }} onClose={() => setAddUser(false)}
          onCreated={() => {
            // โหลดรายละเอียดใหม่ให้เห็นบัญชีที่เพิ่งสร้าง
            api.get<Detail>(`/admin/tenants/${hcode}/detail`).then(setD).catch(() => {})
            onChanged()
          }} />
      )}
    </div>
  )
}
