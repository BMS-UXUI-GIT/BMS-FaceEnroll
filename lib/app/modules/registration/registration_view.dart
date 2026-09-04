import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../widgets/tappable.dart';

import '../../theme/nexus.dart';
import 'registration_controller.dart';

/// ลงทะเบียนใบหน้า — ธีม NEXUS · auto-capture 3 มุม (ตรง/ซ้าย/ขวา)
class RegistrationView extends GetView<RegistrationController> {
  const RegistrationView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF04080E),
      body: Obx(() {
        switch (controller.step.value) {
          case RegStep.checking:
            return _shell(_checking());
          case RegStep.intro:
            return _shell(_intro(context));
          case RegStep.capture:
            return _capture(context);
          case RegStep.done:
            return _shell(_done());
        }
      }),
    );
  }

  Widget _shell(Widget child) => Container(
    decoration: Nexus.screenBg,
    child: SafeArea(child: child),
  );

  // ---------- checking ----------
  Widget _checking() {
    return Center(
      child: Obx(
        () => controller.checkFailed.value
            ? Padding(
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(PhosphorIconsRegular.wifiSlash, size: 56, color: Nexus.muted),
                    const SizedBox(height: 14),
                    Text('เช็คข้อมูลไม่ได้ — ตรวจการเชื่อมต่อ', style: Nexus.body(size: 15, color: Nexus.sub)),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: 200,
                      child: NexusButton(label: 'ลองใหม่', onTap: controller.checkExisting),
                    ),
                  ],
                ),
              )
            : CircularProgressIndicator(color: Nexus.cyan),
      ),
    );
  }

  // ---------- intro (เคยลงแล้ว) ----------
  Widget _intro(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _circleBack(),
              const SizedBox(width: 10),
              Text(
                'ลงทะเบียนใบหน้า',
                style: Nexus.tech(size: 16, weight: FontWeight.w700, color: Nexus.ink),
              ),
            ],
          ),
          const Spacer(),
          Center(
            child: Container(
              width: 84,
              height: 84,
              padding: const EdgeInsets.all(1),
              decoration: BoxDecoration(shape: BoxShape.circle, color: Nexus.cyan),
              child: Container(
                alignment: Alignment.center,
                decoration: BoxDecoration(shape: BoxShape.circle, color: Nexus.cyan.withValues(alpha: 0.12)),
                child: Icon(PhosphorIconsRegular.userFocus, size: 44, color: Nexus.cyan),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Center(
            child: Text(
              'คุณลงทะเบียนใบหน้าไว้แล้ว',
              style: Nexus.tech(size: 20, weight: FontWeight.w700, color: Nexus.ink),
            ),
          ),
          const SizedBox(height: 4),
          Center(
            child: Text('ต้องการทำอะไรต่อ?', style: Nexus.body(size: 13, color: Nexus.muted)),
          ),
          const Spacer(),
          // ปิดปุ่ม "เพิ่มมุม" ไปก่อน (ตามที่สั่ง) — เหลือแค่ลงทะเบียนใหม่ สี cyan
          NexusButton(label: 'ลงทะเบียนใหม่ (ลบของเดิม)', onTap: () => _confirmRedo(context)),
        ],
      ),
    );
  }

  void _confirmRedo(BuildContext context) {
    Get.dialog(
      AlertDialog(
        backgroundColor: Nexus.sheet,
        title: Text(
          'ลงทะเบียนใหม่?',
          style: Nexus.tech(size: 17, weight: FontWeight.w700, color: Nexus.ink),
        ),
        content: Text(
          'จะลบใบหน้าเดิมทั้งหมดออกก่อน แล้วถ่ายใหม่ — ยืนยันไหม?',
          style: Nexus.body(size: 14, color: Nexus.sub),
        ),
        actions: [
          TextButton(
            onPressed: Get.back,
            child: Text('ยกเลิก', style: Nexus.body(size: 14, color: Nexus.muted)),
          ),
          TextButton(
            onPressed: () {
              Get.back<void>();
              controller.reRegister();
            },
            child: Text(
              'ลบแล้วลงใหม่',
              style: Nexus.body(size: 14, weight: FontWeight.w700, color: Nexus.red),
            ),
          ),
        ],
      ),
    );
  }

  // ---------- capture (auto 3 มุม) ----------
  Widget _capture(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        GetBuilder<RegistrationController>(
          builder: (c) {
            if (c.camera == null || !c.camera!.value.isInitialized) {
              return Center(child: CircularProgressIndicator(color: Nexus.cyan));
            }
            return FittedBox(
              fit: BoxFit.cover,
              child: SizedBox(
                width: c.camera!.value.previewSize?.height ?? 720,
                height: c.camera!.value.previewSize?.width ?? 1280,
                child: CameraPreview(c.camera!),
              ),
            );
          },
        ),
        const _Scrim(),
        SafeArea(
          child: Stack(
            fit: StackFit.expand,
            children: [
              Align(
                alignment: Alignment.topCenter,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(8, 6, 8, 0),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          _circleBack(),
                          const SizedBox(width: 10),
                          Text(
                            'ลงทะเบียนใบหน้า',
                            style: Nexus.tech(size: 16, weight: FontWeight.w700, color: Nexus.ink),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Obx(() => _StatusPill(text: controller.instruction.value)),
                    ],
                  ),
                ),
              ),
              Center(child: Obx(() => _ScanOval(detected: controller.faceInZone.value))),
              Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 34),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Obx(
                        () => Text(
                          controller.angleLabel,
                          style: Nexus.tech(size: 16, weight: FontWeight.w600, color: Nexus.cyan, spacing: 1),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Obx(() => _dots(controller.poseIndex.value, controller.totalPoses)),
                      const SizedBox(height: 14),
                      Obx(
                        () => Text(
                          controller.busy.value ? 'กำลังบันทึก…' : 'ระบบจะจับภาพเองเมื่อหน้านิ่ง',
                          style: Nexus.body(size: 12.5, color: Nexus.muted),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _dots(int filled, int total) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(total, (i) {
        final on = i < filled;
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 6),
          width: 11,
          height: 11,
          padding: const EdgeInsets.all(1.5),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: on ? Nexus.cyan : const Color(0xFF2A4D72),
            boxShadow: on ? [BoxShadow(color: Nexus.cyan.withValues(alpha: 0.6), blurRadius: 10)] : null,
          ),
          child: Container(
            decoration: BoxDecoration(shape: BoxShape.circle, color: on ? Nexus.cyan : Colors.transparent),
          ),
        );
      }),
    );
  }

  // ---------- done ----------
  Widget _done() {
    return Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 96,
            height: 96,
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(shape: BoxShape.circle, color: Nexus.cyan, boxShadow: Nexus.glow(0.4, 40)),
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(shape: BoxShape.circle, color: Nexus.cyan.withValues(alpha: 0.12)),
              child: Icon(PhosphorIconsRegular.check, size: 50, color: Nexus.cyan),
            ),
          ),
          const SizedBox(height: 22),
          Text(
            'ลงทะเบียนสำเร็จ',
            style: Nexus.tech(size: 22, weight: FontWeight.w700, color: Nexus.ink),
          ),
          Obx(
            () => Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                controller.message.value,
                textAlign: TextAlign.center,
                style: Nexus.body(size: 13, color: Nexus.muted),
              ),
            ),
          ),
          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            child: NexusButton(label: 'เสร็จสิ้น · Done', onTap: () => Get.back<void>()),
          ),
          const SizedBox(height: 6),
          TextButton(
            onPressed: controller.reset,
            child: Text('ถ่ายเพิ่ม', style: Nexus.body(size: 14, color: Nexus.sub)),
          ),
        ],
      ),
    );
  }

  // ---------- ชิ้นส่วนเล็ก ----------
  Widget _circleBack() => Tappable(
    onTap: Get.back,
    circle: true,
    child: Container(
      width: 34,
      height: 34,
      padding: const EdgeInsets.all(1),
      decoration: BoxDecoration(shape: BoxShape.circle, color: Nexus.line),
      child: Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0x80081420)),
        child: const Icon(PhosphorIconsRegular.arrowLeft, size: 18, color: Nexus.sub),
      ),
    ),
  );
}

