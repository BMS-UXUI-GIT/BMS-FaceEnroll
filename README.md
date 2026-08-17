# BMS FaceEnroll

ระบบบริหารจัดการ **Face Enrollment และการลงเวลาปฏิบัติงานของบุคลากรในโรงพยาบาล** สำหรับผู้ดูแลระบบของ BMS และโรงพยาบาล

ระบบถูกออกแบบมาเพื่อช่วยให้เจ้าหน้าที่สามารถจัดการข้อมูลบุคลากร การลงทะเบียนใบหน้า ตรวจสอบการลงเวลา และติดตามข้อมูลการใช้งานของระบบได้จากศูนย์กลาง

> **Note:** Repository นี้เป็น Web Application สำหรับส่วนจัดการระบบ โดยข้อมูลในโหมด Demo เป็นข้อมูลตัวอย่างและไม่ใช่ข้อมูลจริงของโรงพยาบาล

---

## ✨ Overview

**BMS FaceEnroll** เป็นระบบ Admin Dashboard ที่ใช้สำหรับบริหารจัดการระบบ Face Recognition สำหรับการลงเวลาปฏิบัติงานของบุคลากรในโรงพยาบาล

ระบบรองรับการใช้งานในหลายระดับ ทั้งระดับโรงพยาบาลและระดับส่วนกลางของ BMS โดยมีระบบกำหนดสิทธิ์การเข้าถึงเมนูตามบทบาทของผู้ใช้งาน

### เป้าหมายของระบบ

- จัดการข้อมูลบุคลากรที่ใช้ระบบ Face Recognition
- ลงทะเบียนและจัดการข้อมูลใบหน้าของบุคลากร
- ตรวจสอบประวัติการลงเวลาปฏิบัติงาน
- ดูข้อมูลและสรุปผลการลงเวลาผ่าน Dashboard
- จัดการข้อมูลโรงพยาบาลและผู้ใช้งานระบบ
- ตรวจสอบประวัติการดำเนินการของผู้ใช้งาน
- รองรับการบริหารจัดการจากส่วนกลางของ BMS

---

## 🧩 Features

### 1. Overview Dashboard

หน้าภาพรวมสำหรับติดตามสถานะและข้อมูลสำคัญของระบบ เช่น

- สรุปข้อมูลการใช้งาน
- สถานะการลงเวลา
- ข้อมูลบุคลากร
- ข้อมูลที่เกี่ยวข้องกับระบบ Face Recognition
- ข้อมูลสรุปในรูปแบบกราฟและสถิติ

---

### 2. Face Enrollment

จัดการข้อมูลใบหน้าของบุคลากรสำหรับใช้กับระบบ Face Recognition

ความสามารถหลัก ได้แก่

- ตรวจสอบสถานะการลงทะเบียนใบหน้า
- จัดการข้อมูลบุคลากร
- ตรวจสอบข้อมูลที่เกี่ยวข้องกับ Face Enrollment
- รองรับการทำงานร่วมกับข้อมูลของแต่ละโรงพยาบาล

---

### 3. Attendance

สำหรับตรวจสอบข้อมูลการลงเวลาปฏิบัติงานของบุคลากร

สามารถใช้สำหรับ

- ตรวจสอบประวัติการลงเวลา
- ตรวจสอบสถานะการเข้างาน
- ดูข้อมูลการลงเวลาของบุคลากร
- วิเคราะห์ข้อมูลการปฏิบัติงาน

---

### 4. Reports

ระบบรายงานสำหรับวิเคราะห์ข้อมูลการลงเวลา โดยแบ่งออกเป็นหลายมุมมอง เช่น

- รายงานรายบุคคล
- รายงานตามแผนก
- รายงานตามกะการทำงาน
- รายงานการมาสาย

ช่วยให้ผู้ดูแลระบบสามารถตรวจสอบและวิเคราะห์ข้อมูลได้ง่ายขึ้น

---

### 5. Hospital Management

สำหรับจัดการข้อมูลโรงพยาบาลที่ใช้งานระบบ

รองรับการทำงานในลักษณะ Multi-Hospital โดยผู้ใช้งานสามารถเข้าถึงข้อมูลตามโรงพยาบาลและสิทธิ์ที่ได้รับ

---

### 6. User Management

สำหรับผู้ดูแลระบบในการจัดการผู้ใช้งาน

- จัดการบัญชีผู้ใช้งาน
- กำหนดสิทธิ์การเข้าถึง
- ตรวจสอบ role ของผู้ใช้งาน
- ควบคุมการเข้าถึงเมนูต่าง ๆ

