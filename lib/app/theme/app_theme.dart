import 'package:flutter/material.dart';

/// ระบบดีไซน์กลาง — โมเดิร์น/มินิมอล แนวสุขภาพ (calm teal + neutral, มินิมอล)
/// คุมสี/ตัวอักษร/ระยะ/คอมโพเนนต์ที่เดียว -> ทุกจอหน้าตาเป็นชุดเดียวกัน
class AppTheme {
  AppTheme._();

  // ---- palette ----
  static const Color brand = Color(0xFF0E9384); // primary (calm teal)
  static const Color ink = Color(0xFF0F172A); // หัวข้อ/ตัวหนัก
  static const Color muted = Color(0xFF64748B); // ข้อความรอง
  static const Color bg = Color(0xFFF6F8FA); // พื้นหลัง
  static const Color surface = Colors.white; // การ์ด
  static const Color border = Color(0xFFE6EAF0);

  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFDC2626);

  // ---- spacing (8pt) ----
  static const double s1 = 4, s2 = 8, s3 = 12, s4 = 16, s5 = 20, s6 = 24, s8 = 32;
  // ---- radius ----
  static const double rSm = 12, rMd = 16, rLg = 20, rXl = 28;

  static ThemeData get light {
    final cs = ColorScheme.fromSeed(seedColor: brand, brightness: Brightness.light).copyWith(
      primary: brand,
      surface: surface,
      onSurface: ink,
      onSurfaceVariant: muted,
      outlineVariant: border,
      error: danger,
    );

    const text = TextTheme(
      headlineSmall: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: ink, height: 1.25),
      titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: ink),
      titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: ink),
      bodyLarge: TextStyle(fontSize: 16, color: ink, height: 1.5),
      bodyMedium: TextStyle(fontSize: 14, color: muted, height: 1.5),
      labelLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: cs,
      scaffoldBackgroundColor: bg,
      textTheme: text,
      appBarTheme: const AppBarTheme(
        backgroundColor: bg,
        foregroundColor: ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: ink),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(rLg),
          side: const BorderSide(color: border),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: bg,
        contentPadding: const EdgeInsets.symmetric(horizontal: s4, vertical: s4),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(rMd),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(rMd),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(rMd),
          borderSide: const BorderSide(color: brand, width: 2),
        ),
        labelStyle: const TextStyle(color: muted),
        floatingLabelStyle: const TextStyle(color: brand, fontWeight: FontWeight.w600),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(56),
          backgroundColor: brand,
          foregroundColor: Colors.white,
          textStyle: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(rMd)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(54),
          foregroundColor: ink,
          side: const BorderSide(color: border),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(rMd)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: brand,
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: bg,
        selectedColor: brand.withValues(alpha: 0.14),
        side: const BorderSide(color: border),
        labelStyle: const TextStyle(fontWeight: FontWeight.w600, color: ink),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        padding: const EdgeInsets.symmetric(horizontal: s3, vertical: s2),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((st) => st.contains(WidgetState.selected) ? Colors.white : null),
        trackColor: WidgetStateProperty.resolveWith((st) => st.contains(WidgetState.selected) ? brand : null),
      ),
      sliderTheme: const SliderThemeData(activeTrackColor: brand, thumbColor: brand),
      dividerTheme: const DividerThemeData(color: border, thickness: 1, space: 1),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(rXl))),
      ),
    );
  }
}
