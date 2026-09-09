import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../utils/thai_date.dart';
import 'widgets/dash_page.dart';
import 'widgets/success_splash.dart';

/// หน้าสำเร็จหลังยืนยันส่งคำขอ — เต็มจอ เล่นภาพเคลื่อนไหวรอบเดียวแล้วปิดตัวเอง
///
/// ⚠️ ต้นแบบ: คำขอยังไม่ถูกส่งออกนอกเครื่องจริง (ยังไม่มี endpoint)
/// ปิดแล้วคืน true ไล่กลับไปถึงหน้ารายการ เพื่อย้ายวันนั้นไปแท็บ "ส่งแล้ว"
class FixRequestDoneView extends StatelessWidget {
  const FixRequestDoneView({super.key});

  Map<String, dynamic> get _a =>
      (Get.arguments as Map?)?.cast<String, dynamic>() ?? const {};

  @override
  Widget build(BuildContext context) => DashPage(
    builder: (context) => SuccessSplash(
      animation: 'assets/anim/form_accepted.json',
      title: 'ส่งคำขอแล้ว',
      message:
          'คำขอแก้ไขเวลาวันที่ ${thaiShortDate('${_a['date']}')}\n'
          'ถูกส่งให้หัวหน้าเวรพิจารณาแล้ว',
      // ต้นแบบ: บอกตรง ๆ ว่ายังไม่มีอะไรออกจากเครื่อง
      footnote: 'ต้นแบบ: ยังไม่ส่งเข้าระบบจริง — ${_a['summary'] ?? ''}',
      onDone: () => Get.back<bool>(result: true),
    ),
  );
}
