import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../widgets/tappable.dart';

import '../../../theme/nexus.dart';

/// popup เตือนอยู่นอกพื้นที่ลงเวลา (บล็อกการลงเวลา) — จอสแกน (ตรึงมืด)
Future<void> showOutOfAreaDialog(String detail) => Get.dialog(
  _OutOfAreaDialog(detail: detail),
  barrierDismissible: true,
  barrierColor: Colors.black.withValues(alpha: 0.6),
);

class _OutOfAreaDialog extends StatelessWidget {
  const _OutOfAreaDialog({required this.detail});
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 32),
      child: Container(
        padding: const EdgeInsets.fromLTRB(24, 26, 24, 20),
        decoration: BoxDecoration(
          color: Nexus.sheet,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: Nexus.line2),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 36, offset: const Offset(0, 12)),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              padding: const EdgeInsets.all(1),
              decoration: BoxDecoration(shape: BoxShape.circle, color: Nexus.amber.withValues(alpha: 0.4)),
              child: Container(
                decoration: BoxDecoration(shape: BoxShape.circle, color: Nexus.amber.withValues(alpha: 0.12)),
                child: const Icon(PhosphorIconsRegular.mapPinArea, color: Nexus.amber, size: 40),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'อยู่นอกพื้นที่ลงเวลา',
              style: Nexus.tech(size: 19, weight: FontWeight.w700, color: Nexus.amber),
            ),
            const SizedBox(height: 10),
            Text(
              detail,
              textAlign: TextAlign.center,
              style: Nexus.body(size: 14.5, color: Nexus.ink),
            ),
            const SizedBox(height: 6),
            Text(
              'ต้องอยู่ในพื้นที่ที่โรงพยาบาลกำหนดจึงจะลงเวลาได้',
              textAlign: TextAlign.center,
              style: Nexus.body(size: 13, color: Nexus.sub),
            ),
            const SizedBox(height: 20),
            Tappable(
              onTap: Get.back,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Nexus.amber.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Nexus.amber.withValues(alpha: 0.4)),
                ),
                child: Text(
                  'ปิด',
                  style: Nexus.tech(size: 15, weight: FontWeight.w700, color: Nexus.amber),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
