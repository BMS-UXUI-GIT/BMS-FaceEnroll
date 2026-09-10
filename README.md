# FaceCheck — แอปลงเวลาทำงานด้วยใบหน้า

แอป Flutter/GetX ที่ **พนักงานติดตั้งบนมือถือตัวเอง** — login ด้วย user/pass HOSxP → ตั้ง PIN → ลงทะเบียนใบหน้า → สแกนลงเวลาเข้า/ออก → ดูสถิติและยื่นขอแก้ไขเวลาย้อนหลัง

> ไม่ใช่ kiosk ติดผนังแล้ว (ชื่อโฟลเดอร์ยังเป็น `kiosk-app` ตามของเดิม)
> คุยกับ 2 backend: **face-cloud** (สแกนหน้า — prod `https://facehub.bmscloud.in.th`) + **attendance :8300** (ลงเวลา/สถิติ)
> โปรเจกต์เดิม `D:\test_lungbest\bms-face-enroll` = reference เท่านั้น ห้ามแก้

**ลองเล่นได้เลยบนเบราว์เซอร์** → https://bms-uxui-git.github.io/BMS-FaceEnroll/mobile/frame.html
(ข้อมูลจำลองล้วน ไม่ต่อ backend · ต่อท้าย `?theme=dark` เพื่อดูโหมดมืด)

---

## เอกสารในโปรเจกต์

| ไฟล์ | เนื้อหา |
|---|---|
| [DESIGN.md](DESIGN.md) | **ระบบออกแบบ** — โทเคนสี ตัวอักษร กริด จังหวะเคลื่อนไหว หลัก UX สารบัญคอมโพเนนต์ และกติกาเวลาเพิ่มของใหม่ · **อ่านก่อนแตะ UI** |
| [CHECKLIST.md](CHECKLIST.md) | ฟังก์ชันรายหน้าจอ (12 หน้า / 88 ฟังก์ชัน) · ติ๊กแล้ว = ทำเสร็จจริง |
| [testflight-deploy.md](testflight-deploy.md) | ขั้นตอนส่งขึ้น TestFlight |

---

## Flow

```
เปิดแอป
├─ ยังไม่ login       → หน้า login (เลือกโรงพยาบาล → user/pass HOSxP)
│                        POST :8300/{hcode}/login → {emp_id, name} → เก็บ session
├─ login แล้วไม่มี PIN → ตั้ง PIN 6 หลัก
└─ มี PIN แล้ว        → ใส่ PIN ปลดล็อก

เข้าแล้วเจอ dock 4 แท็บ + ปุ่มสแกนตรงกลาง
  หน้าหลัก · แดชบอร์ด · [สแกน] · ประวัติ · บัญชี

สแกนลงเวลา    กล้อง + ML Kit จับหน้า → (liveness ถ้าเปิด) → POST :8100/match → emp_id
              → (ยืนยัน + เลือกเวร ถ้าเปิด) → (GPS ถ้าเปิด)
              → POST :8300/{hcode}/?Data=DoorEnroll → "เข้างาน/ออกงาน สำเร็จ"

ลงทะเบียนหน้า  ถ่ายหน้าตัวเอง → POST :8100/register {hcode, metadata:{emp_id,name}, images} → subject_id

แดชบอร์ด      สรุปเดือน + กราฟ 3 ช่วง (สัปดาห์ = วงกลมรายวัน · เดือน = ปฏิทินความเข้ม · ปี = กราฟแท่ง)
              → แบนเนอร์ท้ายหน้า: วันที่ลงเวลาไม่ครบ/สแกนนอกพื้นที่

ขอแก้ไขเวลา    รายการค้าง → ฟอร์ม (เวร · เวลา · สาเหตุ · รูปประกอบ)
              → หน้าตรวจสอบ (ตารางเทียบก่อน/หลัง) → ยืนยัน → หน้าสำเร็จ
              ⚠️ ยังไม่ต่อ API — คำขอยังไม่ออกนอกเครื่อง
```

