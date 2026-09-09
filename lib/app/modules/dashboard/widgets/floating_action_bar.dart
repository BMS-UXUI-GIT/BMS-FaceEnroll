import 'package:flutter/material.dart';

import '../dash_theme.dart';

/// ช่องไฟรอบปุ่มในแผง — บนกับล่างเท่ากัน ปุ่มอยู่กลางแผงพอดี
/// พื้นที่ปลอดภัยของเครื่องบวกเพิ่มใต้แผงต่างหาก ไม่ใช่บวกทั้งบนและล่าง
/// (เครื่องที่มีแถบ home สูง ๆ เคยได้ช่องไฟบน 46 แผงเลยหนาผิดสัดส่วน)
const double kActionBarPad = 14;

/// ความสูงจริงของแผงปุ่มรวมขอบล่าง — ใช้เว้นท้ายเนื้อหาไม่ให้โดนบัง
double actionBarHeight(BuildContext context) =>
    Dash.box(50) + kActionBarPad * 2 + MediaQuery.viewPaddingOf(context).bottom;

/// แผงปุ่มลอยปิดท้ายหน้า — เต็มความกว้าง ชนขอบล่าง มุมตรง
/// แยกจากเนื้อหาด้วยเงาอย่างเดียว ไม่ใช่เส้นขอบ
class FloatingActionBar extends StatelessWidget {
  const FloatingActionBar({super.key, required this.children});

  /// ปุ่มในแผง — ผู้เรียกจัดสัดส่วนเองด้วย Expanded/flex
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
    padding: EdgeInsets.fromLTRB(
      16,
      kActionBarPad,
      16,
      kActionBarPad + MediaQuery.viewPaddingOf(context).bottom,
    ),
    decoration: BoxDecoration(
      color: Dash.card,
      // เงานุ่มบอกว่าแผงลอยอยู่เหนือเนื้อหาที่เลื่อนผ่านข้างหลัง
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: Dash.dark ? 0.4 : 0.08),
          blurRadius: 20,
          offset: const Offset(0, -2),
        ),
      ],
    ),
    child: Row(children: children),
  );
}
