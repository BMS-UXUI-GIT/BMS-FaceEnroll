const _thaiMonths = [
  '',
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const _thaiMonthsFull = [
  '',
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

/// วันที่ไทยแบบสั้น "9 ก.ค. 69" (วัน เดือนย่อ ปี พ.ศ. 2 หลัก)
/// รับ "yyyy-MM-dd" หรือ ISO datetime — แปลงไม่ได้/ว่าง คืนค่าเดิม
String thaiShortDate(String? raw) {
  if (raw == null || raw.isEmpty) return raw ?? '';
  final d = DateTime.tryParse(raw);
  if (d == null || d.month < 1 || d.month > 12) return raw;
  final be = ((d.year + 543) % 100).toString().padLeft(2, '0');
  return '${d.day} ${_thaiMonths[d.month]} $be';
}

/// "กรกฎาคม 2568" (เดือนเต็ม + ปี พ.ศ. เต็ม) — ไว้หัวตัวเลือกเดือน
String thaiMonthYear(int year, int month) {
  final m = (month >= 1 && month <= 12) ? _thaiMonthsFull[month] : '';
  return '$m ${year + 543}';
}

/// ชื่อเดือนย่อไทย "ก.ย." — 1..12 (นอกช่วงคืนค่าว่าง) ไว้ใช้เป็นป้ายแกนในแดชบอร์ด
String thaiMonthShort(int month) => (month >= 1 && month <= 12) ? _thaiMonths[month] : '';