---

## Run (dev)

```bash
flutter pub get
flutter run \
  --dart-define=FACE_SCAN_URL=https://facehub.bmscloud.in.th \
  --dart-define=ATTENDANCE_URL=http://10.0.2.2:8300 \
  --dart-define=API_KEY=demo-key-123
```

> face-scan = prod (public HTTPS) แล้ว · attendance ยังรัน local
> → มือถือจริงต่อ USB แค่ `adb reverse tcp:8300 tcp:8300` แล้วใช้ `ATTENDANCE_URL=http://localhost:8300`
> path ไทยทำ `flutter build` พัง (impellerc) → build จาก path ASCII เช่น `C:\amondev\kiosk_build`

**API key ห้าม hardcode** — repo นี้เป็น public prototype ส่งผ่าน `--dart-define` เท่านั้น

---

## เว็บ prototype

`kDemoBuild = kIsWeb` ([demo_mode.dart](lib/app/config/demo_mode.dart)) — บนเว็บไม่มีทั้ง backend (CORS + ไม่มี key) และ ML Kit
เปิดโหมดนี้แล้ว **ทุกอย่างตอบจากข้อมูลจำลองในเครื่อง ไม่มี request ออกนอกเลย** · ข้าม login/PIN เข้าแดชบอร์ดตรง ๆ
build มือถือจริง `kIsWeb = false` → เส้นทางเดิมทั้งหมด ไม่มีอะไรเปลี่ยน

```bash
flutter build web --release --dart-define=API_KEY=demo
cd build/web && python3 -m http.server 8099
```

| ไฟล์ | หน้าที่ |
|---|---|
| `web/index.html` | วัด safe area ของเครื่องจาก `env()` แล้วยัดเป็น query ก่อน bootstrap (Flutter web อ่านเองไม่ได้) |
| `web/frame.html` | กรอบมือถือจำลองสำหรับเปิดบนเดสก์ท็อป — เลือกรุ่นเครื่อง/ซูม/ธีม พร้อมแถบสถานะ iOS ปลอม |

เปิด `frame.html` บนเดสก์ท็อป · เปิด `index.html` ตรง ๆ บนมือถือจริง (Add to Home Screen ได้)

