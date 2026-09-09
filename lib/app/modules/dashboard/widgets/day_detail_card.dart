import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../routes/app_pages.dart';
import '../../../utils/thai_date.dart';
import '../../../widgets/tappable.dart';
import '../attendance_row.dart';
import '../dash_theme.dart';
import '../dashboard_controller.dart';
import '../fix_request_view.dart';

/// บรรทัดใต้แถบวัน — บอกว่าวันที่แตะมีเวรอะไร เวลาเท่าไหร่ ผิดตรงไหน
/// วันไหนมีเวรที่ต้องแก้ กดที่การ์ดตรงไหนก็เข้าฟอร์มได้ ไม่ต้องเล็งบรรทัด
class DayDetailCard extends StatelessWidget {
  const DayDetailCard({super.key, required this.dayKey, required this.shifts});

  /// วันที่เลือกอยู่ในรูปแบบ yyyy-MM-dd — ว่าง = ยังไม่ได้แตะวันไหน
  final String dayKey;
  final Map<String, List<Map<String, dynamic>>> shifts;

  @override
  Widget build(BuildContext context) {
    final list = dayKey.isEmpty
        ? const <Map<String, dynamic>>[]
        : (shifts[dayKey] ?? const []);
    if (list.isEmpty) return const _DayDetailHint();
    final d = DateTime.parse(dayKey);
    // (วันควบเวรที่ต้องแก้ทั้งคู่ ให้เข้าเวรแรกก่อน — ส่งเสร็จค่อยกลับมากดอีกที)
    final fixable = list.where(rowNeedsFix).toList();
    return Tappable(
      onTap: fixable.isEmpty ? null : () => openFixForm(fixable.first),
      borderRadius: BorderRadius.circular(12),
      splash: Dash.accent,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Dash.rowBg,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${d.day} ${thaiMonthShort(d.month)} ${(d.year + 543) % 100}',
                    style: Dash.tech(
                      size: 12.5,
                      weight: FontWeight.w700,
                      color: Dash.ink,
                    ),
                  ),
                ),
                // มุมขวาบนบอกว่ากดการ์ดนี้แล้วไปยื่นคำขอแก้ไขได้
                if (fixable.isNotEmpty) ...[
                  Text(
                    'แก้ไข',
                    style: Dash.body(
                      size: 11.5,
                      weight: FontWeight.w700,
                      color: Dash.accentActive,
                    ),
                  ),
                  Icon(
                    PhosphorIconsBold.caretRight,
                    size: Dash.sp(11),
                    color: Dash.accentActive,
                  ),
                ],
              ],
            ),
            for (final r in list) ...[
              const SizedBox(height: 6),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    margin: const EdgeInsets.only(top: 5, right: 8),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: dayMarkColor(DashboardController.markOf(r)),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      shiftSummaryLine(r),
                      style: Dash.body(size: 11.5, color: Dash.sub),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// ยังไม่ได้แตะวันไหน (หรือวันนั้นไม่มีเวร) — บอกวิธีใช้แทนที่จะปล่อยว่าง
class _DayDetailHint extends StatelessWidget {
  const _DayDetailHint();

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.symmetric(vertical: 10),
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: Dash.rowBg,
      borderRadius: BorderRadius.circular(12),
    ),
    child: Text(
      'แตะวันที่มีเวรเพื่อดูรายละเอียด',
      style: Dash.body(size: 11.5, color: Dash.muted),
    ),
  );
}

/// เปิดฟอร์มขอแก้ไขของวันนั้นตรง ๆ — ส่งแล้วจำไว้ว่าวันนี้ยื่นไปแล้ว
/// ให้หน้ารายการเปิดมาเห็นอยู่ในแท็บ "ส่งแล้ว" ตรงกัน
Future<void> openFixForm(Map<String, dynamic> r) async {
  final ok = await Get.toNamed<Object?>(Routes.fixRequestForm, arguments: r);
  if (ok == true) FixRequestView.sentDates.add('${r['date']}');
}

/// สรุปหนึ่งเวรเป็นบรรทัดเดียว: ชื่อเวร · ช่วงเวลา · สิ่งที่ผิดปกติ
String shiftSummaryLine(Map<String, dynamic> r) {
  final inT = '${r['in'] ?? ''}';
  final outT = '${r['out'] ?? ''}';
  final why = [
    if (r['late'] == true) 'เข้าสาย',
    if (r['early'] == true) 'ออกก่อนเวลา',
    if (r['no_out'] == true) 'ไม่มีเวลาออก',
    if (r['out_area'] == true) 'สแกนนอกพื้นที่',
  ];
  final name = inT.isEmpty ? 'เวร' : shiftName(inT);
  final time = '$inT ถึง ${outT.isEmpty ? '--:--' : outT}';
  return why.isEmpty ? '$name · $time' : '$name · $time · ${why.join(' · ')}';
}