class _Scrim extends StatelessWidget {
  const _Scrim();
  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            const Color(0xFF04080E).withValues(alpha: 0.55),
            Colors.transparent,
            Colors.transparent,
            const Color(0xFF04080E).withValues(alpha: 0.65),
          ],
          stops: const [0.0, 0.25, 0.7, 1.0],
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();
    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.86),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
        decoration: BoxDecoration(
          color: const Color(0xCC081420),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: Nexus.line2),
        ),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: Nexus.body(size: 15, weight: FontWeight.w600, color: Nexus.ink),
        ),
      ),
    );
  }
}

/// กรอบวงรี cyan + เส้นสแกนวิ่ง — เขียวเมื่ออยู่ในมุม+นิ่ง (กำลังจะจับ)
class _ScanOval extends StatefulWidget {
  const _ScanOval({required this.detected});
  final bool detected;
  @override
  State<_ScanOval> createState() => _ScanOvalState();
}

class _ScanOvalState extends State<_ScanOval> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000))
    ..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.detected ? Nexus.green : Nexus.cyan;
    return SizedBox(
      width: 240,
      height: 300,
      child: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              border: Border.all(
                color: color.withValues(alpha: widget.detected ? 1 : 0.7),
                width: widget.detected ? 4 : 2.5,
              ),
              borderRadius: const BorderRadius.all(Radius.elliptical(120, 150)),
              boxShadow: [BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 30)],
            ),
          ),
          AnimatedBuilder(
            animation: _c,
            builder: (_, __) => Positioned(
              left: 18,
              right: 18,
              top: 22 + _c.value * 256,
              child: Container(
                height: 3,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [Colors.transparent, color, Colors.transparent]),
                  boxShadow: [BoxShadow(color: color, blurRadius: 12)],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
