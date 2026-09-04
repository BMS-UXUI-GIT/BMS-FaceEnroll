import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../widgets/tappable.dart';

import '../../theme/nexus.dart';
import '../../widgets/dismiss_keyboard.dart';
import '../../widgets/hospital_picker.dart';
import 'login_controller.dart';

/// หน้า Login — ธีม NEXUS (cyber dark) · คง logic HOSxP เดิม
class LoginView extends GetView<LoginController> {
  const LoginView({super.key});

  @override
  Widget build(BuildContext context) {
    final s = controller.settings;
    return DismissKeyboard(
      child: Scaffold(
        body: Container(
          decoration: Nexus.pScreenBg,
          child: SafeArea(
            child: LayoutBuilder(
              builder: (context, box) => SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: box.maxHeight),
                  child: IntrinsicHeight(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(26, 14, 26, 26),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Obx(
                                () => _circleBtn(
                                  controller.settings.themeMode.value == 'dark'
                                      ? PhosphorIconsRegular.sun
                                      : PhosphorIconsRegular.moon,
                                  controller.toggleTheme,
                                  'สลับ มืด/สว่าง',
                                ),
                              ),
                              _circleBtn(PhosphorIconsRegular.gear, () => _openHcode(context), 'ตั้งค่ารหัสโรงพยาบาล'),
                            ],
                          ),
                          const SizedBox(height: 22),
                          Center(
                            child: Container(
                              width: 58,
                              height: 58,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(17),
                                boxShadow: Nexus.glow(0.5, 24),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(17),
                                child: Image.asset('assets/images/logo.png', width: 58, height: 58, fit: BoxFit.cover),
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Center(
                            child: Text('FaceCheck', style: Nexus.tech(size: 18, weight: FontWeight.w700, spacing: 1)),
                          ),
                          const SizedBox(height: 8),
                          Center(
                            child: Obx(
                              () => Tappable(
                                onTap: () => _openHcode(context),
                                borderRadius: BorderRadius.circular(20),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: Nexus.pPanel,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: Nexus.pLine2),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Flexible(
                                        child: Text(
                                          s.hcode.value.isEmpty
                                              ? 'เลือกโรงพยาบาล'
                                              : (s.hospitalName.value.isEmpty
                                                    ? 'รพ. ${s.hcode.value}'
                                                    : '${s.hcode.value} · ${s.hospitalName.value}'),
                                          overflow: TextOverflow.ellipsis,
                                          style: Nexus.tech(size: 11.5, color: Nexus.pSub, spacing: 1),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Icon(
                                        s.hcode.value.isEmpty
                                            ? PhosphorIconsRegular.plus
                                            : PhosphorIconsRegular.caretDown,
                                        size: 14,
                                        color: Nexus.pAccent,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 26),
                          Center(
                            child: Text('เข้าสู่ระบบ', style: Nexus.tech(size: 22, weight: FontWeight.w700)),
                          ),
                          const SizedBox(height: 3),
                          Center(
                            child: Text(
                              'ลงชื่อเข้าใช้ด้วยบัญชีพนักงาน',
                              style: Nexus.body(size: 12, color: Nexus.pMuted),
                            ),
                          ),
                          const SizedBox(height: 24),
                          _field(
                            icon: PhosphorIconsRegular.user,
                            ctrl: controller.loginCtrl,
                            hint: 'ชื่อผู้ใช้ · Username',
                          ),
                          const SizedBox(height: 12),
                          Obx(
                            () => _field(
                              icon: PhosphorIconsRegular.lock,
                              ctrl: controller.passCtrl,
                              hint: 'รหัสผ่าน · Password',
                              obscure: controller.obscure.value,
                              onSubmit: controller.doLogin,
                              suffix: Tappable(
                                onTap: controller.obscure.toggle,
                                child: Icon(
                                  controller.obscure.value ? PhosphorIconsRegular.eyeSlash : PhosphorIconsRegular.eye,
                                  color: Nexus.pDim,
                                  size: 19,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          Obx(
                            () => SizedBox(
                              height: 20,
                              child: controller.message.value.isEmpty
                                  ? null
                                  : Text(controller.message.value, style: Nexus.body(size: 12.5, color: Nexus.pBad)),
                            ),
                          ),
                          const Spacer(),
                          Obx(
                            () => controller.busy.value
                                ? Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      gradient: Nexus.cyanGradient,
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: SizedBox(
                                      height: 22,
                                      width: 22,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Nexus.pOn),
                                    ),
                                  )
                                : NexusButton(label: 'เข้าสู่ระบบ · Sign in', onTap: controller.doLogin),
                          ),
                          const SizedBox(height: 14),
                          Center(
                            child: Obx(
                              () => Text(s.appVersion.value, style: Nexus.body(size: 11, color: Nexus.pMuted)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _circleBtn(IconData icon, VoidCallback onTap, String tip) => Tooltip(
    message: tip,
    child: Tappable(
      onTap: onTap,
      circle: true,
      child: Container(
        width: 34,
        height: 34,
        padding: const EdgeInsets.all(1),
        decoration: BoxDecoration(shape: BoxShape.circle, color: Nexus.pLine),
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(shape: BoxShape.circle, color: Nexus.pPanel),
          child: Icon(icon, size: 18, color: Nexus.pAccent),
        ),
      ),
    ),
  );

  Widget _field({
    required IconData icon,
    required TextEditingController ctrl,
    required String hint,
    bool obscure = false,
    VoidCallback? onSubmit,
    Widget? suffix,
  }) {
    return TextField(
      controller: ctrl,
      obscureText: obscure,
      onSubmitted: onSubmit == null ? null : (_) => onSubmit(),
      textInputAction: onSubmit == null ? TextInputAction.next : TextInputAction.done,
      style: Nexus.body(size: 14.5, color: Nexus.pInk),
      decoration: InputDecoration(
        prefixIcon: Icon(icon, size: 19, color: Nexus.pDim),
        suffixIcon: suffix,
        hintText: hint,
      ),
    );
  }

  void _openHcode(BuildContext context) {
    Get.bottomSheet(
      HospitalPicker(
        search: controller.searchHospitals,
        onSelected: (h) {
          controller.saveHospital(h.hcode, h.name);
          Get.back<void>();
        },
      ),
      isScrollControlled: true,
    );
  }
}
