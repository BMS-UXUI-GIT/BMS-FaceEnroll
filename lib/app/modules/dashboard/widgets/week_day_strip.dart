import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../widgets/tappable.dart';
import '../attendance_row.dart';
import '../dash_theme.dart';
import '../dashboard_controller.dart';
import 'chart_appear.dart';
import 'day_detail_card.dart';
import 'split_painters.dart';

/// 7 วันของสัปดาห์เป็นวงกลมสถานะ — สีมาจากเวรที่แย่ที่สุดของวันนั้น
/// วันที่มีสองเวรผ่าครึ่งทแยง · แตะแล้วเห็นรายละเอียดใต้แถบ
/// รายสัปดาห์แค่ 7 วัน ไล่ดูทีละวงได้ — ตอบ "วันไหนมีปัญหา" ทันทีโดยไม่ต้องแตะทีละแท่ง
class WeekDayStrip extends StatelessWidget {
  const WeekDayStrip({super.key, required this.controller});

  final DashboardController controller;

  @override
  Widget build(BuildContext context) => Obx(() {
    final mon = controller.weekMonday;
    final map = controller.dayShifts;
    final sel = controller.touchedDay.value;
    final today = DashboardController.ymd(DateTime.now());
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // จุดวันไล่โผล่ซ้าย→ขวา ตามลำดับวันในสัปดาห์
        ChartAppear(
          trigger: DashboardController.ymd(mon),
          builder: (context, t) => Row(
            children: [
              for (var i = 0; i < 7; i++)
                Expanded(
                  child: PopIn(
                    t: appearAt(t, i, 7),
                    child: DayDot(
                      controller: controller,
                      date: mon.add(Duration(days: i)),
                      weekday: DashboardController.weekdayNames[i],
                      shifts: map,
                      selected: sel,
                      today: today,
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        DayDetailSwitcher(dayKey: sel, shifts: map),
      ],
    );
  });
}

/// วงกลมหนึ่งวันในแถบรายสัปดาห์
class DayDot extends StatelessWidget {
  const DayDot({
    super.key,
    required this.controller,
    required this.date,
    required this.weekday,
    required this.shifts,
    required this.selected,
    required this.today,
  });

  final DashboardController controller;
  final DateTime date;
  final String weekday;
  final Map<String, List<Map<String, dynamic>>> shifts;
  final String selected;
  final String today;

  @override
  Widget build(BuildContext context) => Obx(() {
    final key = DashboardController.ymd(date);
    final rows = shifts[key] ?? const <Map<String, dynamic>>[];
    final isToday = key == today;
    final on = key == selected;
    final size = Dash.box(38);
    // สำเนาออกมาเป็น Set ธรรมดา — การอ่านค่าจริงคือสิ่งที่บอก Obx ว่าต้องฟังตัวนี้
    final hidden = {...controller.hiddenSeries};
    // เวรของวันนั้นที่ยังไม่ถูกปิดจาก legend (อ่าน Rx ตรงนี้ = วาดใหม่เมื่อกดชิป)
    final marks = [
      for (final r in rows)
        if (!hidden.contains(seriesOf(DashboardController.markOf(r))))
          DashboardController.markOf(r),
    ];
    // ปิด "ไม่มีเวร" จาก legend = ไม่ต้องวาดวงเทาของวันที่ไม่มีเวรเลย
    final blank = hidden.contains(Series.none);
    return Tappable(
      onTap: rows.isEmpty
          ? null
          : () => controller.touchedDay.value = on ? '' : key,
      borderRadius: BorderRadius.circular(12),
      splash: Dash.accent,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              weekday,
              style: Dash.body(
                size: 10.5,
                color: isToday ? Dash.accent : Dash.muted,
              ),
            ),
            const SizedBox(height: 6),
            SizedBox(
              width: size,
              height: size,
              child: Container(
                width: size,
                height: size,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: marks.isEmpty
                      ? (blank ? Colors.transparent : Dash.rowBg)
                      : null,
                  // วงเลือก/วันนี้เป็นขอบ ไม่ใช่สี — สีในวงถูกใช้บอกสถานะไปแล้ว
                  border: on || isToday
                      ? Border.all(
                          color: on ? Dash.accentActive : Dash.accent,
                          width: on ? 2.5 : 1.5,
                        )
                      : null,
                ),
                child: marks.isEmpty
                    ? null
                    : CustomPaint(
                        size: Size.square(size - (on ? 7 : 4)),
                        painter: SplitDot(
                          dayMarkColor(marks.first),
                          dayMarkColor(marks.last),
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${date.day}',
              style: Dash.num(
                size: 12,
                weight: FontWeight.w700,
                color: isToday ? Dash.accentActive : Dash.sub,
              ),
            ),
          ],
        ),
      ),
    );
  });
}

/// กล่องรายละเอียดใต้แถบวัน — สูงไม่เท่ากันตามจำนวนเวร
/// ยืด/หดให้ลื่น และครอสเฟดตัวเก่า-ใหม่ตรงที่เดิม ไม่ให้ตัวเก่าดันความสูงระหว่างเปลี่ยน
class DayDetailSwitcher extends StatelessWidget {
  const DayDetailSwitcher({
    super.key,
    required this.dayKey,
    required this.shifts,
  });

  final String dayKey;
  final Map<String, List<Map<String, dynamic>>> shifts;

  @override
  Widget build(BuildContext context) => AnimatedSize(
    duration: const Duration(milliseconds: 220),
    curve: Curves.easeOutCubic,
    alignment: Alignment.topCenter,
    child: AnimatedSwitcher(
      duration: const Duration(milliseconds: 180),
      layoutBuilder: (cur, prev) => Stack(
        alignment: Alignment.topCenter,
        children: [...prev, if (cur != null) cur],
      ),
      child: KeyedSubtree(
        key: ValueKey(dayKey),
        child: DayDetailCard(dayKey: dayKey, shifts: shifts),
      ),
    ),
  );
}
