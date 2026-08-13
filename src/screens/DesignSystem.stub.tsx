// ตัวแทนหน้าระบบดีไซน์ตอน build ขึ้น server จริง
// vite.config.ts สลับ import ของ './screens/DesignSystem' มาที่ไฟล์นี้เมื่อไม่ใช่ dev/demo
// -> โค้ดแคตตาล็อกทั้งก้อนไม่ติดไปกับ bundle ที่ส่งขึ้น production
export function DesignSystem() {
  return null
}
