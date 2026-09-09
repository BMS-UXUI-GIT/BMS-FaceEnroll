import 'package:flutter/material.dart';

import '../../../utils/thai_date.dart';
import '../../../widgets/tappable.dart';
import '../attendance_row.dart';
import '../dash_theme.dart';
import 'fix_list_header.dart';
import 'web_badges.dart';

/// แถวรายการขอแก้ไข 3 คอลัมน์: วันที่+ผ่านมานานแค่ไหน · เวลาที่บันทึก+เวร · ป้ายสาเหตุ
/// คั่นด้วยเส้น ไม่ใช่การ์ดแยกใบ ตาจะได้ไล่คอลัมน์ลงมาได้รวดเดียว
class FixRequestRow extends StatelessWidget {
  const FixRequestRow({super.key, required this.row, required this.onTap});

  final Map<String, dynamic> row;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final inT = '${row['in'] ?? ''}';
    final outT = '${row['out'] ?? ''}';
    return Tappable(
      onTap: onTap,
      splash: Dash.accent,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: Dash.hairline)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // คอลัมน์ 1: วันที่ + วัน
            SizedBox(
              width: kFixColDateW,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    thaiShortDate('${row['date']}'),
                    style: Dash.tech(
                      size: 15,
                      weight: FontWeight.w700,
                      color: Dash.ink,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    relativeDayLabel('${row['date']}'),
                    style: Dash.body(size: 12, color: Dash.muted),
                  ),
                ],
              ),
            ),
            // คอลัมน์ 2: เวลาที่บันทึก + เวร
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // บรรทัดเดียวเสมอ — จอแคบให้ย่อฟอนต์ ไม่ตัดขึ้นบรรทัดใหม่
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(
                      '${inT.isEmpty ? '--:--' : inT} ถึง ${outT.isEmpty ? '--:--' : outT} น.',
                      maxLines: 1,
                      style: Dash.tech(
                        size: 14,
                        weight: FontWeight.w700,
                        color: Dash.sub,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  // ไม่มีเวลาเข้าก็ยังบอกเวรได้ — เดาจากเวลาออก
                  WebShiftBadge(shiftAnchor(row)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // คอลัมน์ 3: ป้ายสาเหตุอย่างเดียว — สถานะ "ส่งแล้ว" บอกด้วยแท็บที่เปิดอยู่แล้ว
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                // ป้ายเดียวกับเว็บ — แถวที่ขาดหลายอย่างซ้อนหลายป้าย
                for (final (i, b) in problemBadgesOf(row).indexed) ...[
                  if (i > 0) const SizedBox(height: 4),
                  b,
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// บรรทัดใต้วันที่ — บอกว่านานแค่ไหนแล้ว สำคัญกว่าชื่อวัน
/// เพราะคำขอค้างยิ่งนานยิ่งต้องรีบส่ง
///
/// ไล่หยาบขึ้นตามระยะ: วัน → สัปดาห์ → เดือน → ปี
/// "45 วันที่แล้ว" ไม่ได้บอกอะไรมากกว่า "เดือนที่แล้ว" แต่ต้องอ่านนานกว่า
/// (ข้อมูลเดโมมีวันในอนาคตด้วย จึงรองรับสองทาง)
String relativeDayLabel(String ymd) {
  final d = DateTime.tryParse(ymd);
  if (d == null) return '';
  final now = DateTime.now();
  final days = DateTime(
    d.year,
    d.month,
    d.day,
  ).difference(DateTime(now.year, now.month, now.day)).inDays;
  if (days == 0) return 'วันนี้';
  if (days == -1) return 'เมื่อวาน';
  if (days == 1) return 'พรุ่งนี้';
  final past = days < 0;
  final n = days.abs();
  final (unit, count) = switch (n) {
    < 7 => ('วัน', n),
    < 30 => ('สัปดาห์', n ~/ 7),
    // ตัดที่ 11 เดือน — 12 เดือนที่แล้วต้องอ่านว่า "ปีที่แล้ว"
    < 330 => ('เดือน', n ~/ 30),
    _ => ('ปี', n ~/ 365),
  };
  // "1 สัปดาห์ที่แล้ว" อ่านแข็ง — หน่วยละหนึ่งพูดว่า "สัปดาห์ที่แล้ว" เฉย ๆ
  final head = count == 1 && unit != 'วัน' ? unit : '$count $unit';
  return past ? '$headที่แล้ว' : 'อีก $count $unit';
}
