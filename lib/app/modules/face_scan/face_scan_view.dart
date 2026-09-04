import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../widgets/tappable.dart';

import '../../theme/nexus.dart';
import 'face_scan_controller.dart';
import 'widgets/liveness_overlay.dart';

/// หน้าสแกนใบหน้า — ธีม NEXUS (กล้องเต็มจอ + กรอบ cyan + การ์ดผล dark)
class FaceScanView extends GetView<FaceScanController> {
  const FaceScanView({super.key});

  /// ขนาดกรอบวงรี — fix 80% ของความกว้างจอ (ไม่ผูกกับตั้งค่า dashboard)
  double _ovalW(BuildContext context) => MediaQuery.of(context).size.width * 0.80;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF04080E),
      body: Obx(() {
        final phase = controller.phase.value;
        // ด่านตำแหน่ง: นอกพื้นที่ / กำลังตรวจตำแหน่ง = ซ่อนกรอบสแกน+ปุ่ม โชว์การ์ดแทน
        final locBlocked = controller.locBlocked.value;
        final locChecking = controller.locChecking.value;
        final scanReady = !locBlocked && !locChecking;
        return Stack(
          fit: StackFit.expand,
          children: [
            if (controller.camera != null && controller.camera!.value.isInitialized)
              FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: controller.camera!.value.previewSize?.height ?? 720,
                  height: controller.camera!.value.previewSize?.width ?? 1280,
                  child: CameraPreview(controller.camera!),
                ),
              )
            else
              Center(child: CircularProgressIndicator(color: Nexus.cyan)),

            const _Scrim(),

            SafeArea(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // ring light: เลเยอร์ขาวโปร่งนอกวงรี (เจาะวงรีใส) — ตอนเปิดปุ่ม fill light
                  if (controller.brightOn.value)
                    Positioned.fill(
                      child: IgnorePointer(
                        child: CustomPaint(
                          painter: _FillOverlayPainter(ovalW: _ovalW(context), ovalH: _ovalW(context) * 1.25),
                        ),
                      ),
                    ),
                  // TOP: back · chip พร้อม
                  Align(
                    alignment: Alignment.topCenter,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 6, 12, 0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _RoundIconButton(icon: PhosphorIconsRegular.arrowLeft, onTap: Get.back),
                          _ReadinessChip(controller: controller),
                        ],
                      ),
                    ),
                  ),

                  if (scanReady &&
                      (phase == ScanPhase.scanning || phase == ScanPhase.processing || controller.livenessActive.value))
                    Align(
                      // วงรีใหญ่ขึ้น (80% ของจอ) — ป้ายสถานะขยับขึ้นไม่ให้ทับวง
                      alignment: const Alignment(0, -0.78),
                      child: _StatusPill(text: controller.message.value),
                    ),

                  if (controller.livenessActive.value)
                    LivenessOverlay(
                      instruction: controller.livenessInstruction.value,
                      completed: controller.livenessCompleted.value,
                      total: controller.livenessTotal.value,
                    ),

                  if (scanReady &&
                      phase == ScanPhase.scanning &&
                      !controller.livenessActive.value &&
                      !controller.paused.value)
                    Center(
                      child: _FaceGuide(
                        detected: controller.faceDetected.value,
                        width: _ovalW(context),
                        height: _ovalW(context) * 1.25,
                      ),
                    ),

                  // นอกพื้นที่ลงเวลา — บล็อกสแกน โชว์การ์ดบอกเหตุ + ปุ่มตรวจใหม่
                  if (locBlocked && phase == ScanPhase.scanning) Center(child: _OutOfAreaCard(controller: controller)),

                  // กำลังตรวจตำแหน่งรอบแรก (ยังไม่รู้ว่าอยู่ในเขตไหม)
                  if (locChecking && !locBlocked && phase == ScanPhase.scanning)
                    Align(alignment: const Alignment(0, -0.4), child: _CheckingLocationPill()),

                  if (controller.paused.value)
                    const Center(child: Icon(PhosphorIconsRegular.pauseCircle, color: Colors.white70, size: 84)),

                  if (phase == ScanPhase.processing)
                    Center(
                      child: SizedBox(
                        width: 60,
                        height: 60,
                        child: CircularProgressIndicator(color: Nexus.cyan, strokeWidth: 3),
                      ),
                    ),

                  if (phase == ScanPhase.success && controller.matched.value != null)
                    Center(child: _SuccessCard(controller: controller)),

                  if (phase == ScanPhase.notFound || phase == ScanPhase.error)
                    Center(
                      child: _ResultCard(kind: controller.resultKind.value, text: controller.message.value),
                    ),

                  if (scanReady && (phase == ScanPhase.scanning || controller.livenessActive.value))
                    Align(
                      alignment: Alignment.bottomCenter,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
                        child: Row(
                          children: [
                            Expanded(child: _FillLightButton(controller: controller)),
                            const SizedBox(width: 10),
                            Expanded(
                              child: controller.paused.value
                                  ? _ResumeScanButton(onTap: controller.resumeScan)
                                  : _StopScanButton(onTap: controller.pauseScan),
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
      }),
    );
  }
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

