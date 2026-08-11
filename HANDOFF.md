# คู่มือรับช่วงต่อ (dev handoff)

ไฟล์นี้สรุป **สิ่งที่ต้องทำต่อ** หลังรอบ redesign UI ทั้งระบบ — อ่านจบแล้วเริ่มงานได้เลย
(อธิบายเชิงโครงสร้าง/กติกาของโปรเจกต์อยู่ในคอมเมนต์หัวไฟล์ของแต่ละไฟล์)

---

## 1. ต้องทำก่อนขึ้น server จริง (blocking)

### 1.1 เพิ่ม endpoint ยืนยันรหัสผ่าน — **จำเป็น**

เมนูกลุ่ม "จัดการระบบ" (อนุมัติโรงพยาบาล / จัดการโรงพยาบาล / ผู้ใช้และสิทธิ์ / ประวัติการจัดการ / สถานะระบบ)
มีด่านให้กรอกรหัสผ่านซ้ำก่อนเข้าใช้ครั้งแรกของแต่ละ session (`src/components/SuperGate.tsx`)

ฝั่ง frontend เรียก:

```
POST /admin/auth/verify-password
Header: Authorization ของ session ปัจจุบัน
Body:   { "password": "..." }

200 {"ok": true}       -> รหัสตรงกับบัญชีของ token นั้น
401 {"detail": "..."}  -> ไม่ตรง
```

ข้อกำหนด: **ห้ามออก token ใหม่ / ห้าม invalidate session เดิม** (แค่ตรวจรหัสผ่านเฉย ๆ)

- โหมด mock/demo ทำงานได้แล้ว (`src/mockData.ts` → `/admin/auth/verify-password`)
- ถ้ายังไม่พร้อม: ปิดด่านชั่วคราวได้ที่ `src/App.tsx` — คอมเมนต์ `needsGate` (ค้นคำว่า `SUPER_NAVS`) แล้วเปิดคืนทีหลังบรรทัดเดียว

### 1.2 ตรวจ field ที่ frontend คาดหวังจาก backend

| endpoint | field ที่ใช้ | ใช้ที่ไหน |
|---|---|---|
| `POST /admin/auth/staff-login` | `hospitals[].label` (ชื่อโรงพยาบาล) | ชื่อบนการ์ด "ฐานข้อมูลปัจจุบัน" — ถ้าไม่ส่งมา frontend จะใช้ชื่อจากฟอร์ม login แทน |
| session | `position` (ตำแหน่ง/แผนก, optional) | บรรทัดล่างของการ์ดโปรไฟล์; ไม่ส่งมาก็ fallback เป็นชื่อบทบาท |
| `GET /admin/employees` | `rows[].emp/name/dept` | ผลค้นหาพนักงานใน command palette (⌘K) |

---

## 2. ของที่ยังเป็น mock / ยังไม่ต่อจริง

- **การแจ้งเตือน** (`src/components/NotificationMenu.tsx`) — UI ครบแล้ว (แผงลอยบนจอใหญ่ · bottom sheet บนมือถือ · badge จำนวนที่กระดิ่ง)
  แต่ **ข้อมูลยังเป็นตัวอย่างในไฟล์** (`SAMPLE`) เพราะ backend ยังไม่มี endpoint
  ต่อของจริง: เปลี่ยนเป็น `useFetch<Notification[]>('/admin/notifications')` แล้วให้ "อ่านทั้งหมด"/ปิดรายการยิง API แทนเก็บใน state
- **หน้า "รายงาน" (rp-reports)** — ซ่อนไว้ก่อน โค้ดยังอยู่ครบ (`src/screens/ReportsHub.tsx`)
  เปิดคืน: ปลดคอมเมนต์ `NavItem` ใน `src/components/layout/Sidebar.tsx` + เอา `'rp-reports'` กลับเข้า `NAV_ORDER` และ `allowed()` ใน `src/App.tsx`
- **ภาษา** ในหน้าจัดการบัญชี — แสดง "ไทย" อย่างเดียว ยังไม่มีระบบหลายภาษา
- **command palette** ค้นพนักงานแล้วพาไปหน้า "รายบุคคล" เฉย ๆ (ยังไม่ preselect คนนั้นให้)
- **ตัวเลข "เชื่อมต่อได้/ไม่ได้"** บนหน้าหลักมาจาก `GET /admin/health` = นับเฉพาะโรงพยาบาลที่เปิดใช้งานแล้ว
  ไม่ใช่ยอดเดียวกับ "โรงพยาบาลทั้งหมด" (`/admin/platform/overview`) — เปอร์เซ็นต์ในการ์ดจึงคิดจากที่ตรวจได้เท่านั้น
