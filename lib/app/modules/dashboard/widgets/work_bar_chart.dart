import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../dash_theme.dart';
import '../dashboard_controller.dart';
import 'chart_appear.dart';

/// แท่งแนวตั้ง = ชั่วโมงทำงานของวัน/เดือนนั้น
/// อ่านได้ทันทีว่า "ช่วงไหนทำงานสั้น/ยาวผิดปกติ" ซึ่งดูจากตัวเลขอย่างเดียวไม่เห็น
/// เดือน/ปีข้อมูลเยอะเกินกว่าจะไล่ทีละวง จึงยังเป็นกราฟแท่ง (สัปดาห์ใช้วงกลมรายวันแทน)
class WorkBarChart extends StatelessWidget {
  const WorkBarChart({
    super.key,
    required this.controller,
    required this.buckets,
    required this.maxMinutes,
    required this.current,
    required this.byDay,
  });

  final DashboardController controller;
  final List<Bucket> buckets;

  /// นาทีของแท่งที่สูงที่สุดในชุด — ใช้ตั้งเพดานสเกล
  final int maxMinutes;

  /// ดัชนีของแท่งที่เป็นช่วงปัจจุบัน (ป้ายใต้แท่งเป็นสีฟ้า)
  final int? current;

  /// แท่ง = วัน (ไม่ใช่สัปดาห์/เดือน) — เปลี่ยนหน่วยนับใน tooltip และเพดานสเกล
  final bool byDay;

  /// เพดานขั้นต่ำของสเกล — วันที่ทำงานน้อยจะได้ไม่ถูกดันจนเต็มกราฟ
  static const double _target = 8;