/// pill บอกสถานะ — จำกัดความกว้าง ~82% จอ (text ยาวห่อบรรทัด)
class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();
    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xCC081420),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: Nexus.line2),
        ),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: Nexus.body(size: 16, weight: FontWeight.w600, color: Nexus.ink),
        ),
      ),
    );
  }
}

/// ปุ่ม fill light (ring light) — toggle เลเยอร์ขาว + จอสว่างสุด · อยู่ข้างหยุดสแกน
class _FillLightButton extends StatelessWidget {
  const _FillLightButton({required this.controller});
  final FaceScanController controller;
  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final on = controller.brightOn.value;
      return Tappable(
        onTap: controller.toggleFillLight,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 13),
          decoration: BoxDecoration(
            color: on ? const Color(0x33FFD86A) : const Color(0x73142840),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: on ? const Color(0xFFFFD86A) : Nexus.line),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(PhosphorIconsRegular.sunDim, size: 17, color: Color(0xFFFFD86A)),
              const SizedBox(width: 7),
              Text(
                on ? 'ปิดไฟ' : 'เพิ่มแสง',
                style: Nexus.body(size: 13, weight: FontWeight.w600, color: Nexus.ink),
              ),
            ],
          ),
        ),
      );
    });
  }
}

/// เลเยอร์ขาวโปร่งทั้งจอ เจาะวงรีใส (ring light) — วงรีขนาดเดียวกับ _FaceGuide
class _FillOverlayPainter extends CustomPainter {
  const _FillOverlayPainter({required this.ovalW, required this.ovalH});
  final double ovalW;
  final double ovalH;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.saveLayer(rect, Paint());
    canvas.drawRect(rect, Paint()..color = const Color(0x6BFFFFFF)); // ขาว ~42% (มองทะลุได้นิดหน่อย)
    final oval = Rect.fromCenter(center: rect.center, width: ovalW, height: ovalH);
    canvas.drawRRect(
      RRect.fromRectAndRadius(oval, Radius.elliptical(ovalW / 2, ovalH / 2)),
      Paint()..blendMode = BlendMode.clear,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _FillOverlayPainter oldDelegate) =>
      oldDelegate.ovalW != ovalW || oldDelegate.ovalH != ovalH;
}

/// ปุ่มกลม พื้นเข้มโปร่ง (back)
class _RoundIconButton extends StatelessWidget {
  const _RoundIconButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(1),
          decoration: BoxDecoration(shape: BoxShape.circle, color: Nexus.line),
          child: Container(
            padding: const EdgeInsets.all(9),
            decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0x80081420)),
            child: Icon(icon, color: Nexus.sub, size: 22),
          ),
        ),
      ),
    );
  }
}

/// ปุ่ม "หยุดสแกน" — โทน subtle (แดงโปร่ง)
class _StopScanButton extends StatelessWidget {
  const _StopScanButton({required this.onTap});
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return Tappable(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 13),
        decoration: BoxDecoration(
          color: const Color(0x663C141C),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF5A2230)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(PhosphorIconsRegular.stop, color: Nexus.red, size: 18),
            const SizedBox(width: 6),
            Text(
              'หยุดสแกน',
              style: Nexus.body(size: 13, weight: FontWeight.w600, color: Nexus.red),
            ),
          ],
        ),
      ),
    );
  }
}

/// ปุ่ม "สแกนต่อ" — เด่น (cyan gradient)
class _ResumeScanButton extends StatelessWidget {
  const _ResumeScanButton({required this.onTap});
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return Tappable(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 13),
        decoration: BoxDecoration(
          gradient: Nexus.cyanGradient,
          borderRadius: BorderRadius.circular(14),
          boxShadow: Nexus.glow(0.35, 20),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(PhosphorIconsRegular.play, color: Nexus.on, size: 20),
            const SizedBox(width: 6),
            Text(
              'สแกนต่อ',
              style: Nexus.tech(size: 14, weight: FontWeight.w700, color: Nexus.on),
            ),
          ],
        ),
      ),
    );
  }
}

