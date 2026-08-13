import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/inputs/Button'
import { SearchInput } from '../components/inputs/SearchInput'
import { EmptyState } from '../components/feedback/Message'
import { HeroArt } from '../components/HeroArt'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'

// คู่มือการใช้งาน — จัดแบบบทความ (blog)
//   หน้ารวม  : การ์ดบทความ + ค้นหา (คลิกเพื่ออ่าน)
//   หน้าอ่าน : ความกว้างจำกัด ~68ch อ่านสบาย · สารบัญเกาะขวาบนจอกว้าง · ปุ่มกลับด้านบน
//
// เพิ่มบทความใหม่ = เพิ่มก้อนใน ARTICLES (id/title/excerpt/icon/tag/minutes/updated/sections)
// หัวข้อย่อยใน sections จะกลายเป็นสารบัญ + จุดกระโดด (anchor) ให้เอง ไม่ต้องเขียนซ้ำ

// ---------- ชิ้นส่วนของเนื้อบทความ ----------

/** ย่อหน้า — ขนาด/ระยะบรรทัดของ "เนื้อความยาว" (ใหญ่กว่า body ปกติของแดชบอร์ด) */
function P({ children, lead }: { children: ReactNode; lead?: boolean }) {
  return (
    <p style={{
      margin: 0,
      fontSize: lead ? 17 : 15,
      lineHeight: lead ? 1.75 : 1.85,
      color: lead ? 'var(--text)' : 'var(--text-dim)',
    }}>{children}</p>
  )
}

/** โค้ด/ค่าที่ต้องคัดลอกตรงตัว */
export const Code = ({ children }: { children: ReactNode }) => (
  <code style={{
    fontFamily: 'var(--mono)', fontSize: 13.5,
    background: 'var(--surface-card)', border: '1px solid var(--control-border)',
    padding: '1px 6px', borderRadius: 'var(--r-sm)', color: 'var(--text)', wordBreak: 'break-all',
  }}>{children}</code>
)