  @override
  Widget build(BuildContext context) {
    // ต้องอ่าน Rx ตรงนี้ ไม่ใช่ใน LayoutBuilder ด้านล่าง — builder ของ LayoutBuilder ทำงานตอน layout
    // ซึ่งอยู่นอก closure ของ Obx แล้ว GetX จึงไม่เห็นว่าใครพึ่งค่าไหน กด legend/แท่งแล้วกราฟไม่ขยับ
    final hidden = {...controller.hiddenSeries};
    final touched = controller.touchedBar.value;
    final maxH = maxMinutes / 60;
    // เผื่อที่ให้ป้ายค่าลอยเหนือแท่ง
    final top = (byDay ? (maxH < _target ? _target : maxH) : maxH) * 1.18;
    // แท่งเยอะเกินกว่าจะใส่ป้ายครบ — เว้นระยะให้อ่านออก
    final step = buckets.length > 20 ? 5 : 1;

    return LayoutBuilder(
      builder: (context, box) {
        // ความกว้างแท่งตามพื้นที่จริง — เดิมตายตัว 16 ทำให้กราฟ 5 แท่งดูผอมเก้อ
        final barW = (box.maxWidth / buckets.length * 0.6).clamp(5.0, 30.0);
        return SizedBox(
          height: Dash.sp(160),
          // แท่งไล่งอกจากพื้นทีละแท่ง ซ้าย→ขวา ทุกครั้งที่เปลี่ยนชุดข้อมูล
          child: ChartAppear(
            trigger: '${controller.month.value.year}|${buckets.length}|$byDay',
            builder: (context, t) => BarChart(
              BarChartData(
                maxY: top,
                minY: 0,
                // spaceBetween — แท่งแรก/สุดท้ายชิดขอบกราฟพอดี ไม่เหลือช่องว่างหัวท้าย
                alignment: BarChartAlignment.spaceBetween,
                borderData: FlBorderData(show: false),
                gridData: const FlGridData(show: false),
                titlesData: FlTitlesData(
                  leftTitles: const AxisTitles(),
                  rightTitles: const AxisTitles(),
                  topTitles: const AxisTitles(),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 24,
                      getTitlesWidget: (value, meta) {
                        final i = value.toInt();
                        if (i < 0 || i >= buckets.length) {
                          return const SizedBox.shrink();
                        }
                        if (step > 1 && i % step != 0) {
                          return const SizedBox.shrink();
                        }
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: SizedBox(
                            width: box.maxWidth / buckets.length - 2,
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                buckets[i].label,
                                maxLines: 1,
                                softWrap: false,
                                style: Dash.body(
                                  size: 10,
                                  color: i == current
                                      ? Dash.accent
                                      : Dash.muted,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                barTouchData: BarTouchData(
                  // จัดการเองเพื่อให้ tooltip ค้างจนกดที่อื่น — ของ built-in หายทันทีที่ปล่อยนิ้ว
                  handleBuiltInTouches: false,
                  touchCallback: (event, resp) {
                    if (event is! FlTapUpEvent) return;
                    final i = resp?.spot?.touchedBarGroupIndex ?? -1;
                    controller.touchedBar.value =
                        controller.touchedBar.value == i ? -1 : i;
                  },
                  touchTooltipData: BarTouchTooltipData(
                    getTooltipColor: (_) => Dash.ink,
                    fitInsideHorizontally: true,
                    fitInsideVertically: true,
                    maxContentWidth: 200,
                    tooltipBorderRadius: BorderRadius.circular(12),
                    tooltipPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    tooltipMargin: 8,
                    // สลับช่วงแล้ว fl_chart ยัง tween จากชุดเดิมอยู่ — groupIndex อาจเกินความยาว list ชุดใหม่
                    getTooltipItem: (group, groupIndex, rod, rodIndex) =>
                        groupIndex < 0 || groupIndex >= buckets.length
                        ? null
                        : _tooltip(buckets[groupIndex], byDay, hidden),
                  ),
                ),
                barGroups: [
                  for (var i = 0; i < buckets.length; i++)
                    _group(
                      i,
                      buckets[i],
                      top,
                      barW,
                      hidden,
                      touched,
                      current: i == current,
                      grow: Curves.easeOutCubic.transform(
                        appearAt(t, i, buckets.length),
                      ),
                    ),
                ],
              ),
              // ไม่ให้ fl_chart tween ซ้อนกับการไล่โผล่ของเราเอง — คุมความสูงเองทั้งหมด
              duration: Duration.zero,
            ),
          ),
        );
      },
    );
  }

  /// แท่งเดียวซ้อนหลายสี: ตรงเวลา → สาย · ลืมออกเวรไม่มีชั่วโมงจึงใส่ขีดแดงเตี้ยๆ ให้วันนั้นไม่หายไป
  BarChartGroupData _group(
    int i,
    Bucket b,
    double top,
    double barW,
    Set<Series> hidden,
    int touched, {
    bool current = false,
    double grow = 1,
  }) {
    // เวรที่ยังไม่เลิกงานไม่ใช่ความผิดปกติ — ขีดจางแทนแดง
    final open = b.openShifts > 0 && b.noOut == 0;
    // สีทึบเต็มเท่าแถบสัดส่วนด้านบน — เดิมแท่งที่ไม่ใช่ช่วงปัจจุบันถูกลด alpha 0.85
    // ทำให้เขียว/ส้มดูคนละเฉดกับ legend และการ์ดสรุปทั้งที่เป็นสีเดียวกัน
    const a = 1.0;

    // ชั้นที่ถูกปิดจาก legend ต้องหายไปจริง — สแต็กจึงต้องคำนวณ offset ใหม่ ไม่ใช่แค่ทำให้ใส
    // สีชุดเดียวกับชิป legend ทุกแท็บ — แท่งเดียวบอกได้ว่าชั่วโมงมาจากเวรแบบไหน
    final parts = <(double, Color)>[
      if (!hidden.contains(Series.ok))
        (b.minutesOk / 60, Dash.ok.withValues(alpha: a)),
      if (!hidden.contains(Series.late))
        (b.minutesLate / 60, Dash.warn.withValues(alpha: a)),
      if (!hidden.contains(Series.early))
        (b.minutesEarly / 60, Dash.info.withValues(alpha: a)),
      if (!hidden.contains(Series.bad))
        (b.minutesBad / 60, Dash.bad.withValues(alpha: a)),
      // มีเวรแต่ไม่มีชั่วโมง (ลืมออก / ยังไม่เลิกงาน) — ขีดเตี้ย ๆ ไม่ให้เดือนนั้นหายไปเลย
      if (b.minutes == 0 &&
          b.shifts > 0 &&
          !hidden.contains(open ? Series.none : Series.bad))
        (top * 0.04, (open ? Dash.faint : Dash.bad).withValues(alpha: a)),
    ];
    final stack = <BarChartRodStackItem>[];
    var acc = 0.0;
    for (final (v, c) in parts) {
      if (v <= 0) continue;
      // คูณด้วยความคืบหน้าของแท่งนี้ — สัดส่วนของแต่ละสีคงเดิม แค่เตี้ยลงตอนกำลังงอก
      final h = v * grow;
      stack.add(BarChartRodStackItem(acc, acc + h, c));
      acc += h;
    }

    return BarChartGroupData(
      x: i,
      showingTooltipIndicators: touched == i ? [0] : const [],
      barRods: [
        BarChartRodData(
          toY: acc,
          width: barW,
          // แท่งกว้างขึ้นแล้ว มุม 100 กลายเป็นครึ่งวงกลมเต็มหัว — ตรึงไว้ที่ 6
          borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
          rodStackItems: stack,
          color: Dash.ok,
          // รางพื้นหลัง = สเกล ต้องจางจริง — withValues(alpha:) แทนที่ค่า alpha เดิม ไม่ได้คูณ
          backDrawRodData: BackgroundBarChartRodData(
            show: true,
            toY: top,
            color: Dash.dark
                ? Colors.white.withValues(alpha: 0.06)
                : Colors.black.withValues(alpha: 0.05),
          ),
        ),
      ],
    );
  }

  /// สรุปของแท่งที่แตะ — หัวข้อ + ชั่วโมง + สิ่งที่ผิดปกติ
  /// แท่ง = วัน จะนับเป็น "ครั้ง" (วันเดียวลงได้หลายเวร) · แท่ง = สัปดาห์/เดือน นับเป็น "วัน"
  BarTooltipItem _tooltip(Bucket b, bool byDay, Set<Series> hidden) {
    final head = Dash.num(
      size: 12.5,
      weight: FontWeight.w800,
      color: Colors.white,
    );
    final line = Dash.body(
      size: 11.5,
      color: Colors.white.withValues(alpha: 0.85),
    );
    final unit = byDay ? 'ครั้ง' : 'วัน';
    final late = byDay ? b.late : b.lateDays;
    final early = byDay ? b.early : b.earlyDays;
    final noOut = byDay ? b.noOut : b.noOutDays;
    final rows = <String>[
      if (b.shifts == 0)
        'ไม่มีการลงเวลา'
      else ...[
        _hShort(_visibleMinutes(b, hidden)),
        if (!byDay) 'มาทำงาน ${b.days} วัน',
        if (byDay && b.shifts > 1) '${b.shifts} เวร',
        if (late > 0) 'เข้าสาย $late $unit',
        if (early > 0) 'ออกก่อน $early $unit',
        if (noOut > 0) 'ลืมออกเวร $noOut $unit',
        if (b.openShifts > 0) 'ยังไม่สแกนออก',
      ],
    ];
    return BarTooltipItem(
      b.label,
      head,
      textAlign: TextAlign.left,
      children: [for (final r in rows) TextSpan(text: '\n$r', style: line)],
    );
  }

  /// นาทีที่แท่งแสดงจริง — ชั้นที่ปิดจาก legend ไม่ถูกนับ ป้ายค่าจึงตรงกับความสูงแท่ง
  int _visibleMinutes(Bucket b, Set<Series> hidden) =>
      (hidden.contains(Series.ok) ? 0 : b.minutesOk) +
      (hidden.contains(Series.late) ? 0 : b.minutesLate) +
      (hidden.contains(Series.early) ? 0 : b.minutesEarly) +
      (hidden.contains(Series.bad) ? 0 : b.minutesBad);

  String _hShort(int minutes) {
    final h = minutes / 60;
    return h >= 10 ? '${h.round()} ชม.' : '${h.toStringAsFixed(1)} ชม.';
  }
}