**Deploy**: workflow `deploy-pages.yml` อยู่บน branch `main` ของ repo [BMS-FaceEnroll](https://github.com/BMS-UXUI-GIT/BMS-FaceEnroll)
มัน checkout branch `mobile-app` มา `flutter build web` แล้ววางไว้ใต้ `/mobile/`
สั่งเองได้ด้วย `gh workflow run deploy-pages.yml --repo BMS-UXUI-GIT/BMS-FaceEnroll`

---

## โครงโปรเจกต์

### ระบบ

| path | หน้าที่ |
|---|---|
| `lib/app/config/api_config.dart` | URL face-cloud/attendance + api key (dart-define) |
| `lib/app/config/demo_mode.dart` | สวิตช์โหมดเดโมของเว็บ prototype |
| `lib/app/services/settings_service.dart` | hcode, จุดสแกน (doorId), session, toggle (liveness/confirm/GPS) |
| `lib/app/services/api_service.dart` | login / register / match / doorEnroll / shifts / profile / my-attendance |
| `lib/app/services/location_service.dart` | GPS ตอนลงเวลา (logic ระบบเก่า) |
| `lib/app/services/pin_service.dart` | PIN ล็อกแอป |
| `lib/app/theme/nexus.dart` | ธีมกลางทั้งแอป (ฟอนต์ Noto Sans Thai + Nunito) |

### หน้าจอ

| path | หน้าที่ |
|---|---|
| `lib/app/modules/login/` | login + เลือกโรงพยาบาล |
| `lib/app/modules/pin/` | ตั้ง PIN / ใส่ PIN ปลดล็อก |
| `lib/app/modules/shell/` | dock 4 แท็บ + ปุ่มสแกนกลาง |
| `lib/app/modules/home/` | หน้าหลัก (ทักทาย + สถานะเวรวันนี้) |
| `lib/app/modules/face_scan/` | กล้อง + ML Kit + liveness + scan loop |
| `lib/app/modules/registration/` | ลงทะเบียนใบหน้าตัวเอง |
| `lib/app/modules/dashboard/` | **แดชบอร์ด + โฟลว์ขอแก้ไขเวลา** (ดูข้างล่าง) |
| `lib/app/modules/my_time/` | ประวัติลงเวลารายเดือน |
| `lib/app/modules/account/`, `settings/` | บัญชี + ตั้งค่า |

### โฟลว์แดชบอร์ด — ประกอบจากคอมโพเนนต์ล้วน

หน้าจอในกลุ่มนี้ **ไม่มี UI ของตัวเอง** ทำหน้าที่ประกอบคอมโพเนนต์ + ถือ state เท่านั้น
ทุกชิ้นส่วนเป็นคลาสวิดเจ็ตที่ตั้งชื่อแล้วใน `widgets/` (ไม่มี `Widget _method()` เหลืออยู่)

```
lib/app/modules/dashboard/
├── dash_theme.dart            โทเคนทั้งหมด (Dash) — สี ฟอนต์ การย่อขยายตามจอ
├── dashboard_controller.dart  ดึงข้อมูล + คำนวณสถิติ/ช่วงเวลา
├── attendance_row.dart        ตัวช่วยอ่านแถวลงเวลา (เวร ป้ายปัญหา สีสถานะ)
├── dashboard_view.dart        130 บรรทัด — ประกอบล้วน
├── fix_request_view.dart      รายการที่ต้องขอแก้ไข
├── fix_request_form_view.dart ฟอร์มขอแก้ไขของหนึ่งวัน
├── fix_request_review_view.dart หน้าตรวจสอบก่อนส่ง
├── fix_request_done_view.dart หน้าสำเร็จ
└── widgets/                   42 ไฟล์ / 82 คอมโพเนนต์ — สารบัญเต็มอยู่ใน DESIGN.md
```

กติกาสั้น ๆ (ฉบับเต็มอยู่ท้าย [DESIGN.md](DESIGN.md)):

1. UI ทุกชิ้นเป็น **คลาส** ไม่ใช่เมธอด
2. ไฟล์ใน `widgets/` **ห้าม import หน้าจอ** — ทิศทางเป็น view → widgets เสมอ
3. คอมโพเนนต์ที่ต้องการค่า reactive รับ `DashboardController` ทาง constructor แล้วครอบ `Obx` ใกล้ค่าที่ฟัง ไม่ใช่ครอบทั้งหน้า
4. **ห้ามเขียนสีดิบในไฟล์วิดเจ็ต** — เข้า `Dash` ก่อน พร้อมบอกที่มา
5. คอมเมนต์เขียนว่า "ทำไม" ไม่ใช่ "ทำอะไร"

---

## Test

```bash
flutter analyze    # 0 error (เหลือ info curly_braces เดิมในโมดูลเก่า)
flutter test       # parse response contract (Match/Register/DoorEnroll/Login) + location service
```

---

## ยังไม่เสร็จ

- **ยื่นคำขอแก้ไขเวลายังไม่ส่งเข้าระบบจริง** — ยังไม่มี endpoint สถานะ "ส่งแล้ว" เก็บในหน่วยความจำ หายเมื่อปิดแอป
- ก่อนปล่อยตัวจริง: ถอด `kDemoBuild` / ข้อมูลจำลอง / การข้าม login ออก
- เวรที่แสดงยังเดาจากช่วงเวลา (`shiftOfRow`) — เมื่อ backend ส่งเวรที่คนเลือกตอนสแกนมาแล้ว แก้ที่ฟังก์ชันเดียว
- อีก 8 หน้าจอนอกโฟลว์แดชบอร์ดยังใช้ธีมกลาง `Nexus` ยังไม่ย้ายมาระบบ `Dash`
