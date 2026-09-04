/// ข้อมูลลงเวลาจำลองสำหรับ prototype (แดชบอร์ด + เว็บเดโม) — ไม่มีอะไรออกเน็ต
///
/// เดินตามตารางเวรจริง (เช้า/บ่าย/ดึก + วันหยุดประจำสัปดาห์) แล้วโรยสาย/ออกก่อน/
/// ลืมออก/นอกพื้นที่ ตามสัดส่วนที่เจอจริง — ทุกอย่าง deterministic จากวันที่
/// ลบไฟล์นี้ทิ้งพร้อม kDashboardDemo/kDemoBuild ตอนต่อ backend จริง
library;

/// สุ่มแบบ deterministic จากวันที่ — เปิดหน้าใหม่กี่รอบก็ได้ชุดเดิม ไม่กระพริบ
int _seed(DateTime d) {
  var h = d.year * 10000 + d.month * 100 + d.day;
  h = (h ^ (h >> 7)) * 0x27d4eb2d;
  return (h ^ (h >> 15)) & 0x7fffffff;
}

String _hhmm(int h, int m) =>
    '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';

/// วันหยุดตามตารางเวร — หยุดสัปดาห์ละ 2 วัน (บางสัปดาห์หนักหน่อยเหลือวันเดียว)
/// สุ่มรายวันแบบเดิมทำให้มีสัปดาห์ที่ทำงานรวด 7 วัน ซึ่งไม่มีในตารางเวรจริง
bool _isOff(DateTime d) {
  final w = _seed(_mondayOf(d));
  // ถ่วงให้วันหยุดตกเสาร์-อาทิตย์บ่อยกว่า แต่ไม่ใช่ทุกครั้ง (เวรโรงพยาบาลหมุนทั้งสัปดาห์)
  const pick = [5, 6, 5, 6, 0, 1, 2, 3, 4];
  final offA = pick[w % pick.length];
  var offB = pick[(w >> 7) % pick.length];
  if (offB == offA) offB = (offA + 3) % 7;
  var offC = pick[(w >> 17) % pick.length];
  if (offC == offA || offC == offB) offC = (offA + 5) % 7;
  final idx = d.weekday - 1;
  if (idx == offA) return true;
  final mood = (w >> 14) % 100;
  // ปกติหยุด 2 วัน · ~15% เวรหนักหยุดวันเดียว · ~15% หยุด 3 วัน
  // เฉลี่ยแล้วได้ ~21-22 วันทำงานต่อเดือน ตรงกับตารางเวรจริง
  if (idx == offB) return mood >= 15;
  return idx == offC && mood >= 85;
}

/// เวรประจำสัปดาห์: 0 เช้า · 1 บ่าย · 2 ดึก — สลับเป็นบล็อก ไม่ใช่สุ่มรายวัน
int _shiftOf(DateTime d) {
  final w = _seed(_mondayOf(d));
  final base = w % 3;
  final swapLate =
      (w >> 11) % 100 < 30 && d.weekday >= 5; // ท้ายสัปดาห์สลับเวรบ้าง
  return swapLate ? (base + 1) % 3 : base;
}

/// สร้างแถวลงเวลาให้ดูสมจริง: เดินตามตารางเวร (เช้า/บ่าย/ดึก) มีวันหยุดประจำสัปดาห์
/// สาย/ออกก่อน/ลืมออก/นอกพื้นที่ ปนตามสัดส่วนที่เจอจริง และควบเวรเป็นครั้งคราว
List<Map<String, dynamic>> demoAttendanceRows(
  DateTime from,
  DateTime to, {
  DateTime? until,
}) {
  final stop = until != null && until.isBefore(to) ? until : to;
  final now = DateTime.now();
  final out = <Map<String, dynamic>>[];
  for (var d = from; !d.isAfter(stop); d = d.add(const Duration(days: 1))) {
    final today =
        d.year == now.year && d.month == now.month && d.day == now.day;
    // วันนี้ปักไว้เป็นควบเวรบ่าย-ดึกเสมอ ให้การ์ดด้านบนมีสองหน้าให้ปัด (มีตัวบอกหน้า)
    if (today) {
      final key =
          '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
      out.add({
        'date': key,
        'in': '15:42',
        'out': '23:06',
        'late': false,
        'early': false,
        'no_out': false,
        'out_area': false,
      });
      // เวรดึกต่อทันที ยังไม่ถึงเวลาออก — ว่างไว้ ไม่ใช่ "ลืมออก"
      out.add({
        'date': key,
        'in': '23:18',
        'out': '',
        'late': false,
        'early': false,
        'no_out': false,
        'out_area': false,
      });
      continue;
    }
    if (_isOff(d)) continue;
    final r = _seed(d);
    if (r % 100 < 3) continue; // ลากิจ/ลาป่วย ~3%
    // ปักหมุดไว้สัปดาห์ละวัน เพื่อให้เคสสองสถานะโผล่ให้เห็นเสมอ ไม่ต้องรอสุ่มถูก
    final w = _seed(_mondayOf(d));
    final idx = d.weekday - 1;
    final isDouble = idx == w % 7; // วันควบเวร → วงกลมผ่าครึ่งสองสี
    final isMixed =
        idx == (w >> 3) % 7; // วันที่เวรเดียวผิดสองอย่าง → จุดมุมบน
    final shift = isDouble ? 0 : _shiftOf(d); // ควบเวรเริ่มที่เวรเช้าเสมอ
    final late = isMixed || r % 100 < 12;
    final early = !isMixed && (r >> 5) % 100 < 6;
    final noOut = !isMixed && (r >> 9) % 100 < 3;
    final outArea = isMixed || (r >> 13) % 100 < 2;
    final date =
        '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

    // เวลาเข้า-ออกมาตรฐานของแต่ละเวร แล้วขยับตามว่าสาย/ออกก่อน
    final (inH, inBase, outH, outBase) = switch (shift) {
      1 => (late ? 16 : 15, late ? 5 : 35, early ? 21 : 23, early ? 40 : 5),
      2 => (late ? 23 : 22, late ? 40 : 55, early ? 5 : 7, early ? 50 : 10),
      _ => (late ? 8 : 7, late ? 5 : 38, early ? 15 : 16, early ? 20 : 3),
    };
    final inT = _hhmm(inH, (inBase + r % 18) % 60);
    final outT = _hhmm(outH, (outBase + (r >> 3) % 20) % 60);
    out.add({
      'date': date,
      'in': inT,
      'out': noOut ? '' : outT,
      'late': late,
      'early': !noOut && early,
      'no_out': noOut,
      'out_area': outArea,
    });

    // ควบเวรเช้า→บ่าย: สัปดาห์ละวัน (วันที่ปักหมุดไว้) หรือสุ่มเจอเพิ่มอีก ~5%
    if (shift == 0 && (isDouble || (r >> 17) % 100 < 5)) {
      // เวรที่สองต้องคนละสถานะกับเวรแรกเสมอ — วงกลมจะได้ผ่าครึ่งเห็นสองสีจริง
      final firstClean = !late && !early && !noOut && !outArea;
      final late2 = firstClean;
      out.add({
        'date': date,
        'in': _hhmm(late2 ? 16 : 15, (r >> 2) % 45),
        'out': _hhmm(23, (r >> 4) % 30),
        'late': late2,
        'early': false,
        'no_out': false,
        'out_area': false,
      });
    }
  }
  return out;
}

DateTime _mondayOf(DateTime d) =>
    DateTime(d.year, d.month, d.day).subtract(Duration(days: d.weekday - 1));
