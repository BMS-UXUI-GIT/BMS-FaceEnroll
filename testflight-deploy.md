# ส่งแอปขึ้น TestFlight — ขั้นตอนทั้งหมด

> repo: `https://gitlab.hosxp.net/amon/face-check.git`
> อัปเดตล่าสุด: 13 ก.ค. 2569 (Xcode 26 / Flutter 3.32+)

## ที่เตรียมไว้ในโค้ดแล้ว (ไม่ต้องแก้อีก)

- โฟลเดอร์ `ios/` ครบชุด + ชื่อแอปบนหน้าจอ = **FaceCheck**
- Bundle ID = `th.in.bmscloud.facecheck` / รองรับ iOS 15.5 ขึ้นไป (ML Kit บังคับ)
- ข้อความขอสิทธิ์กล้อง/ตำแหน่งใน `Info.plist` (ไม่มี = โดน reject ตอน upload)
- `ITSAppUsesNonExemptEncryption=false` — ข้ามคำถาม Export Compliance บน TestFlight

## สิ่งที่ต้องมี

- บัญชี Apple Developer Program ($99/ปี) — อนุมัติแล้ว
- เครื่อง Mac + Xcode
- iPhone จริงไว้ทดสอบ (คนเทสต้องลงแอป TestFlight จาก App Store)

---

## 1) ฝั่ง Mac — เตรียมเครื่อง (ครั้งเดียว)

1. ลง **Xcode** จาก Mac App Store → เปิดครั้งแรก กด Agree license รอลง iOS component จนจบ
2. ลง **Flutter**: `brew install --cask flutter` (ฝั่ง Windows ใช้ 3.32.7 — ลง stable ล่าสุดได้)
3. ลง **CocoaPods**: `brew install cocoapods`
4. เช็ค: `flutter doctor` — หัวข้อ Xcode ต้องเขียว (ฟ้องอะไรก็รันคำสั่งตามที่มันบอก)

## 2) Clone + ลองรันบน iPhone ก่อน (แนะนำ)

```bash
git clone https://gitlab.hosxp.net/amon/face-check.git
cd face-check
flutter pub get
```

5. **Xcode UI:** เมนู Xcode → **Settings → Accounts → "+"** → login Apple ID ที่สมัคร Developer Program (ครั้งเดียว)
6. **Xcode UI:** `open ios/Runner.xcworkspace` → คลิก **Runner** (แถบซ้ายบนสุด) → แท็บ **Signing & Capabilities**
   - ติ๊ก ✅ **Automatically manage signing**
   - **Team** เลือกทีมของบัญชี — certificate/provisioning Xcode จัดการเองหมด
   - Bundle ID แก้ได้ในช่องนี้เลยถ้าอยากเปลี่ยน (ไม่ต้องแตะโค้ด)
   > เปิด Xcode แค่ครั้งแรกครั้งเดียว (login + เลือก Team) — หลังจากนั้น `flutter run` / `flutter build ipa` จากเทอร์มินัลได้ตลอด ไม่ต้องเปิด Xcode อีก
   > ตั้ง Team เสร็จแล้ว commit ไฟล์ `project.pbxproj` push กลับมาด้วย — เครื่องอื่น clone ไปจะไม่ต้องตั้งซ้ำ
7. เสียบ iPhone:
   - iPhone: Settings → Privacy & Security → เปิด **Developer Mode** (iOS 16+) + กด Trust คอม
   - รัน `flutter run` — ครั้งแรกถ้าแอปเปิดไม่ได้ ไปที่ Settings → General → VPN & Device Management → Trust
   - ลองสแกน/ลงทะเบียนหน้าให้ครบก่อนส่งขึ้น TestFlight

## 3) App Store Connect — สร้างแอป (ครั้งเดียว)

