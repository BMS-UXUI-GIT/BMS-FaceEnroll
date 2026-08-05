// ที่อยู่ไฟล์ใน public/ — ต้องผ่านตัวนี้เสมอ ห้ามเขียน src="/xxx.svg" ตรง ๆ
//
// เว็บ demo บน GitHub Pages ถูกวางใต้ subpath (/BMS-FaceEnroll/) ไม่ใช่ root
// พาธที่ขึ้นต้นด้วย / จึงยิงไป bms-uxui-git.github.io/hero-x.svg = 404 (รูปหาย)
// import.meta.env.BASE_URL = ค่า base ของ vite ('/' ตอน dev/server จริง · '/BMS-FaceEnroll/' ตอน deploy)
export const asset = (path: string) => import.meta.env.BASE_URL + path.replace(/^\//, '')
