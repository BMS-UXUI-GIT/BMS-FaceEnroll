import 'package:flutter/material.dart';

import '../../theme/nexus.dart';

/// tag ของภาพประกอบ "แก้ไขเวลา" ที่บินจากแบนเนอร์บนแดชบอร์ดไปเป็นภาพหัวหน้ารายการ
const String kFixTimeHeroTag = 'fix-time-hero-art';

/// palette "FaceEnroll" — token จาก web app BMS FaceEnroll (ใช้เฉพาะหน้าแดชบอร์ด ไม่แตะ Nexus กลาง)
/// ฟ้าโรงพยาบาลสว่าง · การ์ดขาวขอบบาง · pill · badge สถานะสีเฉพาะ · สลับ dark ตาม Nexus.isDark
class Dash {
  static bool get dark => Nexus.isDark;

  /// ตัวคูณตามความกว้างจอ — Figma วาดบนเฟรม 402 (iPhone 17)
  /// จอ 320 (SE) ย่อลง ~15% · จอใหญ่ขยายได้ถึง ~10% · หนีบไว้ไม่ให้เพี้ยนเกิน
  /// ตั้งค่าครั้งเดียวที่ต้นเฟรมใน [DashboardView.build] — ทุก Dash.* หลังจากนั้นใช้ค่าเดียวกัน
  static double _s = 1;

  /// ตัวคูณขนาดฟอนต์ของระบบ (หนีบ 1.0–1.2 ให้ตรงกับ withClampedTextScaling ที่ครอบหน้านี้)
  static double textScale = 1;

  /// พิกเซลจริงต่อ dp ของเครื่อง — ใช้บอก Image ว่าให้ถอดรหัสละเอียดแค่ไหน
  static double dpr = 3;

  static void useScale(BuildContext c) {
    dpr = MediaQuery.devicePixelRatioOf(c);
    _s = (MediaQuery.sizeOf(c).width / 402).clamp(0.82, 1.1);
    textScale = MediaQuery.textScalerOf(c).scale(1).clamp(1.0, maxTextScale);
  }

  static const double maxTextScale = 1.2;

  /// ขนาดที่ยืดหดตามจอ (ภาพ/ไอคอน) — ระยะห่างไม่ต้องใช้ ปล่อยตามสเกล 4pt เดิม
  static double sp(double v) => v * _s;

  /// ความสูงคงที่ของกล่องที่มีข้อความอยู่ข้างใน — ต้องโตตามฟอนต์ระบบด้วย ไม่งั้นล้น
  static double box(double v) => v * _s * textScale;
  // พื้น / การ์ด
  static Color get bg => dark
      ? const Color(0xFF161A23)
      : const Color(0xFFF0F6FD); // --bg / --hero-bg
  static Color get card => dark
      ? const Color(0xFF222835)
      : const Color(0xFFFFFFFF); // --surface-card / --bg
  static Color get wash => dark
      ? const Color(0xFF1F2A3D)
      : const Color(0xFFEBF1FD); // --surface-blue

  /// พื้นแบนเนอร์ "แก้ไขเวลา" บนแดชบอร์ด
  static Color get fixBannerBg => bad.withValues(alpha: 0.08);

  /// พื้นหัวเรื่องฟ้าอ่อนของหน้าย่อย (Figma 606:12689)
  static Color get heroSky =>
      dark ? const Color(0xFF16283A) : const Color(0xFFD7F0FF);
  // ตัวอักษร
  static Color get ink =>
      dark ? const Color(0xFFE8EBF0) : const Color(0xFF111827); // --text
  static Color get sub =>
      dark ? const Color(0xFFDDE2EA) : const Color(0xFF252A39); // --text-dark
  static Color get muted =>
      dark ? const Color(0xFF9AA5B8) : const Color(0xFF667385); // --text-dim
  static Color get faint =>
      dark ? const Color(0xFF5B6678) : const Color(0xFFC3CAD6);
  // accent
  static Color get accent => const Color(0xFF5682E9);
  static Color get accentActive => const Color(0xFF3382E7);

  /// แผงน้ำเงินครึ่งล่างของหน้า (Figma 593:12419) — โหมดมืดหรี่ลงไม่ให้แสบตา
  static Color get panel =>
      dark ? const Color(0xFF1B2A4A) : const Color(0xFF3382E7);

