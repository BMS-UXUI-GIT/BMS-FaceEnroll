import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../widgets/tappable.dart';
import '../attendance_row.dart';
import '../dash_theme.dart';
import '../dashboard_controller.dart';
import 'chart_appear.dart';
import 'split_painters.dart';
import 'week_day_strip.dart';

/// ปฏิทินความเข้มรายเดือน — แถวละสัปดาห์ คอลัมน์ละวัน
/// สีบอกสถานะเหมือนแถบรายสัปดาห์ · ความเข้มบอกชั่วโมงทำงาน
/// กราฟแท่งรายสัปดาห์เดิมบอกได้แค่ยอดรวมของทั้งสัปดาห์ ไม่เห็นว่าวันไหนหนัก/วันไหนมีปัญหา
class MonthHeatmap extends StatelessWidget {
  const MonthHeatmap({super.key, required this.controller});

  final DashboardController controller;

  @override
  Widget build(BuildContext context) => Obx(() {
    final first = DateTime(
      controller.month.value.year,
      controller.month.value.month,
    );
    final last = DateTime(first.year, first.month + 1, 0);
    final start = first.subtract(Duration(days: first.weekday - 1));
    final weeks = ((last.difference(start).inDays + 1) / 7).ceil();
    final map = controller.dayShifts;
    final sel = controller.touchedDay.value;
    final today = DashboardController.ymd(DateTime.now());
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            for (final w in DashboardController.weekdayNames)
              Expanded(
                child: Center(
                  child: Text(w, style: Dash.body(size: 10, color: Dash.muted)),
                ),
              ),
          ],
        ),
        const SizedBox(height: 6),
        // ช่องปฏิทินไล่โผล่ทีละช่องตามลำดับวัน (ซ้าย→ขวา บน→ล่าง)
        ChartAppear(
          trigger: '${first.year}-${first.month}',
          builder: (context, t) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var r = 0; r < weeks; r++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      for (var c = 0; c < 7; c++)
                        Expanded(
                          child: PopIn(
                            t: appearAt(t, r * 7 + c, weeks * 7),
                            child: HeatCell(
                              controller: controller,
                              date: start.add(Duration(days: r * 7 + c)),
                              month: first.month,
                              shifts: map,
                              selected: sel,
                              today: today,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        const HeatScaleLegend(),
        const SizedBox(height: 12),
        DayDetailSwitcher(dayKey: sel, shifts: map),
      ],
    );
  });
}

/// คำอธิบายสองอย่างที่ปฏิทินใช้สื่อสารแต่ไม่เคยบอกไว้ที่ไหน
///
/// แถบ legend ท้ายการ์ดบอกได้แค่ว่าสีไหนคือสถานะอะไร แต่ปฏิทินเดือนเข้ารหัส
/// เพิ่มอีกสองชั้นที่คนดูเดาเองไม่ได้ — ความเข้มของสี กับช่องที่ถูกผ่าครึ่งทแยง
class HeatScaleLegend extends StatelessWidget {
  const HeatScaleLegend({super.key});

  /// สี่ขั้นที่ตรงกับสูตรไล่เฉดใน [HeatCell] (4 → 10 ชม.)
  static const List<double> _steps = [0, 0.33, 0.67, 1];

  @override
  Widget build(BuildContext context) {
    // ไล่เฉดด้วยสีเดียวกับ "ปกติ" เพราะเป็นสถานะที่คนเห็นบ่อยสุด
    Color shade(double t) =>
        Dash.ok.withValues(alpha: Dash.dark ? 0.14 + 0.20 * t : 0.3 + 0.7 * t);
    final cap = Dash.body(size: 10.5, color: Dash.muted);
    return Wrap(
      spacing: 14,
      runSpacing: 8,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('4 ชม.', style: cap),
            const SizedBox(width: 6),
            for (final t in _steps) ...[
              if (t != _steps.first) const SizedBox(width: 3),
              _Swatch(color: shade(t)),
            ],
            const SizedBox(width: 6),
            Text('10 ชม.', style: cap),
          ],
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ช่องตัวอย่างที่ผ่าครึ่งจริง ๆ ด้วยตัววาดเดียวกับในปฏิทิน
            _Swatch(
              painter: SplitBox(
                Dash.ok.withValues(alpha: Dash.dark ? 0.3 : 0.6),
                Dash.warn.withValues(alpha: Dash.dark ? 0.3 : 0.6),
              ),
            ),
            const SizedBox(width: 6),
            Text('วันที่มีสองเวรคนละสถานะ', style: cap),
          ],
        ),
      ],
    );
  }
}

