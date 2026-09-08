import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../widgets/tappable.dart';

import '../../theme/nexus.dart';
import '../home/home_binding.dart';
import '../home/home_controller.dart';
import '../account/account_view.dart';
import '../dashboard/dashboard_controller.dart';
import '../dashboard/dashboard_view.dart';
import '../home/home_view.dart';
import '../my_time/my_time.dart';
import 'shell_controller.dart';

/// โครงหลักหลัง login — dock ลอย: หน้าหลัก / แดชบอร์ด / ปุ่มสแกนวงกลมกลาง / ประวัติ / บัญชี
class ShellBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut(() => ShellController());
    HomeBinding().dependencies();
    DashboardBinding().dependencies();
    MyTimeBinding().dependencies();
    AccountBinding().dependencies();
  }
}

class ShellView extends GetView<ShellController> {
  const ShellView({super.key});

  @override
  Widget build(BuildContext context) {
    const pages = [HomeView(), DashboardView(), MyTimeView(), AccountView()];
    return Scaffold(
      extendBody: true, // ให้พื้นหลังหน้าไหลต่อไปหลัง dock — แถบลอยแบบไร้รอยต่อ
      body: Obx(
        () => IndexedStack(
          index: controller.tab.value,
          children: [
            for (var i = 0; i < pages.length; i++)
              controller.built.contains(i) ? pages[i] : const SizedBox.shrink(),
          ],
        ),
      ),
      bottomNavigationBar: _dock(context),
    );
  }

  /// แถบล่าง — พื้นขาวเต็มความกว้าง + drop shadow ขึ้นบน · กินพื้นที่ safe area ด้วย
  /// ปุ่มสแกนโผล่ขึ้นเหนือแถบ จึงต้องวางด้วย Stack (Container ที่มีเงาจะไม่ยอมให้ลูกล้น)
  Widget _dock(BuildContext context) {
    const barH = 76.0; // ความสูงเนื้อหาแถบ (ไม่รวม safe area)
    const lift = 24.0; // ระยะที่ปุ่มสแกนโผล่พ้นขอบบนแถบ
    // เครื่องที่ปุ่มระบบเป็นแถบแยก (ไม่ทับ app) viewPadding.bottom = 0 ป้ายจะไปจ่อขอบจอพอดี
    // จึงบังคับระยะขั้นต่ำไว้ ไม่ใช่พึ่ง inset อย่างเดียว
    final safeBottom = math.max(MediaQuery.viewPaddingOf(context).bottom, 10.0);
    return SizedBox(
      height: barH + safeBottom + lift,
      child: Stack(
        alignment: Alignment.topCenter,
        children: [
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: barH + safeBottom,
            child: Container(
              decoration: BoxDecoration(
                color: Nexus.pSheet,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(
                      alpha: Nexus.isDark ? 0.40 : 0.10,
                    ),
                    blurRadius: 20,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              // พื้นขาวลากลงไปคลุม safe area ด้วย แต่ไอคอนถูกดันขึ้นมาอยู่เหนือ gesture bar
              child: Padding(
                padding: EdgeInsets.only(bottom: safeBottom),
                child: Obx(
                  () => Row(
                    children: [
                      Expanded(
                        child: _navItem(
                          0,
                          PhosphorIconsRegular.house,
                          PhosphorIconsFill.house,
                          'หน้าหลัก',
                        ),
                      ),
                      Expanded(
                        child: _navItem(
                          1,
                          PhosphorIconsRegular.chartBar,
                          PhosphorIconsFill.chartBar,
                          'แดชบอร์ด',
                        ),
                      ),
                      const SizedBox(width: 80), // เว้นช่องให้ปุ่มสแกน
                      Expanded(
                        child: _navItem(
                          2,
                          PhosphorIconsRegular.clockCounterClockwise,
                          PhosphorIconsFill.clockCounterClockwise,
                          'ประวัติ',
                        ),
                      ),
                      Expanded(
                        child: _navItem(
                          3,
                          PhosphorIconsRegular.user,
                          PhosphorIconsFill.user,
                          'บัญชี',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          _scanButton(),
        ],
      ),
    );
  }

  /// ปุ่มสแกนกลาง dock — หัวใจของแอป (กดได้จากทุกแท็บ) · ล็อกเทาถ้ายังไม่ลงทะเบียนใบหน้า
  Widget _scanButton() {
    final home = Get.find<HomeController>();
    return Obx(() {
      final locked = home.registered.value == false;
      return Tappable(
        onTap: locked ? _lockedHint : home.startScan,
        circle: true,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // วงแหวนสีเดียวกับแถบ ให้ปุ่มดูฝังในแถบ — ใช้วงกลมทึบซ้อนกัน ไม่ใช่ Border.all (stroke ไม่ได้ AA)
            Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Nexus.pSheet,
                boxShadow: [
                  BoxShadow(
                    color: (locked ? Colors.black : Nexus.pAccent).withValues(
                      alpha: locked ? 0.16 : 0.30,
                    ),
                    blurRadius: 14,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: Container(
                width: 58,
                height: 58,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: locked ? null : Nexus.cyanGradient,
                  color: locked ? Nexus.pPanel : null,
                ),
                child: Icon(
                  locked ? PhosphorIconsFill.lock : PhosphorIconsFill.userFocus,
                  color: locked ? Nexus.pFaint : Nexus.pOn,
                  size: 28,
                ),
              ),
            ),
            const SizedBox(height: 4),
            _label('สแกน', locked ? Nexus.pMuted : Nexus.pAccent, true),
          ],
        ),
      );
    });
  }

  void _lockedHint() => Get.rawSnackbar(
    messageText: Text(
      'ต้องลงทะเบียนใบหน้าก่อน จึงจะสแกนลงเวลาได้',
      textAlign: TextAlign.center,
      style: Nexus.body(size: 13, weight: FontWeight.w600, color: Nexus.pWarn),
    ),
    backgroundColor: Nexus.pSheet,
    borderRadius: 14,
    margin: const EdgeInsets.fromLTRB(24, 0, 24, 108),
    duration: const Duration(seconds: 2),
  );

  Widget _navItem(int i, IconData icon, IconData iconActive, String label) {
    final sel = controller.tab.value == i;
    final color = sel ? Nexus.pAccent : Nexus.pMuted;
    return Tappable(
      onTap: () => controller.go(i),
      borderRadius: BorderRadius.circular(22),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          // สลับ outline → ทึบ ตอนถูกเลือก (สื่อสถานะโดยไม่ต้องมีวงกลมพื้นหลัง)
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 180),
            transitionBuilder: (w, a) => ScaleTransition(
              scale: a,
              child: FadeTransition(opacity: a, child: w),
            ),
            child: Icon(
              sel ? iconActive : icon,
              key: ValueKey(sel),
              size: 26,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          _label(label, color, sel),
        ],
      ),
    );
  }

  /// ป้ายใต้ไอคอน — จอแคบป้ายยาวจะตัดบรรทัดจนล้น dock จึงบังคับบรรทัดเดียวแล้วย่อแทน
  Widget _label(String text, Color color, bool bold) => FittedBox(
    fit: BoxFit.scaleDown,
    child: Text(
      text,
      maxLines: 1,
      softWrap: false,
      style: Nexus.body(
        size: 11,
        weight: bold ? FontWeight.w700 : FontWeight.w500,
        color: color,
      ),
    ),
  );
}
