import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { ErrorBox } from '../components/feedback/Message'
import { api } from '../api'
import { dialog, toast } from '../components/dialog'
import { PickHospital } from '../components/PickHospital'
import { SectionPanel } from '../components/layout/SectionPanel'
import { SearchSelect } from '../components/SearchSelect'
import { Skel } from '../components/Skeleton'
import { Button } from '../components/inputs/Button'
import { Icon } from '../icons'
import { Toggle } from '../components/inputs/Toggle'
import { TEXT } from '../typography'
import { useApp } from '../state'
import { asset } from '../assets'

// ตั้งค่ารายโรง — ส่งลงแอปตอนเข้าสู่ระบบ พนักงานปิดเองไม่ได้
// super แก้ได้ทุกโรง (เลือกจากชิปในหน้า/แถบบน) · admin แก้โรงตัวเอง · user ดูอย่างเดียว
//
// โครงหน้าเดียวกับหน้าอื่นในระบบ: การ์ดหัวเรื่องไล่สี + ภาพประกอบ แล้วตามด้วย SectionPanel
// ทุกอย่างบันทึกทันทีที่แก้ (ไม่มีปุ่ม "บันทึก") — ค่าที่เห็นคือค่าที่บันทึกแล้วเสมอ

type Pol = Record<string, any>

// คีย์ที่หน้านี้ดูแล (ไม่รวมของหน้าจุดลงเวลา เช่น gps_*) — ใช้ทั้งตอนหา diff และตอนคืนค่าเริ่มต้น
const KEYS = [
  'liveness_enabled', 'liveness_count', 'liveness_type', 'liveness_yaw_deg', 'liveness_pitch_deg',
  'liveness_eye_open', 'liveness_smile', 'smile_confirm', 'confirm_popup', 'min_face_width',
  'bms_noti', 'noti_token', 'telegram_noti', 'telegram_bot_token', 'telegram_chat_id',
]

// ค่าแนะนำสำหรับปุ่ม "คืนค่าเริ่มต้น" — ไม่แตะ token/บัญชีของช่องทางแจ้งเตือน (กรอกกันมาแล้ว)
const DEFAULTS: Record<string, any> = {
  liveness_enabled: true, liveness_count: 2, liveness_type: 'random',
  liveness_yaw_deg: 20, liveness_pitch_deg: 12, liveness_eye_open: 0.35, liveness_smile: 0.5,
  smile_confirm: false, confirm_popup: true, min_face_width: 40,
  bms_noti: true, telegram_noti: false,
}

const LIVENESS_TYPES = ['random', 'blink', 'smile', 'left', 'right']
const LIVENESS_LABELS: Record<string, string> = { random: 'สุ่ม', blink: 'กระพริบตา', smile: 'ยิ้ม', left: 'หันซ้าย', right: 'หันขวา' }

/** สวิตช์เปิด/ปิด — ขนาด/สีตาม design token (เขียว = เปิด) */

