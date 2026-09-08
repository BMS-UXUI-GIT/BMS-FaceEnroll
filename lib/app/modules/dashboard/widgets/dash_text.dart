import 'package:flutter/material.dart';

import '../dash_theme.dart';

/// หัวข้อย่อยของฟอร์ม/หน้าตรวจสอบ — "เวร" "สาเหตุ" "เปรียบเทียบ"
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    // medium — หัวข้อบอกกลุ่มเฉย ๆ ไม่ต้องหนักเท่าค่าในช่อง
    style: Dash.tech(size: 13.5, weight: FontWeight.w500, color: Dash.ink),
  );
}

/// หัวคอลัมน์ตาราง — ตัวเล็ก เทา เว้นตัวอักษรนิดหน่อย ใช้ทั้งตารางรายวัน รายการขอแก้ และตารางเทียบ
class TableHeadCell extends StatelessWidget {
  const TableHeadCell(this.text, {super.key, this.end = false});

  final String text;

  /// ชิดขวา — คอลัมน์ท้ายสุด
  final bool end;

  @override
  Widget build(BuildContext context) => Text(
    text,
    textAlign: end ? TextAlign.right : TextAlign.left,
    style: Dash.tech(
      size: 10.5,
      weight: FontWeight.w600,
      color: Dash.muted,
      spacing: 0.3,
    ),
  );
}

/// เส้นคั่นบาง 1px สี hairline
class Hairline extends StatelessWidget {
  const Hairline({super.key});

  @override
  Widget build(BuildContext context) =>
      SizedBox(height: 1, child: ColoredBox(color: Dash.hairline));
}