ระบบมีการตรวจสอบสิทธิ์ในระดับ Navigation เพื่อป้องกันไม่ให้ผู้ใช้งานเข้าถึงหน้าที่ไม่มีสิทธิ์ แม้ว่าจะพยายามเข้าผ่าน URL หรือ navigation state โดยตรงก็ตาม

---

### 7. Audit Log

ระบบบันทึกประวัติการดำเนินการ เพื่อช่วยในการตรวจสอบย้อนหลัง

รองรับการตรวจสอบในระดับโรงพยาบาลและระดับส่วนกลางตามสิทธิ์ของผู้ใช้งาน

---

### 8. System Administration

เมนูสำหรับผู้ดูแลระบบส่วนกลางของ BMS เช่น

- อนุมัติโรงพยาบาล
- จัดการโรงพยาบาล
- จัดการผู้ใช้งาน
- ตรวจสอบ System Audit
- ตรวจสอบข้อมูลระบบ

เมนูกลุ่ม System Administration จะถูกจำกัดเฉพาะผู้ใช้งานที่มีสิทธิ์ระดับส่วนกลาง

---

### 9. Responsive Design

ระบบรองรับการใช้งานบนหลายขนาดหน้าจอ

- Desktop
- Tablet
- Mobile

บนหน้าจอขนาดเล็ก Sidebar จะเปลี่ยนเป็น Drawer และมี interaction สำหรับการ refresh ข้อมูลที่เหมาะกับการใช้งานบน Mobile

---

## 🔐 Role & Permission

ระบบมีการควบคุมสิทธิ์ตามบทบาทของผู้ใช้งานและระดับของหน่วยงาน

ตัวอย่างระดับสิทธิ์ ได้แก่

| Role | Description |
|---|---|
| `superadmin` | ผู้ดูแลระบบระดับสูง |
| `admin` | ผู้ดูแลระบบโรงพยาบาล |
| User | ผู้ใช้งานทั่วไป |

นอกจากนี้ระบบยังตรวจสอบสิทธิ์ตาม **Tab / Navigation Permission** เพื่อควบคุมว่าผู้ใช้งานสามารถเข้าถึงฟังก์ชันใดได้บ้าง

เมนูที่เกี่ยวข้องกับการบริหารระบบส่วนกลางจะถูกจำกัดเฉพาะผู้ใช้งานจากส่วนกลางของ BMS

---

## 🏗️ System Structure

โครงสร้างหลักของ Application แบ่งออกเป็นส่วนต่าง ๆ ดังนี้

```text
src/
├── components/          # Reusable UI Components
├── screens/             # Application Screens
├── App.tsx              # Application Entry & Routing Logic
├── api.ts               # API Layer
├── assets.ts            # Application Assets
├── hooks.ts             # Custom React Hooks
├── icons.tsx             # Icon Components
├── mock.ts              # Development / Demo Configuration
├── mockData.ts          # Demo Data
├── state.tsx             # Application State
├── tokens.ts             # Design Tokens
├── theme.css             # Global Theme
├── tailwind.css          # Tailwind CSS
└── main.tsx              # React Entry Point
```

---

## 🛠️ Tech Stack

### Frontend

- **React 18**
- **TypeScript**
- **Vite**
- **Tailwind CSS**

### UI & Interaction

- React Aria Components
- Custom Design System
- Responsive Layout
- Custom Dialog & Toast
- Command Palette
- Error Boundary
- Pull-to-Refresh

### Data Visualization

- Recharts

### Other Libraries

- Leaflet — Map & Location
- html2canvas — Export / Capture
- jsPDF — PDF generation
- xlsx — Excel data processing
- Internationalized Date — Date handling

Dependencies และ scripts ของระบบกำหนดผ่าน `package.json` โดยใช้ Vite เป็น development และ build tool 

---

## 🚀 Getting Started

### Prerequisites

ติดตั้ง Node.js และ npm ก่อนเริ่มต้นใช้งาน

ตรวจสอบ version:

```bash
node -v
npm -v
```

### Installation

Clone repository:

```bash
git clone https://github.com/BMS-UXUI-GIT/BMS-FaceEnroll.git
```

เข้าสู่ project:

```bash
cd BMS-FaceEnroll
```

ติดตั้ง dependencies:

```bash
npm install
```

---

## 💻 Development

รัน development server:

```bash
npm run dev
```

จากนั้นเปิด URL ที่ Vite แสดงใน terminal

---

## 📦 Build

สร้าง production build:

```bash
npm run build
```

