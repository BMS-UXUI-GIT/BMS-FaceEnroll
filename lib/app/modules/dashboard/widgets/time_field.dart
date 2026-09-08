import 'package:flutter/material.dart';

import '../dash_theme.dart';
import 'outlined_tap_field.dart';

/// ช่องเวลาบนฟอร์มขอแก้ไข — แตะแล้วเปิดตัวเลือกเวลา
/// ยังว่าง = ขอบแดง ป้ายแดง ไอคอนเตือน และข้อความบอกใต้ช่อง
/// กรอกแล้ว = ขอบปกติ ไอคอนติ๊กเขียว
class TimeField extends StatelessWidget {
  const TimeField({
    super.key,
    required this.label,
    required this.value,
    required this.onTap,
  });

  /// "เวลาเข้า" / "เวลาออก"
  final String label;

  /// null = ยังไม่ระบุ
  final String? value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final empty = value == null;
    return OutlinedTapField(
      label: label,
      onTap: onTap,
      bad: empty,
      trailing: FieldStatusDot(done: !empty),
      child: empty
          ? const FieldPlaceholder('แตะเพื่อเลือกเวลา')
          : Text(
              '$value น.',
              maxLines: 1,
              style: Dash.tech(
                size: 18,
                weight: FontWeight.w700,
                color: Dash.ink,
              ),
            ),
    );
  }
}
