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
          // ปิดชิป legend ครบทุกตัว = กราฟไม่เหลืออะไรให้วาด ต้องบอกว่าเป็นเพราะตัวกรอง
          // ไม่ใช่เพราะไม่มีข้อมูล ไม่งั้นคนอ่านว่า "เดือนนี้ไม่ได้ลงเวลาเลย" ซึ่งไม่จริง
          else if (controller.hiddenSeries.length == Series.values.length)
            _AllFiltersOff(controller: controller)
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

/// ปิดชิป legend ไว้ครบทุกตัว — ไม่ใช่ว่าไม่มีข้อมูล แค่ซ่อนไว้หมด
/// มีปุ่มเปิดกลับในตัว ไม่ต้องไล่แตะชิปทีละอันห้าครั้ง
class _AllFiltersOff extends StatelessWidget {
  const _AllFiltersOff({required this.controller});

  final DashboardController controller;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 20),
    child: Column(
      children: [
        Icon(PhosphorIconsRegular.funnelX, size: 26, color: Dash.faint),
        const SizedBox(height: 8),
        Text(
          'ปิดตัวกรองไว้ทั้งหมด',
          style: Dash.body(size: 12.5, color: Dash.sub),
        ),
        const SizedBox(height: 2),
        Text(
          'ข้อมูลยังอยู่ครบ แค่ถูกซ่อนจากกราฟ',
          style: Dash.body(size: 11.5, color: Dash.muted),
        ),
        const SizedBox(height: 12),
        Tappable(
          onTap: controller.hiddenSeries.clear,
          borderRadius: BorderRadius.circular(100),
          splash: Dash.accent,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
            decoration: BoxDecoration(
              color: Dash.accent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(100),
            ),
            child: Text(
              'เปิดทั้งหมด',
              style: Dash.body(
                size: 12.5,
                color: Dash.accentActive,
              ).copyWith(fontWeight: FontWeight.w600),
            ),
          ),
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
/// + ปุ่มล้างตัวกรองที่มุมขวาสุด ซึ่งโผล่มาเฉพาะตอนที่มีชิป legend ถูกปิดอยู่
class PeriodHeader extends StatelessWidget {
  const PeriodHeader({super.key, required this.controller});

  final DashboardController controller;

  @override
  Widget build(BuildContext context) => Obx(() {
    // สำเนาออกมาเป็น Set ธรรมดา — การอ่านค่าจริงคือสิ่งที่บอก Obx ว่าต้องฟังตัวนี้
    // (แค่ให้ชื่อตัวแปรชี้ไป RxSet เฉย ๆ ไม่นับเป็นการอ่าน)
    final filtered = {...controller.hiddenSeries}.isNotEmpty;
    final week = controller.range.value == DashRange.week;
    // ความกว้างแถวเปลี่ยนตอนปุ่มรีเซ็ตโผล่/หาย — ให้ค่อย ๆ ขยับ ไม่ใช่กระตุกทีเดียว
    return AnimatedSize(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOutCubic,
      alignment: Alignment.centerRight,
      child: Row(
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
          // เลื่อนได้เฉพาะรายสัปดาห์ — เดือน/ปีเปลี่ยนที่ปุ่มเดือนบนหัวแผงน้ำเงิน
          if (week) ...[
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
          // ปิดชิป legend ไว้บ้าง = สิ่งที่เห็นในกราฟไม่ใช่ข้อมูลทั้งหมด
          // ปุ่มนี้จึงโผล่มาเฉพาะตอนนั้น ทำหน้าที่สองอย่างพร้อมกัน: เป็นป้ายบอกว่า
          // กำลังกรองอยู่ และเป็นทางกลับที่กดครั้งเดียวจบ ไม่ต้องไล่แตะชิปทีละอัน
          // โผล่มาแบบผุดขึ้น ไม่ใช่ปรากฏทันที — ปุ่มที่เด้งมาเฉย ๆ ตรงมุมจอ
          // คนมักไม่ทันเห็นว่ามันเพิ่งมา จังหวะย่อ-ขยายทำให้สายตาจับได้ว่ามีของใหม่
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 240),
            switchInCurve: Curves.easeOutBack,
            switchOutCurve: Curves.easeIn,
            transitionBuilder: (child, anim) => FadeTransition(
              opacity: anim,
              child: ScaleTransition(scale: anim, child: child),
            ),
            child: filtered
                ? Padding(
                    key: const ValueKey(true),
                    padding: EdgeInsets.only(left: week ? 8 : 0),
                    child: DashIconButton(
                      icon: PhosphorIconsRegular.arrowCounterClockwise,
                      onTap: controller.hiddenSeries.clear,
                    ),
                  )
                : const SizedBox.shrink(key: ValueKey(false)),
          ),
        ],
      ),
    );
  });
}

