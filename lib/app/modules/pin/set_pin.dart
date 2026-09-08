import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../routes/app_pages.dart';
import '../../services/pin_service.dart';
import '../../theme/nexus.dart';
import 'pin_pad.dart';

/// ตั้ง PIN ครั้งแรก (หลัง login) — ใส่ + ยืนยันซ้ำ แล้วเข้า home
class SetPinController extends GetxController {
  final PinService pin = Get.find<PinService>();
  final firstPin = RxnString(); // PIN รอบแรก (null = ยังอยู่รอบแรก)
  final entered = ''.obs;
  final error = ''.obs;

  bool get confirming => firstPin.value != null;
  String get title =>
      confirming ? 'ยืนยัน PIN อีกครั้ง' : 'ตั้ง PIN ${pin.pinLength} หลัก';

  void onKey(String d) {
    if (entered.value.length >= pin.pinLength) return;
    error.value = '';
    entered.value += d;
    if (entered.value.length == pin.pinLength) _next();
  }

  void backspace() {
    final e = entered.value;
    if (e.isNotEmpty) entered.value = e.substring(0, e.length - 1);
  }

  Future<void> _next() async {
    if (!confirming) {
      firstPin.value = entered.value;
      entered.value = '';
      return;
    }
    if (entered.value == firstPin.value) {
      await pin.setPin(entered.value);
      Get.offAllNamed(Routes.home);
    } else {
      error.value = 'PIN ไม่ตรงกัน เริ่มใหม่';
      firstPin.value = null;
      entered.value = '';
    }
  }
}

class SetPinBinding extends Bindings {
  @override
  void dependencies() => Get.lazyPut(() => SetPinController());
}

class SetPinView extends GetView<SetPinController> {
  const SetPinView({super.key});

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false, // ต้องตั้ง PIN ก่อนถึงเข้าใช้งานได้
      child: Scaffold(
        body: Container(
          decoration: Nexus.pScreenBg,
          child: SafeArea(
            child: Obx(
              () => Column(
                children: [
                  const Spacer(),
                  Container(
                    width: 56,
                    height: 56,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Nexus.pPanel,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Nexus.pLine),
                    ),
                    child: Icon(
                      PhosphorIconsRegular.lock,
                      size: 26,
                      color: Nexus.pAccent,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    controller.title,
                    style: Nexus.tech(size: 19, weight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'ใช้ปลดล็อกแอปครั้งต่อไป',
                    style: Nexus.body(size: 12, color: Nexus.pMuted),
                  ),
                  const SizedBox(height: 28),
                  PinDots(
                    length: controller.pin.pinLength,
                    filled: controller.entered.value.length,
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    height: 22,
                    child: Text(
                      controller.error.value,
                      style: Nexus.body(size: 13, color: Nexus.pBad),
                    ),
                  ),
                  const SizedBox(height: 8),
                  PinKeypad(
                    onKey: controller.onKey,
                    onDelete: controller.backspace,
                  ),
                  const Spacer(),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
