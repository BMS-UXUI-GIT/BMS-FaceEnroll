import type { CSSProperties } from 'react'

// ไอคอนทั้งหมดมาจาก Tabler Icons (outline) — MIT License
//   https://github.com/tabler/tabler-icons  ·  ห้ามวาดไอคอนเองหรือใช้ชุดอื่นปน
//
// เก็บเป็น markup ตรงๆ แทนการติดตั้ง @tabler/icons-react เพื่อคงกฎ "ไม่เพิ่ม dependency"
// เพิ่มไอคอนใหม่: ก๊อป <path> จาก icons/outline/<ชื่อ>.svg ของ repo แล้วใส่คอมเมนต์ชื่อ Tabler กำกับ

const P: Record<string, string> = {
  alert: "<path d=\"M12 9v4\" /><path d=\"M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0\" /><path d=\"M12 16h.01\" />", // tabler: alert-triangle
  bell: "<path d=\"M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6\" /><path d=\"M9 17v1a3 3 0 0 0 6 0v-1\" />", // tabler: bell
  briefcase: "<path d=\"M3 9a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9\" /><path d=\"M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2\" />", // tabler: briefcase-2
  calendar: "<path d=\"M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12\" /><path d=\"M16 3v4\" /><path d=\"M8 3v4\" /><path d=\"M4 11h16\" /><path d=\"M11 15h1\" /><path d=\"M12 15v3\" />", // tabler: calendar
  'calendar-time': "<path d=\"M11.795 21h-6.795a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v4\" /><path d=\"M14 18a4 4 0 1 0 8 0a4 4 0 1 0 -8 0\" /><path d=\"M15 3v4\" /><path d=\"M7 3v4\" /><path d=\"M3 11h16\" /><path d=\"M18 16.496v1.504l1 1\" />", // tabler: calendar-time
  'calendar-week': "<path d=\"M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12\" /><path d=\"M16 3v4\" /><path d=\"M8 3v4\" /><path d=\"M4 11h16\" /><path d=\"M7 14h.013\" /><path d=\"M10.01 14h.005\" /><path d=\"M13.01 14h.005\" /><path d=\"M16.015 14h.005\" /><path d=\"M13.015 17h.005\" /><path d=\"M7.01 17h.005\" /><path d=\"M10.01 17h.005\" />", // tabler: calendar-week
  'chevron-down': "<path d=\"M6 9l6 6l6 -6\" />", // tabler: chevron-down
  'chevron-left': "<path d=\"M15 6l-6 6l6 6\" />", // tabler: chevron-left
  'chevron-right': "<path d=\"M9 6l6 6l-6 6\" />", // tabler: chevron-right
  filter: "<path d=\"M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227z\" />", // tabler: filter
  clock: "<path d=\"M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0\" /><path d=\"M12 7v5l3 3\" />", // tabler: clock
  'clock-alert': "<path d=\"M20.986 12.502a9 9 0 1 0 -5.973 7.98\" /><path d=\"M12 7v5l3 3\" /><path d=\"M19 16v3\" /><path d=\"M19 22v.01\" />", // tabler: clock-exclamation
  'clock-play': "<path d=\"M12 7v5l2 2\" /><path d=\"M17 22l5 -3l-5 -3l0 6\" /><path d=\"M13.017 20.943a9 9 0 1 1 7.831 -7.292\" />", // tabler: clock-play
  'clock-x': "<path d=\"M20.984 12.535a9 9 0 1 0 -8.431 8.448\" /><path d=\"M12 7v5l3 3\" /><path d=\"M22 22l-5 -5\" /><path d=\"M17 22l5 -5\" />", // tabler: clock-x
  ban: "<path d=\"M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\" /><path d=\"M5.7 5.7l12.6 12.6\" />", // tabler: ban
  check: "<path d=\"M5 12l5 5l10 -10\" />", // tabler: check
  close: "<path d=\"M18 6l-12 12\" /><path d=\"M6 6l12 12\" />", // tabler: x
  flask: "<path d=\"M9 3l6 0\" /><path d=\"M10 9l4 0\" /><path d=\"M10 3v6l-4 11a.7 .7 0 0 0 .5 1h11a.7 .7 0 0 0 .5 -1l-4 -11v-6\" />", // tabler: flask
  hourglass: "<path d=\"M6.5 7h11\" /><path d=\"M6.5 17h11\" /><path d=\"M6 20v-2a6 6 0 1 1 12 0v2a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1z\" /><path d=\"M6 4v2a6 6 0 1 0 12 0v-2a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1z\" />", // tabler: hourglass
  'hourglass-low': "<path d=\"M6.5 17h11\" /><path d=\"M6 20v-2a6 6 0 1 1 12 0v2a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1z\" /><path d=\"M6 4v2a6 6 0 1 0 12 0v-2a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1z\" />", // tabler: hourglass-low
  'hourglass-off': "<path d=\"M18 18v2a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-2a6 6 0 0 1 6 -6\" /><path d=\"M6 6a6 6 0 0 0 6 6m3.13 -.88a6 6 0 0 0 2.87 -5.12v-2a1 1 0 0 0 -1 -1h-10\" /><path d=\"M3 3l18 18\" />", // tabler: hourglass-off
  download: "<path d=\"M19 18a3.5 3.5 0 0 0 0 -7h-1a5 4.5 0 0 0 -11 -2a4.6 4.4 0 0 0 -2.1 8.4\" /><path d=\"M12 13l0 9\" /><path d=\"M9 19l3 3l3 -3\" />", // tabler: cloud-download
  eye: "<path d=\"M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0\" /><path d=\"M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6\" />", // tabler: eye
  'eye-off': "<path d=\"M10.585 10.587a2 2 0 0 0 2.829 2.828\" /><path d=\"M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87\" /><path d=\"M3 3l18 18\" />", // tabler: eye-off
  face: "<path d=\"M4 8v-2a2 2 0 0 1 2 -2h2\" /><path d=\"M4 16v2a2 2 0 0 0 2 2h2\" /><path d=\"M16 4h2a2 2 0 0 1 2 2v2\" /><path d=\"M16 20h2a2 2 0 0 0 2 -2v-2\" /><path d=\"M9 10l.01 0\" /><path d=\"M15 10l.01 0\" /><path d=\"M9.5 15a3.5 3.5 0 0 0 5 0\" />", // tabler: face-id
  haze: "<path d=\"M3 12h1\" /><path d=\"M12 3v1\" /><path d=\"M20 12h1\" /><path d=\"M5.6 5.6l.7 .7\" /><path d=\"M18.4 5.6l-.7 .7\" /><path d=\"M8 12a4 4 0 1 1 8 0\" /><path d=\"M3 16h18\" /><path d=\"M3 20h18\" />", // tabler: haze
  health: "<path d=\"M19.5 13.572l-7.5 7.428l-2.896 -2.868m-6.117 -8.104a5 5 0 0 1 9.013 -3.022a5 5 0 1 1 7.5 6.572\" /><path d=\"M3 13h2l2 3l2 -6l1 3h3\" />", // tabler: heartbeat
  hospital: "<path d=\"M3 21l18 0\" /><path d=\"M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16\" /><path d=\"M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4\" /><path d=\"M10 9l4 0\" /><path d=\"M12 7l0 4\" />", // tabler: building-hospital
  info: "<path d=\"M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0\" /><path d=\"M12 9h.01\" /><path d=\"M11 12h1v4h1\" />", // tabler: info-circle
  lock: "<path d=\"M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6\" /><path d=\"M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0\" /><path d=\"M8 11v-4a4 4 0 1 1 8 0v4\" />", // tabler: lock
  logout: "<path d=\"M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2\" /><path d=\"M9 12h12l-3 -3\" /><path d=\"M18 15l3 -3\" />", // tabler: logout
  'map-pin': "<path d=\"M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0\" /><path d=\"M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0\" />", // tabler: map-pin
  'map-question': "<path d=\"M15 20l-6 -3l-6 3v-13l6 -3l6 3l6 -3v7.5\" /><path d=\"M9 4v13\" /><path d=\"M15 7v5.5\" /><path d=\"M19 22v.01\" /><path d=\"M19 19a2.003 2.003 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483\" />", // tabler: map-question
  mail: "<path d=\"M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z\" /><path d=\"M3 7l9 6l9 -6\" />", // tabler: mail
  menu: "<path d=\"M4 6l16 0\" /><path d=\"M4 12l16 0\" /><path d=\"M4 18l16 0\" />", // tabler: menu-2
  'mood-check': "<path d=\"M20.925 13.163a9 9 0 1 0 -7.876 7.828\" /><path d=\"M9 10h.01\" /><path d=\"M15 10h.01\" /><path d=\"M9.5 15c.658 .672 1.56 1 2.5 1c.126 0 .25 -.006 .372 -.018\" /><path d=\"M15 19l2 2l4 -4\" />", // tabler: mood-check
  'mood-cog': "<path d=\"M20.955 11.104a9 9 0 1 0 -9.895 9.847\" /><path d=\"M9 10h.01\" /><path d=\"M15 10h.01\" /><path d=\"M9.5 15c.658 .672 1.56 1 2.5 1\" /><path d=\"M19.001 15.5v1.5\" /><path d=\"M19.001 21v1.5\" /><path d=\"M22.032 17.25l-1.299 .75\" /><path d=\"M17.27 20l-1.3 .75\" /><path d=\"M15.97 17.25l1.3 .75\" /><path d=\"M20.733 20l1.3 .75\" />", // tabler: mood-cog
  'mood-x': "<path d=\"M20.984 12.53a9 9 0 1 0 -7.552 8.355\" /><path d=\"M9 10h.01\" /><path d=\"M15 10h.01\" /><path d=\"M9.5 15c.658 .672 1.56 1 2.5 1c.573 0 1.108 -.122 1.567 -.334\" /><path d=\"M22 22l-5 -5\" /><path d=\"M17 22l5 -5\" />", // tabler: mood-x
  moon: "<path d=\"M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008\" /><path d=\"M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2\" /><path d=\"M19 11h2m-1 -1v2\" />", // tabler: moon-stars
  overview: "<path d=\"M5 12l-2 0l9 -9l9 9l-2 0\" /><path d=\"M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7\" /><path d=\"M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6\" />", // tabler: home
  people: "<path d=\"M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0\" /><path d=\"M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2\" /><path d=\"M16 3.13a4 4 0 0 1 0 7.75\" /><path d=\"M21 21v-2a4 4 0 0 0 -3 -3.85\" />", // tabler: users
  person: "<path d=\"M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0\" /><path d=\"M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2\" />", // tabler: user
  'player-pause': "<path d=\"M6 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z\" /><path d=\"M14 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z\" />", // tabler: player-pause
  'rosette-check': "<path d=\"M5 7.2a2.2 2.2 0 0 1 2.2 -2.2h1a2.2 2.2 0 0 0 1.55 -.64l.7 -.7a2.2 2.2 0 0 1 3.12 0l.7 .7c.412 .41 .97 .64 1.55 .64h1a2.2 2.2 0 0 1 2.2 2.2v1c0 .58 .23 1.138 .64 1.55l.7 .7a2.2 2.2 0 0 1 0 3.12l-.7 .7a2.2 2.2 0 0 0 -.64 1.55v1a2.2 2.2 0 0 1 -2.2 2.2h-1a2.2 2.2 0 0 0 -1.55 .64l-.7 .7a2.2 2.2 0 0 1 -3.12 0l-.7 -.7a2.2 2.2 0 0 0 -1.55 -.64h-1a2.2 2.2 0 0 1 -2.2 -2.2v-1a2.2 2.2 0 0 0 -.64 -1.55l-.7 -.7a2.2 2.2 0 0 1 0 -3.12l.7 -.7a2.2 2.2 0 0 0 .64 -1.55v-1\" /><path d=\"M9 12l2 2l4 -4\" />", // tabler: rosette-discount-check
  'progress-alert': "<path d=\"M10 20.777a8.942 8.942 0 0 1 -2.48 -.969\" /><path d=\"M14 3.223a9.003 9.003 0 0 1 0 17.554\" /><path d=\"M4.579 17.093a8.961 8.961 0 0 1 -1.227 -2.592\" /><path d=\"M3.124 10.5c.16 -.95 .468 -1.85 .9 -2.675l.169 -.305\" /><path d=\"M6.907 4.579a8.954 8.954 0 0 1 3.093 -1.356\" /><path d=\"M12 8v4\" /><path d=\"M12 16v.01\" />", // tabler: progress-alert
  phone: "<path d=\"M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2\" />", // tabler: phone
  recon: "<path d=\"M19.95 11a8 8 0 1 0 -.5 4m.5 5v-5h-5\" />", // tabler: rotate
  report: "<path d=\"M14 3v4a1 1 0 0 0 1 1h4\" /><path d=\"M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2\" /><path d=\"M9 9l1 0\" /><path d=\"M9 13l6 0\" /><path d=\"M9 17l6 0\" />", // tabler: file-text
  scan: "<path d=\"M10 9a2 2 0 1 0 4 0a2 2 0 0 0 -4 0\" /><path d=\"M8 16a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2\" /><path d=\"M3 7v-2a2 2 0 0 1 2 -2h2\" /><path d=\"M3 17v2a2 2 0 0 0 2 2h2\" /><path d=\"M17 3h2a2 2 0 0 1 2 2v2\" /><path d=\"M17 21h2a2 2 0 0 0 2 -2v-2\" />", // tabler: user-scan
  search: "<path d=\"M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0\" /><path d=\"M21 21l-6 -6\" />", // tabler: search
  sun: "<path d=\"M14.828 14.828a4 4 0 1 0 -5.656 -5.656a4 4 0 0 0 5.656 5.656\" /><path d=\"M6.343 17.657l-1.414 1.414\" /><path d=\"M6.343 6.343l-1.414 -1.414\" /><path d=\"M17.657 6.343l1.414 -1.414\" /><path d=\"M17.657 17.657l1.414 1.414\" /><path d=\"M4 12h-2\" /><path d=\"M12 4v-2\" /><path d=\"M20 12h2\" /><path d=\"M12 20v2\" />", // tabler: sun-high
  'time-duration-off': "<path d=\"M3 12v.01\" /><path d=\"M7.5 19.8v.01\" /><path d=\"M4.2 16.5v.01\" /><path d=\"M4.2 7.5v.01\" /><path d=\"M12 21a8.994 8.994 0 0 0 6.362 -2.634m1.685 -2.336a9 9 0 0 0 -8.047 -13.03\" /><path d=\"M3 3l18 18\" />", // tabler: time-duration-off
  trash: "<path d=\"M4 7l16 0\" /><path d=\"M10 11l0 6\" /><path d=\"M14 11l0 6\" /><path d=\"M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12\" /><path d=\"M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3\" />", // tabler: trash
  system: "<path d=\"M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065\" /><path d=\"M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0\" />", // tabler: settings
}

/** ชื่อไอคอนทั้งหมดที่มีในระบบ — หน้า Design System เอาไปไล่แสดงเป็นตาราง */
export const ICON_NAMES = Object.keys(P)

export function Icon({
  name,
  size = 17,
  color = 'currentColor',
  width = 1.9,
  style,
}: {
  name: keyof typeof P | string
  size?: number
  color?: string
  width?: number
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      // flexShrink: 0 เสมอ — ไอคอนอยู่ใน flex row บ่อย ถ้าไม่กันไว้จะโดนหดจนเล็กกว่าปกติ
      // เมื่อข้อความข้างๆ ยาวเกินที่ (style ที่ส่งเข้ามาเขียนทับได้)
      style={{ flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: P[name] ?? '' }}
    />
  )
}