class _SuccessCard extends StatelessWidget {
  const _SuccessCard({required this.controller});
  final FaceScanController controller;
  @override
  Widget build(BuildContext context) {
    final emp = controller.matched.value!;
    final type = controller.inOutType.value;
    final (badge, badgeColor, badgeIcon) = switch (type) {
      'I' => ('เข้างาน', Nexus.green, PhosphorIconsRegular.signIn),
      'O' => ('ออกงาน', Nexus.amber, PhosphorIconsRegular.signOut),
      _ => ('บันทึกเวลา', Nexus.cyan, PhosphorIconsRegular.clock),
    };
    final subtitle = controller.matchedPosition.value.isNotEmpty ? controller.matchedPosition.value : 'พนักงาน';
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 28),
      padding: const EdgeInsets.fromLTRB(28, 30, 28, 26),
      decoration: BoxDecoration(
        color: Nexus.sheet,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Nexus.line2),
        boxShadow: Nexus.glow(0.25, 50),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 88,
            height: 88,
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(shape: BoxShape.circle, color: Nexus.cyan),
            child: Container(
              decoration: BoxDecoration(shape: BoxShape.circle, color: Nexus.cyan.withValues(alpha: 0.12)),
              child: Icon(PhosphorIconsRegular.check, color: Nexus.cyan, size: 50),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            emp.name ?? 'พนักงาน',
            textAlign: TextAlign.center,
            style: Nexus.tech(size: 24, weight: FontWeight.w700, color: Nexus.ink),
          ),
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              subtitle,
              textAlign: TextAlign.center,
              style: Nexus.body(size: 15, color: Nexus.muted),
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
            decoration: BoxDecoration(
              color: badgeColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: badgeColor.withValues(alpha: 0.5)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(badgeIcon, color: badgeColor, size: 22),
                const SizedBox(width: 8),
                Text(
                  badge,
                  style: Nexus.tech(size: 18, weight: FontWeight.w700, color: badgeColor),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// กรอบวงรีกลางจอ — cyan, หนา+เขียวเมื่อจับหน้าได้ (ขนาดตาม "ความใกล้ตอนสแกน" ของโรง)
class _FaceGuide extends StatelessWidget {
  const _FaceGuide({this.detected = false, this.width = 240, this.height = 300});
  final bool detected;
  final double width;
  final double height;
  @override
  Widget build(BuildContext context) {
    final color = detected ? Nexus.green : Nexus.cyan;
    return IgnorePointer(
      child: SizedBox(
        width: width,
        height: height,
        child: Stack(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: width,
              height: height,
              decoration: BoxDecoration(
                border: Border.all(
                  color: color.withValues(alpha: detected ? 1 : 0.7),
                  width: detected ? 5 : 3,
                ),
                borderRadius: BorderRadius.all(Radius.elliptical(width / 2, height / 2)),
                boxShadow: detected
                    ? [BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 30)]
                    : Nexus.glow(0.2, 30),
              ),
            ),
            // กรอบมุม (corner brackets) ตามดีไซน์ NEXUS
            Positioned.fill(child: CustomPaint(painter: _BracketPainter(color))),
          ],
        ),
      ),
    );
  }
}

/// วาดกรอบมุม 4 มุม (L-shape) รอบกรอบสแกน — ตามดีไซน์
class _BracketPainter extends CustomPainter {
  _BracketPainter(this.color);
  final Color color;
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..strokeWidth = 3.5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    const len = 26.0, i = 2.0;
    final w = size.width, h = size.height;
    canvas.drawPath(
      Path()
        ..moveTo(i, len + i)
        ..lineTo(i, i)
        ..lineTo(len + i, i),
      p,
    ); // ซ้ายบน
    canvas.drawPath(
      Path()
        ..moveTo(w - len - i, i)
        ..lineTo(w - i, i)
        ..lineTo(w - i, len + i),
      p,
    ); // ขวาบน
    canvas.drawPath(
      Path()
        ..moveTo(i, h - len - i)
        ..lineTo(i, h - i)
        ..lineTo(len + i, h - i),
      p,
    ); // ซ้ายล่าง
    canvas.drawPath(
      Path()
        ..moveTo(w - len - i, h - i)
        ..lineTo(w - i, h - i)
        ..lineTo(w - i, h - len - i),
      p,
    ); // ขวาล่าง
  }

  @override
  bool shouldRepaint(_BracketPainter old) => old.color != color;
}

