// อ่านค่า design token ออกมาเป็นสตริง — ใช้กับ library ที่รับได้แต่สีจริง ไม่รับ var()
// (ตอนนี้คือ Leaflet: สีวงรัศมี/หมุดบนแผนที่ วาดลง canvas จึงอ่าน CSS variable เองไม่ได้)
//
// ทำแบบนี้เพื่อให้ theme.css ยังเป็นแหล่งความจริงเดียว — ไม่ต้องก๊อป hex ไปไว้ในโค้ด

export const cssVar = (name: string, fallback = ''): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