/// ช่องสี่เหลี่ยมเล็กในคำอธิบาย — ขนาดเท่ากันทั้งแบบทึบและแบบผ่าครึ่ง
class _Swatch extends StatelessWidget {
  const _Swatch({this.color, this.painter});

  final Color? color;
  final CustomPainter? painter;

  @override
  Widget build(BuildContext context) {
    final size = Dash.box(12);
    return ClipRRect(
      borderRadius: BorderRadius.circular(3),
      child: SizedBox(
        width: size,
        height: size,
        child: painter != null
            ? CustomPaint(painter: painter)
            : ColoredBox(color: color!),
      ),
    );
  }
}

/// หนึ่งช่องปฏิทิน — พื้นคือสถานะ+ความเข้มชั่วโมง ตัวเลขคือวันที่
class HeatCell extends StatelessWidget {
  const HeatCell({
    super.key,
    required this.controller,
    required this.date,
    required this.month,
    required this.shifts,
    required this.selected,
    required this.today,
  });

  final DashboardController controller;
  final DateTime date;

  /// เดือนที่กำลังดูอยู่ — วันของเดือนอื่นในสัปดาห์หัว/ท้ายจะถูกเว้นว่าง
  final int month;
  final Map<String, List<Map<String, dynamic>>> shifts;
  final String selected;
  final String today;

  /// จังหวะที่ช่องเปลี่ยนหน้าตาตอนกรอง — เท่ากับวงวันในแถบรายสัปดาห์
  static const _morph = Duration(milliseconds: 240);

