import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../dash_theme.dart';

/// โครงหน้าของทุกหน้าใน flow แดชบอร์ด — ทำสามอย่างที่ทุกหน้าต้องทำเหมือนกัน
/// 1. หนีบฟอนต์ระบบไม่ให้เกิน [Dash.maxTextScale] (กล่องความสูงคงที่จะล้น)
/// 2. เรียก [Dash.useScale] ก่อนวาดอะไรทั้งนั้น — ทุก Dash.* ในเฟรมนี้ต้องใช้สเกลเดียวกัน
/// 3. Scaffold พื้น [Dash.bg]
///
/// รับ [builder] ไม่ใช่ widget สำเร็จ เพราะ body ต้องถูกสร้าง "หลัง" useScale เท่านั้น
class DashPage extends StatelessWidget {
  const DashPage({
    super.key,
    required this.builder,
    this.backgroundColor,
    this.resizeToAvoidBottomInset,
  });

  final WidgetBuilder builder;
  final Color? backgroundColor;
  final bool? resizeToAvoidBottomInset;

  @override
  Widget build(BuildContext context) => MediaQuery.withClampedTextScaling(
    maxScaleFactor: Dash.maxTextScale,
    child: Builder(
      builder: (context) {
        Dash.useScale(context);
        return Scaffold(
          backgroundColor: backgroundColor ?? Dash.bg,
          resizeToAvoidBottomInset: resizeToAvoidBottomInset,
          body: builder(context),
        );
      },
    ),
  );
}

/// ช่องไฟปิดท้ายหน้าที่มี dock ลอยอยู่ข้างล่าง
///
/// ShellView ตั้ง extendBody: true — เนื้อหาไหลไปอยู่ "หลัง" dock จึงต้องเว้นเท่าความสูง
/// dock จริง (76 แถบ + 24 ปุ่มที่โผล่ขึ้น + safe area) แล้วบวกช่องไฟอีก 24
/// ไม่งั้นชิ้นสุดท้ายจ่อใต้ปุ่ม
class DockSpacer extends StatelessWidget {
  const DockSpacer({super.key});

  @override
  Widget build(BuildContext context) => SizedBox(
    height:
        76 + 24 + 24 + math.max(MediaQuery.viewPaddingOf(context).bottom, 10.0),
  );
}
