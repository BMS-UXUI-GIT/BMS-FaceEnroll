import 'package:flutter/material.dart';

import '../../../widgets/tappable.dart';
import '../dash_theme.dart';

/// แท็บแบบขีดเส้นใต้ ชิดขอบจอ — ตัวที่เลือกมีแถบ 3px ใต้ข้อความ
///
/// สองชุดสี: บนแผงน้ำเงิน (แท็บช่วงเวลาบนแดชบอร์ด) กับบนพื้นสว่าง (แท็บส่ง/ยังไม่ส่ง)
/// ผู้เรียกกำหนดความสูงด้วย SizedBox ครอบ — แถบขีดอยู่ชิดล่างของพื้นที่ที่ให้มา
class UnderlineTab extends StatelessWidget {
  const UnderlineTab({
    super.key,
    required this.label,
    required this.on,
    required this.onTap,
    this.onPanel = false,
  });

  final String label;
  final bool on;
  final VoidCallback onTap;
  final bool onPanel;

  @override
  Widget build(BuildContext context) {
    final weight = on ? FontWeight.w700 : FontWeight.w500;
    // บนแผงน้ำเงิน ตัวที่ไม่ได้เลือกเป็นขาว 70% — ยังอ่านออกแต่ไม่แย่งสายตา
    final style = onPanel
        ? Dash.body(size: 13, weight: weight, color: Dash.onPanel(on ? 1 : 0.7))
        : Dash.tech(
            size: 14,
            weight: weight,
            color: on ? Dash.ink : Dash.muted,
          );
    return Tappable(
      onTap: onTap,
      borderRadius: BorderRadius.zero,
      splash: onPanel ? Dash.onPanel() : Dash.accent,
      child: Stack(
        alignment: Alignment.bottomCenter,
        children: [
          Container(
            alignment: Alignment.center,
            padding: const EdgeInsets.only(bottom: 3),
            child: Text(label, style: style),
          ),
          // พื้นสว่างมีเส้นฐานของตัวเอง · บนแผงน้ำเงินผู้เรียกวาดเส้นฐานให้ทั้งแถว
          if (!onPanel)
            SizedBox(height: 1, child: ColoredBox(color: Dash.hairline)),
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOut,
            height: 3,
            decoration: BoxDecoration(
              color: on
                  ? (onPanel ? Dash.onPanel() : Dash.accentActive)
                  : Colors.transparent,
              borderRadius: onPanel
                  ? const BorderRadius.vertical(top: Radius.circular(3))
                  : null,
            ),
          ),
        ],
      ),
    );
  }
}
