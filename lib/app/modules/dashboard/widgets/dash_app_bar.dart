import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../dash_theme.dart';
import '../dashboard_controller.dart';
import 'dash_buttons.dart';

/// หัวแอปของแดชบอร์ด — floating: เลื่อนลงอ่านเนื้อหาแล้วหายสนิท ปัดขึ้นนิดเดียวก็โผล่กลับมา
/// (ไม่ pinned เพราะกินที่จอถาวรทั้งที่เป็นแค่ชื่อหน้า)
/// พื้นที่ status bar ไปกันไว้ที่หัวแผงน้ำเงินที่ตรึงอยู่แทน
/// โผล่กลับมาจากการปัดขึ้นกลางหน้า = ผู้ใช้รู้อยู่แล้วว่าหน้านี้คืออะไร
/// คำอธิบายจึงจางหายตาม 40dp แรกของการเลื่อน (ดู [DashboardController.subFade])
class DashAppBar extends StatelessWidget {
  const DashAppBar({super.key, required this.controller});

  final DashboardController controller;

  @override
  Widget build(BuildContext context) => SliverAppBar(
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
                        : DashIconButton(
                            icon: PhosphorIconsRegular.arrowsClockwise,
                            onTap: controller.resetAndRefresh,
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
}
