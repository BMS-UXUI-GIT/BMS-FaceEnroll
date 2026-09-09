import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../utils/thai_date.dart';
import '../dash_theme.dart';
import '../dashboard_controller.dart';
import 'dash_buttons.dart';

/// ย้อนหลังได้แค่ไหนในตัวเลือกแบบเลื่อน — เท่าที่ข้อมูลลงเวลามีจริง
const int _monthsBack = 24;
const int _yearsBack = 5;

/// เลือกเดือน (หรือปี ตอนดูรายปี) แบบเลื่อน — เปิดจากปุ่มเดือนบนหัวแผงน้ำเงิน
void showMonthPickerSheet(DashboardController controller) {
  final now = DateTime.now();
  final isYear = controller.scopeIsYear;
  final cur = controller.month.value;
  // เรียงเก่า→ใหม่ ให้เลื่อนลงคือเข้าใกล้ปัจจุบัน ตรงกับสัญชาตญาณปฏิทิน
  final items = <DateTime>[
    for (var i = isYear ? _yearsBack : _monthsBack; i >= 0; i--)
      isYear
          ? DateTime(now.year - i, cur.month)
          : DateTime(now.year, now.month - i),
  ];
  var picked = items.indexWhere(
    (d) => isYear
        ? d.year == cur.year
        : (d.year == cur.year && d.month == cur.month),
  );
  // เดือนที่ดูอยู่เก่ากว่าช่วงที่ให้เลือก — เริ่มที่ตัวเก่าสุด
  if (picked < 0) picked = 0;
  final wheel = FixedExtentScrollController(initialItem: picked);
  final rowH = Dash.box(44);

  Get.bottomSheet<void>(
    Container(
      decoration: BoxDecoration(
        color: Dash.card,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      child: StatefulBuilder(
        builder: (context, setSheet) => Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Dash.faint,
                borderRadius: BorderRadius.circular(100),
              ),
            ),
            Text(
              isYear ? 'เลือกปี' : 'เลือกเดือน',
              style: Dash.tech(size: 14, color: Dash.ink),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: rowH * 5,
              child: Stack(
                children: [
                  // แถบไฮไลต์วางไว้ใต้ล้อ ไม่งั้นทับตัวอักษรที่เลือกอยู่
                  Center(
                    child: Container(
                      height: rowH,
                      decoration: BoxDecoration(
                        color: Dash.wash,
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  ListWheelScrollView.useDelegate(
                    controller: wheel,
                    itemExtent: rowH,
                    // แบนไว้ — โค้งมากแล้วบรรทัดบนสุดบี้จนอ่านไม่ออก
                    diameterRatio: 2.4,
                    perspective: 0.002,
                    physics: const FixedExtentScrollPhysics(),
                    onSelectedItemChanged: (i) => setSheet(() => picked = i),
                    childDelegate: ListWheelChildBuilderDelegate(
                      childCount: items.length,
                      builder: (context, i) {
                        final d = items[i];
                        final on = i == picked;
                        return Center(
                          child: Text(
                            isYear
                                ? 'ปี ${d.year + 543}'
                                : thaiMonthYear(d.year, d.month),
                            style: Dash.tech(
                              size: on ? 16 : 15,
                              weight: on ? FontWeight.w700 : FontWeight.w500,
                              color: on ? Dash.accentActive : Dash.muted,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: DashPillButton(
                label: 'เลือก',
                height: 48,
                radius: 16,
                onTap: () {
                  Get.back<void>();
                  controller.setMonth(items[picked]);
                },
              ),
            ),
          ],
        ),
      ),
    ),
    isScrollControlled: true,
  ).whenComplete(wheel.dispose);
}
