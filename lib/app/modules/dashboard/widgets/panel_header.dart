import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../widgets/tappable.dart';
import '../dash_theme.dart';
import '../dashboard_controller.dart';
import 'month_picker_sheet.dart';
import 'sliver_headers.dart';
import 'underline_tab.dart';

/// ชื่อของแต่ละช่วงที่เลือกได้ — เรียงตามลำดับที่แสดงในแถบแท็บ
const Map<DashRange, String> kRangeNames = {
  DashRange.week: 'รายสัปดาห์',
  DashRange.month: 'รายเดือน',
  DashRange.year: 'รายปี',
};

/// หัวข้อแผง + บรรทัดบอกความสดของข้อมูล + ปุ่มเลือกเดือน — อยู่ในหัวที่ตรึงไว้
class PanelTitleRow extends StatelessWidget {
  const PanelTitleRow({super.key, required this.controller});

  final DashboardController controller;

  @override
  Widget build(BuildContext context) => Padding(
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
        MonthChip(controller: controller),
      ],
    ),
  );
}

/// ปุ่มเลือกเดือน — โปร่งใส ไม่ใช่ขาวทึบ กันสับสนกับแท็บที่เลือกซึ่งเป็นพิลขาว
class MonthChip extends StatelessWidget {
  const MonthChip({super.key, required this.controller});

  final DashboardController controller;

  @override
  Widget build(BuildContext context) => Obx(
    () => Tappable(
      onTap: () => showMonthPickerSheet(controller),
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
}

/// แท็บเลือกช่วง — เหลี่ยม ชิดขอบจอ ตัวที่เลือกขีดเส้นใต้
/// 3 ตัวเลือกเห็นครบในจอเดียว กดสลับได้ทันทีไม่ต้องเปิดชั้นซ้อน
/// สูง 40 ตัวแท็บ + 3 ขีดใต้ · เส้นฐานอีก 1 มาจากขอบล่างของกล่องนี้
class RangeTabs extends StatelessWidget {
  const RangeTabs({super.key, required this.controller});

  final DashboardController controller;

  @override
  Widget build(BuildContext context) => Obx(
    () => DecoratedBox(
      // เส้นฐานจาง ๆ ให้เห็นว่าแถวนี้เป็นแท็บ ไม่ใช่ข้อความลอย
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Dash.onPanel(0.25))),
      ),
      child: SizedBox(
        height: Dash.box(40) + 3,
        child: Row(
          children: [
            for (final e in kRangeNames.entries)
              Expanded(
                child: UnderlineTab(
                  label: e.value,
                  on: controller.range.value == e.key,
                  onTap: () => controller.setRange(e.key),
                  onPanel: true,
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

/// หัวแผงทั้งก้อน (หัวข้อ + ปุ่มเดือน + แท็บ) ตรึงไว้บนสุดของแผงน้ำเงิน
/// ความสูงคงที่ทุกสถานะ — เดิมพอตรึงแล้วสูงเพิ่มรวดเดียว ~70dp เลยกระตุกเห็นชัด
class PanelHeaderSliver extends StatelessWidget {
  const PanelHeaderSliver({super.key, required this.controller});

  final DashboardController controller;

  /// ช่องไฟหัวแผงตอนยังไม่ตรึง
  static const double _restGap = 14;

  @override
  Widget build(BuildContext context) {
    // หัวแอปเป็น floating หายสนิทตอนเลื่อนลง — พอหัวนี้ตรึงถึงบนสุดจะไปอยู่ใต้ status bar
    // ตอนยังไม่ตรึงใช้ช่องไฟหัวแผงปกติ แล้วค่อยขยายเป็นความสูง status bar ระหว่างเลื่อนขึ้นไปตรึง
    // (เครื่องที่ safe area สูง ๆ เคยได้ช่องไฟ 44-47 ตั้งแต่ยังไม่ตรึง หัวข้อเลยลอยห่างขอบแผงมาก)
    final safeTop = MediaQuery.viewPaddingOf(context).top;
    final stickGap = safeTop < _restGap ? _restGap : safeTop;
    final grow = stickGap - _restGap;
    final rowH = Dash.box(52); // แถวหัวข้อ + ปุ่มเดือน
    final tabH = Dash.box(40) + 4; // 40 ตัวแท็บ + 3 ขีดใต้ + 1 เส้นฐาน
    return SliverLayoutBuilder(
      builder: (context, cons) {
        // ห้ามใช้ overlapsContent — ค่านั้นมาจาก overlap ของ sliver ก่อนหน้า พอหัวแอปเลิก pinned
        // มันเป็น 0 ตลอด
        final stuck = cons.scrollOffset > 0;
        // โตตามระยะที่เลื่อนไปแล้วพอดี — หัวจึงไม่กระโดดตอนเปลี่ยนเป็นตรึง
        final topPad = grow <= 0
            ? _restGap
            : _restGap + grow * (cons.scrollOffset / grow).clamp(0.0, 1.0);
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
                SizedBox(
                  height: rowH,
                  child: PanelTitleRow(controller: controller),
                ),
                Expanded(child: RangeTabs(controller: controller)),
              ],
            ),
          ),
        );
      },
    );
  }
}