/// การ์ดแจ้งผลกลางจอ (dark) — ไม่พบ (แดง) / ผิดพลาด (เหลือง)
class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.kind, required this.text});
  final ScanResultKind kind;
  final String text;
  @override
  Widget build(BuildContext context) {
    final (title, icon, color) = switch (kind) {
      ScanResultKind.notFound => ('ไม่พบใบหน้านี้', PhosphorIconsRegular.magnifyingGlass, Nexus.red),
      ScanResultKind.canceled => ('ยกเลิกแล้ว', PhosphorIconsRegular.minusCircle, Nexus.muted),
      ScanResultKind.rejected => ('ลงเวลาไม่ได้', PhosphorIconsRegular.prohibit, Nexus.amber),
      ScanResultKind.gpsError => ('หาตำแหน่งไม่ได้', PhosphorIconsRegular.gpsSlash, Nexus.amber),
      ScanResultKind.incomplete => ('ข้อมูลไม่สมบูรณ์', PhosphorIconsRegular.userMinus, Nexus.amber),
      ScanResultKind.connError => ('เชื่อมต่อไม่ได้', PhosphorIconsRegular.wifiSlash, Nexus.amber),
      ScanResultKind.cameraError => ('กล้องมีปัญหา', PhosphorIconsRegular.videoCameraSlash, Nexus.red),
    };
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 32),
      padding: const EdgeInsets.fromLTRB(28, 28, 28, 24),
      decoration: BoxDecoration(
        color: Nexus.sheet,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Nexus.line2),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 36, offset: const Offset(0, 12))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 80,
            height: 80,
            padding: const EdgeInsets.all(1),
            decoration: BoxDecoration(shape: BoxShape.circle, color: color.withValues(alpha: 0.4)),
            child: Container(
              decoration: BoxDecoration(shape: BoxShape.circle, color: color.withValues(alpha: 0.12)),
              child: Icon(icon, color: color, size: 44),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: Nexus.tech(size: 20, weight: FontWeight.w700, color: color),
          ),
          const SizedBox(height: 6),
          Text(
            text,
            textAlign: TextAlign.center,
            style: Nexus.body(size: 15, color: Nexus.sub),
          ),
        ],
      ),
    );
  }
}

/// การ์ด "อยู่นอกพื้นที่ลงเวลา" — บล็อกสแกนเมื่อบังคับ GPS แล้วอยู่นอกรัศมี
class _OutOfAreaCard extends StatelessWidget {
  const _OutOfAreaCard({required this.controller});
  final FaceScanController controller;
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 32),
      padding: const EdgeInsets.fromLTRB(28, 28, 28, 22),
      decoration: BoxDecoration(
        color: Nexus.sheet,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Nexus.line2),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 36, offset: const Offset(0, 12))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 80,
            height: 80,
            padding: const EdgeInsets.all(1),
            decoration: BoxDecoration(shape: BoxShape.circle, color: Nexus.amber.withValues(alpha: 0.4)),
            child: Container(
              decoration: BoxDecoration(shape: BoxShape.circle, color: Nexus.amber.withValues(alpha: 0.12)),
              child: Icon(PhosphorIconsRegular.gpsSlash, color: Nexus.amber, size: 44),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'อยู่นอกพื้นที่ลงเวลา',
            style: Nexus.tech(size: 20, weight: FontWeight.w700, color: Nexus.amber),
          ),
          const SizedBox(height: 6),
          Obx(
            () => Text(
              controller.locBlockMsg.value,
              textAlign: TextAlign.center,
              style: Nexus.body(size: 14.5, color: Nexus.sub),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'เข้าใกล้จุดลงเวลาก่อน จึงจะสแกนได้',
            textAlign: TextAlign.center,
            style: Nexus.body(size: 12.5, color: Nexus.muted),
          ),
          const SizedBox(height: 20),
          Tappable(
            onTap: controller.recheckLocation,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 13),
              decoration: BoxDecoration(
                gradient: Nexus.cyanGradient,
                borderRadius: BorderRadius.circular(14),
                boxShadow: Nexus.glow(0.3, 18),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Obx(
                    () => controller.locChecking.value
                        ? SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Nexus.on),
                          )
                        : Icon(PhosphorIconsRegular.gpsFix, size: 18, color: Nexus.on),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'ตรวจตำแหน่งอีกครั้ง',
                    style: Nexus.tech(size: 14, weight: FontWeight.w700, color: Nexus.on),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// ป้าย "กำลังตรวจตำแหน่ง" ระหว่างรอผลตำแหน่งรอบแรก (ยังไม่ให้สแกน)
class _CheckingLocationPill extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xCC081420),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Nexus.line2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Nexus.cyan)),
          const SizedBox(width: 10),
          Text(
            'กำลังตรวจตำแหน่ง…',
            style: Nexus.body(size: 14, weight: FontWeight.w600, color: Nexus.ink),
          ),
        ],
      ),
    );
  }
}

