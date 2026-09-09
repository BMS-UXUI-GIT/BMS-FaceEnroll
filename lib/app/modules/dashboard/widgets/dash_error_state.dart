import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../widgets/tappable.dart';
import '../dash_theme.dart';

/// โหลดข้อมูลไม่สำเร็จ — บอกสาเหตุที่เซิร์ฟเวอร์ส่งมา พร้อมปุ่มลองใหม่
class DashErrorState extends StatelessWidget {
  const DashErrorState({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(PhosphorIconsRegular.wifiSlash, size: 36, color: Dash.faint),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Dash.body(size: 13, color: Dash.sub),
          ),
          const SizedBox(height: 16),
          Tappable(
            onTap: onRetry,
            borderRadius: BorderRadius.circular(100),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                gradient: Dash.accentGradient,
                borderRadius: BorderRadius.circular(100),
              ),
              child: Text(
                'ลองใหม่',
                style: Dash.tech(
                  size: 13,
                  weight: FontWeight.w700,
                  color: Dash.on,
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}
