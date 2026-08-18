import { useCallback, useEffect, useRef, useState } from 'react'
import { SLIDES, type Note, type Slide } from './slides'

// สไลด์นำเสนอแบบ reels — เล่นอัตโนมัติทั้งชุด เน้นภาพเต็มจอ + walkthrough ซูมทีละจุด
// จอมืด · แถบ progress ต่อสไลด์แบบ stories · คำบรรยายซ้อนล่างภาพ
// ปุ่ม: ← → ข้ามสไลด์ (ออโต้เล่นต่อ) · A เล่น/หยุด · G ภาพรวม · F เต็มจอ · B สลับก่อน/หลัง · V เสียง

const N = SLIDES.length
const pad = (n: number) => String(n + 1).padStart(2, '0')
const slideName = (sl: Slide) => (sl.type === 'cover' ? 'ปก — BMS FaceEnroll' : sl.type === 'end' ? 'จบการนำเสนอ' : sl.title)

// ซูมเข้าไปหาจุดที่กำลังอธิบาย — เลื่อนจุดมากลางจอแล้วขยาย (clamp ไม่ให้เห็นขอบว่างนอกภาพ)
const ZOOM = 1.7
function focusTransform(n?: Note) {
  if (!n) return undefined
  const lim = 50 - 50 / ZOOM
  const tx = Math.max(-lim, Math.min(lim, 50 - n.x))
  const ty = Math.max(-lim, Math.min(lim, 50 - n.y))
  return `scale(${ZOOM}) translate(${tx}%, ${ty}%)`
}

// เสียงอ่านบทอธิบาย — ใช้ VoxCPM TTS ของ BMS (เสียงไทยธรรมชาติ) · ล่มเมื่อไรถอยไปใช้เสียงเครื่อง
const TTS_URL = 'https://vox-cpm.bmscloud.in.th/v1/audio/speech'
const TTS_VOICE = 'male_takis'
const ttsCache = new Map<string, string>()   // text -> object URL (ประโยคเดิมไม่ต้องยิงซ้ำ)
let player: HTMLAudioElement | null = null
let reqSeq = 0                               // กันเสียงเก่าที่โหลดช้ามาทับเสียงจุดล่าสุด
// subtitle: บอก UI ว่ากำลังพูดประโยคไหนอยู่ (null = เงียบ) — App สมัครฟังผ่าน subCb
let subCb: ((t: string | null) => void) | null = null

function stopSpeak() {
  reqSeq++
  player?.pause()
  player = null
  window.speechSynthesis?.cancel()
  subCb?.(null)
}

// คำที่ TTS อ่านเพี้ยน (ตัวการันต์/คำทับศัพท์) -> สะกดตามเสียงก่อนส่งเข้า TTS
// เฉพาะบทพูด — ป้ายข้อความบนจอยังสะกดถูกตามปกติ
const TTS_FIX: [RegExp, string][] = [
  [/คอลัมน์/g, 'คอลัม'],
  [/จำนวนครั้ง/g, 'จำนวน ครั้ง'],   // คำติดกันนี้ TTS ตัดคำพลาดอ่านเป็นสะกดทีละตัว — เว้นวรรคช่วย (ยืนยันด้วย ASR แล้ว)
]
const ttsText = (t: string) => TTS_FIX.reduce((s, [re, to]) => s.replace(re, to), t)

/** โหลดเสียงของประโยค (มี retry — เซิร์ฟเวอร์ gen เสียงช้า/คิวแน่นแล้วพลาดครั้งเดียวไม่ควรหลุดไปเสียงเครื่อง) */
async function fetchTtsUrl(text: string): Promise<string> {
  const hit = ttsCache.get(text)
  if (hit) return hit
  let lastErr: unknown
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(TTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, voice: TTS_VOICE, response_format: 'mp3', speed: 1.0 }),
      })
      if (!res.ok) throw new Error(`TTS ${res.status}`)
      const url = URL.createObjectURL(await res.blob())
      ttsCache.set(text, url)
      return url
    } catch (e) {
      lastErr = e
      await new Promise((r) => setTimeout(r, 700 * (i + 1)))
    }
  }
  throw lastErr
}

const WELCOME = 'สวัสดีครับ ขอนำเสนอระบบ BMS FaceEnroll ระบบลงทะเบียนใบหน้าและการลงเวลาปฏิบัติงานของบุคลากรโรงพยาบาล'
const countLine = (n: number) => `ในหน้านี้มีจุดที่ปรับแก้ล่าสุดทั้งหมด ${n} จุด ลองเลื่อนเทียบภาพก่อนและหลังการแก้ไขกันก่อนครับ`