/// chip "พร้อม" มุมขวาบน — จุดเขียว=พร้อม / เหลือง=ยังไม่พร้อม · แตะดูรายละเอียด
class _ReadinessChip extends StatelessWidget {
  const _ReadinessChip({required this.controller});
  final FaceScanController controller;

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final dot = controller.isReady ? Nexus.green : Nexus.amber;
      return Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: () => _showDetails(context),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: const Color(0x80081420),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: Nexus.line),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 9,
                  height: 9,
                  decoration: BoxDecoration(
                    color: dot,
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: dot.withValues(alpha: 0.6), blurRadius: 8)],
                  ),
                ),
                const SizedBox(width: 7),
                Text(
                  controller.readinessLabel,
                  style: Nexus.body(size: 13, weight: FontWeight.w700, color: Nexus.sub),
                ),
                const Icon(PhosphorIconsRegular.caretDown, color: Nexus.muted, size: 18),
              ],
            ),
          ),
        ),
      );
    });
  }

  void _showDetails(BuildContext context) {
    Get.bottomSheet(
      Container(
        padding: const EdgeInsets.fromLTRB(24, 14, 24, 28),
        decoration: const BoxDecoration(
          color: Nexus.sheet,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          border: Border(top: BorderSide(color: Nexus.line2)),
        ),
        child: Obx(() {
          final loc = controller.settings.isEnableLocationEnrolling.value;
          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(color: const Color(0xFF23415F), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              Text(
                'สถานะเครื่อง',
                style: Nexus.tech(size: 18, weight: FontWeight.w700, color: Nexus.ink),
              ),
              const SizedBox(height: 10),
              _StatusRow(
                icon: PhosphorIconsRegular.cloud,
                label: 'เซิร์ฟเวอร์',
                value: controller.online.value ? 'ออนไลน์' : 'ออฟไลน์',
                ok: controller.online.value,
              ),
              _StatusRow(
                icon: PhosphorIconsRegular.mapPin,
                label: 'GPS',
                value: !loc
                    ? 'ปิดอยู่'
                    : (controller.gpsReady.value ? (controller.gpsCoords.value ?? 'กำลังหาตำแหน่ง...') : 'ไม่พร้อม'),
                ok: !loc ? null : controller.gpsReady.value,
              ),
              // ความคลาดของ fix ล่าสุด — ±X ม. (ยิ่งน้อยยิ่งแม่น) ; ใช้วินิจฉัยเคสนอกพื้นที่
              _StatusRow(
                icon: PhosphorIconsRegular.broadcast,
                label: 'Accuracy',
                value: !loc
                    ? '—'
                    : (controller.gpsAccuracyM.value != null ? '±${controller.gpsAccuracyM.value!.round()} ม.' : '—'),
              ),
              _StatusRow(icon: PhosphorIconsRegular.wifiHigh, label: 'Wi-Fi', value: controller.wifiName.value ?? '—'),
              _StatusRow(
                icon: PhosphorIconsRegular.batteryFull,
                label: 'แบตเตอรี่',
                value: controller.batteryLevel.value != null ? '${controller.batteryLevel.value}%' : '—',
              ),
            ],
          );
        }),
      ),
      backgroundColor: Colors.transparent,
    );
  }
}

/// แถวสถานะใน sheet — ok: null=เทา / true=เขียว / false=แดง
class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.icon, required this.label, required this.value, this.ok});
  final IconData icon;
  final String label;
  final String value;
  final bool? ok;

  @override
  Widget build(BuildContext context) {
    final color = ok == null ? Nexus.muted : (ok! ? Nexus.green : Nexus.red);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Nexus.muted),
          const SizedBox(width: 12),
          Text(label, style: Nexus.body(size: 15, color: Nexus.ink)),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: Nexus.tech(size: 14, weight: FontWeight.w700, color: color),
            ),
          ),
        ],
      ),
    );
  }
}
