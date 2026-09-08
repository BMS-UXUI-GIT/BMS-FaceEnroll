import 'package:flutter/material.dart';

import '../attendance_row.dart';
import '../dash_theme.dart';

/// ป้ายกลมเล็กมีข้อความ — ชิปเวร ชิป "วันนี้" ชิป "ปกติ" ในตารางรายวัน
class Pill extends StatelessWidget {
  const Pill(
    this.label, {
    super.key,
    required this.bg,
    this.fg = Colors.white,
    this.dense = false,
  });

  final String label;
  final Color bg;
  final Color fg;

  /// แบบแน่น — ในแถวตารางรายวันที่ที่แคบกว่า
  final bool dense;

  @override
  Widget build(BuildContext context) => Container(
    padding: dense
        ? const EdgeInsets.symmetric(horizontal: 8, vertical: 4)
        : const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(100),
    ),
    child: Text(
      label,
      style: Dash.body(
        size: dense ? 10 : 10.5,
        weight: dense ? FontWeight.w700 : FontWeight.w600,
        color: fg,
      ),
    ),
  );
}

/// ชิปเวรบนการ์ด — ใช้สีตามเวรแบบเดียวกับเว็บ (เดาเวรจากเวลาที่ให้มา)
class ShiftPill extends StatelessWidget {
  const ShiftPill(this.hhmm, {super.key});

  final String hhmm;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = shiftChipColors(hhmm);
    return Pill(shiftName(hhmm), bg: bg, fg: fg);
  }
}
