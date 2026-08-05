import {
  Button as AriaButton, CalendarCell, CalendarGrid, CalendarGridBody,
  CalendarGridHeader, CalendarHeaderCell, Dialog, DialogTrigger, Heading, I18nProvider, Popover, RangeCalendar,
} from 'react-aria-components'
import { getLocalTimeZone, parseDate, today, type CalendarDate } from '@internationalized/date'
import { thShort } from '../DatePicker'
import { TEXT } from '../../typography'

// ช่วงวันที่ — "30 ก.ค. 69 - 5 ส.ค. 69"
// ปฏิทินใบเดียว (2 เดือนเรียงกัน) ลากเลือกช่วงได้ในทีเดียว — react-aria RangeCalendar
// ของเดิมเป็น DatePicker 2 ตัวแยกกัน ต้องเปิด-เลือก-ปิด 2 รอบ และเช็ค from <= to เอง
// ตอนนี้ RangeCalendar บังคับความสัมพันธ์ให้ในตัว + locale th-TH-u-ca-buddhist ให้ พ.ศ.

const toCal = (s?: string | null): CalendarDate | undefined => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined
  try { return parseDate(s) } catch { return undefined }
}

export function DateRangePicker({ from, to, onFrom, onTo, max, bare }: {
  from: string
  to: string
  onFrom: (v: string) => void
  onTo: (v: string) => void
  max?: string
  /** ข้อความล้วนไม่มีกรอบ — ใช้ตอนฝังในชิปตัวกรอง (Figma: "12 ก.ค. 69 - 30 ก.ค. 69") */
  bare?: boolean
}) {
  const s = toCal(from)
  const e = toCal(to)
  const todayCal = today(getLocalTimeZone())

  /** ช่วงที่ใช้บ่อย — นับย้อนจากวันล่าสุดที่เลือกได้ */
  const preset = (days: number) => {
    const end = toCal(max) ?? todayCal
    onFrom(end.subtract({ days: days - 1 }).toString())
    onTo(end.toString())
  }

  return (
    <I18nProvider locale="th-TH-u-ca-buddhist">
      <DialogTrigger>
        {/* RAC ใส่ aria-expanded ให้เอง — ชิปตัวกรองใช้ค่านี้ทำสถานะ "เปิดอยู่" */}
        <AriaButton className={bare ? 'dp-trigger-bare' : 'dp-trigger'}>
          {from === to ? thShort(from) : `${thShort(from)} - ${thShort(to)}`}
        </AriaButton>

        <Popover className="dp-popover dp-popover-range" placement="bottom" offset={24}>
          <Dialog className="dp-dialog" aria-label="เลือกช่วงวันที่">
            {({ close }) => (
              <>
                <RangeCalendar
                  value={s && e ? { start: s, end: e } : null}
                  maxValue={toCal(max)}
                  visibleDuration={{ months: 2 }}
                  onChange={(r) => { onFrom(r.start.toString()); onTo(r.end.toString()); close() }}
                >
                  <header className="dp-head">
                    <AriaButton slot="previous" className="dp-nav" aria-label="เดือนก่อนหน้า">‹</AriaButton>
                    <Heading className="dp-title" />
                    <AriaButton slot="next" className="dp-nav" aria-label="เดือนถัดไป">›</AriaButton>
                  </header>
                  <div className="dp-months">
                    {/* narrow = "อา จ อ ..." (short ของ locale ไทยเป็นชื่อเต็ม กว้างเกินช่อง) */}
                    <CalendarGrid className="dp-grid" weekdayStyle="narrow">
                      <CalendarGridHeader>{(d) => <CalendarHeaderCell className="dp-wd">{d}</CalendarHeaderCell>}</CalendarGridHeader>
                      <CalendarGridBody>{(date) => <CalendarCell date={date} className="dp-cell" />}</CalendarGridBody>
                    </CalendarGrid>
                    <CalendarGrid className="dp-grid" offset={{ months: 1 }} weekdayStyle="narrow">
                      <CalendarGridHeader>{(d) => <CalendarHeaderCell className="dp-wd">{d}</CalendarHeaderCell>}</CalendarGridHeader>
                      <CalendarGridBody>{(date) => <CalendarCell date={date} className="dp-cell" />}</CalendarGridBody>
                    </CalendarGrid>
                  </div>
                </RangeCalendar>

                <div className="dp-presets">
                  <button type="button" className="dp-today" onClick={() => { preset(1); close() }}>วันนี้</button>
                  <button type="button" className="dp-today" onClick={() => { preset(7); close() }}>7 วัน</button>
                  <button type="button" className="dp-today" onClick={() => { preset(30); close() }}>30 วัน</button>
                </div>
              </>
            )}
          </Dialog>
        </Popover>
      </DialogTrigger>
    </I18nProvider>
  )
}

/** ป้ายสรุปช่วงวันที่ — พื้น surface-blue + ตัวอักษร accent (Figma: Date badge) */
export function DateRangeBadge({ from, to }: { from: string; to: string }) {
  return (
    <span style={{
      ...TEXT.sm,
      display: 'inline-flex', alignItems: 'center',
      padding: 'var(--sp-1) var(--sp-3)',
      borderRadius: 'var(--r-md)',
      background: 'var(--surface-blue)',
      color: 'var(--accent-active)',
      whiteSpace: 'nowrap',
    }}>
      {from === to ? thShort(from) : `${thShort(from)} - ${thShort(to)}`}
    </span>
  )
}
