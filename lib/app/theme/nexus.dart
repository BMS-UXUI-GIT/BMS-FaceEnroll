import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../widgets/tappable.dart';

/// ธีม NEXUS — dark/light (ค่าสีจากดีไซน์ claude_design "NEXUS Check-in")
///
/// 2 ชุดสี:
///  - สีตรึงมืด (card/sheet/ink/cyan/...) = ใช้ในจอกล้อง (scan/enroll/confirm/liveness) — ไม่สลับ
///  - page palette (pInk/pAccent/pOk/...) = ใช้ในจอ page — สลับ dark/light ตาม applyMode
class Nexus {
  // ===== สีตรึงมืด (จอกล้อง) =====
  static const card = Color(0xFF04080E);
  static const sheet = Color(0xFF0A1422);
  static const field = Color(0xFF060D18);
  static const ink = Color(0xFFEAF6FF);
  static const sub = Color(0xFFBFE6F3);
  static const muted = Color(0xFF7B90A8);
  static const dim = Color(0xFF5E7790);
  static const line = Color(0xFF1D3450);
  static const line2 = Color(0xFF1D3650);
  static const cyan = Color(0xFF19E3FF);
  static const blue = Color(0xFF2B7FFF);
  static const on = Color(0xFF04121C);
  static const green = Color(0xFF3CFF9E);
  static const greenSoft = Color(0xFF8EFFC4);
  static const amber = Color(0xFFFFB648);
  static const amberSoft = Color(0xFFFFCE8A);
  static const red = Color(0xFFFF8AA0);

  static const _darkBg = RadialGradient(
    center: Alignment(0, -1.0),
    radius: 1.2,
    colors: [Color(0xFF0C1626), Color(0xFF05080F)],
    stops: [0, 0.7],
  );

  // ===== PAGE PALETTE (สลับ dark/light) =====
  static bool isDark = true;
  static Color pCard = card; // scaffold/พื้นหลังหลัก (--phone-bg)
  static Color pSheet = sheet; // การ์ด/sheet (--surface)
  static Color pField = field; // ช่อง input (--surface-2)
  static Color pInk = ink; // ข้อความหลัก (--text-1)
  static Color pSub = sub; // ข้อความรอง (--text-2)
  static Color pMuted = muted; // ข้อความจาง (--text-3)
  static Color pDim = dim; // จางสุด (--text-muted)
  static Color pFaint = const Color(0xFF4A6580); // disabled (--text-faint)
  static Color pLine = const Color(0xFF1D3650); // ขอบ (--border)
  static Color pLine2 = const Color(0xFF2A4D72); // ขอบเข้ม (--border-strong)
  static Color pDivider = const Color(0xFF15263C); // เส้นคั่น (--line)
  static Color pHandle = const Color(0xFF23415F); // แถบลาก (--handle)
  static Color pPanel = const Color(0x66142840); // ปุ่ม/การ์ดโปร่ง (--fill-1)
  static Color pTodayBg = const Color(0x990A1422); // การ์ดวันนี้ (--today-bg)
  static Color pScrim = const Color(0xC702060C); // ฉากหลัง modal (--scrim)
  static Gradient pBg = _darkBg; // (--app-grad)
  // accent (สลับ)
  static Color pAccent = const Color(0xFF19E3FF); // (--accent-ink)
  static Color pAccent2 = const Color(0xFF2B7FFF); // ปลาย gradient
  static Color pOn = const Color(0xFF04121C); // ตัวอักษรบนปุ่ม accent (--knob)
  // status (สลับ)
  static Color pOk = const Color(0xFF3CFF9E);
  static Color pOkBg = const Color(0x66082014);
  static Color pOkBorder = const Color(0xFF15402B);
  static Color pWarn = const Color(0xFFFFCE8A);
  static Color pWarnBg = const Color(0x593C280C);
  static Color pWarnBorder = const Color(0xFF5A3A16);
  static Color pBad = const Color(0xFFFF8AA0);
  static Color pBadBg = const Color(0x663C141C);
  static Color pBadBorder = const Color(0xFF5A2230);