  @override
  Widget build(BuildContext context) {
    // วันของเดือนข้างเคียงที่หลุดเข้ามาในสัปดาห์แรก/สุดท้าย — เว้นว่างไว้ ไม่นับรวม
    // ต้องออกก่อนถึง Obx: ช่องว่างไม่ได้ฟังค่าอะไรเลย ถ้าเอา Obx ไปครอบทางนี้ด้วย
    // มันจะจบ build โดยไม่ได้อ่าน .obs สักตัว GetX ถือว่าใช้ผิดแล้วโยน error
    // ออกมาเป็น ErrorWidget ซึ่งใน release build คือกล่องเทาที่ยืดเต็มพื้นที่ที่เหลือ
    if (date.month != month) {
      return const AspectRatio(aspectRatio: 1.1, child: SizedBox());
    }
    return Obx(() {
      // สำเนาออกมาเป็น Set ธรรมดา — การอ่านค่าจริงคือสิ่งที่บอก Obx ว่าต้องฟังตัวนี้
      // (แค่ให้ชื่อตัวแปรชี้ไป RxSet เฉย ๆ ไม่นับเป็นการอ่าน)
      final hidden = {...controller.hiddenSeries};
      final key = DashboardController.ymd(date);
      final all = shifts[key] ?? const <Map<String, dynamic>>[];
      // เหลือเฉพาะเวรที่สถานะยังเปิดอยู่ใน legend — ปิดหมดแล้ววันนั้นต้องว่างเหมือนไม่มีเวร
      final rows = [
        for (final r in all)
          if (!hidden.contains(seriesOf(DashboardController.markOf(r)))) r,
      ];
      final blank = hidden.contains(Series.none);
      final mins = rows.fold<int>(
        0,
        (sum, r) => sum + controller.workedMinutes(r),
      );
      var mark = rows.isEmpty ? null : DayMark.ok;
      for (final r in rows) {
        final k = DashboardController.markOf(r);
        if (k.index > mark!.index) mark = k;
      }
      // ไล่เฉด 4→10 ชม. ไม่ใช่ 0→8 — เวรจริงเกาะแถว 7-9 ชม. เริ่มที่ 0 แล้วทุกวันเข้มเท่ากันหมด
      // ใช้ค่าคงที่ ไม่ใช่ค่าสูงสุดของเดือน เดือนไหนก็เทียบกันได้
      final t = ((mins - 240) / 360).clamp(0.0, 1.0);
      final on = key == selected;
      final isToday = key == today;
      // โหมดมืด: สีเต็มความเข้มบนพื้นเข้มแสบตาและกลายเป็นสีเลือดหมูตอน alpha กลาง ๆ
      // จึงจำกัดช่วงไว้ให้เป็นสีย้อมบาง ๆ แทน ส่วนโหมดสว่างไล่ได้เต็มช่วงเหมือนเดิม
      final a = Dash.dark ? 0.14 + 0.20 * t : 0.3 + 0.7 * t;
      final bg = mark == null
          ? (blank ? Colors.transparent : Dash.rowBg)
          : dayMarkColor(mark).withValues(alpha: a);
      // วันที่มีสองเวรคนละสถานะ — ผ่าครึ่งทแยงเหมือนวงกลมในมุมมองรายสัปดาห์
      final marks = [for (final r in rows) DashboardController.markOf(r)];
      final split = marks.length > 1 && marks.first != marks.last
          ? (
              dayMarkColor(marks.first).withValues(alpha: a),
              dayMarkColor(marks.last).withValues(alpha: a),
            )
          : null;
      return AspectRatio(
        aspectRatio: 1.1,
        child: Padding(
          padding: const EdgeInsets.all(2),
          child: Tappable(
            onTap: all.isEmpty
                ? null
                : () => controller.touchedDay.value = on ? '' : key,
            borderRadius: BorderRadius.circular(8),
            splash: Dash.on,
            // กดชิป legend แล้วทั้งเดือนเปลี่ยนพร้อมกันสามสิบช่อง ถ้าสลับทันทีอ่านเป็นจอกระพริบ
            // ไล่ให้แทนแล้วมันเล่าเรื่องว่าเวรที่ถูกซ่อนค่อย ๆ จางหายไปจากปฏิทิน
            child: AnimatedContainer(
              duration: _morph,
              curve: Curves.easeOut,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: split == null ? bg : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
                border: on || isToday
                    ? Border.all(
                        color: on ? Dash.accentActive : Dash.accent,
                        width: on ? 2 : 1.2,
                      )
                    : null,
              ),
              // expand — Container ที่ตั้ง alignment ไว้จะส่ง constraint แบบหลวมให้ลูก
              // ถ้าไม่บังคับ Stack จะหดเท่าตัวเลข พื้นที่ผ่าครึ่งเลยเหลือนิดเดียว
              child: Stack(
                fit: StackFit.expand,
                alignment: Alignment.center,
                children: [
                  // ช่องผ่าครึ่งวาดด้วย CustomPaint ซึ่ง AnimatedContainer ไล่ให้ไม่ได้
                  Positioned.fill(
                    child: AnimatedSwitcher(
                      duration: _morph,
                      child: split == null
                          ? const SizedBox.shrink(key: ValueKey('flat'))
                          : ClipRRect(
                              key: ValueKey('${split.$1}|${split.$2}'),
                              borderRadius: BorderRadius.circular(8),
                              child: CustomPaint(
                                painter: SplitBox(split.$1, split.$2),
                              ),
                            ),
                    ),
                  ),
                  Center(
                    child: AnimatedDefaultTextStyle(
                      duration: _morph,
                      curve: Curves.easeOut,
                      style: Dash.num(
                        size: 11,
                        weight: FontWeight.w700,
                        // พื้นเข้มแล้วตัวเลขต้องขาว ไม่งั้นอ่านไม่ออก
                        // โหมดมืด: พื้นเป็นสีย้อมบาง ๆ ตัวเลขจึงเป็นสีของสถานะ
                        // (แบบเดียวกับป้าย badge) อ่านง่ายและไม่แสบตาเหมือนพื้นทึบ
                        color: mark == null
                            ? Dash.faint
                            : (Dash.dark
                                  ? dayMarkColor(mark)
                                  : (t > 0.4 ? Dash.on : Dash.sub)),
                      ),
                      child: Text('${date.day}'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    });
  }
}
