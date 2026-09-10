import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../widgets/tappable.dart';
import '../dash_theme.dart';
import '../dashboard_controller.dart';
import 'dash_buttons.dart';
import 'month_heatmap.dart';
import 'skeleton.dart';
import 'week_day_strip.dart';
import 'work_bar_chart.dart';

/// การ์ดกราฟของช่วงที่เลือก — เนื้อกราฟบนพื้นการ์ด + แถบ legend เข้มปิดท้าย
class DashChartCard extends StatelessWidget {
  const DashChartCard({
    super.key,
    required this.controller,
    required this.card,
  });

  final DashboardController controller;
  final ChartCard card;

  @override
  Widget build(BuildContext context) {
    final maxMin = card.buckets.fold<int>(
      1,
      (m, b) => b.minutes > m ? b.minutes : m,
    );
    final empty = card.buckets.every((b) => b.minutes == 0 && b.shifts == 0);
    // ไล่สีเข้มทาเฉพาะแถบ legend ท้ายการ์ด — เดิมทาเต็มการ์ดแล้วโดนพื้นการ์ดทับหมด
    // เท่ากับระบายทั้งใบทิ้งทุกเฟรม (raster เสียเปล่าเพราะมองไม่เห็นอยู่ดี)
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _body(maxMin, empty),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: Dash.band,
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(16),
              ),
            ),
            child: ChartLegendBar(controller: controller),
          ),
        ],
      ),
    );
  }

  // Obx อยู่ตรงนี้ ไม่ใช่ที่หน้าแม่ — build ของวิดเจ็ตลูกทำงานนอก closure ของ Obx ที่ครอบมัน
  // ค่า .obs ที่อ่านในนี้จึงต้องมี Obx ของตัวเองถึงจะวาดใหม่ตอนค่าเปลี่ยน
  Widget _body(int maxMin, bool empty) => Obx(
    () => Container(
      // 16 ข้าง เท่าการ์ดสรุปด้านบน — เดิม 12 แท่งแรกเลยล้ำออกไปกว่าแถบสัดส่วน 4dp
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      decoration: BoxDecoration(
        color: Dash.card,
        // มนเฉพาะบน — ล่างเป็นแถบ legend ที่มนต่อให้แล้ว
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PeriodHeader(controller: controller),
          const SizedBox(height: 16),
          // ปุ่มเลื่อนอยู่บนหัวการ์ด — ตอนโหลดต้องคงหัวไว้ ให้กดต่อได้ทันที
          if (controller.rangeLoading.value)
            Shimmer(child: Skel(height: Dash.sp(160), radius: 16))
          else if (empty)
            const _EmptyChart()
          else
            ChartRangeBody(
              controller: controller,
              card: card,
              maxMinutes: maxMin,
            ),
        ],
      ),
    ),
  );
}

/// ช่วงที่เลือกยังไม่มีข้อมูลลงเวลาเลย
class _EmptyChart extends StatelessWidget {
  const _EmptyChart();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 24),
    child: Column(
      children: [
        Icon(PhosphorIconsRegular.calendarX, size: 26, color: Dash.faint),
        const SizedBox(height: 8),
        Text(
          'ยังไม่มีข้อมูลในช่วงนี้',
          style: Dash.body(size: 12, color: Dash.muted),
        ),
      ],
    ),
  );
}

/// เนื้อกราฟของช่วงที่เลือก — สลับแท็บแล้วตัวใหม่ค่อย ๆ โผล่ขึ้นแทนที่จะเด้งมาทันที
/// ความสูงของสามแบบไม่เท่ากัน จึงยืด/หดการ์ดตามไปด้วย ไม่ให้กระตุก
class ChartRangeBody extends StatelessWidget {
  const ChartRangeBody({
    super.key,
    required this.controller,
    required this.card,
    required this.maxMinutes,
  });

  final DashboardController controller;
  final ChartCard card;
  final int maxMinutes;

  @override
  Widget build(BuildContext context) => Obx(() {
    final range = controller.range.value;
    final body = switch (range) {
      DashRange.week => WeekDayStrip(controller: controller),
      DashRange.month => MonthHeatmap(controller: controller),
      DashRange.year => WorkBarChart(
        controller: controller,
        buckets: card.buckets,
        maxMinutes: maxMinutes,
        current: card.current,
        byDay: card.byDay,
      ),
    };
    return AnimatedSize(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
      alignment: Alignment.topCenter,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 260),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeIn,
        // ตัวเก่าซ้อนอยู่ที่เดิมระหว่างจาง ไม่ดันความสูงการ์ด
        layoutBuilder: (cur, prev) => Stack(
          alignment: Alignment.topCenter,
          children: [...prev, if (cur != null) cur],
        ),
        transitionBuilder: (child, anim) => FadeTransition(
          opacity: anim,
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 0.06),
              end: Offset.zero,
            ).animate(anim),
            child: child,
          ),
        ),
        child: KeyedSubtree(key: ValueKey(range), child: body),
      ),
    );
  });
}