- **"ต้องติดตาม"** มี 2 อย่างชื่อคล้ายกัน ยังไม่ได้ตัดสินใจว่าจะรวมไหม
  แผงหน้าหลัก = โรงพยาบาลทดลองใช้ที่ใกล้หมด/หมดอายุ (คำนวณจากวันหมดอายุ) ·
  "ธงติดตามลูกค้า" ในหน้ารายละเอียดโรงพยาบาล = สวิตช์ที่ผู้ดูแลปักเอง

---

## 3. กติกาที่ต้องรักษาเวลาแก้ต่อ

1. **ห้าม hardcode สี/ระยะ/ฟอนต์** — ใช้ตัวแปรจาก `src/theme.css` (`--accent`, `--sp-*`, `--r-*`) และสเกลข้อความจาก `src/typography.ts` (`TEXT.body`, `TEXT.bodyMed`, …) เท่านั้น
   ต้องการค่าใหม่ → เพิ่มใน Figma ก่อน แล้วค่อยเพิ่มใน `theme.css`
2. **ห้ามเพิ่ม dependency** โดยไม่จำเป็น — ไอคอนก๊อป path จาก Tabler ใส่ `src/icons.tsx`
3. **โครงหน้ามาตรฐาน**: การ์ดหัวเรื่องไล่สี (+ ภาพประกอบ) → แถวตัวกรอง → `SectionPanel` / ตารางในกรอบบาง
   - ภาพประกอบหน้ากลุ่มจัดการระบบใช้ `src/components/HeroArt.tsx` (เปลี่ยนแค่ prop `icon`)
   - หน้าที่เป็นข้อมูลรายโรงพยาบาลต้อง gate ด้วย `PickHospital` เมื่อ `currentHcode === '*'`
4. **ระหว่างโหลด** ใช้ `src/components/Skeleton.tsx` (ไม่ใช้วงหมุน) และเลย์เอาต์ต้องใกล้เคียงของจริง
5. **ฟอร์มตั้งค่า** ใช้แบบร่างแล้วกดบันทึก (ไม่บันทึกทันทีทุกคลิก) — ดูตัวอย่างที่ `src/screens/Settings.tsx` / `HospitalDetail.tsx`
6. **ภาพประกอบ** ดึง asset จริงจาก Figma มาไว้ใน `public/` เสมอ (ห้ามวาด SVG เอง) และเรียกผ่าน `asset('/ชื่อไฟล์')`
   — `asset()` เติม base path ให้ ไม่งั้นเว็บ demo บน GitHub Pages (อยู่ใต้ subpath) รูปหาย
7. **ไฟล์สื่อขนาดใหญ่** บีบก่อนเข้า repo: ภาพ → JPEG q80-85 · วิดีโอ → H.264 1080p CRF 26 + `-movflags +faststart`
   (คลิปเปิดแอปเดิม 4.7 MB/1440p เหลือ 1.6 MB/1080p ตาแยกไม่ออก)

---

## 4. เริ่มงานยังไง

```bash
npm install
npm run dev        # ต่อ backend จริงตาม VITE_API_BASE / window.__API_BASE__
VITE_MOCK=1 npm run dev   # โหมด mock (ไม่ต้องมี backend) — ใส่ใน .env.local ก็ได้
npm run build      # tsc -b + vite build ต้องผ่านก่อน commit เสมอ
```

บัญชีทดสอบในโหมด mock: พิมพ์ username เป็นชื่อ role (`admin`, `user`, `bmsadmin`) หรืออะไรก็ได้ = superadmin
แท็บ HOSxP: เลือกโรงพยาบาลจากรายการ แล้วกรอก username/password อะไรก็ได้

---

## 5. ไฟล์ที่ควรอ่านก่อนแก้