  /// แถบ legend ใต้การ์ดกราฟ (Figma 593:12411) — ชิปเป็นสีโปร่ง 50% จึงต้องมีพื้นเข้มรองทั้งสองโหมด
  static const LinearGradient band = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFF000000), Color(0xFF2F2F2F)],
  );
  static Color onPanel([double a = 1]) => Colors.white.withValues(alpha: a);
  static Color get on => const Color(0xFFFFFFFF);
  static LinearGradient get accentGradient => const LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF8CBFEE), Color(0xFF5D9BDD), Color(0xFF2E6CB3)],
    stops: [0, 0.48, 1],
  );
  // semantic
  static Color get ok => const Color(0xFF34C759); // colors/green จาก Figma
  static Color get hairline => dark
      ? const Color(0x1AFFFFFF)
      : const Color(0x1A000000); // border การ์ด rgba(0,0,0,.1)
  /// พื้นการ์ดย่อย — ทึบ 100% ไม่ใช่สีโปร่ง เพราะภาพประกอบที่วางหลังการ์ดจะทะลุขึ้นมาเห็น
  static Color get rowBg =>
      dark ? const Color(0xFF262B36) : const Color(0xFFF4F6F9);
  static Color get warn => const Color(0xFFFC9709);
  static Color get bad => const Color(0xFFEB5757);
  static Color get info =>
      const Color(0xFF8D58D3); // ออกก่อนเวลา = ม่วง (ตามเว็บ)
  // badge (bg, text) ตาม --badge-*
  static (Color, Color) get bLate => dark
      ? (const Color(0x2EFC9709), const Color(0xFFFFC46B))
      : (const Color(0xFFFFEBCC), const Color(0xFFB46400));
  static (Color, Color) get bEarly => dark
      ? (const Color(0x338D58D3), const Color(0xFFC9A6F0))
      : (const Color(0xFFEDE4FA), const Color(0xFF6432AA));
  static (Color, Color) get bNoOut => dark
      ? (const Color(0x2EEB5757), const Color(0xFFFF9C9C))
      : (const Color(0x1AEB5757), const Color(0xFFEB5757));
  static (Color, Color) get bOutArea => dark
      ? (const Color(0x29B7C0D0), const Color(0xFFB7C0D0))
      : (const Color(0x0D667385), const Color(0xFF667385));

  /// ป้ายเวรแบบเว็บ (theme.css --shift-*): (พื้น, วงไอคอน, ตัวอักษร)
  static (Color, Color, Color) webShift(String kind) => switch (kind) {
    'afternoon' =>
      dark
          ? (
              const Color(0xFF3A2F1C),
              const Color(0xFFFFCF69),
              const Color(0xFFF2C879),
            )
          : (
              const Color(0xFFFFF0D9),
              const Color(0xFFFFCF69),
              const Color(0xFF8C591A),
            ),
    'night' =>
      dark
          ? (
              const Color(0xFF232B3B),
              const Color(0xFF476CB8),
              const Color(0xFF9FB2D8),
            )
          : (
              const Color(0xFFD4DDE9),
              const Color(0xFF476CB8),
              const Color(0xFF263873),
            ),
    _ =>
      dark // morning
          ? (
              const Color(0xFF23324A),
              const Color(0xFFA0AFDF),
              const Color(0xFFA9BEEA),
            )
          : (
              const Color(0xFFD7E8F6),
              const Color(0xFFA0AFDF),
              const Color(0xFF404D8C),
            ),
  };

  /// ป้ายสถานะแบบเว็บ (theme.css --badge-*): (พื้น, วงไอคอน, ตัวอักษร) — 3 สีคนละชุด
  /// ไม่ใช่สีเดียวปรับความโปร่ง · โหมดมืดวงไอคอนสีเดิม พื้น/ตัวอักษรตามเว็บมืด
  static (Color, Color, Color) webBadge(String kind) => switch (kind) {
    'ontime' =>
      dark
          ? (
              const Color(0x2E27AE60),
              const Color(0xFF27AE60),
              const Color(0xFF6EE7A8),
            )
          : (
              const Color(0xFFD1FAE5),
              const Color(0xFF27AE60),
              const Color(0xFF065F46),
            ),
    'late' =>
      dark
          ? (
              const Color(0x2EFC9709),
              const Color(0xFFFC9709),
              const Color(0xFFFFC46B),
            )
          : (
              const Color(0xFFFFEBCC),
              const Color(0xFFFC9709),
              const Color(0xFFB46400),
            ),
    'leave' =>
      dark
          ? (
              const Color(0x381E6E80),
              const Color(0xFF1E6E80),
              const Color(0xFF7FC7D6),
            )
          : (
              const Color(0x1A1E6E80),
              const Color(0xFF1E6E80),
              const Color(0xFF1E6E80),
            ),
    'early' =>
      dark
          ? (
              const Color(0x338D58D3),
              const Color(0xFF8D58D3),
              const Color(0xFFC9A6F0),
            )
          : (
              const Color(0xFFEDE4FA),
              const Color(0xFF8D58D3),
              const Color(0xFF6432AA),
            ),
    // ไม่มีเวลาเข้า — ชุดสีเดียวกับ "มาสาย" (ส้ม) แยกจากไม่มีเวลาออกที่เป็นเขียวน้ำทะเล
    'noin' =>
      dark
          ? (
              const Color(0x2EFC9709),
              const Color(0xFFFC9709),
              const Color(0xFFFFC46B),
            )
          : (
              const Color(0xFFFFEBCC),
              const Color(0xFFFC9709),
              const Color(0xFFB46400),
            ),
    _ =>
      dark // outarea
          ? (
              const Color(0x299AA5B8),
              const Color(0xFF667385),
              const Color(0xFFB7C0D0),
            )
          : (
              const Color(0x0D667385),
              const Color(0xFF667385),
              const Color(0xFF667385),
            ),
  };

  // ฟอนต์ใช้ของกลางจาก Nexus — แหล่งเดียวทั้งแอป ต่างแค่สี default ของหน้านี้
  // ฟอนต์ยืดหดตามจอด้วย — จอแคบตัวหนังสือเท่าเดิมจะกินที่จนตัดคำ/ล้น
  static TextStyle tech({
    double size = 14,
    FontWeight weight = FontWeight.w600,
    Color? color,
    double spacing = 0,
  }) => Nexus.tech(
    size: sp(size),
    weight: weight,
    color: color ?? ink,
    spacing: spacing,
  );
  static TextStyle body({
    double size = 14,
    FontWeight weight = FontWeight.w500,
    Color? color,
  }) => Nexus.body(size: sp(size), weight: weight, color: color ?? ink);
  static TextStyle num({
    double size = 14,
    FontWeight weight = FontWeight.w700,
    Color? color,
  }) => Nexus.num(size: sp(size), weight: weight, color: color ?? ink);
}