// อุ่นเครื่อง: ไล่โหลดเสียงทุกประโยคตามลำดับเล่นล่วงหน้า (ทีละประโยค ไม่แย่งคิวกับประโยคที่กำลังพูด)
// เริ่มตอนกดเล่นออโต้ครั้งแรก — เล่นถึงสไลด์ไหนเสียงก็พร้อมแล้ว ไม่มีจังหวะหลุดไปเสียงเครื่อง
let prefetching = false
function prefetchVoices() {
  if (prefetching) return
  prefetching = true
  void (async () => {
    const texts: string[] = [WELCOME]
    for (const sl of SLIDES) {
      if (sl.type) continue
      if (sl.notes?.length) {
        texts.push(sl.say ?? sl.desc)
        if (sl.diff) texts.push(countLine(sl.notes.length))
        for (const n of sl.notes) texts.push(n.say ?? n.text)
      } else {
        texts.push(sl.say ?? `${sl.title}. ${sl.desc}`)
      }
    }
    for (const t of texts) await fetchTtsUrl(ttsText(t)).catch(() => {})
  })()
}

/** อ่านออกเสียง — คืน Promise ที่จบเมื่อเสียงเล่นจบ (หรือถูกสั่งหยุด) ให้โหมดออโต้รอได้ */
async function speak(raw: string): Promise<void> {
  const text = ttsText(raw)
  stopSpeak()
  const seq = reqSeq
  subCb?.(raw)   // ขึ้น subtitle ทันที (ระหว่างรอโหลดเสียงก็อ่านตามได้เลย)
  try {
    const url = await fetchTtsUrl(text)
    if (seq !== reqSeq) return   // ผู้ใช้เปลี่ยนจุดไปแล้วระหว่างรอ
    const a = new Audio(url)
    player = a
    await new Promise<void>((done) => {
      a.onended = () => done()
      a.onerror = () => done()
      a.onpause = () => done()   // stopSpeak() ใช้ pause — นับเป็นจบเหมือนกัน
      a.play().catch(() => done())
    })
  } catch {
    // เครือข่าย/เซิร์ฟเวอร์มีปัญหา — ใช้เสียงสังเคราะห์ของเครื่องแทน
    if (seq !== reqSeq) return
    const synth = window.speechSynthesis
    if (!synth) return
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'th-TH'
    const th = synth.getVoices().find((v) => v.lang.replace('_', '-').startsWith('th'))
    if (th) u.voice = th
    u.rate = 1.05
    await new Promise<void>((done) => {
      u.onend = () => done()
      u.onerror = () => done()
      synth.speak(u)
    })
  }
  if (seq === reqSeq) subCb?.(null)   // พูดจบเอง (ไม่ได้ถูกแทรก) — เก็บ subtitle
}

/** คำอธิบายชี้ลงบนภาพ — walkthrough: จุดหมายเลขทุกจุด แต่ป้ายโชว์เฉพาะจุดที่กำลังอธิบาย
    คลิกจุดไหนก็กระโดดไปจุดนั้นได้ (กันชนกับการลาก slider ด้วย stopPropagation) */