/// แถบเข้มท้ายการ์ด — ชิปบอกความหมายของสีแท่ง
/// สีต้องเท่ากับที่วาดเป๊ะ — Figma ใส่ #3382E7 แต่แท่งเป็น #5682E9 legend ที่สีไม่ตรงคือ legend ที่ผิด
/// ห้ามครอบ Obx ที่ตัวแถบ: ในนี้ไม่ได้อ่านค่า .obs สักตัว (อ่านที่ชิปแต่ละตัวแทน)
/// GetX จะมองว่าใช้ผิดแล้วโยน error ออกมาเป็น ErrorWidget ซึ่งใน release build
/// คือกล่องเทาที่ยืดเต็มพื้นที่ที่เหลือ (การ์ดกราฟอยู่ใน SliverToBoxAdapter = ความสูงไม่จำกัด)
class ChartLegendBar extends StatefulWidget {
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
  State<ChartLegendBar> createState() => _ChartLegendBarState();
}

class _ChartLegendBarState extends State<ChartLegendBar> {
  /// ครั้งเดียวต่อการเปิดแอป — ไม่ใช่ต่อการเข้าแดชบอร์ดแต่ละรอบ
  /// คำใบ้ที่เล่นซ้ำทุกครั้งที่กลับมาหน้านี้กลายเป็นของกวนใจ ไม่ใช่คำใบ้อีกต่อไป
  static bool _nudged = false;

  /// ระยะที่ชิปค่อย ๆ จางหายเข้าไปในขอบ — สั้นกว่านี้อ่านเป็นชิปโดนตัด ไม่ใช่จาง
  static const double _fade = 34;

  /// เพดานระยะที่แง้มออกไป — ปกติแถบนี้ล้นไม่ถึงเท่านี้ จึงได้เลื่อนไปสุดทางพอดี
  /// คือเห็นชิปตัวที่ซ่อนอยู่เต็มตัว ไม่ใช่แค่โผล่มุม เห็นเต็มตัวครั้งเดียวจำได้เลย
  /// ว่ายังมีอะไรอยู่ตรงนั้น ดีกว่ากระตุกสั้น ๆ หลายรอบให้เดาเอง
  static const double _peekMax = 96;

  final _scroll = ScrollController();

  /// คนลากแถบเองแล้ว — คำใบ้หมดหน้าที่ ต้องหยุดกลางคันทันที ไม่แย่งมือ
  bool _taken = false;

