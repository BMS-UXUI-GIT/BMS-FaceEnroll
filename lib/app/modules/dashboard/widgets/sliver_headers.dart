import 'package:flutter/material.dart';

import '../dash_theme.dart';

/// หัวตรึงความสูงคงที่ — [topGap] คือที่ว่างสำหรับ status bar ตอนตรึงถึงบนสุด
class StickyPanelHeader extends SliverPersistentHeaderDelegate {
  const StickyPanelHeader({
    required this.height,
    required this.topGap,
    required this.stuck,
    required this.child,
  });

  final double height;
  final double topGap;
  final bool stuck;
  final Widget child;

  /// ล้นขึ้นข้างบนนิดหน่อย — ตอนตรึง ขอบล่างหัวแอปกับขอบบนหัวนี้ตกลงคนละครึ่งพิกเซลจริง
  /// เหลือรอยบาง ๆ ให้เห็นการ์ดขาวข้างใต้ทะลุขึ้นมา ระบายเผื่อไว้ให้ทับรอยนั้น
  /// ตอนยังไม่ตรึงต้องไม่ล้น ไม่งั้นสีน้ำเงินเลยขอบบนแผงขึ้นไปทับแผ่นขาว
  static const double _bleedMax = 4;
  double get _bleed => stuck ? _bleedMax : 0;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlaps) =>
      RepaintBoundary(
        child: OverflowBox(
          alignment: Alignment.bottomCenter,
          minHeight: height + _bleed,
          maxHeight: height + _bleed,
          child: AnimatedContainer(
            // เงาค่อย ๆ มา ไม่ปรากฏพรวด ตอนเริ่มมีอะไรลอดใต้หัว
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOut,
            decoration: BoxDecoration(
              // ทึบเสมอ ไม่งั้นแถวรายวันเลื่อนลอดใต้หัวแล้วเห็นทะลุ
              color: Dash.panel,
              // หัวนี้คือขอบบนสุดของแผงน้ำเงิน — ต้องมนตามแผง
              // พอตรึงถึงขอบจอแล้วค่อยคลายเป็นเหลี่ยมให้เต็มความกว้างจริง
              borderRadius: stuck
                  ? BorderRadius.zero
                  : const BorderRadius.vertical(top: Radius.circular(24)),
              // เงาบอกว่าการ์ดข้างล่างลอดอยู่ใต้หัว ไม่ใช่ต่อกันเป็นแผ่นเดียว
              boxShadow: stuck
                  ? [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.18),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ]
                  : null,
            ),
            // ส่วนที่ล้นบวกเข้าที่ช่องบน แท็บจึงสูงเท่าเดิม ขีดใต้ไม่ขยับ
            child: Column(
              children: [
                SizedBox(height: topGap + _bleed),
                Expanded(child: child),
              ],
            ),
          ),
        ),
      );

  @override
  double get maxExtent => height;

  @override
  double get minExtent => height;

  @override
  // ไม่เทียบ child — SliverLayoutBuilder สร้าง widget ใหม่ทุกเฟรมที่เลื่อน
  // เทียบแล้วไม่มีทางตรง แท็บเลยรีบิลด์ทิ้งทุกเฟรมทั้งที่หน้าตาเหมือนเดิม
  // (ตัวแท็บเป็น Obx อยู่แล้ว เปลี่ยนช่วงเมื่อไหร่มันอัปเดตตัวเอง)
  bool shouldRebuild(StickyPanelHeader old) =>
      old.height != height || old.topGap != topGap || old.stuck != stuck;
}

/// หัวตรึงของหน้าขอแก้ไข — ความสูงคงที่ที่ผู้เรียกวัดมาให้แล้ว
class FixedHeightHeader extends SliverPersistentHeaderDelegate {
  FixedHeightHeader({
    required this.height,
    required this.child,
    required this.signature,
  });

  final double height;
  final Widget child;

  /// สรุปสถานะที่หัวนี้วาดอยู่ — เปลี่ยนเมื่อไหร่ถึงจะวาดใหม่
  /// (เทียบ child ตรง ๆ ไม่ได้ เพราะสร้างใหม่ทุกเฟรมอยู่แล้ว)
  final String signature;

  @override
  double get minExtent => height;
  @override
  double get maxExtent => height;
  @override
  Widget build(BuildContext context, double shrink, bool overlaps) => child;
  @override
  bool shouldRebuild(FixedHeightHeader old) =>
      old.height != height || old.signature != signature;
}