function NoteLayer({ notes, active, onPick, zoomed }: {
  notes: Note[]; active: number; onPick: (i: number) => void; zoomed?: boolean
}) {
  // ตอน stage ถูกซูม ป้าย/จุดจะถูกขยายตาม — ย่อกลับด้วย scale(1/ZOOM) ให้ขนาดบนจอคงที่
  const unscale = zoomed ? ` scale(${1 / ZOOM})` : ''
  return (
    <>
      {notes.map((n, i) => {
        const on = i === active
        const left = n.side !== 'left'
        return (
          <div key={i} className="absolute z-10 flex items-center transition-all duration-300"
            style={{
              left: `${n.x}%`, top: `${n.y}%`,
              flexDirection: left ? 'row' : 'row-reverse',
              transform: (left ? 'translateY(-50%)' : 'translate(-100%, -50%)') + unscale,
              transformOrigin: left ? 'left center' : 'right center',
              opacity: on ? 1 : 0.5,
            }}>
            <button type="button" aria-label={`จุดที่ ${i + 1}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onPick(i) }}
              className="relative block size-6 flex-none cursor-pointer">
              {on && <span className="absolute inset-0 animate-ping rounded-full bg-accent-active/60" />}
              <span className={`absolute inset-0 flex items-center justify-center rounded-full border-2 border-white font-num text-[12px] font-bold text-white shadow-card ${on ? 'bg-accent-active' : 'bg-ink/45'}`}>
                {i + 1}
              </span>
            </button>
            {on && (
              <>
                <span className="pointer-events-none h-0.5 w-5 flex-none bg-accent-active/70" />
                <span className="pointer-events-none w-max max-w-60 rounded-lg border border-accent-active/50 bg-white/95 px-3 py-1.5 text-[12.5px] font-medium leading-snug text-ink shadow-card backdrop-blur-sm">
                  {n.text}
                </span>
              </>
            )}
          </div>
        )
      })}
    </>
  )
}

/** รูปหน้าจอ — ไม่มีไฟล์ → placeholder บอกชื่อไฟล์ที่ต้องวาง */
function Shot({ img, alt }: { img: string; alt: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-accent bg-hero text-dim">
        <b className="text-base font-semibold text-ink">ยังไม่มีภาพหน้าจอ</b>
        <span>วางไฟล์ไว้ที่</span>
        <code className="rounded-lg border border-line bg-white px-3 py-1 font-num text-[13px] text-accent-active">
          presentation/public/shots/{img}
        </code>
      </div>
    )
  }
  return (
    <img src={`shots/${img}`} alt={alt} onError={() => setMissing(true)}
      className="size-full rounded-xl bg-white object-contain shadow-float ring-1 ring-white/15" />
  )
}

/** รีโมตคุมเส้นแบ่งจากภายนอก — แป้น B เด้งสลับข้าง · โหมดออโต้สั่งเลื่อนแบบ animate */
export type DiffApi = { toggle: () => void; set: (pct: number, ms?: number) => void }

/** slider เทียบภาพ ก่อน/หลัง — ลากได้ทั้งเมาส์/นิ้ว · คุมจากภายนอกผ่าน apiRef */
function DiffSlider({ diff, title, notes, step, onPickStep, apiRef }: {
  diff: { before: string; after: string }
  title: string
  notes?: Note[]
  step: number
  onPickStep: (i: number) => void
  apiRef: React.MutableRefObject<DiffApi | null>
}) {
  const [pct, setPct] = useState(50)
  // ระยะเวลา animate ตอนถูกสั่งเลื่อนจากภายนอก — 0 = กำลังลากมือ (ต้องตามนิ้วทันที)
  const [anim, setAnim] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef(false)

  apiRef.current = {
    toggle: () => { setAnim(450); setPct((p) => (p > 50 ? 0 : 100)) },
    set: (p, ms = 800) => { setAnim(ms); setPct(p) },
  }

  const moveTo = (clientX: number) => {
    const r = box.current!.getBoundingClientRect()
    setPct(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)))
  }

  // เข้าโหมดซูมอธิบายจุด = เลื่อนเส้นไปสุดฝั่ง "หลัง" ให้เอง — เส้นค้างกลางภาพจะบังเนื้อหาที่กำลังชี้
  useEffect(() => {
    if (step >= 0) { setAnim(700); setPct(0) }
  }, [step])

  const slide = anim ? `${anim}ms ease-in-out` : undefined

  const zoom = notes && notes[step] ? focusTransform(notes[step]) : undefined

  return (
    // ขนาดตาม Frame ที่ครอบ (ล็อก 16:10 เท่าไฟล์ภาพ 1600x1000 — สองภาพสเกลตรงกันเป๊ะ)
    <div ref={box} className="relative size-full touch-none select-none overflow-hidden rounded-xl bg-white shadow-float ring-1 ring-white/15"
      onPointerDown={(e) => { drag.current = true; setAnim(0); e.currentTarget.setPointerCapture(e.pointerId); moveTo(e.clientX) }}
      onPointerMove={(e) => { if (drag.current) moveTo(e.clientX) }}
      onPointerUp={() => { drag.current = false }}
      onPointerCancel={() => { drag.current = false }}>
      {/* stage — ซูมทั้งฉาก (ภาพ+เส้นแบ่ง+หมุด) เข้าไปหาจุดที่กำลังอธิบาย */}
      <div className="absolute inset-0 transition-transform duration-500 ease-out" style={{ transform: zoom }}>
        <img src={`shots/${diff.after}`} alt={`${title} — หลัง`} className="block size-full" />
        {/* ชั้นภาพ "ก่อน" — ตัดความกว้างตามตำแหน่งเส้น (ภาพในสูงเต็ม กว้าง auto = ขนาดเท่าภาพฐาน) */}
        <div className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%`, transition: slide && `width ${slide}` }}>
          <img src={`shots/${diff.before}`} alt={`${title} — ก่อน`} className="block h-full w-auto max-w-none" />
        </div>
        {/* เส้นแบ่ง + ปุ่มจับ */}
        <div className="absolute inset-y-0 w-[3px] -translate-x-1/2 cursor-ew-resize bg-accent-active shadow-[0_0_0_1px_rgba(255,255,255,0.65)]"
          style={{ left: `${pct}%`, transition: slide && `left ${slide}` }} />
        <div className="absolute top-1/2 flex size-[42px] -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-accent-active text-[15px] font-bold text-white shadow-float"
          style={{ left: `${pct}%`, transition: slide && `left ${slide}` }}>‹›</div>
        {/* ป้ายบอกฝั่ง — จมใต้เส้น = ซ่อน */}
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-ink/60 px-3.5 py-1 text-[12.5px] font-bold text-white transition-opacity"
          style={{ opacity: pct < 12 ? 0 : 1 }}>ก่อน</span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-accent-active px-3.5 py-1 text-[12.5px] font-bold text-white transition-opacity"
          style={{ opacity: pct > 88 ? 0 : 1 }}>หลัง</span>
        {notes && <NoteLayer notes={notes} active={step} onPick={onPickStep} zoomed={!!zoom} />}
      </div>
    </div>
  )
}

/** ปก + สไลด์ปิด ใช้โครงเดียวกัน */
function CoverShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3.5 p-6 text-center"
      style={{ background: 'linear-gradient(to top, var(--color-surface-blue), #fff 70%)' }}>
      {children}
    </div>
  )
}

function Stat({ v, label }: { v: string; label: string }) {
  return (
    <div className="min-w-[130px] rounded-2xl border border-line bg-white px-7 py-4 shadow-card">
      <b className="block font-num text-3xl font-extrabold text-accent-active">{v}</b>
      <span className="text-[13px] text-dim">{label}</span>
    </div>
  )
}

function Cover({ onStart }: { onStart: () => void }) {
  return (
    <CoverShell>
      <img src="assets/logo-mark.svg" alt="" className="mb-1 w-[clamp(90px,11vh,140px)]" />
      <img src="assets/wordmark.svg" alt="BMS FaceEnroll" className="w-[clamp(230px,30vw,410px)]" />
      <p className="max-w-[660px] text-[clamp(14.5px,1.6vw,18px)] leading-[1.85] text-dim">
        ระบบบริหารจัดการการลงทะเบียนใบหน้าและการลงเวลาปฏิบัติงาน<br />ของบุคลากรโรงพยาบาล — เชื่อมต่อ HOSxP
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        <Stat v="20+" label="หน้าจอการทำงาน" />
        <Stat v="8" label="ธีมให้เลือก" />
        <Stat v="3" label="ระดับสิทธิ์ผู้ใช้" />
        <Stat v="3" label="ขนาดจอที่รองรับ" />
      </div>
      {/* ปุ่มเริ่ม = user gesture ปลดล็อกเสียงของ browser ไปในตัว */}
      <button onClick={onStart}
        className="mt-5 inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-accent-active px-9 py-4 text-[17px] font-bold text-white shadow-float transition-transform hover:-translate-y-0.5">
        ▶ เริ่มนำเสนออัตโนมัติ
      </button>
      <div className="mt-4 flex flex-wrap justify-center gap-5 text-[12.5px] text-dim">
        <span><kbd>←</kbd> <kbd>→</kbd> ข้ามสไลด์</span>
        <span><kbd>A</kbd> เล่น/หยุด</span>
        <span><kbd>G</kbd> ภาพรวม</span>
        <span><kbd>F</kbd> เต็มจอ</span>
        <span><kbd>B</kbd> เทียบก่อน/หลัง</span>
      </div>
    </CoverShell>
  )
}

function End({ onReplay }: { onReplay: () => void }) {
  return (
    <CoverShell>
      <h1 className="text-[clamp(30px,4vw,50px)] font-bold">พร้อมใช้งานจริง<em className="not-italic text-accent-active">.</em></h1>
      <p className="text-[clamp(15px,1.7vw,19px)] leading-[1.85] text-dim">
        ชมระบบสด ๆ ได้ที่<br />
        <b className="font-num text-accent-active">bms-uxui-git.github.io/BMS-FaceEnroll</b>
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Stat v="React" label="TypeScript + Vite" />
        <Stat v="Design System" label="component เดียวกันทั้งระบบ" />
        <Stat v="Responsive" label="ทุกอุปกรณ์" />
      </div>
      <button onClick={onReplay}
        className="mt-5 inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-accent-active px-8 py-3.5 text-[15.5px] font-bold text-white shadow-float transition-transform hover:-translate-y-0.5">
        ↺ เล่นอีกครั้ง
      </button>
      <p className="mt-5 text-sm text-dim">BMS UX/UI Team · 2569</p>
    </CoverShell>
  )
}

// ── aura แสงฟุ้งรอบจอแบบ YouTube ambient ─────────────────────────────
// sample สีจริงจากภาพด้วย canvas (มุม 4 มุม) → เร่ง saturation ให้เป็น "แสง"
// ตอนซูมจุด walkthrough จะ sample เฉพาะบริเวณรอบจุดนั้น — แสงเปลี่ยนตามเนื้อหาที่กำลังโชว์

const auraCache = new Map<string, string[]>()   // `${img}@x,y` -> สี 4 มุม

/** เร่งสีตัวอย่างให้เป็นแสง — ภาพหน้าจอส่วนใหญ่ขาว/เทา ถ้าจางเกินไปให้ทิ้งไปหาโทนฟ้าแบรนด์ */
function glowColor(r: number, g: number, b: number): string {
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255
  const l = (mx + mn) / 2
  const d = mx - mn
  let h = 0
  let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d > 0) {
    if (mx === r / 255) h = (((g - b) / 255) / d) % 6
    else if (mx === g / 255) h = ((b - r) / 255) / d + 2
    else h = ((r - g) / 255) / d + 4
    h = (h * 60 + 360) % 360
  }
  if (s < 0.06) { h = 217; s = 0.45 }              // เทา/ขาวล้วน -> ฟ้าแบรนด์
  s = Math.min(0.95, s * 1.7 + 0.25)
  const lum = Math.min(0.66, Math.max(0.5, l))
  return `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(lum * 100).toFixed(0)}%)`
}

