# แอปลงเวลาทำงาน (front)

แอป Flutter/GetX ที่ **พนักงานติดตั้งบนมือถือตัวเอง** — login ด้วย user/pass HOSxP → ลงทะเบียนใบหน้าตัวเอง → สแกนลงเวลาเข้า/ออก
> ไม่ใช่ kiosk ติดผนังแล้ว · คุยกับ 2 backend: **face-cloud** (สแกนหน้า — prod `https://facehub.bmscloud.in.th`) + **attendance :8300** (ลงเวลา)
> โปรเจคเดิม `D:\test_lungbest\bms-face-enroll` = reference เท่านั้น ห้ามแก้

## Flow
```
เปิดแอป → หน้า login (⚙️ มุมขวาบน = ตั้ง hcode)
   POST :8300/{hcode}/login {loginname, password}  → {emp_id, name} → เก็บ session (SharedPreferences)
→ เมนู: [สแกนลงเวลา] [ลงทะเบียนใบหน้า] [ออกระบบ]

ลงทะเบียนใบหน้า: ถ่ายหน้าตัวเอง → POST :8100/register {hcode, metadata:{emp_id,name}, images} → subject_id
สแกนลงเวลา:   กล้อง+ML Kit จับหน้า → (liveness ถ้าเปิด) → POST :8100/match → emp_id
              → (confirm+เลือกกะ ถ้าเปิด) → (GPS ถ้าเปิด) → POST :8300/{hcode}/?Data=DoorEnroll
              → "เข้างาน/ออกงาน สำเร็จ"
```

## Run (dev)
```bash
flutter pub get
flutter run \
  --dart-define=FACE_SCAN_URL=https://facehub.bmscloud.in.th \
  --dart-define=ATTENDANCE_URL=http://10.0.2.2:8300 \
  --dart-define=API_KEY=demo-key-123
```
> face-scan = prod (public HTTPS) แล้ว · attendance ยังรัน local → มือถือจริงต่อ USB แค่ `adb reverse tcp:8300 tcp:8300` แล้วใช้ `ATTENDANCE_URL=http://localhost:8300`
> path ไทยทำ `flutter build` พัง (impellerc) → build จาก path ASCII เช่น `C:\amondev\kiosk_build`

## โครง
| path | หน้าที่ |
|---|---|
| `lib/app/config/api_config.dart` | URL face-cloud/attendance + api key (dart-define) |
| `lib/app/services/settings_service.dart` | hcode, จุดสแกน (doorId), session, toggle ต่างๆ (liveness/confirm/GPS) |
| `lib/app/services/api_service.dart` | login / register / match / doorEnroll / shifts / profile |
| `lib/app/services/location_service.dart` | GPS ตอนลงเวลา (logic ระบบเก่า) |
| `lib/app/modules/login/` | หน้า login + ⚙️ ตั้ง hcode |
| `lib/app/modules/home/` | เมนู (greeting + สแกน + ลงทะเบียน + logout) |
| `lib/app/modules/registration/` | ลงทะเบียนใบหน้าตัวเอง (emp_id จาก session) |
| `lib/app/modules/face_scan/` | กล้อง + ML Kit + liveness + scan loop |

## Test
```bash
flutter analyze    # 0 error
flutter test       # parse response contract (Match/Register/DoorEnroll/Login)
```