  /// สลับโหมดธีม (boot + ตอนกดในแอป)
  static void applyMode(bool dark) {
    isDark = dark;
    if (dark) {
      pCard = const Color(0xFF04080E);
      pSheet = const Color(0xFF0A1422);
      pField = const Color(0xFF060D18);
      pInk = const Color(0xFFEAF6FF);
      pSub = const Color(0xFFBFE6F3);
      pMuted = const Color(0xFF7B90A8);
      pDim = const Color(0xFF5E7790);
      pFaint = const Color(0xFF4A6580);
      pLine = const Color(0xFF1D3650);
      pLine2 = const Color(0xFF2A4D72);
      pDivider = const Color(0xFF15263C);
      pHandle = const Color(0xFF23415F);
      pPanel = const Color(0x66142840);
      pTodayBg = const Color(0x990A1422);
      pScrim = const Color(0xC702060C);
      pBg = _darkBg;
      pAccent = const Color(0xFF19E3FF);
      pAccent2 = const Color(0xFF2B7FFF);
      pOn = const Color(0xFF04121C);
      pOk = const Color(0xFF3CFF9E);
      pOkBg = const Color(0x66082014);
      pOkBorder = const Color(0xFF15402B);
      pWarn = const Color(0xFFFFCE8A);
      pWarnBg = const Color(0x593C280C);
      pWarnBorder = const Color(0xFF5A3A16);
      pBad = const Color(0xFFFF8AA0);
      pBadBg = const Color(0x663C141C);
      pBadBorder = const Color(0xFF5A2230);
    } else {
      pCard = const Color(0xFFFFFFFF);
      pSheet = const Color(0xFFFFFFFF);
      pField = const Color(0xFFF3F6FB);
      pInk = const Color(0xFF0F1D2E);
      pSub = const Color(0xFF33506B);
      pMuted = const Color(0xFF5B6B80);
      pDim = const Color(0xFF8593A4);
      pFaint = const Color(0xFFAAB4C2);
      pLine = const Color(0xFFE0E7F0);
      pLine2 = const Color(0xFFC6D2E1);
      pDivider = const Color(0xFFEAEFF5);
      pHandle = const Color(0xFFC4CFDD);
      pPanel = const Color(0x0F144682); // rgba(20,70,130,.06)
      pTodayBg = const Color(0x09144682); // rgba(20,70,130,.035)
      pScrim = const Color(0x61192332); // rgba(25,35,50,.38)
      pBg = const RadialGradient(
        center: Alignment(0, -1.0),
        radius: 1.2,
        colors: [Color(0xFFE9F0F8), Color(0xFFD4DEEC)],
        stops: [0, 0.7],
      );
      pAccent = const Color(0xFF1F6FD0);
      pAccent2 = const Color(0xFF2F86E8);
      pOn = const Color(0xFFFFFFFF);
      pOk = const Color(0xFF10B06A);
      pOkBg = const Color(0x1F10B06A); // rgba(16,176,106,.12)
      pOkBorder = const Color(0x5210B06A); // rgba(16,176,106,.32)
      pWarn = const Color(0xFFB9791A);
      pWarnBg = const Color(0x29FFB448); // rgba(255,180,72,.16)
      pWarnBorder = const Color(0x6BFFB448); // rgba(255,180,72,.42)
      pBad = const Color(0xFFD2453F);
      pBadBg = const Color(0x1AD2453F); // rgba(210,69,63,.1)
      pBadBorder = const Color(0x47D2453F); // rgba(210,69,63,.28)
    }
  }

  // ===== ฟอนต์ =====
  /// ฟอนต์ระบบ: ตัวอักษร Noto Sans Thai · ตัวเลข Nunito (ตาม Figma)
  /// default สี = pInk (สลับ dark/light) ; จอกล้องที่อยู่บนพื้นมืดเสมอ ส่ง color: Nexus.ink เอง
  /// GoogleFonts.* จับคู่ variant + สร้าง TextStyle ใหม่ทุกครั้งที่เรียก และเราเรียกมันทุก Text
  /// (แถวรายวันแถวเดียวมี 6 ครั้ง) — แคชตามชุดพารามิเตอร์ ซึ่งมีอยู่ไม่กี่สิบแบบในทั้งแอป
  static final Map<(double, FontWeight, int, double), TextStyle> _thaiCache = {};
  static final Map<(double, FontWeight, int), TextStyle> _numCache = {};

  static TextStyle _thai(double size, FontWeight weight, Color color, double spacing) => _thaiCache.putIfAbsent((
    size,
    weight,
    color.toARGB32(),
    spacing,
  ), () => GoogleFonts.notoSansThai(fontSize: size, fontWeight: weight, color: color, letterSpacing: spacing));

  static TextStyle tech({double size = 14, FontWeight weight = FontWeight.w600, Color? color, double spacing = 0}) =>
      _thai(size, weight, color ?? pInk, spacing);
  static TextStyle body({double size = 14, FontWeight weight = FontWeight.w400, Color? color}) =>
      _thai(size, weight, color ?? pInk, 0);

