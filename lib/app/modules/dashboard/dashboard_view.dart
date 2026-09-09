import 'package:flutter/material.dart';
import 'package:get/get.dart';

import 'dash_theme.dart';
import 'dashboard_controller.dart';
import 'widgets/dash_app_bar.dart';
import 'widgets/dash_chart_card.dart';
import 'widgets/dash_error_state.dart';
import 'widgets/dash_page.dart';
import 'widgets/dashboard_skeleton.dart';
import 'widgets/fix_action_banner.dart';
import 'widgets/panel_header.dart';
import 'widgets/stat_summary_card.dart';
import 'widgets/today_card.dart';

/// หน้าแดชบอร์ด — โครงตาม Figma: hero (พื้นฟ้า) + แผงน้ำเงินมุมมนบนที่เลื่อนขึ้นมาซ้อน
///
/// หน้านี้ประกอบจากคอมโพเนนต์ล้วน ๆ ไม่มี UI ของตัวเอง — แต่ละชิ้นอยู่ใน widgets/
/// และรับ [DashboardController] เข้าไปตรง ๆ เพื่อให้ Obx อยู่ใกล้ค่าที่มันฟังที่สุด
class DashboardView extends GetView<DashboardController> {
  const DashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    return DashPage(
      builder: (context) => Obx(() {
        if (controller.error.value.isNotEmpty) {
          return DashErrorState(
            message: controller.error.value,
            onRetry: controller.refreshAll,
          );
        }
        if (controller.loading.value) return const DashboardSkeleton();
        return RefreshIndicator(
          color: Dash.accent,
          backgroundColor: Dash.card,
          onRefresh: controller.resetAndRefresh,
          child: CustomScrollView(
            controller: controller.scroll,
            slivers: [
              DashAppBar(controller: controller),
              // การ์ดวันนี้มี PageView ปัดได้ — กันการวาดซ้ำไม่ให้ลามไปทั้งหน้า
              SliverToBoxAdapter(
                child: RepaintBoundary(child: _TodaySection(controller)),
              ),
              // ช่องไฟก่อนแผงน้ำเงิน — พื้นหน้าปกติ ไม่มีแผ่นการ์ดคั่นแล้ว
              const SliverToBoxAdapter(child: SizedBox(height: 14)),
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
                    PanelHeaderSliver(controller: controller),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                        child: StatSummaryCard(controller: controller),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        // กราฟวาดใหม่เองตอน tween/แตะ — กันไม่ให้ลากแผงน้ำเงินทั้งแผ่นไปวาดด้วย
                        child: RepaintBoundary(
                          child: Obx(
                            () => DashChartCard(
                              controller: controller,
                              card: controller.card,
                            ),
                          ),
                        ),
                      ),
                    ),
                    // แถบเตือนวันที่ต้องตรวจสอบ ปิดท้ายภาพรวม — อ่านกราฟจบแล้วค่อยเจอ
                    // สิ่งที่ต้องลงมือทำต่อ (เดิมอยู่เหนือแผง แทรกก่อนได้อ่านอะไรเลย)
                    SliverToBoxAdapter(
                      child: Obx(
                        () => controller.pendingFixes.isEmpty
                            ? const SizedBox.shrink()
                            : Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  16,
                                  2,
                                  16,
                                  0,
                                ),
                                child: FixActionBanner(
                                  rows: controller.pendingFixes,
                                ),
                              ),
                      ),
                    ),
                    const SliverToBoxAdapter(child: DockSpacer()),
                  ],
                ),
              ),
            ],
          ),
        );
      }),
    );
  }
}

/// ส่วน hero — การ์ด "การสแกนวันนี้" วางบนพื้นหน้าโดยตรง ไม่มีแผ่นการ์ดรองข้างใต้
class _TodaySection extends StatelessWidget {
  const _TodaySection(this.controller);

  final DashboardController controller;

  @override
  Widget build(BuildContext context) => Container(
    color: Dash.bg,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Obx(() => TodayCard(shifts: controller.todayShifts)),
        ),
      ],
    ),
  );
}