/// หัวการ์ดกราฟ — ช่วงย่อยที่การ์ดนี้แสดง + ปุ่มเลื่อนสัปดาห์ (เฉพาะรายสัปดาห์)
class PeriodHeader extends StatelessWidget {
  const PeriodHeader({super.key, required this.controller});

  final DashboardController controller;

  @override
  Widget build(BuildContext context) => Obx(
    () => Row(
      children: [
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                controller.cardTitle,
                style: Dash.tech(
                  size: 16,
                  weight: FontWeight.w700,
                  color: Dash.ink,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                controller.cardSub,
                style: Dash.body(size: 12, color: Dash.muted),
              ),
            ],
          ),
        ),
        // เลื่อนได้เฉพาะรายสัปดาห์ — เดือน/ปีเปลี่ยนที่ปุ่มเดือนมุมขวาบน
        if (controller.range.value == DashRange.week) ...[
          DashNavButton(
            icon: PhosphorIconsRegular.caretLeft,
            onTap: controller.goPrev,
            enabled: controller.canGoPrev,
          ),
          const SizedBox(width: 12),
          DashNavButton(
            icon: PhosphorIconsRegular.caretRight,
            onTap: controller.goNext,
            enabled: controller.canGoNext,
          ),
        ],
      ],
    ),
  );
}

/// แถบเข้มท้ายการ์ด — ชิปบอกความหมายของสีแท่ง
/// สีต้องเท่ากับที่วาดเป๊ะ — Figma ใส่ #3382E7 แต่แท่งเป็น #5682E9 legend ที่สีไม่ตรงคือ legend ที่ผิด
/// ห้ามครอบ Obx ที่ตัวแถบ: ในนี้ไม่ได้อ่านค่า .obs สักตัว (อ่านที่ชิปแต่ละตัวแทน)
/// GetX จะมองว่าใช้ผิดแล้วโยน error ออกมาเป็น ErrorWidget ซึ่งใน release build
/// คือกล่องเทาที่ยืดเต็มพื้นที่ที่เหลือ (การ์ดกราฟอยู่ใน SliverToBoxAdapter = ความสูงไม่จำกัด)
class ChartLegendBar extends StatelessWidget {
  const ChartLegendBar({super.key, required this.controller});

  final DashboardController controller;

  /// ชิปชุดเดียวกันทุกแท็บ — แตะเพื่อปิด/เปิดชั้นนั้นในแท่ง
  static const List<(Series, String)> _items = [
    (Series.ok, 'ปกติ'),
    (Series.late, 'สาย'),
    (Series.early, 'ออกก่อน'),
    (Series.bad, 'ลืมออก/นอกพื้นที่'),
    (Series.none, 'ไม่มีเวร'),
  ];

  static Color _colorOf(Series s) => switch (s) {
    Series.ok => Dash.ok,
    Series.late => Dash.warn,
    Series.early => Dash.info,
    Series.bad => Dash.bad,
    Series.none => Dash.faint,
  };

  @override
  Widget build(BuildContext context) {
    // บังคับความสูงไว้ด้วย — การ์ดกราฟอยู่ใน SliverToBoxAdapter (ความสูงไม่จำกัด)
    // แถวเลื่อนแนวนอนที่ไม่มีความสูงบังคับจะยืดไปเท่าที่พื้นที่เหลือให้
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 12),
      child: SizedBox(
        height: Dash.box(34), // ชิป: ตัวอักษร 12 + padding 8 บน-ล่าง
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              for (var i = 0; i < _items.length; i++) ...[
                if (i > 0) const SizedBox(width: 8),
                LegendChip(
                  controller: controller,
                  series: _items[i].$1,
                  color: _colorOf(_items[i].$1),
                  label: _items[i].$2,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// ชิป legend กดได้ — ปิดแล้วชั้นนั้นหายจากแท่งและยอดรวมของ tooltip
/// สถานะปิดใช้ชิปโปร่ง + จุดกลวง + ขีดฆ่า ให้รู้ว่ายังมีอยู่แค่ถูกซ่อน
class LegendChip extends StatelessWidget {
  const LegendChip({
    super.key,
    required this.controller,
    required this.series,
    required this.color,
    required this.label,
  });

  final DashboardController controller;
  final Series series;
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) => Obx(() {
    final on = controller.shown(series);
    return Tappable(
      onTap: () => controller.toggleSeries(series),
      borderRadius: BorderRadius.circular(100),
      splash: color,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: on ? 0.5 : 0.12),
          borderRadius: BorderRadius.circular(100),
          border: Border.all(
            color: on ? Colors.transparent : Colors.white.withValues(alpha: .3),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: on ? color : Colors.transparent,
                border: on ? null : Border.all(color: color, width: 1.5),
              ),
            ),
            const SizedBox(width: 9),
            Text(
              label,
              style:
                  Dash.body(
                    size: 12,
                    color: Colors.white.withValues(alpha: on ? 1 : 0.55),
                  ).copyWith(
                    decoration: on ? null : TextDecoration.lineThrough,
                    decorationColor: Colors.white.withValues(alpha: 0.55),
                  ),
            ),
          ],
        ),
      ),
    );
  });
}