/** แถวตั้งค่า 1 รายการ: ชื่อ + คำอธิบาย ซ้าย · ตัวควบคุมขวา */
function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap',
      padding: 'var(--sp-3) var(--sp-4)', minHeight: 60,
      background: 'var(--surface-alt)', borderRadius: 'var(--r-lg)',
    }}>
      {/* minWidth เล็กพอให้ช่องกรอกอยู่บรรทัดเดียวกันในแผงแคบ (ไม่ตกลงมาเป็นคอลัมน์) */}
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ ...TEXT.bodyMed, color: 'var(--text)' }}>{label}</div>
        {sub && <div style={{ ...TEXT.sm, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

const fieldSt: React.CSSProperties = {
  padding: 'var(--sp-2) var(--sp-3)', minHeight: 40,
  border: '1px solid var(--control-border)', borderRadius: 'var(--r-md)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none',
}

// ช่องตัวเลข/ข้อความ — บันทึกตอน blur หรือกด Enter
function NumField({ value, min, max, step, disabled, onCommit }: { value: number; min: number; max: number; step?: number; disabled?: boolean; onCommit: (v: number) => void }) {
  const [v, setV] = useState(String(value))
  useEffect(() => { setV(String(value)) }, [value])
  const commit = () => {
    const n = Math.max(min, Math.min(max, Number(v)))
    if (Number.isNaN(n)) { setV(String(value)); return }
    if (n !== value) onCommit(n)
    setV(String(n))
  }
  return <input type="number" value={v} min={min} max={max} step={step} disabled={disabled} onChange={(e) => setV(e.target.value)}
    onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    style={{ ...fieldSt, width: 96, fontFamily: 'var(--mono)', textAlign: 'right' }} />
}

function TextField({ value, placeholder, disabled, onCommit }: { value: string; placeholder?: string; disabled?: boolean; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value)
  useEffect(() => { setV(value) }, [value])
  const commit = () => { if (v.trim() !== value) onCommit(v.trim()) }
  return <input value={v} placeholder={placeholder} disabled={disabled} onChange={(e) => setV(e.target.value)}
    onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    style={{ ...fieldSt, flex: '1 1 260px', minWidth: 120, maxWidth: 420 }} />
}

/** หัวแผงพร้อมไอคอนในกล่องสี (ชุดเดียวกับการ์ดสรุปหน้าอื่น) */
function PanelTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
      <span aria-hidden style={{
        width: 36, height: 36, flex: 'none', borderRadius: 'var(--r-md)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--accent-light)', color: 'var(--accent-active)',
      }}>
        <Icon name={icon} size={20} width={1.8} />
      </span>
      {title}
    </span>
  )
}

// การ์ดช่องทางแจ้งเตือน 1 ช่องทาง — เปิด/ปิดแยกกัน · เปิดแล้วโชว์ช่องตั้งค่าของช่องทางนั้น
// เพิ่มช่องทางใหม่ในอนาคต = วาง <NotiChannel> อีกก้อน
function NotiChannel({ name, desc, on, onToggle, disabled, onHelp, children }: {
  name: string; desc?: string; on: boolean; onToggle: () => void
  disabled?: boolean; onHelp?: () => void; children?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
        padding: 'var(--sp-3) var(--sp-4)', minHeight: 60,
        background: 'var(--surface-alt)', borderRadius: 'var(--r-lg)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...TEXT.bodyMed, color: 'var(--text)' }}>{name}</div>
          {desc && <div style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>{desc}</div>}
        </div>
        {onHelp && (
          <Button variant="ghost" size="sm" pill onClick={onHelp} icon={<Icon name="report" size={16} width={1.8} />}>คู่มือ</Button>
        )}
        <Toggle on={on} disabled={disabled} onClick={onToggle} />
      </div>
      {/* ช่องตั้งค่าของช่องทาง — แถวทรงเดียวกับตั้งค่าอื่น ๆ กว้างเต็มแผง */}
      {on && children && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// แถวตั้งค่าย่อยในช่องทาง — ทรงเดียวกับ <Row> ของแผงอื่น
const CfgRow = Row

/** โครงร่างระหว่างโหลด — สูงใกล้เคียงแผงจริง หน้าจะได้ไม่กระโดด */
function SkelRowsCfg({ rows }: { rows: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {Array.from({ length: rows }, (_, i) => <Skel key={i} h={60} r="var(--r-lg)" />)}
    </div>
  )
}

export function Settings() {
  const { currentHcode, session, setNav, setHcode, isSuper } = useApp()
  // เลือกโรงได้จากในหน้าเลย (นอกจากการ์ดบน header) — คนดูแลหลายโรงมักสลับไปมาระหว่างตั้งค่า
  // เฉพาะโรงจริง — หน้านี้ตั้งค่าได้ทีละโรง ไม่มีโหมด "ทุกโรงพยาบาล"
  const hospOpts = (session?.hospitals ?? []).map((h) => ({ value: h.value, label: h.label, sub: h.value }))
  const canSwitch = isSuper || (session?.hospitals?.length ?? 0) > 1
  const readOnly = session?.role === 'user'
  const [pol, setPol] = useState<Pol | null>(null)   // ค่าที่บันทึกไว้บน server
  const [draft, setDraft] = useState<Pol | null>(null) // ค่าที่กำลังแก้อยู่ในหน้า
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const seqRef = useRef(0)

  // แถบปุ่มติดขอบบนแล้ว (sticky ทำงานอยู่) -> ใส่เงาให้ดูลอยเหนือเนื้อหา
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    // เผื่อความสูง header ที่ลอยทับอยู่ (--topbar-h 80 + ระยะห่าง) ก่อนถือว่าติดขอบ
    const io = new IntersectionObserver(([e]) => setStuck(e.intersectionRatio === 0),
      { threshold: [0, 1], rootMargin: '-96px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [readOnly])

  // แก้แล้วยังไม่บันทึก = ปุ่มบันทึกกดได้ (เทียบเฉพาะคีย์ที่หน้านี้ดูแล)
  const dirty = !!pol && !!draft && KEYS.some((k) => draft[k] !== pol[k])

  useEffect(() => {
    if (currentHcode === '*') return
    let alive = true // กันสลับโรงแล้ว response โรงเก่ามาทับ (จะอ่าน/เขียนผิดโรง)
    seqRef.current++ // ตัด save ที่ค้างของโรงเก่าด้วย
    setPol(null); setDraft(null); setErr(null)
    api.get<{ policy: Pol }>(`/admin/policy?hcode=${encodeURIComponent(currentHcode)}`)
      .then((d) => { if (alive) { setPol(d.policy); setDraft(d.policy) } })
      .catch((e) => alive && setErr(e?.message || 'โหลดไม่สำเร็จ'))
    return () => { alive = false }
  }, [currentHcode])

  // แก้ค่าในหน้า (ยังไม่ส่ง server จนกว่าจะกดบันทึก)
  const upd = (k: string, v: any) => { if (!readOnly) setDraft((d) => (d ? { ...d, [k]: v } : d)) }

  // ส่งเฉพาะคีย์ที่เปลี่ยน — ไม่เขียนทับค่าที่หน้าอื่นดูแล (เช่นจุดลงเวลา)
  const save = async () => {
    if (!pol || !draft || readOnly || saving || !dirty) return
    const patch: Record<string, any> = {}
    for (const k of KEYS) if (draft[k] !== pol[k]) patch[k] = draft[k]
    const my = ++seqRef.current // รับเฉพาะ response ล่าสุด (กันกดรัวแล้วอันเก่ามาทับ)
    setSaving(true); setErr(null)
    try {
      const d = await api.post<{ policy: Pol }>(`/admin/policy/${currentHcode}`, patch)
      if (my !== seqRef.current) return
      setPol(d.policy); setDraft(d.policy)
      toast.success('บันทึกการตั้งค่าแล้ว')
    } catch (e: any) {
      if (my !== seqRef.current) return
      setErr(e?.message || 'บันทึกไม่สำเร็จ')
    } finally {
      if (my === seqRef.current) setSaving(false)
    }
  }

  // คืนค่าเริ่มต้น = เซ็ตค่าในหน้าเป็นค่าแนะนำ แล้วให้ผู้ใช้กดบันทึกเอง (ยังไม่แตะ server)
  const restore = async () => {
    if (!draft || readOnly) return
    const ok = await dialog.confirm({
      title: 'คืนค่าเริ่มต้น',
      body: 'ตั้งค่าทุกข้อในหน้านี้จะถูกเปลี่ยนเป็นค่าแนะนำ (Token/Bot Token/Chat ID ไม่ถูกแตะ) — ยังไม่บันทึกจนกว่าจะกด "บันทึกการตั้งค่า"',
      confirmText: 'คืนค่าเริ่มต้น',
    })
    if (!ok) return
    setDraft({ ...draft, ...DEFAULTS })
  }

  if (currentHcode === '*') return <PickHospital />
  const view = draft // ค่าที่แสดงบนหน้า = ฉบับร่าง

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      {/* ---------- การ์ดหัวเรื่อง ---------- */}
      <PageHeader
        title="ตั้งค่าแอปสแกน"
        desc={<>ตั้งค่าของโรงพยาบาล {currentHcode} · แอปรับค่าล่าสุดเองเมื่อพนักงานเปิดแอป · พนักงานแก้เองไม่ได้</>}
        art={<>
        {/* ภาพประกอบชุดเดียวกับแท็บ "ภาพรวมระบบ" ของหน้าหลัก — ตึกเป็นฉากหลัง พยาบาลเป็นฉากหน้า */}
        <span aria-hidden className="hide-sm" style={{ position: 'absolute', right: 0, bottom: -120, lineHeight: 0 }}>
          <span className="hero-rise" style={{ display: 'block', lineHeight: 0 }}>
            <img src={asset('/hero-hospital.svg')} alt="" width={300} height={300}
              className="hero-bg pointer-events-none select-none" style={{ opacity: 0.72 }} />
          </span>
          <span className="hero-fg pointer-events-none select-none" style={{ position: 'absolute', right: 0, bottom: 24, lineHeight: 0 }}>
            <img src={asset('/nurse-scan.svg')} alt="" width={230} height={230} />
          </span>
          {/* เฟืองลอยข้างภาพ — สื่อว่าหน้านี้คือ "ตั้งค่า" (ตกแต่งล้วน วางนอกตัวตึก/พยาบาล) */}
          <span className="pointer-events-none select-none" style={{ position: 'absolute', left: -72, top: 56, color: 'var(--accent)', opacity: 0.45 }}>
            <Icon name="system" size={56} width={1.4} />
          </span>
          <span className="pointer-events-none select-none" style={{ position: 'absolute', left: -28, top: 8, color: 'var(--accent-active)', opacity: 0.28 }}>
            <Icon name="system" size={32} width={1.6} />
          </span>
        </span>
        </>}
        actions={<>
          <div className="flex gap-2 items-center flex-wrap">
            {readOnly && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
                padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-full)',
                background: 'var(--warn-light)', color: 'var(--warn)', ...TEXT.sm, fontWeight: 500,
              }}>
                <Icon name="eye" size={16} width={1.8} />ดูอย่างเดียว
              </span>
            )}
          </div>
        </>}
      >

      </PageHeader>

      {err && <ErrorBox>ผิดพลาด: {err}</ErrorBox>}

      {/* ---------- แถวปุ่มสั่งงาน (ชิดขวา เหนือแผงตั้งค่า) ---------- */}
      {/* จุดวัดว่าปุ่มเริ่มติดขอบบนหรือยัง (ไม่มีความสูง ไม่กินที่) */}
      {/* marginBottom ลบ = หักช่องไฟของ flex ที่ตัว sentinel กินไป (ไม่งั้นบนห่างกว่าล่าง) */}
      {!readOnly && <div ref={sentinelRef} aria-hidden style={{ height: 0, marginBottom: 'calc(var(--sp-4) * -1)' }} />}
      {!readOnly && (
        // ค้างไว้ใต้ header ตอนเลื่อนดูตั้งค่ายาว ๆ — กดบันทึกได้โดยไม่ต้องเลื่อนกลับขึ้นบน
        // top วัดจากขอบบนของ main (header เป็นเลเยอร์ลอยทับ) จึงต้องเผื่อความสูง header เอง
        <div className="flex gap-2 items-center flex-wrap justify-end"
          style={{
            position: 'sticky', top: 'calc(var(--topbar-h) + var(--sp-2))', zIndex: 20,
            filter: stuck ? 'drop-shadow(0 8px 20px rgba(17,24,39,.18))' : 'none',
            transition: 'filter .18s ease',
          }}>
          <Button variant="secondary" size="lg" pill onClick={restore} disabled={!draft || saving}
            icon={<Icon name="recon" size={20} width={1.8} />}>
            คืนค่าเริ่มต้น
          </Button>
          <Button variant="primary" size="lg" pill onClick={save} disabled={!dirty || saving}
            icon={<Icon name="rosette-check" size={20} width={1.8} />}>
            {saving ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่าแอปสแกน'}
          </Button>
        </div>
      )}

      {/* ---------- แผงตั้งค่า ---------- */}
      <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px,100%), 1fr))' }}>
        <SectionPanel title={<PanelTitle icon="face" title="ตรวจว่าเป็นคนจริง" />}
          meta="กันปลอมด้วยรูปถ่าย/วิดีโอ">
          {!view ? <SkelRowsCfg rows={7} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <Row label="เปิดใช้งาน" sub="แนะนำให้เปิดเมื่อใช้งานจริง">
                <Toggle on={view.liveness_enabled} disabled={readOnly} onClick={() => upd('liveness_enabled', !view.liveness_enabled)} />
              </Row>
              <Row label="จำนวนท่าที่ต้องทำ" sub="1–5 ท่า">
                <NumField value={view.liveness_count} min={1} max={5} disabled={readOnly} onCommit={(v) => upd('liveness_count', v)} />
              </Row>
              <Row label="ท่าที่ให้ทำ">
                <SearchSelect width={150} value={view.liveness_type} disabled={readOnly}
                  onChange={(v) => upd('liveness_type', v)}
                  options={LIVENESS_TYPES.map((t) => ({ value: t, label: LIVENESS_LABELS[t] ?? t }))} />
              </Row>
              <Row label="องศาหันซ้าย/ขวา" sub="ต้องหันเกินกี่องศาถึงนับ">
                <NumField value={view.liveness_yaw_deg} min={5} max={45} disabled={readOnly} onCommit={(v) => upd('liveness_yaw_deg', v)} />
              </Row>
              <Row label="องศาเงยหน้า">
                <NumField value={view.liveness_pitch_deg} min={5} max={30} disabled={readOnly} onCommit={(v) => upd('liveness_pitch_deg', v)} />
              </Row>
              <Row label="เกณฑ์กระพริบตา" sub="0.1–1.0 · ยิ่งสูงยิ่งเข้มงวด">
                <NumField value={view.liveness_eye_open} min={0.1} max={1} step={0.05} disabled={readOnly} onCommit={(v) => upd('liveness_eye_open', v)} />
              </Row>
              <Row label="เกณฑ์ยิ้ม" sub="0.1–1.0">
                <NumField value={view.liveness_smile} min={0.1} max={1} step={0.05} disabled={readOnly} onCommit={(v) => upd('liveness_smile', v)} />
              </Row>
            </div>
          )}
        </SectionPanel>

        <div className="flex flex-col gap-4">
          <SectionPanel title={<PanelTitle icon="scan" title="การยืนยันตอนลงเวลา" />}
            meta="ขั้นตอนก่อนบันทึกเวลา">
            {!view ? <SkelRowsCfg rows={3} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                <Row label="ยิ้มเพื่อยืนยัน" sub="เปิดแล้วปุ่มยืนยันจะถูกซ่อน — ยิ้มเท่านั้นถึงบันทึก">
                  <Toggle on={view.smile_confirm} disabled={readOnly} onClick={() => upd('smile_confirm', !view.smile_confirm)} />
                </Row>
                <Row label="หน้าต่างยืนยัน" sub="เลือกเข้า/ออก + เวร ก่อนบันทึก">
                  <Toggle on={view.confirm_popup} disabled={readOnly} onClick={() => upd('confirm_popup', !view.confirm_popup)} />
                </Row>
                <Row label="ความใกล้ตอนสแกน (%)"
                  sub="ยิ่ง % สูง ยิ่งต้องเอาหน้าเข้าใกล้กล้อง · ตัวเลขน้อย = ยืนไกลก็สแกนติด (เสี่ยงติดหน้าคนเดินผ่าน) — แนะนำ 30–50">
                  <NumField value={view.min_face_width} min={10} max={90} disabled={readOnly} onCommit={(v) => upd('min_face_width', v)} />
                </Row>
              </div>
            )}
          </SectionPanel>

          <SectionPanel title={<PanelTitle icon="bell" title="แจ้งเตือน" />}
            meta="เปิดพร้อมกันได้หลายช่องทาง">
            {!view ? <SkelRowsCfg rows={2} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                <NotiChannel name="BMS Noti" desc="ระบบแจ้งเตือนของ BMS"
                  on={view.bms_noti} disabled={readOnly} onToggle={() => upd('bms_noti', !view.bms_noti)}>
                  <CfgRow label="Token" sub="ของโรงพยาบาลนี้">
                    <TextField value={view.noti_token} placeholder="วาง token ที่นี่" disabled={readOnly} onCommit={(v) => upd('noti_token', v)} />
                  </CfgRow>
                </NotiChannel>

                <NotiChannel name="Telegram" desc="ส่งข้อความเข้ากลุ่ม Telegram"
                  on={view.telegram_noti} disabled={readOnly} onToggle={() => upd('telegram_noti', !view.telegram_noti)}
                  onHelp={() => setNav('help')}>
                  <CfgRow label="Bot Token" sub="จาก @BotFather">
                    <TextField value={view.telegram_bot_token} placeholder="เช่น 123456789:AAE-..." disabled={readOnly} onCommit={(v) => upd('telegram_bot_token', v)} />
                  </CfgRow>
                  <CfgRow label="Chat ID" sub="ของกลุ่ม (ขึ้นต้นด้วย -100)">
                    <TextField value={view.telegram_chat_id} placeholder="เช่น -1001234567890" disabled={readOnly} onCommit={(v) => upd('telegram_chat_id', v)} />
                  </CfgRow>
                </NotiChannel>
              </div>
            )}
          </SectionPanel>
        </div>
      </div>
    </div>
  )
}