/** สี 4 มุมของบริเวณที่กำลังแสดง (ทั้งภาพ หรือหน้าต่างซูมรอบ note) */
function sampleAura(img: string, note: Note | undefined, cb: (cols: string[]) => void) {
  const key = `${img}@${note ? `${note.x},${note.y}` : 'full'}`
  const hit = auraCache.get(key)
  if (hit) { cb(hit); return }
  const im = new Image()
  im.src = `shots/${img}`
  im.onload = () => {
    const W = 64, H = 40
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const g = c.getContext('2d')
    if (!g) return
    g.drawImage(im, 0, 0, W, H)
    // หน้าต่างที่กำลังแสดง: ซูม = กรอบสัดส่วน 1/ZOOM รอบจุด (clamp ในภาพ) · ไม่ซูม = ทั้งภาพ
    let x0 = 0, y0 = 0, w = W, h0 = H
    if (note) {
      w = W / ZOOM; h0 = H / ZOOM
      x0 = Math.max(0, Math.min(W - w, (note.x / 100) * W - w / 2))
      y0 = Math.max(0, Math.min(H - h0, (note.y / 100) * H - h0 / 2))
    }
    const avg = (ax: number, ay: number, aw: number, ah: number) => {
      const d = g.getImageData(Math.round(ax), Math.round(ay), Math.max(1, Math.round(aw)), Math.max(1, Math.round(ah))).data
      let r = 0, gg = 0, b = 0
      const n = d.length / 4
      for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2] }
      return glowColor(r / n, gg / n, b / n)
    }
    // 4 มุมของหน้าต่าง — มุมละครึ่งกว้างครึ่งสูง
    const cols = [
      avg(x0, y0, w / 2, h0 / 2), avg(x0 + w / 2, y0, w / 2, h0 / 2),
      avg(x0, y0 + h0 / 2, w / 2, h0 / 2), avg(x0 + w / 2, y0 + h0 / 2, w / 2, h0 / 2),
    ]
    auraCache.set(key, cols)
    cb(cols)
  }
}