8. เข้า [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps → "+" → New App**
   - Platform: **iOS**
   - Name: **FaceCheck** (ชื่อที่โชว์บน TestFlight)
   - Primary Language: Thai
   - **Bundle ID:** เลือก `th.in.bmscloud.facecheck` จาก dropdown
     - ถ้ายังไม่ขึ้น = ยังไม่เคย build ผ่าน Xcode (ข้อ 6–7 จะ register ให้อัตโนมัติ) หรือเพิ่มเองที่ developer.apple.com → Identifiers → "+"
   - SKU: อะไรก็ได้ เช่น `facecheck-001`

## 4) Build + Upload

```bash
flutter build ipa
```

ได้ไฟล์ `build/ios/ipa/*.ipa` (รอบแรก ~5–10 นาที)

อัปโหลด เลือกทางเดียว:

- **ทาง Transporter (ง่ายสุด):** ลงแอป **Transporter** จาก Mac App Store → login → **ลากไฟล์ .ipa ใส่ → Deliver**
- ทาง Xcode UI: `open build/ios/archive/Runner.xcarchive` → **Distribute App → App Store Connect → Upload** → Next ใช้ค่า default หมด

## 5) TestFlight — แจกคนเทส

9. App Store Connect → FaceCheck → แท็บ **TestFlight** → รอสถานะ **Ready to Test** (~15–30 นาที มีเมลแจ้ง)
   - คำถาม encryption ไม่ถาม — ตั้ง flag ไว้ในโค้ดแล้ว
10. เมนูซ้าย **Internal Testing → "+"** สร้างกลุ่ม → **Add Testers** ใส่อีเมล
    - ต้องเป็น Apple ID ของคนเทส / สูงสุด 100 คน / **ไม่ต้องรอ Apple รีวิว**
11. คนเทส: ลงแอป **TestFlight** จาก App Store → เปิดเมลเชิญ → View in TestFlight → **Install**
12. (ถ้าจะแจกวงกว้าง 10,000 คน ใช้ **External Testing** — build แรกต้องผ่าน Beta App Review ~1–2 วัน)

## 6) ส่ง build รอบถัดไป

1. แก้โค้ดฝั่ง Windows → push → บน Mac `git pull`
2. **bump เลข build ใน `pubspec.yaml`** เช่น `69.7.13+3` → `69.7.14+4`
   - เลขหลัง `+` ห้ามซ้ำของเดิม ไม่งั้น upload ไม่ผ่าน
3. `flutter build ipa` → ลากใส่ Transporter → คนเทสได้อัปเดตเองใน TestFlight

---

## เครื่อง Mac ใช้ร่วมกันหลายคน

- **ทางสะอาดสุด:** สร้าง macOS user แยกของตัวเอง — Keychain/git/Xcode แยกขาดกันหมด ข้ามหัวข้อนี้ได้เลย
- **Git:** ถ้า clone แล้ว*ไม่ถาม* username/password = ใช้บัญชี GitLab คนอื่นที่ค้างใน Keychain
  - แค่ pull+build ใช้ของใครก็ได้ที่อ่าน repo ได้ (เราไม่ commit บน Mac)
  - จะใช้บัญชีตัวเอง: แอป **Keychain Access** → ค้น `gitlab.hosxp.net` → ลบรายการเก่า → clone ใหม่ → ใส่ username + **Personal Access Token** (สร้างที่ gitlab.hosxp.net → Edit Profile → Access Tokens → scope `read_repository`)
  - **อย่าแก้ `git config --global`** บนเครื่องรวม — ถ้าต้องตั้งชื่อ ให้ตั้ง local ในโฟลเดอร์ repo: `git config user.name "..."` (ไม่ใส่ --global)
- **Xcode:** ไม่ต้อง logout ของใคร — Settings → Accounts → "+" เพิ่ม Apple ID ของเราได้เลย (อยู่ร่วมกันได้หลายบัญชี) ตอนเลือก Team ใน Signing เลือกทีมตัวเอง
- **Transporter:** login ได้ทีละคน — ใช้เสร็จ logout / หรือ upload ผ่าน Xcode Organizer แทนก็ได้

## แก้ปัญหาที่เจอบ่อย

| อาการ | ทางแก้ |
|---|---|
| `pod install` พัง / pod หาไม่เจอ | `cd ios && pod repo update && pod install` แล้ว build ใหม่ |
| Signing error "No profiles found" | เช็คข้อ 6 — Team ต้องถูกเลือก + Automatically manage signing ติ๊กอยู่ |
| Upload ฟ้อง build number ซ้ำ | bump เลขหลัง `+` ใน pubspec.yaml แล้ว build ใหม่ |
| build ค้าง "Processing" นานผิดปกติ | ปกติ 15–30 นาที ถ้าเกินชั่วโมงให้เช็คเมล — Apple อาจแจ้งปัญหา asset/icon |
| iPhone รันแล้วแอปเปิดไม่ได้ | Settings → General → VPN & Device Management → Trust developer |