| ไฟล์ | ทำอะไร |
|---|---|
| `src/App.tsx` | โครงหน้า, สิทธิ์รายเมนู (`allowed`), ด่าน SuperGate, shortcut ⌘K |
| `src/state.tsx` | session, บทบาท, โรงพยาบาลที่กำลังดู (`currentHcode`), `isCentral()` |
| `src/theme.css` | design token ทั้งหมด + คลาสร่วม (`.hero-*`, `.pick-hosp`, `.chip`, …) |
| `src/components/layout/SectionPanel.tsx` | แผงเนื้อหามาตรฐาน (หัวข้อ + meta + actions) |
| `src/components/SearchSelect.tsx` | dropdown/ค้นหา ใช้ทั่วระบบ (มี `renderTrigger` ทำ trigger เองได้) |
| `src/screens/PlatformOverview.tsx` | การ์ดสรุปหน้าหลักของส่วนกลาง (2 แผง: การเชื่อมต่อ / การเปิดใช้งาน) ตาม Figma 444:26753 |
| `src/screens/Health.tsx` | `useHealth()` + `ServiceGrid` + `HealthStats` + `HealthSummary` — ใช้ร่วมกับหน้าหลัก ยิง endpoint ครั้งเดียว |
| `src/components/charts.tsx` | กราฟทุกตัว + `legendHover()` / `focusOpacity()` (ชี้ legend แล้วเน้นชิ้นนั้น) |
| `src/mock.ts`, `src/mockData.ts` | ข้อมูลตัวอย่างของโหมด mock/demo |

---

## 6. ของที่เพิ่มรอบล่าสุด (ต้องรู้ก่อนแก้ต่อ)

### 6.1 คลิปเปิดแอปหน้า login
`public/bms-face-enroll-splash.mp4` (1920x1080 · 5.2 วิ · 1.6 MB) เล่นคลุมเต็มจอตอนเปิดหน้า login
- จบคลิป -> `pause()` ค้างเฟรมสุดท้ายไว้เป็นฉากหลัง (ไม่ถอด element ทิ้ง) แล้วการ์ด login เฟดเข้าทับ
- เล่น **รอบเดียวต่อการโหลดหน้า** — สถานะเก็บในตัวแปรระดับโมดูล (`splashPlayed` ใน `Login.tsx`)
  ตั้งใจไม่ใช้ sessionStorage เพราะ hard refresh ต้องได้ดูใหม่ / ออกจากระบบแล้วกลับมาไม่ต้องดูซ้ำ
- ทางออกสำรอง: กดที่จอ · ปุ่ม "ข้าม" · `onError` · timeout 15 วิ (กันเบราว์เซอร์บล็อก autoplay)

### 6.2 สิทธิ์เมนูกลุ่มจัดการระบบ
`allowed()` ใน `App.tsx` บล็อก `SUPER_NAVS` ทั้งชุดถ้าไม่ใช่บัญชีส่วนกลาง (`isCentral`)
— admin ของโรงพยาบาลเห็นได้แค่เมนูระดับโรงพยาบาล (เดิม Sidebar ซ่อนอย่างเดียว แต่เข้าทาง ⌘K / nav ที่ค้างใน storage ได้)

### 6.3 asset ชุดใหม่ใน `public/`
| ไฟล์ | ใช้ที่ | Figma node |
|---|---|---|
| `ov-hospital.svg` | การ์ด "โรงพยาบาลทั้งหมด" | 444:26972 |
| `ov-nurse-phone.svg` | การ์ด "ใช้งานจริง" | 457:29027 |
| `ov-flask.svg` | การ์ด "ทดลองใช้" | 457:29429 |
| `ov-expiring.svg` | การ์ด "ใกล้หมดอายุ" | 457:29472 |
| `login-art.jpg` | แผงซ้ายหน้า login | 457:29497 |

⚠️ ภาพในการ์ดสรุปตั้งใจ **ล้นพ้นขอบบนการ์ด** — `Tile` จึงไม่ใส่ `overflow: hidden`
ถ้าต้องตัดเฉพาะบางด้าน (เช่นตึกโรงพยาบาลที่ตัดขอบล่าง) ให้ครอบภาพด้วย span ที่ยื่นเลยขอบบนแล้วใส่ `overflow: hidden` ที่ span แทน


## 7. Responsive (tablet / mobile)

ทั้งระบบทำงานได้ 3 ระดับ — เกณฑ์อยู่ใน `src/theme.css` โซน "Responsive" ท้ายไฟล์

