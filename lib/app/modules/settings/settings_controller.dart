import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../routes/app_pages.dart';
import '../../services/settings_service.dart';
import '../../theme/nexus.dart';

/// หน้าตั้งค่า — ผูก view กับ .obs ของ SettingsService ตรงๆ แล้วกดบันทึก
class SettingsController extends GetxController {
  final s = Get.find<SettingsService>();

  Future<void> save() async {
    await s.save();
    Get.snackbar(
      'บันทึกแล้ว',
      'การตั้งค่าถูกบันทึกเรียบร้อย',
      snackPosition: SnackPosition.BOTTOM,
      margin: const EdgeInsets.all(16),
      borderRadius: 14,
      backgroundColor: Nexus.sheet,
      colorText: Nexus.ink,
      borderColor: Nexus.line2,
      borderWidth: 1,
      icon: const Icon(PhosphorIconsRegular.checkCircle, color: Nexus.green),
      duration: const Duration(seconds: 2),
    );
  }

  void goRegister() => Get.toNamed(Routes.registration);

  /// สลับโหมดธีม มืด/สว่าง → อัปเดต Nexus + persist + rebuild ทั้งแอป
  void setThemeMode(bool dark) {
    s.themeMode.value = dark ? 'dark' : 'light';
    Nexus.applyMode(dark);
    s.save();
    Get.forceAppUpdate();
  }

  Future<void> logout() async {
    await s.logout();
    Get.offAllNamed(Routes.login);
  }
}

class SettingsBinding extends Bindings {
  @override
  void dependencies() => Get.lazyPut(() => SettingsController());
}
