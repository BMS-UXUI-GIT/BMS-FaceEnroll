import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import '../../../widgets/tabler_icon.dart';
import '../dash_theme.dart';
import '../attendance_row.dart';

/// ป้ายสถานะการลงเวลา — ก๊อปสเปกจากเว็บ StatusBadge (Figma "Status Badge" 82:1249)
/// สูง 36 · มุมกลม · padding 4/12/4/8 · gap 6 · วงทึบ 26 + ไอคอน tabler 14 ขาว · ตัวอักษร 12
class WebStatusBadge extends StatelessWidget {
  const WebStatusBadge({
    super.key,
    required this.kind,
    required this.label,
    this.blur = false,
  });

  /// พื้นกระจกฝ้า — เปิดเฉพาะตอนวางบนการ์ดวันที่สแกน
  final bool blur;

  /// ontime · late · leave · outarea · early (ชื่อเดียวกับเว็บ)
  final String kind;
  final String label;

  static const _icon = {
    'ontime': 'scan',
    'late': 'clock-alert',
    'leave': 'clock-play',
    'outarea': 'map-question',
    'early': 'time-duration-off',
  };

  @override
  Widget build(BuildContext context) =>
      WebBadge(Dash.webBadge(kind), _icon[kind] ?? 'clock', label, blur: blur);
}

/// ป้ายเวร — ก๊อปสเปกจากเว็บ ShiftBadge (Figma "Shift Badge" 120:3190) โครงเดียวกับป้ายสถานะ
/// เช้า = haze · บ่าย = sun-high · ดึก = moon-stars
class WebShiftBadge extends StatelessWidget {
  const WebShiftBadge(this.hhmm, {super.key});

  /// เวลาเข้า — เดาเวรจากชั่วโมงแบบเดียวกับ [shiftName]
  final String hhmm;

  /// (kind, ไอคอน tabler, ป้ายสั้น) ของเวรจากเวลาเข้า
  static (String, String, String) of(String hhmm) {
    final h = int.tryParse(hhmm.split(':').first) ?? 8;
    return h < 12
        ? ('morning', 'haze', 'เช้า')
        : h < 18
        ? ('afternoon', 'sun', 'บ่าย')
        : ('night', 'moon', 'ดึก');
  }

  @override
  Widget build(BuildContext context) {
    final (kind, icon, label) = of(hhmm);
    return WebBadge(Dash.webShift(kind), icon, label);
  }
}

/// พิลป้ายร่วมของเว็บ: สูง 36 · padding 4/12/4/8 · วงทึบ 26 + ไอคอน tabler 14 ขาว · ตัวอักษร 12
class WebBadge extends StatelessWidget {
  const WebBadge(
    this.colors,
    this.icon,
    this.label, {
    super.key,
    this.blur = false,
  });

  final (Color, Color, Color) colors;
  final String icon;
  final String label;

  /// พื้นกระจกฝ้า — ใช้เฉพาะบนการ์ดที่มีไล่สี/ภาพประกอบข้างหลัง
  /// ในลิสต์พื้นเรียบ ๆ เบลอแล้วไม่เห็นอะไร แถมเปลืองแรงวาดตอนเลื่อน
  final bool blur;

  @override
  Widget build(BuildContext context) {
    final (bg, ring, fg) = colors;
    // ย่อจากสเปกเว็บ (36/26/14/12) ลง ~80% ให้พอดีแถวบนจอมือถือ สัดส่วนเดิม
    final pill = Container(
      constraints: BoxConstraints(minHeight: Dash.box(28)),
      padding: const EdgeInsets.fromLTRB(4, 3, 10, 3),
      decoration: BoxDecoration(
        // เบลอ = ต้องใสจริง ๆ ถึงจะเห็นของข้างหลัง · ไม่เบลอ = พื้นทึบตามสเปกเว็บ
        color: blur ? bg.withValues(alpha: Dash.dark ? 0.32 : 0.38) : bg,
        borderRadius: BorderRadius.circular(100),
        // ขอบสว่างบาง ๆ แบบกระจก ช่วยให้ขอบป้ายไม่จมไปกับพื้นหลัง
        border: blur
            ? Border.all(
                color: Colors.white.withValues(alpha: Dash.dark ? 0.16 : 0.55),
              )
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: Dash.sp(21),
            height: Dash.sp(21),
            alignment: Alignment.center,
            decoration: BoxDecoration(color: ring, shape: BoxShape.circle),
            child: TablerIcon(icon, size: Dash.sp(12), color: Colors.white),
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: Dash.body(size: 11, weight: FontWeight.w500, color: fg),
          ),
        ],
      ),
    );
    if (!blur) return pill;
    return ClipRRect(
      borderRadius: BorderRadius.circular(100),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: pill,
      ),
    );
  }
}