| ระดับ | ความกว้าง | เกิดอะไรขึ้น |
|---|---|---|
| desktop | > 1024px | ตาม Figma เต็มรูปแบบ |
| tablet | ≤ 1024px | Sidebar เป็น drawer · ซ่อนของรองบน header (`.hide-sm`) · ตารางเลื่อนแนวนอนในกรอบตัวเอง |
| mobile | ≤ 620px | แถบบนเตี้ยลง (`--topbar-h: 64px`) · เปลือกแอพเต็มจอ (`--shell-gap: 0`) · หัวเรื่อง/ระยะขอบเล็กลง · กริดตายตัวยุบคอลัมน์ |

กติกา:
- **breakpoint tablet ซ้ำอยู่ 2 ที่** — `useMedia('(max-width: 1024px)')` ใน `App.tsx` กับ `@media (max-width: 1024px)` ใน `theme.css` แก้ต้องแก้คู่กัน
- หน้าจอเขียนด้วย inline style ซึ่งชนะ CSS class เสมอ → กฎในโซน Responsive **ต้องใช้ `!important`** เป็นปกติ
- คลาสช่วยที่มีให้ใช้:
  - `.hide-sm` / `.only-sm` — ซ่อน/โผล่ตั้งแต่ tablet ลงมา
  - `.grid-collapse-sm` — กริดคอลัมน์ตายตัว → 1 คอลัมน์บนมือถือ
  - `.grid-2-sm` — กริด 3–4 คอลัมน์ → 2 คอลัมน์บนมือถือ
  - `.table-scroll` — ใส่ให้อัตโนมัติโดย `DataTable` (จอเล็กเลื่อนตารางแนวนอนแทนลากทั้งหน้า และปิด sticky thead เพราะกรอบที่ scroll ได้ทำให้ `top` อ้างผิด)
- ตารางที่ตั้ง `minWidth` ไว้ (เช่น 1040) ไม่ต้องแก้ — กรอบ `.table-scroll` จัดการให้แล้ว
- โดนัท/พาย (`Donut` ใน `charts.tsx`) ย่อตามกรอบด้วย `maxWidth:100% + aspect-ratio` ระยะข้างในเป็น % ทั้งหมด **ห้ามเปลี่ยนกลับเป็น px** ไม่งั้น tooltip กับรูตรงกลางจะหลุดตำแหน่งตอนย่อ

### 7.1 ของเฉพาะมือถือ

| ของ | ไฟล์ | หมายเหตุ |
|---|---|---|
| แถบแท็บล่างจอ (navbar) | `Overview.tsx` + `.bottom-nav` | หน้าหลักเท่านั้น · ต้องมี `.bottom-nav-spacer` **ท้ายหน้า** ไม่ใช่ติดกับ nav ไม่งั้นเกิดช่องว่างกลางหน้า |
| ลากลงเพื่อรีเฟรช | `PullToRefresh.tsx` | ยิง `refreshAll()` → ทุก `useFetch` ที่ยัง mount โหลดใหม่ · ปุ่มรีเฟรชในหัวเรื่อง (`.btn-refresh`) ถูกซ่อนแทน |
| ตัวกรองยุบเป็นแผงล่างจอ | `FilterBar.tsx` · `FilterSheet.tsx` · `BottomSheet.tsx` | เกณฑ์ยุบ: แถบตัวกรองของหน้า ≥3 ชิป · แถวหัวแผง (`SectionPanel`) ≥2 ชิป |
| การ์ดตัวเลขสรุป | `.stat-grid` | มือถือเป็น grid 2 คอลัมน์เสมอ · ใบสุดท้ายที่เหลือเดี่ยวกินเต็มบรรทัด |

ข้อควรระวัง:
- **`BottomSheet` ต้อง render ผ่าน portal ไป `<body>`** — การ์ดหน้า/แท็บมี `transform` (อนิเมชัน `.page-in`/`.tab-in`) ซึ่งทำให้ `position: fixed` ยึดกับกล่องนั้นแทนทั้งจอ (เคยพลาดมาแล้ว: แผงโผล่อยู่ในตาราง)
- นับชิปด้วย `countChips()` ซึ่ง**แผ่ Fragment ก่อนนับ** — หน้าจอส่วนใหญ่ส่งชิปมาเป็น `<>…</>` ก้อนเดียว ถ้านับตรง ๆ จะได้ 1 เสมอ
- เทียบชนิด element ด้วย `c.type === FilterChip` ห้ามเทียบจากชื่อ component (ถูกย่อตอน build)