/** กรอบภาพ + aura — แสง radial 4 มุมสีตามเนื้อหาที่กำลังแสดงจริง */
function Frame({ img, note, children }: { img: string; note?: Note; children: React.ReactNode }) {
  const [cols, setCols] = useState<string[] | null>(null)
  useEffect(() => {
    let dead = false
    sampleAura(img, note, (c) => { if (!dead) setCols(c) })
    return () => { dead = true }
  }, [img, note?.x, note?.y])   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative aspect-[16/10] h-full max-w-full">
      {cols && (
        <div aria-hidden className="pointer-events-none absolute -inset-14 blur-[64px] transition-opacity duration-700"
          style={{
            opacity: 0.75,
            background: `radial-gradient(58% 58% at 14% 14%, ${cols[0]}, transparent 72%),` +
              `radial-gradient(58% 58% at 86% 14%, ${cols[1]}, transparent 72%),` +
              `radial-gradient(58% 58% at 14% 86%, ${cols[2]}, transparent 72%),` +
              `radial-gradient(58% 58% at 86% 86%, ${cols[3]}, transparent 72%)`,
          }} />
      )}
      <div className="absolute inset-0">{children}</div>
    </div>
  )
}

/** เนื้อสไลด์แบบ reels — ภาพอย่างเดียวเต็มพื้นที่ (ข้อความทั้งหมดอยู่บน caption ซ้อนล่างภาพ) */
function Content({ s, step, onPickStep, diffApi }: {
  s: Extract<Slide, { sec: string }>
  step: number
  onPickStep: (i: number) => void
  diffApi: React.MutableRefObject<DiffApi | null>
}) {
  return (
    <div className="flex size-full items-center justify-center px-[clamp(14px,2.5vw,36px)] pb-[clamp(96px,15vh,160px)] pt-[clamp(46px,7vh,70px)]">
      {s.diff ? (
        <Frame img={s.diff.after} note={s.notes?.[step]}>
          <DiffSlider diff={s.diff} title={s.title} notes={s.notes} step={step} onPickStep={onPickStep} apiRef={diffApi} />
        </Frame>
      ) : s.notes ? (
        <Frame img={s.img!} note={s.notes[step]}>
          <div className="relative size-full overflow-hidden rounded-xl bg-white shadow-float ring-1 ring-white/15">
            <div className="absolute inset-0 transition-transform duration-500 ease-out"
              style={{ transform: focusTransform(s.notes[step]) }}>
              <img src={`shots/${s.img}`} alt={s.title} className="block size-full" />
              <NoteLayer notes={s.notes} active={step} onPick={onPickStep} zoomed />
            </div>
          </div>
        </Frame>
      ) : (
        <Frame img={s.img!}>
          <Shot img={s.img!} alt={s.title} />
        </Frame>
      )}
    </div>
  )
}

