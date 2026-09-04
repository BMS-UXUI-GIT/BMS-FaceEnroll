import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../routes/app_pages.dart';
import '../../services/pin_service.dart';
import '../../theme/nexus.dart';
import 'pin_pad.dart';

/// ใส่ PIN — 2 โหมด (อ่านจาก Get.arguments)
///   purpose 'gate'    : ปลดล็อกตอนเปิดแอป → สำเร็จไป home (กดย้อนไม่ได้)
///   purpose 'overlay' : ปลดล็อก resume / ยืนยัน action (#4) → สำเร็จคืน true
///   dismissible true  : กดยกเลิกได้ (คืน false) — ใช้กับ #4
class EnterPinController extends GetxController {
  final PinService pin = Get.find<PinService>();
  final entered = ''.obs;
  final error = ''.obs;
  final lockLeft = 0.obs;

  late final String purpose;
  late final bool dismissible;
  late final String title;
  Timer? _ticker;

  @override
  void onInit() {
    super.onInit();
    final args = (Get.arguments as Map?) ?? const {};
    purpose = (args['purpose'] as String?) ?? 'gate';
    dismissible = (args['dismissible'] as bool?) ?? false;
    title = (args['title'] as String?) ?? 'ใส่ PIN';
    _refreshLock();
  }

  void _refreshLock() {
    lockLeft.value = pin.lockSecondsLeft();
    _ticker?.cancel();
    if (lockLeft.value > 0) {
      var tick = 0;
      _ticker = Timer.periodic(const Duration(seconds: 1), (t) async {
        lockLeft.value = pin.lockSecondsLeft();
        if (lockLeft.value <= 0) {
          t.cancel();
          return;
        }
        // ทุก 10 วิ เช็คว่า admin กด "ปลดล็อค" จาก dashboard ไหม → ปลดทันที
        if (++tick % 10 == 0 && await pin.tryRemoteUnlock()) {
          t.cancel();
          lockLeft.value = 0;
          error.value = '';
        }
      });
    }
  }

  void onKey(String d) {
    if (lockLeft.value > 0) return;
    if (entered.value.length >= pin.savedPinLength) return;
    error.value = '';
    entered.value += d;
    if (entered.value.length == pin.savedPinLength) _submit();
  }

  void backspace() {
    final e = entered.value;
    if (e.isNotEmpty) entered.value = e.substring(0, e.length - 1);
  }

  Future<void> _submit() async {
    if (pin.verify(entered.value)) {
      await pin.onUnlocked();
      if (purpose == 'gate') {
        Get.offAllNamed(Routes.home);
      } else {
        Get.back(result: true);
      }
      return;
    }
    entered.value = '';
    final left = await pin.registerFail();
    if (left == 0) {
      _refreshLock();
      error.value = 'ใส่ผิดเกินกำหนด — ล็อกชั่วคราว';
    } else {
      error.value = 'PIN ไม่ถูกต้อง (เหลือ $left ครั้ง)';
    }
  }

  void cancel() => Get.back(result: false);

  @override
  void onClose() {
    _ticker?.cancel();
    super.onClose();
  }
}

class EnterPinBinding extends Bindings {
  @override
  void dependencies() => Get.lazyPut(() => EnterPinController());
}

class EnterPinView extends GetView<EnterPinController> {
  const EnterPinView({super.key});

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: controller.dismissible,
      child: Scaffold(
        body: Container(
          decoration: Nexus.pScreenBg,
          child: SafeArea(
            child: Obx(() {
              final locked = controller.lockLeft.value > 0;
              return Column(
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
                    child: Icon(PhosphorIconsRegular.lock, size: 26, color: Nexus.pAccent),
                  ),
                  const SizedBox(height: 16),
                  Text(controller.title, style: Nexus.tech(size: 19, weight: FontWeight.w700)),
                  const SizedBox(height: 28),
                  PinDots(length: controller.pin.savedPinLength, filled: controller.entered.value.length),
                  const SizedBox(height: 14),
                  SizedBox(
                    height: 22,
                    child: Text(
                      locked ? 'ลองใหม่ใน ${controller.lockLeft.value} วิ' : controller.error.value,
                      style: Nexus.body(size: 13, color: Nexus.pBad),
                    ),
                  ),
                  const SizedBox(height: 8),
                  PinKeypad(onKey: controller.onKey, onDelete: controller.backspace, disabled: locked),
                  const Spacer(),
                  if (controller.dismissible)
                    TextButton(
                      onPressed: controller.cancel,
                      child: Text('ยกเลิก', style: Nexus.body(size: 14, color: Nexus.pMuted)),
                    ),
                  const SizedBox(height: 16),
                ],
              );
            }),
          ),
        ),
      ),
    );
  }
}
