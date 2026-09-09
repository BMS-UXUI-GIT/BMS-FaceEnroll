import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../dash_theme.dart';

/// หมายเหตุตัวเล็กท้ายหน้า — ไอคอน i + ข้อความเทา
/// ใช้บอกผลที่ตามมาหลังกดปุ่ม ไม่ใช่คำเตือนแบบต้องหยุดอ่าน (จึงไม่ใช้สีแดง)
class InfoNote extends StatelessWidget {
  const InfoNote(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Icon(PhosphorIconsRegular.info, size: Dash.sp(16), color: Dash.muted),
      const SizedBox(width: 8),
      Expanded(
        child: Text(
          text,
          style: Dash.body(size: 12, color: Dash.muted).copyWith(height: 1.45),
        ),
      ),
    ],
  );
}
