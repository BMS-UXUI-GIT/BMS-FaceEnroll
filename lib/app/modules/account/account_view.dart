import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../widgets/tappable.dart';

import '../../routes/app_pages.dart';
import '../../services/settings_service.dart';
import '../../theme/nexus.dart';

/// บัญชี — ข้อมูลผู้ใช้ที่ล็อกอินอยู่ + ทางลัดตั้งค่า/ออกจากระบบ
class AccountBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut(() => AccountController());
  }
}

class AccountController extends GetxController {
  final settings = Get.find<SettingsService>();

  Future<void> logout() async {
    await settings.logout();
    Get.offAllNamed<void>(Routes.login);
  }
}

class AccountView extends GetView<AccountController> {
  const AccountView({super.key});

  @override
  Widget build(BuildContext context) {
    final s = controller.settings;
    return Scaffold(
      body: Container(
        decoration: Nexus.pScreenBg,
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 12, 18, 4),
                child: Text('บัญชี', style: Nexus.tech(size: 17, weight: FontWeight.w700)),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(18, 8, 18, 110), // 110 = เว้นที่ให้ dock ลอย
                  children: [
                    _profileCard(s),
                    const SizedBox(height: 16),
                    _tile(
                      PhosphorIconsRegular.gear,
                      'ตั้งค่า',
                      'จุดสแกน · liveness · การแจ้งเตือน',
                      () => Get.toNamed<void>(Routes.settings),
                    ),
                    const SizedBox(height: 10),
                    _tile(
                      PhosphorIconsRegular.identificationBadge,
                      'ลงทะเบียนใบหน้า',
                      'ถ่ายใบหน้าใหม่ / อัปเดตข้อมูล',
                      () {
                        Get.toNamed<void>(Routes.registration);
                      },
                    ),
                    const SizedBox(height: 10),
                    _tile(PhosphorIconsRegular.lock, 'เปลี่ยน PIN', 'ตั้งรหัส PIN สำหรับปลดล็อกแอป', () {
                      Get.toNamed<void>(Routes.setPin);
                    }),
                    const SizedBox(height: 22),
                    _logoutButton(),
                    const SizedBox(height: 14),
                    Center(
                      child: Obx(() => Text(s.appVersion.value, style: Nexus.body(size: 11, color: Nexus.pMuted))),
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

  Widget _profileCard(SettingsService s) => Container(
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(
      color: Nexus.pSheet,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: Nexus.pLine),
    ),
    child: Row(
      children: [
        Container(
          width: 54,
          height: 54,
          alignment: Alignment.center,
          decoration: BoxDecoration(shape: BoxShape.circle, gradient: Nexus.cyanGradient),
          child: Icon(PhosphorIconsRegular.user, size: 28, color: Nexus.pOn),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Obx(
            () => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  s.staffName.value.isEmpty ? (s.loginName.value.isEmpty ? '-' : s.loginName.value) : s.staffName.value,
                  style: Nexus.tech(size: 15.5, weight: FontWeight.w700),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  s.empId.value.isEmpty ? '-' : 'รหัสพนักงาน ${s.empId.value}',
                  style: Nexus.body(size: 12, color: Nexus.pSub),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  s.hospitalName.value.isEmpty ? 'รพ. ${s.hcode.value}' : s.hospitalName.value,
                  style: Nexus.body(size: 11.5, color: Nexus.pMuted),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  );

  Widget _tile(IconData icon, String title, String sub, VoidCallback onTap) => Tappable(
    onTap: onTap,
    borderRadius: BorderRadius.circular(16),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Nexus.pPanel,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Nexus.pLine),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Nexus.pAccent),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Nexus.tech(size: 13.5, weight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(sub, style: Nexus.body(size: 11.5, color: Nexus.pMuted)),
              ],
            ),
          ),
          Icon(PhosphorIconsRegular.caretRight, size: 20, color: Nexus.pDim),
        ],
      ),
    ),
  );

  Widget _logoutButton() => Tappable(
    onTap: controller.logout,
    borderRadius: BorderRadius.circular(16),
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Nexus.pBadBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Nexus.pBadBorder),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(PhosphorIconsRegular.signOut, size: 18, color: Nexus.pBad),
          const SizedBox(width: 8),
          Text(
            'ออกจากระบบ',
            style: Nexus.tech(size: 13.5, weight: FontWeight.w700, color: Nexus.pBad),
          ),
        ],
      ),
    ),
  );
}
