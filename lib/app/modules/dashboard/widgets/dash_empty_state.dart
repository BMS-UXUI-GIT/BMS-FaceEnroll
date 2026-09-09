import 'package:flutter/material.dart';

import '../dash_theme.dart';

/// ไม่มีอะไรในรายการ — ไอคอน + หนึ่งบรรทัดบอกว่าทำไมถึงว่าง
/// (ต่างจาก [DashErrorState] ตรงที่ "ว่าง" ไม่ใช่ความผิดพลาด จึงไม่มีปุ่มให้กด)
class DashEmptyState extends StatelessWidget {
  const DashEmptyState({
    super.key,
    required this.icon,
    required this.message,
    required this.iconColor,
  });

  final IconData icon;
  final String message;
  final Color iconColor;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 48),
    child: Column(
      children: [
        Icon(icon, size: 34, color: iconColor),
        const SizedBox(height: 10),
        Text(message, style: Dash.body(size: 13, color: Dash.muted)),
      ],
    ),
  );
}