  /// ตัวเลข/เวลา — Nunito (ตาม Figma ที่แยกฟอนต์สำหรับตัวเลขโดยเฉพาะ)
  /// ความกว้างตัวเลขสม่ำเสมอกว่า อ่านเวลา/สถิติเป็นคอลัมน์ได้ไม่เต้น
  /// Nunito ไม่มี glyph ไทย — ถ้าไม่ใส่ fallback ตัวไทยที่ปนมา (เช่น "08:18 น.") จะตกไปใช้ฟอนต์ระบบ
  /// แคชชื่อ family ไว้ — เดิมเรียก GoogleFonts.notoSansThai() ใหม่ทุกครั้งที่สร้าง TextStyle
  /// (จับคู่ variant + สร้าง TextStyle ทิ้ง) ทั้งที่ต้องการแค่ชื่อ ซึ่งไม่เคยเปลี่ยน
  static final List<String> _thaiFallback = [GoogleFonts.notoSansThai().fontFamily!];

  static TextStyle num({double size = 14, FontWeight weight = FontWeight.w700, Color? color}) {
    final c = color ?? pInk;
    return _numCache.putIfAbsent(
      (size, weight, c.toARGB32()),
      () =>
          GoogleFonts.nunito(fontSize: size, fontWeight: weight, color: c).copyWith(fontFamilyFallback: _thaiFallback),
    );
  }

  /// glow ใช้ accent ปัจจุบัน (page) — จอกล้องก็เรียกได้ (สีตามโหมด)
  static List<BoxShadow> glow([double alpha = 0.4, double blur = 28]) => [
    BoxShadow(
      color: pAccent.withValues(alpha: alpha),
      blurRadius: blur,
    ),
  ];

  // ===== gradient / bg =====
  /// gradient accent (สลับสีตามโหมด) — ปุ่มหลักทุกจอ
  static LinearGradient get cyanGradient =>
      LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [pAccent, pAccent2]);

  /// พื้นหลังจอกล้อง (มืดเสมอ)
  static BoxDecoration get screenBg => const BoxDecoration(gradient: _darkBg);

  /// พื้นหลังจอ page (สลับ)
  static BoxDecoration get pScreenBg => BoxDecoration(gradient: pBg);

  static BoxDecoration get inputBox => BoxDecoration(
    color: pField,
    borderRadius: BorderRadius.circular(15),
    border: Border.all(color: pLine),
  );

  /// ธีม Material — page palette (Scaffold/TextField/Dialog/Sheet สลับตามโหมด)
  static ThemeData get themeData {
    final base = ThemeData(brightness: isDark ? Brightness.dark : Brightness.light, useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: pCard,
      canvasColor: pCard,
      colorScheme: base.colorScheme.copyWith(
        primary: pAccent,
        secondary: pAccent,
        surface: pSheet,
        onSurface: pInk,
        error: pBad,
      ),
      textTheme: GoogleFonts.notoSansThaiTextTheme(base.textTheme).apply(bodyColor: pInk, displayColor: pInk),
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: pAccent,
        selectionColor: pAccent.withValues(alpha: 0.3),
        selectionHandleColor: pAccent,
      ),
      bottomSheetTheme: BottomSheetThemeData(backgroundColor: pSheet),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: pField,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        hintStyle: GoogleFonts.notoSansThai(color: pDim, fontSize: 14),
        labelStyle: GoogleFonts.notoSansThai(color: pMuted, fontSize: 13.5),
        floatingLabelStyle: GoogleFonts.notoSansThai(color: pAccent, fontSize: 13.5),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: pLine),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: pLine),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: pAccent, width: 1.6),
        ),
      ),
    );
  }
}

/// ปุ่มหลัก accent gradient (สลับสีตามโหมด) — ใช้ซ้ำทุกจอ
class NexusButton extends StatelessWidget {
  const NexusButton({super.key, required this.label, required this.onTap, this.enabled = true, this.glow = true});
  final String label;
  final VoidCallback? onTap;
  final bool enabled;
  final bool glow;

  @override
  Widget build(BuildContext context) {
    if (!enabled) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Nexus.pPanel,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Nexus.pLine),
        ),
        child: Text(
          label,
          style: Nexus.tech(size: 15, weight: FontWeight.w700, color: Nexus.pFaint),
        ),
      );
    }
    return Tappable(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          gradient: Nexus.cyanGradient,
          borderRadius: BorderRadius.circular(16),
          boxShadow: glow ? Nexus.glow(0.4) : null,
        ),
        child: Text(
          label,
          style: Nexus.tech(size: 15, weight: FontWeight.w700, color: Nexus.pOn),
        ),
      ),
    );
  }
}