/** กล่องหมายเหตุ — info (ฟ้า) / warn (ส้ม) */
function Note({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  const c = tone === 'warn' ? 'var(--warn)' : 'var(--accent-active)'
  return (
    <div style={{
      display: 'flex', gap: 'var(--sp-3)', padding: 'var(--sp-3) var(--sp-4)',
      borderRadius: 'var(--r-lg)', borderLeft: `3px solid ${c}`,
      background: tone === 'warn' ? 'var(--warn-light)' : 'var(--accent-light)',
      fontSize: 14.5, lineHeight: 1.7, color: 'var(--text)',
    }}>
      <span aria-hidden style={{ flex: 'none', color: c, marginTop: 2 }}>
        <Icon name={tone === 'warn' ? 'alert' : 'info'} size={18} width={1.8} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

/** ขั้นตอนที่ n — เลขในวงกลม + เส้นต่อลงไปยังขั้นถัดไป */
function Step({ n, title, children, last }: { n: number; title: string; children: ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{
          width: 32, height: 32, borderRadius: 'var(--r-full)', flex: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--accent-active)', color: 'var(--bg)',
          fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 14,
        }}>{n}</span>
        {!last && <span aria-hidden style={{ flex: 1, width: 2, background: 'var(--control-border)', marginTop: 4 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 'var(--sp-6)' }}>
        <div style={{ ...TEXT.h3, color: 'var(--text)', marginBottom: 'var(--sp-2)' }}>{title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', fontSize: 15, lineHeight: 1.8, color: 'var(--text-dim)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/** รายการหัวข้อย่อย (จุดนำหน้า) */
function List({ items }: { items: ReactNode[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {items.map((it, i) => (
        <li key={i} style={{ display: 'flex', gap: 'var(--sp-3)', fontSize: 15, lineHeight: 1.8, color: 'var(--text-dim)' }}>
          <span aria-hidden style={{ flex: 'none', color: 'var(--accent)', marginTop: 9, width: 6, height: 6, borderRadius: 'var(--r-full)', background: 'currentColor' }} />
          <span style={{ flex: 1, minWidth: 0 }}>{it}</span>
        </li>
      ))}
    </ul>
  )
}

/** คำถาม-คำตอบท้ายบทความ */
function QA({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
      <div style={{ ...TEXT.bodyMed, fontSize: 15, color: 'var(--text)' }}>{q}</div>
      <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-dim)' }}>{children}</div>
    </div>
  )
}

// ---------- เนื้อหา ----------

type Section = { id: string; title: string; body: ReactNode }
type Article = {
  id: string
  title: string
  excerpt: string
  icon: string
  tag: string
  minutes: number
  updated: string
  /** ย่อหน้านำ — ตัวใหญ่กว่าเนื้อหาปกติ อยู่ใต้หัวบทความ */
  lead: ReactNode
  sections: Section[]
}

const ARTICLES: Article[] = [
  {
    id: 'telegram',
    title: 'ตั้งค่าแจ้งเตือนเข้ากลุ่ม Telegram',
    excerpt: 'ให้ระบบส่งข้อความเข้ากลุ่มทุกครั้งที่พนักงานสแกนลงเวลา — สร้างบอท เอา Chat ID แล้วกรอกในหน้าตั้งค่า',
    icon: 'bell',
    tag: 'การแจ้งเตือน',
    minutes: 5,
    updated: '11 ส.ค. 2569',
    lead: <>เมื่อพนักงานสแกนลงเวลาสำเร็จ ระบบจะส่งข้อความแจ้งเข้า <b>กลุ่ม Telegram</b> ที่คุณตั้งไว้ — บอกชื่อ ตำแหน่ง และเวลาที่ลงเวลา ทำครั้งเดียวจบใน 4 ขั้นตอน</>,
    sections: [
      {
        id: 'overview',
        title: 'ภาพรวม',
        body: (
          <>
            <P>ทั้งหมดมี 4 ขั้น ใช้เวลาประมาณ 5 นาที และทำจากมือถือเครื่องเดียวได้:</P>
            <List items={[
              <>สร้าง <b>บอท</b> ใน Telegram เพื่อให้ระบบมีตัวแทนไว้ส่งข้อความ</>,
              <>สร้าง <b>กลุ่ม</b> แล้วเพิ่มบอทเข้าไป</>,
              <>เอา <b>Chat ID</b> ของกลุ่ม (เลขประจำกลุ่ม)</>,
              <>กรอก <b>Bot Token</b> + <b>Chat ID</b> ในหน้าตั้งค่าแอปสแกน</>,
            ]} />
          </>
        ),
      },
      {
        id: 'steps',
        title: 'ทำตามทีละขั้น',
        body: (
          <>
            <Step n={1} title="สร้างบอท Telegram">
              <div>เปิดแอป Telegram ค้นหา <Code>@BotFather</Code> (มีเครื่องหมายติ๊กน้ำเงิน) แล้วกดเริ่มแชท</div>
              <div>พิมพ์ <Code>/newbot</Code> แล้วส่ง</div>
              <div>ตั้ง <b>ชื่อบอท</b> ที่จะโชว์ในแชท เช่น "แจ้งเตือนลงเวลา รพ.X"</div>
              <div>ตั้ง <b>username ของบอท</b> ต้องลงท้ายด้วย <Code>bot</Code> เช่น <Code>checkin_rpx_bot</Code></div>
              <div>BotFather จะส่ง <b>Bot Token</b> กลับมา หน้าตาแบบ <Code>123456789:AAE-xxxxxxxxxxxxxxxxx</Code></div>
              <Note tone="warn">เก็บ Bot Token เป็นความลับ — ใครมีก็ส่งข้อความในนามบอทได้ ถ้าหลุดให้พิมพ์ <Code>/revoke</Code> ใน BotFather เพื่อออก token ใหม่</Note>
            </Step>

            <Step n={2} title="สร้างกลุ่มแล้วเพิ่มบอทเข้าไป">
              <div>สร้างกลุ่มใหม่ใน Telegram (New Group) ตั้งชื่อ เช่น "ลงเวลา รพ.X"</div>
              <div>เพิ่มสมาชิก: ค้นหา username ของบอทที่เพิ่งสร้าง แล้วเพิ่มเข้ากลุ่ม</div>
              <div>ตั้งบอทเป็น <b>ผู้ดูแลกลุ่ม (admin)</b> จะส่งข้อความได้แน่นอนกว่า</div>
              <div>พิมพ์ข้อความอะไรก็ได้ในกลุ่ม 1 ครั้ง เพื่อให้บอท "เห็น" กลุ่มนี้</div>
            </Step>

            <Step n={3} title="เอา Chat ID ของกลุ่ม">
              <div>เปิดเบราว์เซอร์ ไปที่ลิงก์นี้ (แทน <Code>{'<BOT_TOKEN>'}</Code> ด้วย token จากขั้นที่ 1):</div>
              <div><Code>https://api.telegram.org/bot{'<BOT_TOKEN>'}/getUpdates</Code></div>
              <div>มองหาค่า <Code>{'"chat":{"id":-100xxxxxxxxxx}'}</Code> — เลขที่ขึ้นต้นด้วย <Code>-100</Code> คือ <b>Chat ID</b> ของกลุ่ม</div>
              <Note>ถ้าลิงก์ขึ้น <Code>{'"result":[]'}</Code> ว่างเปล่า ให้กลับไปพิมพ์ข้อความในกลุ่มอีกครั้ง แล้วรีเฟรชลิงก์</Note>
            </Step>

            <Step n={4} last title="กรอกในระบบแล้วทดสอบ">
              <div>กลับมาหน้า <b>ตั้งค่าแอปสแกน</b> → หัวข้อ <b>แจ้งเตือน</b> → เปิดสวิตช์ช่องทาง <b>Telegram</b></div>
              <div>วาง <b>Bot Token</b> (จากขั้นที่ 1) ในช่อง <Code>Bot Token</Code></div>
              <div>วาง <b>Chat ID</b> (จากขั้นที่ 3) ในช่อง <Code>Chat ID</Code> — ระบบบันทึกให้อัตโนมัติ</div>
              <div><b>ทดสอบ:</b> ให้พนักงานสแกนลงเวลา 1 ครั้ง ข้อความควรเด้งเข้ากลุ่มภายในไม่กี่วินาที</div>
            </Step>
          </>
        ),
      },
      {
        id: 'faq',
        title: 'เจอปัญหาบ่อย ๆ',
        body: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <QA q="ข้อความไม่เข้ากลุ่ม">
              เช็ก 3 อย่างตามลำดับ: บอทยังอยู่ในกลุ่มไหม · Bot Token กับ Chat ID ถูกต้องไหม · เปิดสวิตช์แจ้งเตือนในหน้าตั้งค่าแล้วหรือยัง
            </QA>
            <QA q="อยากย้ายไปกลุ่มใหม่">
              เพิ่มบอทเข้ากลุ่มใหม่ ทำขั้นที่ 3 อีกครั้งเพื่อเอา Chat ID ใหม่ แล้วอัปเดตในหน้าตั้งค่า
            </QA>
            <QA q="Token หลุด">
              พิมพ์ <Code>/revoke</Code> ใน BotFather เพื่อออก token ใหม่ แล้วเอามาอัปเดตในระบบ ของเดิมจะใช้ไม่ได้ทันที
            </QA>
          </div>
        ),
      },
    ],
  },
]

// ---------- หน้ารวมบทความ ----------

function ArticleCard({ a, onOpen }: { a: Article; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="lift" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--sp-3)',
      padding: 'var(--sp-5)', textAlign: 'left', cursor: 'pointer',
      background: 'var(--bg)', border: '1px solid var(--control-border)', borderRadius: 'var(--r-xl)',
      fontFamily: 'var(--sans)', minWidth: 0,
    }}>
      <span aria-hidden style={{
        width: 44, height: 44, flex: 'none', borderRadius: 'var(--r-lg)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--accent-light)', color: 'var(--accent-active)',
      }}>
        <Icon name={a.icon} size={22} width={1.8} />
      </span>

      <span style={{ ...TEXT.h3, color: 'var(--text)' }}>{a.title}</span>
      <span style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-dim)' }}>{a.excerpt}</span>

      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap', marginTop: 'auto', paddingTop: 'var(--sp-2)' }}>
        <span style={{
          ...TEXT.caption, padding: '2px var(--sp-2)', borderRadius: 'var(--r-full)',
          background: 'var(--surface-blue)', color: 'var(--accent)',
        }}>{a.tag}</span>
        <span style={{ ...TEXT.caption, color: 'var(--text-dim)' }}>อ่าน {a.minutes} นาที · แก้ไข {a.updated}</span>
      </span>
    </button>
  )
}

