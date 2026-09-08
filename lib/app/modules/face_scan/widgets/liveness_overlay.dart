import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../theme/nexus.dart';

/// ป้ายสั่งท่า liveness กลางจอ + จุดบอกความคืบหน้า (ธีม NEXUS)
class LivenessOverlay extends StatelessWidget {
  const LivenessOverlay({
    super.key,
    required this.instruction,
    required this.completed,
    required this.total,
  });

  final String instruction;
  final int completed;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 24),
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 22),
        decoration: BoxDecoration(
          color: const Color(0xCC081420),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Nexus.line2),
          boxShadow: Nexus.glow(0.2, 30),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(PhosphorIconsRegular.userFocus, color: Nexus.cyan, size: 44),
            const SizedBox(height: 14),
            Text(
              instruction,
              textAlign: TextAlign.center,
              style: Nexus.body(
                size: 25,
                weight: FontWeight.w700,
                color: Nexus.ink,
              ),
            ),
            const SizedBox(height: 18),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(total, (i) {
                final done = i < completed;
                return Container(
                  width: 12,
                  height: 12,
                  margin: const EdgeInsets.symmetric(horizontal: 5),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: done ? Nexus.cyan : const Color(0xFF2A4D72),
                    boxShadow: done
                        ? [
                            BoxShadow(
                              color: Nexus.cyan.withValues(alpha: 0.6),
                              blurRadius: 10,
                            ),
                          ]
                        : null,
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }
}
