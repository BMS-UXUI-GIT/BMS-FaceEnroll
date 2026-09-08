import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../widgets/tappable.dart';
import '../../routes/app_pages.dart';
import '../../utils/thai_date.dart';
import 'dash_theme.dart';
import 'dashboard_controller.dart';
import 'attendance_row.dart';
import 'fix_request_view.dart';
import 'widgets/chart_appear.dart';
import 'widgets/today_card.dart';
import 'widgets/skeleton.dart';
import 'widgets/sliver_headers.dart';
import 'widgets/split_painters.dart';
import 'widgets/dash_page.dart';
import 'widgets/dash_buttons.dart';
import 'widgets/underline_tab.dart';

/// หน้าแดชบอร์ด — โครงตาม Figma: hero (พื้นฟ้า) + แผ่นขาวมุมมนบนเลื่อนขึ้นซ้อนใต้การ์ดสถานะ
class DashboardView extends GetView<DashboardController> {
  const DashboardView({super.key});

  /// ระยะจากขอบบนการ์ดสถานะถึงขอบบนแผ่นขาว (การ์ดจึงคร่อมรอยต่อ) — ค่าเดียวกับ Figma (215-143)
  static const double _sheetOverlap = 72;

  @override
  Widget build(BuildContext context) {
    // ฟอนต์ระบบใหญ่กว่า 1.2 เท่าทำให้กล่องความสูงคงที่ (การ์ดสแกน/แถบเลือกเดือน) ล้น
    // ยอมให้ขยายได้ถึง 1.2 แล้วความสูงโตตามผ่าน Dash.box()
    return DashPage(
      builder: (context) => Obx(() {
        if (controller.error.value.isNotEmpty) return _errorState();
        if (controller.loading.value) return _skeleton(context);
        return RefreshIndicator(
          color: Dash.accent,
          backgroundColor: Dash.card,
          onRefresh: controller.resetAndRefresh,
          child: CustomScrollView(
            controller: controller.scroll,
            slivers: [
              _appBar(context),
              // การ์ดวันนี้มี PageView ปัดได้ — กันการวาดซ้ำไม่ให้ลามไปทั้งหน้า
              SliverToBoxAdapter(child: RepaintBoundary(child: _hero(context))),
              // แผ่นขาว (ต่อจากที่โผล่มาใต้การ์ด — ไร้รอยต่อ) รับแค่แถบเตือน
              // ห้ามครอบแผงน้ำเงินไว้ข้างใน: พื้นขาวจะถูกระบายเต็มจอทุกเฟรมแล้วโดนน้ำเงินทับทิ้ง
              DecoratedSliver(
                decoration: BoxDecoration(color: Dash.card),
                sliver: SliverToBoxAdapter(
                  child: Obx(
                    () => controller.pendingFixes.isEmpty
                        ? const SizedBox(height: 14)
                        // บน-ล่างเท่ากัน ให้รอยต่อ section สม่ำเสมอไม่ว่าจะมีการ์ดหรือไม่
                        : Padding(
                            // การ์ดวันนี้ทิ้งช่องไฟใต้ท้ายไว้ ~5 อยู่แล้ว บวกอีก 11 ให้ครบ 16
                            // เท่ากับระยะด้านล่างถึงแผงน้ำเงิน — สองช่องไฟเท่ากันพอดี
                            padding: const EdgeInsets.fromLTRB(16, 11, 16, 16),
                            child: _actionBanner(),
                          ),
                  ),
                ),
              ),
              // แผงน้ำเงินคลุมส่วนล่างทั้งหมด: ภาพรวม + รายวัน (Figma 593:12419)
              DecoratedSliver(
                decoration: BoxDecoration(
                  color: Dash.panel,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(24),
                  ),
                ),
                sliver: SliverMainAxisGroup(
                  slivers: [
                    _tabsSliver(context),
                    _statSliver(),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        // กราฟวาดใหม่เองตอน tween/แตะ — กันไม่ให้ลากแผงน้ำเงินทั้งแผ่นไปวาดด้วย
                        child: RepaintBoundary(
                          child: Obx(() => _chartCard(controller.card)),
                        ),
                      ),
                    ),
                    const SliverToBoxAdapter(
                      child: SizedBox(height: 120),
                    ), // เว้นที่ให้แถบล่าง
                  ],
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  // ============ โครงร่างระหว่างโหลด ============

  /// ใช้โครงเดียวกับของจริง (hero + แผ่นขาว) เพื่อไม่ให้ layout กระโดดตอนข้อมูลมาถึง
  /// หัวเรื่องแสดงของจริงไปเลย เพราะเป็นข้อความคงที่ ไม่ต้องรอโหลด
  Widget _skeleton(BuildContext context) => Shimmer(
    child: SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            color: Dash.bg,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SafeArea(bottom: false, child: _heroTitle()),
                const SizedBox(height: 12),
                Stack(
                  children: [
                    Positioned(
                      top: _sheetOverlap,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: Dash.card,
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(24),
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: _skelTodayCard(),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(color: Dash.card, height: 24),
          Container(
            decoration: BoxDecoration(
              color: Dash.panel,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Skel(width: 96, height: 22, onPanel: true, phase: 0.00),
                const SizedBox(height: 16),
                Row(
                  children: [
                    for (var i = 0; i < 3; i++) ...[
                      Expanded(
                        child: Skel(
                          height: 36,
                          radius: 100,
                          onPanel: true,
                          phase: 0.08 + i * 0.06,
                        ),
                      ),
                      if (i < 2) const SizedBox(width: 8),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Skel(
                      width: 120,
                      height: 34,
                      onPanel: true,
                      phase: 0.28,
                    ),
                    const Spacer(),
                    const Skel(
                      width: 40,
                      height: 40,
                      radius: 100,
                      onPanel: true,
                      phase: 0.32,
                    ),
                    const SizedBox(width: 16),
                    const Skel(
                      width: 40,
                      height: 40,
                      radius: 100,
                      onPanel: true,
                      phase: 0.34,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    for (var i = 0; i < 4; i++) ...[
                      Expanded(
                        child: Skel(
                          height: 88,
                          radius: 16,
                          onPanel: true,
                          phase: 0.36 + i * 0.05,
                        ),
                      ),
                      if (i < 3) const SizedBox(width: 8),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                for (var i = 0; i < 2; i++) ...[
                  Skel(
                    height: 250,
                    radius: 24,
                    onPanel: true,
                    phase: 0.58 + i * 0.08,
                  ),
                  const SizedBox(height: 16),
                ],
                const SizedBox(height: 8),
                const Skel(width: 80, height: 20, onPanel: true, phase: 0.76),
                const SizedBox(height: 12),
                for (var i = 0; i < 4; i++) ...[
                  Skel(
                    height: 64,
                    radius: 16,
                    onPanel: true,
                    phase: 0.80 + i * 0.06,
                  ),
                  const SizedBox(height: 8),
                ],
              ],
            ),
          ),
        ],
      ),
    ),
  );

  Widget _skelTodayCard() => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Dash.card,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: Dash.hairline),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Skel(width: 120, height: 14, phase: 0.0),
            const Spacer(),
            const Skel(width: 56, height: 24, radius: 100, phase: 0.10),
          ],
        ),
        const SizedBox(height: 12),
        const Skel(width: 150, height: 24, phase: 0.18),
        const SizedBox(height: 16),
        Row(
          children: const [
            Expanded(child: Skel(height: 84, radius: 16, phase: 0.26)),
            SizedBox(width: 8),
            Expanded(child: Skel(height: 84, radius: 16, phase: 0.34)),
          ],
        ),
      ],
    ),
  );

  // ============ hero ============

  Widget _hero(BuildContext context) {
    return Container(
      color: Dash.bg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 12),
          // Stack กำหนดขนาดตามการ์ด แล้วให้แผ่นขาวเริ่มที่ _sheetOverlap ลงไปจนสุดการ์ด
          Stack(
            children: [
              Positioned(
                top: _sheetOverlap,
                left: 0,
                right: 0,
                bottom: 0,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Dash.card,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                    // โหมดสว่างเงาจางที่ 4% แทบมองไม่เห็น แต่ต้องเบลอเต็มความกว้างทุกเฟรม
                    // ตัดทิ้งไปเลย เหลือเฉพาะโหมดมืดที่เห็นผลจริง
                    boxShadow: Dash.dark
                        ? [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.30),
                              blurRadius: 12,
                              offset: const Offset(0, -4),
                            ),
                          ]
                        : null,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Obx(() => TodayCard(shifts: controller.todayShifts)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// หัวแอป — floating+snap: เลื่อนลงอ่านเนื้อหาแล้วหาย ปัดขึ้นนิดเดียวก็โผล่กลับมาทันที
  /// (ไม่ pinned เพราะกินที่จอถาวรทั้งที่เป็นแค่ชื่อหน้า)
  /// หัวแอป — เลื่อนลงอ่านเนื้อหาแล้วหายสนิท ปัดขึ้นนิดเดียวก็โผล่กลับมาทันที
  /// พื้นที่ status bar ไปกันไว้ที่แถบเลือกเดือนที่ตรึงอยู่แทน (ดู [_scopeSliver])
  /// โผล่กลับมาจากการปัดขึ้นกลางหน้า = ผู้ใช้รู้อยู่แล้วว่าหน้านี้คืออะไร
  /// คำอธิบายจึงจางหายตาม 40dp แรกของการเลื่อน (ดู DashboardController.subFade)
  Widget _appBar(BuildContext context) => SliverAppBar(
    floating: true,
    // ไม่ใช้ snap — snap จะ "เติมให้เต็ม" ทุกครั้งที่ปล่อยนิ้วโดยมีหัวโผล่มาแม้แต่พิกเซลเดียว
    // เลื่อนลงแล้วหยุด (หรือสะบัดกลับนิดเดียวตอนปล่อย) หัวจึงเด้งขึ้นมาเองตลอด
    // ปิดแล้วหัวจะโผล่ตามระยะที่ปัดขึ้นจริงเท่านั้น
    // สีพื้นวาดเองใน flexibleSpace — Obx ต้องเป็น box widget ครอบ sliver ไม่ได้
    backgroundColor: Colors.transparent,
    surfaceTintColor: Colors.transparent,
    elevation: 0,
    scrolledUnderElevation: 0,
    automaticallyImplyLeading: false,
    toolbarHeight: 0,
    expandedHeight: Dash.box(76),
    flexibleSpace: FlexibleSpaceBar(
      background: Obx(() {
        // ฟ้าเฉพาะตอนที่ข้างหลังเป็นแผงน้ำเงินแล้ว — ยังอยู่ช่วง hero พื้นสว่างต้องขาวเหมือนเดิม
        final onPanel = controller.panelStuck.value;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          color: onPanel ? Dash.panel : Dash.bg,
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'แดชบอร์ด',
                          style: Dash.tech(
                            size: 20,
                            weight: FontWeight.w700,
                            color: onPanel ? Dash.onPanel() : null,
                          ),
                        ),
                        // คงที่ทางในเลย์เอาต์ไว้เสมอ จางอย่างเดียว
                        // ไม่งั้นพอจางหมดแล้วชื่อหน้าจะเด้งขึ้นไปกลางแถบ
                        const SizedBox(height: 4),
                        // จางด้วย alpha ของสีตัวอักษร ไม่ใช่ widget Opacity
                        // — Opacity สั่ง saveLayer ทุกเฟรมที่ค่าอยู่ระหว่าง 0-1 แพงเปล่า ๆ
                        ValueListenableBuilder<double>(
                          valueListenable: controller.subFade,
                          builder: (context, v, _) => Text(
                            'สรุปข้อมูลการมาทำงานของคุณ',
                            style: Dash.body(
                              size: 12,
                              color: Dash.muted.withValues(alpha: v),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Obx(
                    () =>
                        controller.loading.value ||
                            controller.rangeLoading.value
                        ? SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: onPanel ? Dash.onPanel() : Dash.accent,
                            ),
                          )
                        : _iconBtn(
                            PhosphorIconsRegular.arrowsClockwise,
                            controller.resetAndRefresh,
                            onPanel: onPanel,
                          ),
                  ),
                ],
              ),
            ),
          ),
        );
      }),
    ),
  );

  /// หัวเรื่องแบบอยู่กับที่ — ใช้ตอนโหลด (ยังไม่มี scroll view จริง)
  Widget _heroTitle() => Padding(
    padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
    child: Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'แดชบอร์ด',
                style: Dash.tech(size: 20, weight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                'สรุปข้อมูลการมาทำงานของคุณ',
                style: Dash.body(size: 12, color: Dash.muted),
              ),
            ],
          ),
        ),
        SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(strokeWidth: 2, color: Dash.accent),
        ),
      ],
    ),
  );

  // ============ ภาพรวม (อยู่บนแผงน้ำเงิน) ============

  /// หัวแผงทั้งก้อน (หัวข้อ + ปุ่มเดือน + แท็บ) ตรึงไว้บนสุด
  /// ความสูงคงที่ทุกสถานะ — เดิมพอตรึงแล้วสูงเพิ่มรวดเดียว ~70dp เลยกระตุกเห็นชัด
  Widget _tabsSliver(BuildContext context) {
    // หัวแอปเป็น floating หายสนิทตอนเลื่อนลง — พอหัวนี้ตรึงถึงบนสุดจะไปอยู่ใต้ status bar
    // ตอนยังไม่ตรึงใช้ช่องไฟหัวแผงปกติ แล้วค่อยขยายเป็นความสูง status bar ระหว่างเลื่อนขึ้นไปตรึง
    // (เครื่องที่ safe area สูง ๆ เคยได้ช่องไฟ 44-47 ตั้งแต่ยังไม่ตรึง หัวข้อเลยลอยห่างขอบแผงมาก)
    const restGap = 14.0;
    final safeTop = MediaQuery.viewPaddingOf(context).top;
    final stickGap = safeTop < restGap ? restGap : safeTop;
    final grow = stickGap - restGap;
    final rowH = Dash.box(52); // แถวหัวข้อ + ปุ่มเดือน
    final tabH = Dash.box(40) + 4; // 40 ตัวแท็บ + 3 ขีดใต้ + 1 เส้นฐาน
    return SliverLayoutBuilder(
      builder: (context, cons) {
        // ห้ามใช้ overlapsContent — ค่านั้นมาจาก overlap ของ sliver ก่อนหน้า พอหัวแอปเลิก pinned
        // มันเป็น 0 ตลอด
        final stuck = cons.scrollOffset > 0;
        // โตตามระยะที่เลื่อนไปแล้วพอดี — หัวจึงไม่กระโดดตอนเปลี่ยนเป็นตรึง
        final topPad = grow <= 0
            ? restGap
            : restGap + grow * (cons.scrollOffset / grow).clamp(0.0, 1.0);
        // แจ้งหัวแอปให้เปลี่ยนสี — ตั้งค่า Rx ระหว่าง layout ไม่ได้ ต้องรอจบเฟรม
        if (controller.panelStuck.value != stuck) {
          WidgetsBinding.instance.addPostFrameCallback(
            (_) => controller.panelStuck.value = stuck,
          );
        }
        return SliverPersistentHeader(
          pinned: true,
          delegate: StickyPanelHeader(
            height: topPad + rowH + tabH,
            topGap: topPad,
            stuck: stuck,
            child: Column(
              children: [
                SizedBox(height: rowH, child: _titleRow()),
                Expanded(child: _rangeTabs()),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _statSliver() => SliverToBoxAdapter(
    child: Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      child: _statRow(),
    ),
  );

  static const _rangeNames = {
    DashRange.week: 'รายสัปดาห์',
    DashRange.month: 'รายเดือน',
    DashRange.year: 'รายปี',
  };

  /// หัวข้อ + แท็บเลือกช่วง — 3 ตัวเลือกเห็นครบในจอเดียว กดสลับได้ทันทีไม่ต้องเปิดชั้นซ้อน
  /// หัวข้อ + บรรทัดบอกความสดของข้อมูล + ปุ่มเลือกเดือน — อยู่ในหัวที่ตรึง
  Widget _titleRow() => Padding(
    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
    child: Row(
      children: [
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'ภาพรวม',
                style: Dash.tech(
                  size: 17,
                  weight: FontWeight.w700,
                  color: Dash.onPanel(),
                ),
              ),
              Obx(
                () => Text(
                  controller.syncLabel,
                  style: Dash.body(size: 11, color: Dash.onPanel(0.75)),
                ),
              ),
            ],
          ),
        ),
        _monthChip(),
      ],
    ),
  );

  /// ปุ่มเลือกเดือน — โปร่งใส ไม่ใช่ขาวทึบ กันสับสนกับแท็บที่เลือกซึ่งเป็นพิลขาว
  Widget _monthChip() => Obx(
    () => Tappable(
      onTap: _pickScope,
      borderRadius: BorderRadius.circular(100),
      splash: Dash.onPanel(),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 8, 10, 8),
        decoration: BoxDecoration(
          color: Dash.onPanel(0.18),
          borderRadius: BorderRadius.circular(100),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              controller.scopeTitle,
              style: Dash.tech(
                size: 13,
                weight: FontWeight.w600,
                color: Dash.onPanel(),
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              PhosphorIconsRegular.caretDown,
              size: Dash.sp(14),
              color: Dash.onPanel(0.8),
            ),
          ],
        ),
      ),
    ),
  );

  /// แท็บเลือกช่วง — เหลี่ยม ชิดขอบจอ ตัวที่เลือกขีดเส้นใต้
  /// สูง 40 ตัวแท็บ + 3 ขีดใต้ · เส้นฐานอีก 1 มาจากขอบล่างของกล่องนี้
  Widget _rangeTabs() => Obx(
    () => DecoratedBox(
      // เส้นฐานจาง ๆ ให้เห็นว่าแถวนี้เป็นแท็บ ไม่ใช่ข้อความลอย
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Dash.onPanel(0.25))),
      ),
      child: SizedBox(
        height: Dash.box(40) + 3,
        child: Row(
          children: [
            for (final e in _rangeNames.entries)
              Expanded(child: _rangeTab(e.key, e.value)),
          ],
        ),
      ),
    ),
  );

  Widget _rangeTab(DashRange r, String label) => UnderlineTab(
    label: label,
    on: controller.range.value == r,
    onTap: () => controller.setRange(r),
    onPanel: true,
  );

  /// ย้อนหลังได้แค่ไหนในตัวเลือกแบบเลื่อน — เท่าที่ข้อมูลลงเวลามีจริง
  static const _pickMonthsBack = 24;
  static const _pickYearsBack = 5;

  /// เลือกเดือน (หรือปี ตอนดูรายปี) แบบเลื่อน — กดที่หัวข้อบนแถบเดือน
  void _pickScope() {
    final now = DateTime.now();
    final isYear = controller.scopeIsYear;
    final cur = controller.month.value;
    // เรียงเก่า→ใหม่ ให้เลื่อนลงคือเข้าใกล้ปัจจุบัน ตรงกับสัญชาตญาณปฏิทิน
    final items = <DateTime>[
      for (var i = isYear ? _pickYearsBack : _pickMonthsBack; i >= 0; i--)
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

  /// หัวการ์ดกราฟ — ช่วงย่อยที่การ์ดนี้แสดง + ปุ่มเลื่อนสัปดาห์ (เฉพาะรายสัปดาห์)
  Widget _periodHeader() => Obx(
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
          _navBtn(
            PhosphorIconsRegular.caretLeft,
            controller.goPrev,
            controller.canGoPrev,
          ),
          const SizedBox(width: 12),
          _navBtn(
            PhosphorIconsRegular.caretRight,
            controller.goNext,
            controller.canGoNext,
          ),
        ],
      ],
    ),
  );

  Widget _navBtn(
    IconData icon,
    VoidCallback onTap,
    bool enabled,
  ) => DashCircleButton(
    icon: icon,
    onTap: enabled ? onTap : null,
    size: Dash.sp(40),
    iconSize: Dash.sp(20),
    splash: Dash.accent,
    // ปุ่มที่กดได้เป็นฟ้าทึบ ปุ่มที่สุดทางแล้วเป็นฟ้าจาง — ต่างกันชัดโดยไม่ต้องอ่าน
    fill: enabled ? Dash.accent : Dash.wash,
    iconColor: enabled ? Dash.on : Dash.accent.withValues(alpha: 0.45),
  );

  // ============ ต้องขอแก้ไข ============

  /// ลงเวลาที่ระบบใช้ต่อไม่ได้ (ลืมออกเวร/นอกพื้นที่) = งานค้างที่ต้องเดินไปแจ้ง ไม่ใช่แค่สถิติ
  /// ยกขึ้นมาไว้บนสุดพร้อมรายละเอียดครบ: วันไหน เวรอะไร เวลาเท่าไหร่ ผิดยังไง แจ้งใคร
  Widget _actionBanner() {
    final fixes = controller.pendingFixes;
    return Tappable(
      // กดแล้วเปิดหน้ารายการที่ต้องขอแก้ไข (กด back กลับมาที่แดชบอร์ดตำแหน่งเดิม)
      onTap: () => Get.toNamed(Routes.fixRequest, arguments: {'rows': fixes}),
      borderRadius: BorderRadius.circular(16),
      splash: Dash.accent,
      // แผ่นไล่สีน้ำเงินซ้อนอยู่ข้างหลัง โผล่พ้นขอบบนการ์ด 8 (Figma 619:16055)
      child: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF045FA9), Color(0xFF288AD1)],
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        padding: const EdgeInsets.only(top: 8),
        child: Container(
          // ไม่มี padding ที่การ์ด — ลายพื้นต้องชนขอบจริง เนื้อหาเว้นขอบเองข้างใน
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: Dash.card,
            borderRadius: BorderRadius.circular(16),
          ),
          // เส้นขอบวาดทับลูก ไม่ใช่ border ใน decoration — ของเดิมโดน clip กินไปครึ่งเส้น
          foregroundDecoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Dash.hairline),
          ),
          // ย่อเหลือหัวเรื่อง + จำนวน — รายละเอียดของแต่ละวันอยู่ในหน้ารายการอยู่แล้ว
          // แถวย่อยสามบรรทัดเดิมกินที่บนแดชบอร์ดโดยที่คนต้องกดเข้าไปทำต่ออยู่ดี
          child: Stack(
            children: [
              // ลายพื้น: วงกลมจมขอบล่างการ์ด เห็นแค่ครึ่งบน (การ์ด clip ที่เหลือทิ้ง)
              // กึ่งกลางตรงกับภาพประกอบ — ภาพกว้าง sp(104) ห่างขอบขวา 8
              Positioned(
                right: 8 + (Dash.sp(104) - Dash.sp(116)) / 2,
                bottom: -Dash.sp(58),
                child: Container(
                  width: Dash.sp(116),
                  height: Dash.sp(116),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Dash.accent.withValues(alpha: 0.08),
                  ),
                ),
              ),
              // บอกว่ากดแล้วออกไปหน้าอื่น — การ์ดนี้ไม่ได้แค่แจ้ง แต่กดต่อได้
              Positioned(
                right: 12,
                top: 12,
                child: Icon(
                  PhosphorIconsBold.arrowUpRight,
                  size: Dash.sp(16),
                  color: Dash.accentActive.withValues(alpha: 0.55),
                ),
              ),
              // ภาพประกอบวางทับเป็นชั้นบนสุด ไม่ได้อยู่ในแถว — ความสูงการ์ดจึงมาจากข้อความล้วน
              // ชนขอบล่างการ์ด แล้วย่อ/ขยายตามความสูงที่ข้อความกำหนด
              Positioned(
                right: 8,
                top: 10,
                bottom: 0,
                child: Hero(
                  tag: kFixTimeHeroTag,
                  child: SizedBox(
                    width: Dash.sp(104),
                    child: SvgPicture.asset(
                      'assets/images/fix_time_hero.svg',
                      fit: BoxFit.contain,
                      alignment: Alignment.bottomCenter,
                    ),
                  ),
                ),
              ),
              Padding(
                // เว้นขวาให้พ้นภาพประกอบ — ข้อความต้องไม่ไปทับมือที่ถือมือถือ
                padding: EdgeInsets.fromLTRB(14, 12, Dash.sp(104) + 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'ตรวจพบเวลาเข้า - ออกงาน',
                      style: Dash.body(
                        size: 12.5,
                        weight: FontWeight.w600,
                        color: Dash.sub,
                      ),
                    ),
                    const SizedBox(height: 2),
                    // จำนวนวันคือสิ่งที่ต้องเห็นก่อน — ตัวเลขใหญ่ คำอธิบายตัวเล็กต่อท้าย
                    Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: '${fixes.length}',
                            style: Dash.num(
                              size: 26,
                              weight: FontWeight.w700,
                              color: Dash.accentActive,
                            ),
                          ),
                          TextSpan(
                            text: ' วันที่ต้องตรวจสอบ',
                            style: Dash.body(
                              size: 12.5,
                              weight: FontWeight.w600,
                              color: Dash.accentActive,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _iconBtn(
    IconData icon,
    VoidCallback? onTap, {
    Key? key,
    bool enabled = true,
    bool onPanel = false,
  }) => DashCircleButton(
    key: key,
    icon: icon,
    onTap: enabled ? onTap : null,
    splash: onPanel ? Dash.onPanel() : Dash.accent,
    fill: onPanel ? Dash.onPanel(0.2) : Dash.rowBg,
    iconColor: onPanel
        ? Dash.onPanel(enabled ? 1 : 0.4)
        : (enabled ? Dash.accent : Dash.faint),
  );

  Widget _errorState() => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(PhosphorIconsRegular.wifiSlash, size: 36, color: Dash.faint),
          const SizedBox(height: 8),
          Text(
            controller.error.value,
            textAlign: TextAlign.center,
            style: Dash.body(size: 13, color: Dash.sub),
          ),
          const SizedBox(height: 16),
          Tappable(
            onTap: controller.refreshAll,
            borderRadius: BorderRadius.circular(100),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                gradient: Dash.accentGradient,
                borderRadius: BorderRadius.circular(100),
              ),
              child: Text(
                'ลองใหม่',
                style: Dash.tech(
                  size: 13,
                  weight: FontWeight.w700,
                  color: Dash.on,
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );

  // ============ 4 ช่องสรุป ============

  /// สรุปช่วงที่เลือกเป็นแถบสัดส่วนเส้นเดียว — การ์ด 4 ใบบอกแต่ตัวเลขโดด ๆ
  /// อ่านไม่ออกว่าสัดส่วนวันที่มีปัญหาเทียบกับทั้งเดือนเป็นเท่าไหร่
  Widget _statRow() => Obx(() {
    if (controller.rangeLoading.value) {
      return Shimmer(child: Skel(height: 104, radius: 16, onPanel: true));
    }
    final b = controller.summary;
    final segs = <(String, int, Color)>[
      ('ปกติ', b.normalDays, Dash.ok),
      ('สาย', b.lateOnly, Dash.warn),
      ('ออกก่อน', b.earlyOnly, Dash.info),
      ('ลืมออก', b.noOutOnly, Dash.bad),
    ];
    final total = b.days;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: Dash.card,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('มาทำงาน', style: Dash.body(size: 12.5, color: Dash.muted)),
              const SizedBox(width: 8),
              // นับขึ้นจาก 0 — ตาจับได้ว่าตัวเลขนี้เพิ่งเปลี่ยนตามช่วงที่เลือก
              TweenAnimationBuilder<double>(
                key: ValueKey(total),
                tween: Tween(begin: 0, end: total.toDouble()),
                duration: const Duration(milliseconds: 450),
                curve: Curves.easeOutCubic,
                builder: (context, v, _) => Text(
                  '${v.round()} วัน',
                  style: Dash.num(
                    size: 18,
                    weight: FontWeight.w800,
                    color: Dash.ink,
                  ),
                ),
              ),
              const Spacer(),
              // ช่วงวันที่ของตัวเลขชุดนี้ — ใช้ค่าเดียวกับหัวการ์ดกราฟ เพราะสรุปจากแถวชุดเดียวกัน
              Text(
                controller.cardSub,
                style: Dash.body(size: 11.5, color: Dash.muted),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(100),
            child: SizedBox(
              height: Dash.sp(12),
              child: total == 0
                  ? ColoredBox(color: Dash.rowBg)
                  // ยืดจากซ้ายตอนโผล่/เปลี่ยนช่วง — key ผูกกับตัวเลขจริง
                  // ไม่งั้นสลับแท็บแล้วแถบเปลี่ยนค่าเงียบ ๆ ไม่รู้ว่าอัปเดตแล้ว
                  : TweenAnimationBuilder<double>(
                      key: ValueKey(
                        '$total-${b.normalDays}-${b.lateOnly}-${b.earlyOnly}-${b.noOutOnly}',
                      ),
                      tween: Tween(begin: 0, end: 1),
                      duration: const Duration(milliseconds: 550),
                      curve: Curves.easeOutCubic,
                      builder: (context, t, child) => Align(
                        alignment: Alignment.centerLeft,
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: t,
                          child: child,
                        ),
                      ),
                      child: Row(
                        // stretch — ColoredBox/Container ในแถวนี้ไม่มีความสูงของตัวเอง
                        // ปล่อยไว้ Row จะให้ความสูง 0 แถบเลยหายทั้งแถบ
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (final (i, seg) in segs.indexed)
                            if (seg.$2 > 0) ...[
                              // ช่องไฟคั่นเป็นสีพื้นหลัง ไม่ใช่ช่องว่าง — ClipRRect ตัดขอบให้เอง
                              if (i > 0 && segs.take(i).any((e) => e.$2 > 0))
                                Container(width: 2, color: Dash.card),
                              // Expanded ไม่ใช่ Flexible — loose fit ทำให้ ColoredBox
                              // ที่ไม่มีขนาดของตัวเองหดเหลือ 0 แถบเลยหายไปทั้งแถว
                              Expanded(
                                flex: seg.$2,
                                child: ColoredBox(color: seg.$3),
                              ),
                            ],
                        ],
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 14,
            runSpacing: 8,
            children: [
              for (final (label, v, c) in segs) _statLegend(label, v, c),
            ],
          ),
        ],
      ),
    );
  });

  Widget _statLegend(String label, int v, Color c) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          // จางลงเมื่อเป็นศูนย์ — ตายังกวาดหาอันที่มีค่าได้เร็ว
          color: v > 0 ? c : Dash.faint,
          shape: BoxShape.circle,
        ),
      ),
      const SizedBox(width: 6),
      Text(label, style: Dash.body(size: 11.5, color: Dash.muted)),
      const SizedBox(width: 4),
      Text(
        '$v',
        style: Dash.num(
          size: 12.5,
          weight: FontWeight.w700,
          color: v > 0 ? Dash.ink : Dash.faint,
        ),
      ),
    ],
  );

  // ============ การ์ดกราฟ ============

  Widget _chartCard(ChartCard c) {
    final maxMin = c.buckets.fold<int>(
      1,
      (m, b) => b.minutes > m ? b.minutes : m,
    );
    final empty = c.buckets.every((b) => b.minutes == 0 && b.shifts == 0);
    // ไล่สีเข้มทาเฉพาะแถบ legend ท้ายการ์ด — เดิมทาเต็มการ์ดแล้วโดนพื้นการ์ดทับหมด
    // เท่ากับระบายทั้งใบทิ้งทุกเฟรม (raster เสียเปล่าเพราะมองไม่เห็นอยู่ดี)
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _chartBody(c, maxMin, empty),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: Dash.band,
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(16),
              ),
            ),
            child: _legendBar(),
          ),
        ],
      ),
    );
  }

  /// แถบเข้มท้ายการ์ด — ชิปบอกความหมายของสีแท่ง
  /// สีต้องเท่ากับที่วาดเป๊ะ — Figma ใส่ #3382E7 แต่แท่งเป็น #5682E9 legend ที่สีไม่ตรงคือ legend ที่ผิด
  /// ห้ามครอบ Obx: ในนี้ไม่ได้อ่านค่า .obs สักตัว GetX จะมองว่าใช้ผิดแล้วโยน error
  /// ออกมาเป็น ErrorWidget ซึ่งใน release build คือกล่องเทาที่ยืดเต็มพื้นที่ที่เหลือ
  /// (การ์ดกราฟอยู่ใน SliverToBoxAdapter = ความสูงไม่จำกัด เลยเทาลงไปเป็นพันพิกเซล)
  Widget _legendBar() {
    // ชิปชุดเดียวกันทุกแท็บ — แตะเพื่อปิด/เปิดชั้นนั้นในแท่ง
    final chips = [
      _legendChip(Series.ok, Dash.ok, 'ปกติ'),
      _legendChip(Series.late, Dash.warn, 'สาย'),
      _legendChip(Series.early, Dash.info, 'ออกก่อน'),
      _legendChip(Series.bad, Dash.bad, 'ลืมออก/นอกพื้นที่'),
      _legendChip(Series.none, Dash.faint, 'ไม่มีเวร'),
    ];
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
              for (var i = 0; i < chips.length; i++) ...[
                if (i > 0) const SizedBox(width: 8),
                chips[i],
              ],
            ],
          ),
        ),
      ),
    );
  }

  /// ชิป legend กดได้ — ปิดแล้วชั้นนั้นหายจากแท่งและยอดรวมของ tooltip
  /// สถานะปิดใช้ชิปโปร่ง + จุดกลวง + ขีดฆ่า ให้รู้ว่ายังมีอยู่แค่ถูกซ่อน
  Widget _legendChip(Series s, Color c, String label) => Obx(() {
    final on = controller.shown(s);
    return Tappable(
      onTap: () => controller.toggleSeries(s),
      borderRadius: BorderRadius.circular(100),
      splash: c,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: c.withValues(alpha: on ? 0.5 : 0.12),
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
                color: on ? c : Colors.transparent,
                border: on ? null : Border.all(color: c, width: 1.5),
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

  Widget _chartBody(ChartCard c, int maxMin, bool empty) {
    return Container(
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
          _periodHeader(),
          const SizedBox(height: 16),
          // ปุ่มเลื่อนอยู่บนหัวการ์ด — ตอนโหลดต้องคงหัวไว้ ให้กดต่อได้ทันที
          if (controller.rangeLoading.value)
            Shimmer(child: Skel(height: Dash.sp(160), radius: 16))
          else if (empty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Column(
                children: [
                  Icon(
                    PhosphorIconsRegular.calendarX,
                    size: 26,
                    color: Dash.faint,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'ยังไม่มีข้อมูลในช่วงนี้',
                    style: Dash.body(size: 12, color: Dash.muted),
                  ),
                ],
              ),
            )
          // รายสัปดาห์แค่ 7 วัน ไล่ดูทีละวงได้ — ตอบ "วันไหนมีปัญหา" ทันทีโดยไม่ต้องแตะทีละแท่ง
          // เดือน/ปีข้อมูลเยอะเกินกว่าจะไล่ทีละวง จึงยังเป็นกราฟแท่ง
          else
            _rangeBody(c, maxMin),
        ],
      ),
    );
  }

  /// เนื้อกราฟของช่วงที่เลือก — สลับแท็บแล้วตัวใหม่ค่อย ๆ โผล่ขึ้นแทนที่จะเด้งมาทันที
  /// ความสูงของสามแบบไม่เท่ากัน จึงยืด/หดการ์ดตามไปด้วย ไม่ให้กระตุก
  Widget _rangeBody(ChartCard c, int maxMin) {
    final range = controller.range.value;
    final body = switch (range) {
      DashRange.week => _dayStrip(),
      DashRange.month => _monthHeatmap(),
      DashRange.year => _bars(c.buckets, maxMin, c.current, c.byDay),
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
  }

  /// ชิ้นเดียวของการไล่โผล่ — ขยายจาก 88% พร้อมจางเข้า
  /// เด้งเล็กน้อยตอนจบ (easeOutBack) ให้รู้สึกว่าข้อมูล "วางลง" ไม่ใช่แค่จางมา
  static Widget _popIn(double t, Widget child) => Opacity(
    opacity: t,
    child: Transform.scale(
      scale: 0.88 + 0.12 * Curves.easeOutBack.transform(t),
      child: child,
    ),
  );

  /// 7 วันของสัปดาห์เป็นวงกลมสถานะ — สีมาจากเวรที่แย่ที่สุดของวันนั้น
  /// วันที่มีสองเวรผ่าครึ่งทแยง · เวรเดียวที่ผิดหลายอย่างมีจุดเล็กมุมบน
  Widget _dayStrip() {
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
                  child: _popIn(
                    appearAt(t, i, 7),
                    _dayDot(
                      mon.add(Duration(days: i)),
                      DashboardController.weekdayNames[i],
                      map,
                      sel,
                      today,
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        // กล่องรายละเอียดสูงไม่เท่ากันตามจำนวนเวร — ยืด/หดให้ลื่น ไม่ใช่กระตุกเปลี่ยนความสูงทันที
        AnimatedSize(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          alignment: Alignment.topCenter,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 180),
            // ครอสเฟดตัวเก่า-ใหม่ตรงที่เดิม ไม่ให้ตัวเก่าดันความสูงระหว่างเปลี่ยน
            layoutBuilder: (cur, prev) => Stack(
              alignment: Alignment.topCenter,
              children: [...prev, if (cur != null) cur],
            ),
            child: KeyedSubtree(
              key: ValueKey(sel),
              child: _dayDetail(sel, map),
            ),
          ),
        ),
      ],
    );
  }

  Widget _dayDot(
    DateTime d,
    String wd,
    Map<String, List<Map<String, dynamic>>> map,
    String sel,
    String today,
  ) {
    final key = DashboardController.ymd(d);
    final shifts = map[key] ?? const <Map<String, dynamic>>[];
    final isToday = key == today;
    final on = key == sel;
    final size = Dash.box(38);
    final marks = _visibleMarks(shifts);
    // ปิด "ไม่มีเวร" จาก legend = ไม่ต้องวาดวงเทาของวันที่ไม่มีเวรเลย
    final blank = controller.hiddenSeries.contains(Series.none);
    return Tappable(
      onTap: shifts.isEmpty
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
              wd,
              style: Dash.body(
                size: 10.5,
                color: isToday ? Dash.accent : Dash.muted,
              ),
            ),
            const SizedBox(height: 6),
            SizedBox(
              width: size,
              height: size,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
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
                ],
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${d.day}',
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
  }

  /// ปฏิทินความเข้มรายเดือน — แถวละสัปดาห์ คอลัมน์ละวัน
  /// สีบอกสถานะเหมือนแถบรายสัปดาห์ · ความเข้มบอกชั่วโมงทำงาน (เต็มที่ 8 ชม.)
  /// กราฟแท่งรายสัปดาห์เดิมบอกได้แค่ยอดรวมของทั้งสัปดาห์ ไม่เห็นว่าวันไหนหนัก/วันไหนมีปัญหา
  Widget _monthHeatmap() {
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
                          child: _popIn(
                            appearAt(t, r * 7 + c, weeks * 7),
                            _heatCell(
                              start.add(Duration(days: r * 7 + c)),
                              first.month,
                              map,
                              sel,
                              today,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        AnimatedSize(
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
              key: ValueKey(sel),
              child: _dayDetail(sel, map),
            ),
          ),
        ),
      ],
    );
  }

  Widget _heatCell(
    DateTime d,
    int month,
    Map<String, List<Map<String, dynamic>>> map,
    String sel,
    String today,
  ) {
    // วันของเดือนข้างเคียงที่หลุดเข้ามาในสัปดาห์แรก/สุดท้าย — เว้นว่างไว้ ไม่นับรวม
    if (d.month != month) {
      return const AspectRatio(aspectRatio: 1.1, child: SizedBox());
    }
    final key = DashboardController.ymd(d);
    final all = map[key] ?? const <Map<String, dynamic>>[];
    final hidden = controller.hiddenSeries;
    // เหลือเฉพาะเวรที่สถานะยังเปิดอยู่ใน legend — ปิดหมดแล้ววันนั้นต้องว่างเหมือนไม่มีเวร
    final shifts = [
      for (final r in all)
        if (!hidden.contains(_seriesOf(DashboardController.markOf(r)))) r,
    ];
    final blank = hidden.contains(Series.none);
    final mins = shifts.fold<int>(
      0,
      (sum, r) => sum + controller.workedMinutes(r),
    );
    var mark = shifts.isEmpty ? null : DayMark.ok;
    for (final r in shifts) {
      final k = DashboardController.markOf(r);
      if (k.index > mark!.index) mark = k;
    }
    // ไล่เฉด 4→10 ชม. ไม่ใช่ 0→8 — เวรจริงเกาะแถว 7-9 ชม. เริ่มที่ 0 แล้วทุกวันเข้มเท่ากันหมด
    // ใช้ค่าคงที่ ไม่ใช่ค่าสูงสุดของเดือน เดือนไหนก็เทียบกันได้
    final t = ((mins - 240) / 360).clamp(0.0, 1.0);
    final on = key == sel;
    final isToday = key == today;
    final a = 0.3 + 0.7 * t;
    final bg = mark == null
        ? (blank ? Colors.transparent : Dash.rowBg)
        : dayMarkColor(mark).withValues(alpha: a);
    // วันที่มีสองเวรคนละสถานะ — ผ่าครึ่งทแยงเหมือนวงกลมในมุมมองรายสัปดาห์
    final marks = [for (final r in shifts) DashboardController.markOf(r)];
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
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: split == null ? bg : null,
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
                if (split != null)
                  Positioned.fill(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: CustomPaint(painter: SplitBox(split.$1, split.$2)),
                    ),
                  ),
                Center(
                  child: Text(
                    '${d.day}',
                    style: Dash.num(
                      size: 11,
                      weight: FontWeight.w700,
                      // พื้นเข้มแล้วตัวเลขต้องขาว ไม่งั้นอ่านไม่ออก
                      color: mark == null
                          ? Dash.faint
                          : (t > 0.4 ? Dash.on : Dash.sub),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// ชิป legend หนึ่งตัวคุมหนึ่งสถานะ — แปลงกลับให้วงกลม/ปฏิทินใช้ตัวกรองเดียวกับกราฟแท่ง
  static Series _seriesOf(DayMark m) => switch (m) {
    DayMark.ok => Series.ok,
    DayMark.late => Series.late,
    DayMark.early => Series.early,
    DayMark.bad => Series.bad,
  };

  /// เวรของวันนั้นที่ยังไม่ถูกปิดจาก legend (อ่าน Rx ตรงนี้ = ทั้งการ์ดวาดใหม่เมื่อกดชิป)
  List<DayMark> _visibleMarks(List<Map<String, dynamic>> shifts) {
    final hidden = controller.hiddenSeries;
    return [
      for (final r in shifts)
        if (!hidden.contains(_seriesOf(DashboardController.markOf(r))))
          DashboardController.markOf(r),
    ];
  }

  /// บรรทัดใต้แถบ — บอกว่าวันที่แตะมีเวรอะไร เวลาเท่าไหร่ ผิดตรงไหน
  Widget _dayDetail(String key, Map<String, List<Map<String, dynamic>>> map) {
    final list = key.isEmpty
        ? const <Map<String, dynamic>>[]
        : (map[key] ?? const []);
    if (list.isEmpty) {
      return Container(
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
    final d = DateTime.parse(key);
    // วันไหนมีเวรที่ต้องแก้ กดที่การ์ดตรงไหนก็เข้าฟอร์มได้ ไม่ต้องเล็งบรรทัด
    // (วันควบเวรที่ต้องแก้ทั้งคู่ ให้เข้าเวรแรกก่อน — ส่งเสร็จค่อยกลับมากดอีกที)
    final fixable = list.where(_needsFix).toList();
    return Tappable(
      onTap: fixable.isEmpty ? null : () => _openFixForm(fixable.first),
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
                      _shiftLine(r),
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

  /// เวรนี้ยื่นคำขอแก้ไขได้ไหม — เกณฑ์เดียวกับการ์ดแจ้งเตือนด้านบน
  /// (มาสาย/ออกก่อนไม่นับ เพราะเวลาที่เครื่องบันทึกถูกต้องอยู่แล้ว)
  static bool _needsFix(Map<String, dynamic> r) =>
      rowNoIn(r) || rowNoOut(r) || r['out_area'] == true;

  /// เปิดฟอร์มขอแก้ไขของวันนั้นตรง ๆ — ส่งแล้วจำไว้ว่าวันนี้ยื่นไปแล้ว
  /// ให้หน้ารายการเปิดมาเห็นอยู่ในแท็บ "ส่งแล้ว" ตรงกัน
  Future<void> _openFixForm(Map<String, dynamic> r) async {
    final ok = await Get.toNamed<Object?>(Routes.fixRequestForm, arguments: r);
    if (ok == true) FixRequestView.sentDates.add('${r['date']}');
  }

  String _shiftLine(Map<String, dynamic> r) {
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

  /// แท่งแนวตั้ง = ชั่วโมงทำงานของวัน/เดือนนั้น · เส้นประ = เกณฑ์ 8 ชม.
  /// อ่านได้ทันทีว่า "วันไหนทำงานสั้น/ยาวผิดปกติ" ซึ่งดูจากตัวเลขอย่างเดียวไม่เห็น
  Widget _bars(List<Bucket> list, int maxMin, int? cur, bool byDay) {
    // ต้องอ่าน Rx ตรงนี้ ไม่ใช่ใน LayoutBuilder ด้านล่าง — builder ของ LayoutBuilder ทำงานตอน layout
    // ซึ่งอยู่นอก closure ของ Obx แล้ว GetX จึงไม่เห็นว่าใครพึ่งค่าไหน กด legend/แท่งแล้วกราฟไม่ขยับ
    final hidden = {...controller.hiddenSeries};
    final touched = controller.touchedBar.value;
    const target =
        8.0; // เพดานขั้นต่ำของสเกล — วันที่ทำงานน้อยจะได้ไม่ถูกดันจนเต็มกราฟ
    final maxH = maxMin / 60;
    final top =
        (byDay ? (maxH < target ? target : maxH) : maxH) *
        1.18; // เผื่อที่ให้ป้ายค่าลอยเหนือแท่ง
    // แท่งเยอะเกินกว่าจะใส่ป้ายครบ — เว้นระยะให้อ่านออก
    final step = list.length > 20 ? 5 : 1;

    return LayoutBuilder(
      builder: (context, box) {
        // ความกว้างแท่งตามพื้นที่จริง — เดิมตายตัว 16 ทำให้กราฟ 5 แท่งดูผอมเก้อ
        final barW = (box.maxWidth / list.length * 0.6).clamp(5.0, 30.0);
        return SizedBox(
          height: Dash.sp(160),
          // แท่งไล่งอกจากพื้นทีละแท่ง ซ้าย→ขวา ทุกครั้งที่เปลี่ยนชุดข้อมูล
          child: ChartAppear(
            trigger: '${controller.month.value.year}|${list.length}|$byDay',
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
                        if (i < 0 || i >= list.length)
                          return const SizedBox.shrink();
                        if (step > 1 && i % step != 0)
                          return const SizedBox.shrink();
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: SizedBox(
                            width: box.maxWidth / list.length - 2,
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                list[i].label,
                                maxLines: 1,
                                softWrap: false,
                                style: Dash.body(
                                  size: 10,
                                  color: i == cur ? Dash.accent : Dash.muted,
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
                        groupIndex < 0 || groupIndex >= list.length
                        ? null
                        : _tooltip(list[groupIndex], byDay, hidden),
                  ),
                ),
                barGroups: [
                  for (var i = 0; i < list.length; i++)
                    _group(
                      i,
                      list[i],
                      top,
                      barW,
                      hidden,
                      touched,
                      current: i == cur,
                      grow: Curves.easeOutCubic.transform(
                        appearAt(t, i, list.length),
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

// ============ การ์ด "การสแกนของวันนี้" ============
