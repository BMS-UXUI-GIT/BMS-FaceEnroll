import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

import '../dash_theme.dart';

/// หน้าจอสำเร็จเต็มจอ — ภาพเคลื่อนไหวรอบเดียว + ข้อความ แล้วเรียก [onDone] เอง
/// ไม่มีปุ่ม: ผู้ใช้ทำงานเสร็จแล้ว ไม่ต้องให้กดอะไรอีกเพื่อกลับไปที่เดิม
class SuccessSplash extends StatefulWidget {
  const SuccessSplash({
    super.key,
    required this.animation,
    required this.title,
    required this.message,
    required this.onDone,
    this.footnote,
    this.hold = const Duration(milliseconds: 900),
  });

  /// ไฟล์ Lottie ใน assets
  final String animation;
  final String title;
  final String message;

  /// บรรทัดจาง ๆ ท้ายสุด — ใช้บอกข้อจำกัดของต้นแบบ
  final String? footnote;

  /// ค้างให้อ่านข้อความอีกครู่หลังภาพเล่นจบ แล้วค่อยเรียกตัวนี้
  final Duration hold;
  final VoidCallback onDone;

  @override
  State<SuccessSplash> createState() => _SuccessSplashState();
}

class _SuccessSplashState extends State<SuccessSplash>
    with SingleTickerProviderStateMixin {
  late final AnimationController _anim = AnimationController(vsync: this);
  Timer? _exit;

  @override
  void dispose() {
    _exit?.cancel();
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // เล่นรอบเดียวแล้วค้างเฟรมสุดท้าย — จบเมื่อไหร่ค่อยตั้งเวลาปิดหน้า
          Lottie.asset(
            widget.animation,
            width: Dash.sp(220),
            height: Dash.sp(220),
            fit: BoxFit.contain,
            controller: _anim,
            onLoaded: (composition) {
              _anim
                ..duration = composition.duration
                ..forward(from: 0).whenComplete(() {
                  _exit = Timer(widget.hold, widget.onDone);
                });
            },
          ),
          const SizedBox(height: 8),
          Text(
            widget.title,
            textAlign: TextAlign.center,
            style: Dash.tech(size: 22, weight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            widget.message,
            textAlign: TextAlign.center,
            style: Dash.body(
              size: 13.5,
              color: Dash.muted,
            ).copyWith(height: 1.5),
          ),
          if (widget.footnote != null) ...[
            const SizedBox(height: 14),
            Text(
              widget.footnote!,
              textAlign: TextAlign.center,
              style: Dash.body(size: 11.5, color: Dash.faint),
            ),
          ],
        ],
      ),
    ),
  );
}