  @override
  void initState() {
    super.initState();
    // รอให้การ์ดกราฟวาดเสร็จและแอนิเมชันตอนเข้าหน้าจบก่อน ไม่งั้นขยับพร้อมกันจนดูรวน
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future<void>.delayed(const Duration(milliseconds: 900), _nudge);
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  /// แง้มแถบออกไปให้เห็นของที่ซ่อนอยู่ แล้วค่อย ๆ พากลับ — รอบเดียวจบ
  ///
  /// ไป-ค้าง-กลับ ใช้ easeInOutCubic ทั้งขาไปและขากลับ ออกตัวนุ่มและจอดนุ่ม
  /// ไม่มีจังหวะไหนที่ความเร็วกระโดด · ช่วงค้างยาวพอให้ตาอ่านชิปที่เพิ่งโผล่มาได้จริง
  /// ไม่ใช่แค่เห็นว่ามีอะไรวาบไป
  Future<void> _nudge() async {
    if (_nudged || !mounted || !_scroll.hasClients) return;
    final max = _scroll.position.maxScrollExtent;
    if (max <= 0) return; // จอกว้างพอ ไม่มีอะไรให้ใบ้
    // เครื่องที่ตั้งลดการเคลื่อนไหวไว้ — นับว่าใบ้ไปแล้ว จะได้ไม่ค้างรอเล่นทีหลัง
    _nudged = true;
    if (MediaQuery.maybeOf(context)?.disableAnimations ?? false) return;

    Future<bool> glide(double to, int ms) async {
      if (_taken || !mounted || !_scroll.hasClients) return false;
      await _scroll.animateTo(
        to,
        duration: Duration(milliseconds: ms),
        curve: Curves.easeInOutCubic,
      );
      return !_taken && mounted;
    }

    if (!await glide(max < _peekMax ? max : _peekMax, 780)) return;
    await Future<void>.delayed(const Duration(milliseconds: 620));
    // ขากลับช้ากว่าขาไปเล็กน้อย — จบแบบวางลง ไม่ใช่ดีดกลับ
    await glide(0, 840);
  }

  @override
  Widget build(BuildContext context) {
    // บังคับความสูงไว้ด้วย — การ์ดกราฟอยู่ใน SliverToBoxAdapter (ความสูงไม่จำกัด)
    // แถวเลื่อนแนวนอนที่ไม่มีความสูงบังคับจะยืดไปเท่าที่พื้นที่เหลือให้
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 12),
      child: SizedBox(
        height: Dash.box(34), // ชิป: ตัวอักษร 12 + padding 8 บน-ล่าง
        // ชิปทั้งห้ากว้างเกินจอ ตัวสุดท้ายเลยอยู่นอกสายตาแบบไม่มีอะไรบอกว่ายังมีต่อ
        // ขอบจางทำให้ชิปที่ค้างตรงขอบดูเหมือนถูกตัดกลางคัน ซึ่งตาอ่านออกเองว่ายังไม่หมด
        child: NotificationListener<ScrollNotification>(
          onNotification: (n) {
            // ขนาดแถบเปลี่ยน (หมุนจอ ตัวอักษรใหญ่ขึ้น) — ต้องวาดใหม่เพื่ออ่านค่าขอบเขตใหม่
            if (n is ScrollMetricsNotification) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) setState(() {});
              });
            }
            // dragDetails มีค่าเฉพาะตอนนิ้วลากจริง — การเลื่อนที่ _nudge สั่งเองไม่มี
            // จึงแยกออกจากกันได้ว่าใครเป็นคนขยับแถบนี้
            if (n is ScrollStartNotification && n.dragDetails != null) {
              _taken = true;
            }
            return false;
          },
          // ฟังตัวคุมสกรอลล์ตรง ๆ ความเข้มของขอบจึงไหลตามตำแหน่งจริงทุกเฟรม
          // ถ้าใช้ค่าจริง/เท็จแล้ว setState ขอบจะกระพริบเป็นขั้นตอนที่เลื่อนถึงหัว-ท้าย
          child: AnimatedBuilder(
            animation: _scroll,
            builder: (context, child) {
              final p = _scroll.hasClients ? _scroll.position : null;
              final l = p == null ? 0.0 : (p.pixels / _fade).clamp(0.0, 1.0);
              final r = p == null
                  ? 0.0
                  : ((p.maxScrollExtent - p.pixels) / _fade).clamp(0.0, 1.0);
              return ShaderMask(
                blendMode: BlendMode.dstIn,
                shaderCallback: (rect) {
                  final f = (_fade / rect.width).clamp(0.0, 0.35);
                  return LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [
                      Colors.white.withValues(alpha: 1 - l),
                      Colors.white,
                      Colors.white,
                      Colors.white.withValues(alpha: 1 - r),
                    ],
                    stops: [0, f, 1 - f, 1],
                  ).createShader(rect);
                },
                child: child,
              );
            },
            child: SingleChildScrollView(
              controller: _scroll,
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  for (var i = 0; i < ChartLegendBar._items.length; i++) ...[
                    if (i > 0) const SizedBox(width: 8),
                    LegendChip(
                      controller: widget.controller,
                      series: ChartLegendBar._items[i].$1,
                      color: ChartLegendBar._colorOf(
                        ChartLegendBar._items[i].$1,
                      ),
                      label: ChartLegendBar._items[i].$2,
                    ),
                  ],
                ],
              ),
            ),
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
