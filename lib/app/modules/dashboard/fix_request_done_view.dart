import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lottie/lottie.dart';

import '../../utils/thai_date.dart';
import 'dash_theme.dart';
import 'widgets/dash_page.dart';

/// หน้าสำเร็จหลังยืนยันส่งคำขอ — เต็มจอ เล่นภาพเคลื่อนไหวรอบเดียวแล้วปิดตัวเอง
/// ไม่มีปุ่ม: ผู้ใช้ทำงานเสร็จแล้ว ไม่ต้องให้กดอะไรอีกเพื่อกลับไปที่รายการ
///
/// ⚠️ ต้นแบบ: คำขอยังไม่ถูกส่งออกนอกเครื่องจริง (ยังไม่มี endpoint)
/// ปิดแล้วคืน true ไล่กลับไปถึงหน้ารายการ เพื่อย้ายวันนั้นไปแท็บ "ส่งแล้ว"
class FixRequestDoneView extends StatefulWidget {
  const FixRequestDoneView({super.key});

  @override
  State<FixRequestDoneView> createState() => _FixRequestDoneViewState();
}

class _FixRequestDoneViewState extends State<FixRequestDoneView>
    with SingleTickerProviderStateMixin {
  late final AnimationController _anim = AnimationController(vsync: this);
  Timer? _exit;

  Map<String, dynamic> get _a =>
      (Get.arguments as Map?)?.cast<String, dynamic>() ?? const {};

  /// ค้างให้อ่านข้อความอีกครู่หลังภาพเล่นจบ แล้วค่อยเด้งกลับ
  static const _hold = Duration(milliseconds: 900);

  @override
  void dispose() {
    _exit?.cancel();
    _anim.dispose();
    super.dispose();
  }

  void _leave() {
    if (mounted) Get.back<bool>(result: true);
  }

  @override
  Widget build(BuildContext context) => DashPage(
    builder: (context) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // เล่นรอบเดียวแล้วค้างเฟรมสุดท้าย — จบเมื่อไหร่ค่อยตั้งเวลาปิดหน้า
            Lottie.asset(
              'assets/anim/form_accepted.json',
              width: Dash.sp(220),
              height: Dash.sp(220),
              fit: BoxFit.contain,
              controller: _anim,
              onLoaded: (composition) {
                _anim
                  ..duration = composition.duration
                  ..forward(from: 0).whenComplete(() {
                    _exit = Timer(_hold, _leave);
                  });
              },
            ),
            const SizedBox(height: 8),
            Text(
              'ส่งคำขอแล้ว',
              textAlign: TextAlign.center,
              style: Dash.tech(size: 22, weight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              'คำขอแก้ไขเวลาวันที่ ${thaiShortDate('${_a['date']}')}\n'
              'ถูกส่งให้หัวหน้าเวรพิจารณาแล้ว',
              textAlign: TextAlign.center,
              style: Dash.body(
                size: 13.5,
                color: Dash.muted,
              ).copyWith(height: 1.5),
            ),
            const SizedBox(height: 14),
            // ต้นแบบ: บอกตรง ๆ ว่ายังไม่มีอะไรออกจากเครื่อง
            Text(
              'ต้นแบบ: ยังไม่ส่งเข้าระบบจริง — ${_a['summary'] ?? ''}',
              textAlign: TextAlign.center,
              style: Dash.body(size: 11.5, color: Dash.faint),
            ),
          ],
        ),
      ),
    ),
  );
}