// จำนวนจุด walkthrough ของสไลด์ · สไลด์มีจุด = เปิดมาที่ step -1 (ภาพรวม ยังไม่ซูม) ก่อน
const stepsOf = (i: number) => { const sl = SLIDES[i]; return sl && !sl.type && sl.notes ? sl.notes.length : 0 }
const startStep = (i: number) => (stepsOf(i) ? -1 : 0)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function App() {
  const [cur, setCur] = useState(() => {
    const h = parseInt(location.hash.slice(1))
    return Number.isFinite(h) ? Math.max(0, Math.min(N - 1, h - 1)) : 0
  })
  const [grid, setGrid] = useState(false)
  // walkthrough: -1 = ภาพรวมทั้งหน้า · 0..n-1 = ซูมอธิบายทีละจุด
  const [step, setStep] = useState(() => startStep(parseInt(location.hash.slice(1)) - 1 || 0))
  // เสียงอ่านบทอธิบาย (ปิด/เปิดด้วยปุ่มหรือแป้น V)
  const [voice, setVoice] = useState(true)
  // โหมดออโต้ = โหมดหลักของ reels — เล่าเรื่องหน้า → กวาด slider → ซูมทีละจุด → สไลด์ถัดไปเอง
  const [auto, setAuto] = useState(false)
  const autoRef = useRef(auto)
  autoRef.current = auto
  // ตัวคุม slider ของสไลด์ปัจจุบัน — DiffSlider ฝาก api ไว้ให้แป้น B และโหมดออโต้เรียก
  const diffApi = useRef<DiffApi | null>(null)
  // subtitle = ประโยคที่เสียงกำลังอ่านอยู่ (null = เงียบ) — speak() ป้อนให้ผ่าน subCb
  const [sub, setSub] = useState<string | null>(null)
  useEffect(() => {
    subCb = setSub
    return () => { subCb = null }
  }, [])

  const show = useCallback((i: number) => {
    const t = Math.max(0, Math.min(N - 1, i))
    setCur(t); setStep(startStep(t))
  }, [])
  const go = useCallback((d: number) => {
    const t = Math.max(0, Math.min(N - 1, cur + d))
    setCur(t); setStep(startStep(t))
  }, [cur])
  // เดินหน้า/ถอยหลังแบบนับจุด walkthrough (ใช้ตอนดูเอง) — ตอนออโต้ให้ข้ามเป็นสไลด์
  // เพราะเครื่องเดินออโต้คุม step เองอยู่ การขยับสไลด์จะรีสตาร์ตลำดับของสไลด์ใหม่ให้เอง
  const advance = useCallback(() => {
    if (autoRef.current) { go(1); return }
    if (step + 1 < stepsOf(cur)) setStep(step + 1)
    else { const t = Math.min(N - 1, cur + 1); setCur(t); setStep(startStep(t)) }
  }, [cur, step, go])
  const retreat = useCallback(() => {
    if (autoRef.current) { go(-1); return }
    if (step > startStep(cur)) setStep(step - 1)
    else {
      const t = Math.max(0, cur - 1)
      setCur(t)
      setStep(Math.max(0, stepsOf(t) - 1))   // ถอยเข้าสไลด์ก่อนหน้า = จุดสุดท้ายของมัน
    }
  }, [cur, step, go])

  useEffect(() => { location.hash = String(cur + 1) }, [cur])

  // โหมดมือ: เปลี่ยนจุด/สไลด์ = อ่านบทพูดของจุดนั้น (โหมดออโต้คุมเสียงเองทั้งลำดับ)
  useEffect(() => {
    if (autoRef.current) return
    const sl = SLIDES[cur]
    if (voice && sl && !sl.type && sl.notes && sl.notes[step]) {
      void speak(sl.notes[step].say ?? sl.notes[step].text)
    } else {
      stopSpeak()
    }
    return () => { if (!autoRef.current) stopSpeak() }
  }, [cur, step, voice])
  useEffect(() => { if (!SLIDES[cur] || !('diff' in SLIDES[cur]) || !SLIDES[cur].diff) diffApi.current = null }, [cur])

  // ── เครื่องเดินสไลด์อัตโนมัติ — ทำงานทีละสไลด์ จบแล้วขยับ cur ให้ effect รอบใหม่รับช่วงต่อ ──
  useEffect(() => {
    if (!auto) return
    setVoice(true)
    prefetchVoices()   // โหลดเสียงทั้งชุดล่วงหน้าเบื้องหลัง — สไลด์ถัดๆ ไปเสียงพร้อมทันที
    let dead = false
    void (async () => {
      const sl = SLIDES[cur]
      if (!sl) return
      if (sl.type === 'end') { setAuto(false); return }
      if (sl.type === 'cover') {
        await speak(WELCOME)
        if (dead) return
        await sleep(600); if (dead) return
        go(1); return
      }
      if (sl.notes?.length) {
        // 1) เล่าภาพรวมของหน้า — ค้างที่ภาพ "ก่อน" ยังไม่ซูม
        setStep(-1)
        diffApi.current?.set(100, 600)
        await speak(sl.say ?? sl.desc)
        if (dead) return
        // 2) บอกจำนวนจุดแก้ + กวาด slider เทียบก่อน/หลังให้ดู จบที่ภาพ "หลัง"
        if (sl.diff) {
          const talk = speak(countLine(sl.notes.length))
          diffApi.current?.set(0, 2400); await sleep(2700); if (dead) return
          diffApi.current?.set(100, 1700); await sleep(1900); if (dead) return
          diffApi.current?.set(0, 1700)
          await talk
          if (dead) return
          await sleep(400); if (dead) return
        }
        // 3) ซูมอธิบายทีละจุด — เสียงจบจุดหนึ่งค่อยไปจุดถัดไป
        for (let i = 0; i < sl.notes.length; i++) {
          setStep(i)
          await speak(sl.notes[i].say ?? sl.notes[i].text)
          if (dead) return
          await sleep(500); if (dead) return
        }
        await sleep(400); if (dead) return
        go(1); return
      }
      // สไลด์หน้าจอปกติ — อ่านชื่อหน้า + คำโปรยแล้วไปต่อ
      await speak(sl.say ?? `${sl.title}. ${sl.desc}`)
      if (dead) return
      await sleep(900); if (dead) return
      go(1)
    })()
    return () => { dead = true; stopSpeak() }
  }, [auto, cur])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); advance() }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); retreat() }
      else if (e.key === 'Home') { setAuto(false); show(0) }
      else if (e.key === 'End') { setAuto(false); show(N - 1) }
      else if (e.key.toLowerCase() === 'a') setAuto((v) => !v)
      else if (e.key.toLowerCase() === 'b') diffApi.current?.toggle()
      else if (e.key.toLowerCase() === 'v') setVoice((v) => !v)
      else if (e.key.toLowerCase() === 'g') setGrid((v) => !v)
      else if (e.key.toLowerCase() === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
      else if (e.key === 'Escape') { setAuto(false); setGrid(false) }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [go, show, advance, retreat])

  const s = SLIDES[cur]
  const steps = stepsOf(cur)
  // ความยาวแถบ progress ของสไลด์ปัจจุบัน — ประมาณจากตำแหน่งจุด walkthrough
  const fill = steps ? ((step + 2) / (steps + 2)) * 100 : auto ? 60 : 100
  // caption ล่างภาพ: ตอนซูมจุด = ข้อความของจุดนั้น · นอกนั้น = คำโปรยของหน้า
  const caption = !s.type && s.notes && step >= 0 ? s.notes[step].text : !s.type ? s.desc : ''

  return (
    <div className="relative h-full overflow-hidden bg-[#0c1322] font-sans text-ink">
      {/* ── ฉากสไลด์ ── */}
      <div className="absolute inset-0">
        {SLIDES.map((sl, i) => (
          <section key={i} aria-hidden={i !== cur}
            className={`absolute inset-0 flex flex-col transition-all duration-300 ease-out ${
              i === cur ? 'visible translate-x-0 opacity-100' : `invisible opacity-0 ${i < cur ? '-translate-x-9' : 'translate-x-9'}`
            }`}>
            {sl.type === 'cover' ? <Cover onStart={() => { setAuto(true) }} />
              : sl.type === 'end' ? <End onReplay={() => { show(0); setAuto(true) }} /> : (
                <Content s={sl} step={i === cur ? step : 0} onPickStep={setStep}
                  diffApi={i === cur ? diffApi : { current: null }} />
              )}
          </section>
        ))}
      </div>

      {/* ── โซนแตะซ้าย/ขวา — ข้ามสไลด์ (ออโต้เล่นต่อจากสไลด์ใหม่เอง) ── */}
      <button aria-label="ก่อนหน้า" onClick={retreat} className="absolute inset-y-24 left-0 z-[4] w-[10%] cursor-pointer opacity-0" />
      <button aria-label="ถัดไป" onClick={advance} className="absolute inset-y-24 right-0 z-[4] w-[10%] cursor-pointer opacity-0" />

      {/* ── แถบบน: progress ต่อสไลด์แบบ stories + ปุ่มคุมเล็ก ๆ ── */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-[6] px-[clamp(12px,2vw,28px)] pb-8 pt-2.5 transition-opacity ${s.type ? 'opacity-0' : 'opacity-100'}`}
        style={{ background: 'linear-gradient(to bottom, rgba(5,10,22,0.72), transparent)' }}>
        <div className="flex gap-1">
          {SLIDES.map((_, i) => (
            <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              <span className="block h-full rounded-full bg-white transition-[width] duration-500"
                style={{ width: i < cur ? '100%' : i === cur ? `${fill}%` : '0%' }} />
            </span>
          ))}
        </div>
        <div className="pointer-events-auto mt-2 flex items-center gap-2.5 text-white">
          <span className="text-[13px] font-bold">BMS FaceEnroll</span>
          <span className="truncate text-[12px] text-white/65">{!s.type && `${s.sec} · ${s.title}`}</span>
          <span className="flex-1" />
          <GhostBtn label={auto ? 'หยุดเล่น (A)' : 'เล่นอัตโนมัติ (A)'} onClick={() => setAuto((v) => !v)} active={auto}>{auto ? '⏸' : '▶'}</GhostBtn>
          <GhostBtn label="เสียง (V)" onClick={() => setVoice((v) => !v)}>{voice ? '🔊' : '🔇'}</GhostBtn>
          <GhostBtn label="ภาพรวม (G)" onClick={() => setGrid(true)}>▦</GhostBtn>
          <GhostBtn label="เต็มจอ (F)" onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()}>⛶</GhostBtn>
          <span className="font-num text-[12.5px] font-bold text-white/80">{cur + 1}/{N}</span>
        </div>
      </div>

      {/* ── caption ล่าง: ชื่อเรื่อง + บรรทัดที่กำลังอธิบาย — หลบทั้งแถบตอน subtitle กลางจอขึ้น ── */}
      {!s.type && !sub && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] px-[clamp(18px,3.5vw,48px)] pb-[clamp(14px,2.6vh,26px)] pt-20"
          style={{ background: 'linear-gradient(to top, rgba(5,10,22,0.85), rgba(5,10,22,0.35) 55%, transparent)' }}>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center rounded-full bg-accent-active px-3 py-1 text-[11.5px] font-bold text-white">{s.sec}</span>
            {steps > 0 && (
              <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 font-num text-[11.5px] font-bold text-white backdrop-blur-sm">
                {step >= 0 ? `จุดแก้ไข ${step + 1} / ${steps}` : `จุดแก้ไข ${steps} จุด`}
              </span>
            )}
          </div>
          <h2 className="mt-2 text-[clamp(17px,2vw,25px)] font-bold leading-snug text-white">{s.title}</h2>
          {/* คำโปรย/ข้อความจุด — หลบให้ subtitle ตอนเสียงกำลังพูด (subtitle เป็นแถบกลางล่างจอ) */}
          {!sub && (
            <p key={`${cur}:${step}`} className="cap-in mt-1 max-w-[88ch] text-[clamp(13px,1.4vw,15.5px)] leading-[1.7] text-white/85">
              {caption}
            </p>
          )}
        </div>
      )}

      {/* ── subtitle ตามเสียงพูด — แถบดำโปร่งกลางล่างจอแบบวิดีโอ (ทุกสไลด์) ── */}
      {sub && (
        <div className="pointer-events-none absolute inset-x-0 bottom-7 z-[7] flex justify-center px-6">
          <span key={sub} className="cap-in max-w-[80ch] rounded-2xl bg-black/65 px-6 py-2.5 text-center text-[clamp(14px,1.5vw,17px)] font-medium leading-[1.7] text-white shadow-float backdrop-blur-sm">
            {sub}
          </span>
        </div>
      )}

      {/* ── โหมดภาพรวม ── */}
      {grid && (
        <div className="absolute inset-0 z-20 overflow-auto bg-white/95 p-[clamp(24px,4vh,44px)] px-[clamp(24px,4vw,64px)] backdrop-blur-lg"
          onClick={(e) => { if (e.target === e.currentTarget) setGrid(false) }}>
          <h3 className="mb-1.5 text-[21px] font-bold">สไลด์ทั้งหมด</h3>
          <div className="mb-5 text-[13.5px] text-dim">คลิกการ์ดเพื่อข้ามไปสไลด์นั้น · กด <b>Esc</b> เพื่อปิด</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
            {SLIDES.map((sl, i) => (
              <button key={i} onClick={() => { setGrid(false); show(i) }}
                className={`flex cursor-pointer flex-col gap-1 rounded-2xl border bg-white px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-card ${
                  i === cur ? 'border-accent-active bg-hero shadow-[inset_0_0_0_1px_var(--color-accent-active)]' : 'border-line'
                }`}>
                <span className="font-num text-xs font-bold text-accent-active">{pad(i)}</span>
                <span className="text-[14.5px] font-semibold leading-snug">{slideName(sl)}</span>
                {!sl.type && <span className="text-xs text-dim">{sl.sec}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GhostBtn({ onClick, active, label, children }: {
  onClick: () => void; active?: boolean; label: string; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
      className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-[14px] backdrop-blur-sm transition-colors ${
        active ? 'bg-accent-active text-white' : 'bg-white/15 text-white hover:bg-white/30'
      }`}>
      {children}
    </button>
  )
}