ตรวจสอบ production build:

```bash
npm run preview
```

---

## 🧪 Demo Mode

ระบบรองรับข้อมูลสำหรับ Demo เพื่อใช้ในการพัฒนาและทดสอบ UI โดยไม่จำเป็นต้องเชื่อมต่อกับข้อมูลจริง

เมื่ออยู่ใน Demo Mode ระบบจะแสดงข้อความแจ้งเตือนว่า

> โรงพยาบาลสาธิต — ข้อมูลตัวอย่าง ไม่ใช่ข้อมูลจริง และไม่ถูกบันทึกลงระบบโรงพยาบาลใดๆ

เพื่อป้องกันความเข้าใจผิดระหว่างข้อมูล Demo และข้อมูลจริง 

---

## 🔎 Global Search

ระบบมี Command Palette สำหรับค้นหาและเข้าถึงฟังก์ชันต่าง ๆ ภายในระบบได้อย่างรวดเร็ว

### Keyboard Shortcut

| Shortcut | Action |
|---|---|
| `⌘ K` | เปิด Global Search |
| `Ctrl K` | เปิด Global Search |
| `/` | เปิด Global Search เมื่อไม่ได้อยู่ในช่องกรอกข้อมูล |

---

## 🎨 Design System

ภายในระบบมี Design System สำหรับใช้เป็นเครื่องมือของทีมพัฒนาและทีม UX/UI

ประกอบด้วย

- Design Tokens
- Typography
- Color
- Spacing
- Components
- UI Patterns

Design System ถูกแยกเป็นส่วนสำหรับ Development และสามารถโหลดแบบ Lazy Loading เพื่อไม่เพิ่มขนาดของ Application ใน Production โดยไม่จำเป็น 

---

## 📱 Responsive Behavior

ระบบกำหนด Responsive Breakpoints สำหรับ Desktop, Tablet และ Mobile

### Desktop

ใช้ Sidebar แบบเต็มรูปแบบ พร้อมพื้นที่สำหรับ Dashboard และ Data Table

### Tablet

Sidebar จะเปลี่ยนเป็น Drawer เพื่อเพิ่มพื้นที่ในการแสดงข้อมูล

### Mobile

ปรับ Layout และ Interaction ให้เหมาะกับหน้าจอขนาดเล็ก เช่น

- Collapsible Navigation
- Pull-to-Refresh
- Responsive Data Table
- Mobile-friendly Controls

---

## 🔒 Security Considerations

ระบบมีการควบคุมการเข้าถึงในระดับ Application เช่น

- Role-based access
- Tab-based permission
- Central / Hospital access separation
- Protected system administration
- Session-based system unlock
- Error Boundary สำหรับจัดการ Runtime Error

สำหรับเมนูระดับ System Administration ระบบจะมีขั้นตอนยืนยันตัวตนเพิ่มเติมก่อนเข้าใช้งานในแต่ละ session 

> การควบคุมสิทธิ์ที่อยู่ใน Frontend ไม่ควรถูกใช้เป็น security boundary เพียงอย่างเดียว การตรวจสอบสิทธิ์ที่สำคัญควรดำเนินการซ้ำที่ Backend/API ด้วย

---

## 📁 Main Screens

ระบบประกอบด้วยหน้าหลัก เช่น

```text
Login
Overview
Face Enrollment
Attendance
Reports
├── Person Report
├── Department Report
├── Shift Report
└── Late Report

Locations
Hospital Management
User Management
System Approval
System Audit
Health
Settings
Account
Display
Help
```

รวมถึงหน้าเฉพาะสำหรับการส่งคำขอลงทะเบียนโรงพยาบาล:

```text
/hospital-request
```

---

## 🌐 Deployment

ระบบถูกออกแบบให้สามารถ deploy เป็น Web Application ได้ โดย Vite จะสร้าง production assets ผ่าน

```bash
npm run build
```

Build output สามารถนำไป deploy บน Static Hosting หรือ Web Server ที่รองรับ SPA ได้

สำหรับ GitHub Pages จำเป็นต้องรองรับ SPA routing และกำหนด base path ให้สอดคล้องกับ repository

---

## 👥 Project

**BMS FaceEnroll**

Developed by **BMS UX/UI Team**

Repository:

https://github.com/BMS-UXUI-GIT/BMS-FaceEnroll

---

## 📌 Status

> 🚧 **Under Development**

ระบบอยู่ระหว่างการพัฒนาและปรับปรุง Feature, UI และ Integration กับระบบ Backend อย่างต่อเนื่อง

---