// ---------- หน้าอ่านบทความ ----------

function Reader({ a, onBack }: { a: Article; onBack: () => void }) {
  const { setNav } = useApp()
  const [active, setActive] = useState(a.sections[0]?.id)

  // ไฮไลต์หัวข้อในสารบัญตามตำแหน่งที่อ่านอยู่
  useEffect(() => {
    const main = document.querySelector('main')
    const els = a.sections.map((s) => document.getElementById(`sec-${s.id}`)).filter(Boolean) as HTMLElement[]
    if (!main || els.length === 0) return
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0]
        if (seen) setActive(seen.target.id.replace('sec-', ''))
      },
      { root: main, rootMargin: '-96px 0px -60% 0px', threshold: 0 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [a])

  const jump = (id: string) => document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      <div className="flex gap-2 items-center flex-wrap">
        <Button variant="outline-accent" size="xs" radius="lg" onClick={onBack}
          icon={<Icon name="chevron-left" size={20} width={2} />}>บทความทั้งหมด</Button>
        <Button variant="ghost" size="xs" onClick={() => setNav('settings')}
          icon={<Icon name="system" size={16} width={1.8} />}>ไปหน้าตั้งค่าแอปสแกน</Button>
      </div>

      {/* บทความ + สารบัญ — จอกว้างวางคู่กัน จอแคบเหลือคอลัมน์เดียว (สารบัญถูกซ่อน) */}
      <div className="grid gap-4 items-start help-article-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 240px)' }}>
        <article className="help-article" style={{
          background: 'var(--bg)', border: '1px solid var(--control-border)', borderRadius: 'var(--r-xl)',
          padding: 'var(--sp-8) var(--sp-8) var(--sp-10)', minWidth: 0,
        }}>
          {/* หัวบทความ */}
          <header style={{ maxWidth: '68ch', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              <span style={{
                ...TEXT.caption, padding: '2px var(--sp-2)', borderRadius: 'var(--r-full)',
                background: 'var(--surface-blue)', color: 'var(--accent)',
              }}>{a.tag}</span>
              <span style={{ ...TEXT.caption, color: 'var(--text-dim)' }}>อ่าน {a.minutes} นาที · แก้ไขล่าสุด {a.updated}</span>
            </span>
            <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.35, fontWeight: 500, color: 'var(--text)' }}>{a.title}</h1>
            <P lead>{a.lead}</P>
          </header>

          <hr style={{ border: 'none', borderTop: '1px solid var(--control-border)', margin: 'var(--sp-6) 0' }} />

          {/* เนื้อหา */}
          <div style={{ maxWidth: '68ch', display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
            {a.sections.map((s) => (
              <section key={s.id} id={`sec-${s.id}`} style={{ scrollMarginTop: 96, display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.4, fontWeight: 500, color: 'var(--text)' }}>{s.title}</h2>
                {s.body}
              </section>
            ))}
          </div>
        </article>

        {/* สารบัญ — เกาะไว้ใต้ header ตอนเลื่อน */}
        <nav className="hide-sm" aria-label="สารบัญ" style={{
          position: 'sticky', top: 'calc(var(--topbar-h) + var(--sp-4))', alignSelf: 'start',
          background: 'var(--bg)', border: '1px solid var(--control-border)', borderRadius: 'var(--r-xl)',
          padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)',
        }}>
          <span style={{ ...TEXT.caption, color: 'var(--text-dim)', marginBottom: 'var(--sp-1)' }}>ในบทความนี้</span>
          {a.sections.map((s) => {
            const on = s.id === active
            return (
              <button key={s.id} type="button" onClick={() => jump(s.id)} style={{
                textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)',
                padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-md)',
                background: on ? 'var(--accent-light)' : 'transparent',
                color: on ? 'var(--accent-active)' : 'var(--text-dim)',
                ...TEXT.sm, fontWeight: on ? 500 : 400,
              }}>{s.title}</button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export function Help() {
  const [open, setOpen] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const found = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return ARTICLES
    return ARTICLES.filter((a) => `${a.title} ${a.excerpt} ${a.tag}`.toLowerCase().includes(k))
  }, [q])

  const article = ARTICLES.find((a) => a.id === open)
  if (article) return <Reader a={article} onBack={() => setOpen(null)} />

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      <PageHeader
        title="คู่มือการใช้งาน"
        desc="วิธีใช้งานระบบแบบทีละขั้น เขียนไว้เป็นบทความสั้น ๆ อ่านจบแล้วทำตามได้เลย"
        art={<HeroArt icon="info" />}
      >
        <div className="relative mt-4" style={{ maxWidth: 420 }}>
          <SearchInput grow value={q} onChange={setQ} placeholder="ค้นหาบทความ…" />
        </div>
      </PageHeader>

      {found.length === 0 ? (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--control-border)', borderRadius: 'var(--r-xl)' }}>
          <EmptyState icon="search" text={`ไม่พบบทความที่ตรงกับ "${q.trim()}"`} />
        </div>
      ) : (
        <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px,100%), 1fr))' }}>
          {found.map((a) => <ArticleCard key={a.id} a={a} onOpen={() => setOpen(a.id)} />)}
        </div>
      )}
    </div>
  )
}
