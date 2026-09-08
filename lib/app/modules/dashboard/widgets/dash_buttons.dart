import 'package:flutter/material.dart';

import '../../../widgets/tappable.dart';
import '../dash_theme.dart';

/// ปุ่มยาวมุมกลม — ปุ่มหลักน้ำเงินทึบ ปุ่มรองพื้นการ์ดขอบบาง
class DashPillButton extends StatelessWidget {
  const DashPillButton({
    super.key,
    required this.label,
    this.onTap,
    this.secondary = false,
    this.height = 50,
    this.radius = 100,
  });

  final String label;
  final VoidCallback? onTap;

  /// true = ปุ่มรอง (พื้นการ์ด ตัวหนังสือน้ำเงิน) — คู่กับปุ่มหลักในแถวเดียวกัน
  final bool secondary;

  /// ความสูง dp ก่อนสเกล — แถบล่าง 50 · ปุ่มใน bottom sheet 48
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) => Tappable(
    onTap: onTap,
    borderRadius: BorderRadius.circular(radius),
    splash: secondary ? Dash.accent : Dash.on,
    child: Container(
      height: Dash.box(height),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: secondary ? Dash.card : Dash.accentActive,
        borderRadius: BorderRadius.circular(radius),
        border: secondary ? Border.all(color: Dash.hairline) : null,
      ),
      child: Text(
        label,
        style: Dash.tech(
          size: 15,
          weight: FontWeight.w700,
          color: secondary ? Dash.accentActive : Dash.on,
        ),
      ),
    ),
  );
}

/// ปุ่มไอคอนวงกลม — ผู้เรียกกำหนดสีพื้น/ไอคอนเอง เพราะแต่ละที่มีชุดสีของตัวเอง
/// (บนแผงน้ำเงินเป็นขาวโปร่ง · บนพื้นสว่างเป็นเทาอ่อน · ปุ่มเลื่อนสัปดาห์เป็นฟ้าทึบ)
class DashCircleButton extends StatelessWidget {
  const DashCircleButton({
    super.key,
    required this.icon,
    required this.fill,
    required this.iconColor,
    required this.splash,
    this.onTap,
    this.size = 36,
    this.iconSize = 19,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final Color fill;
  final Color iconColor;
  final Color splash;

  /// ขนาดจริงหลังสเกลแล้ว — ผู้เรียกเลือกเองว่าจะยืดตามจอหรือไม่
  final double size;
  final double iconSize;

  @override
  Widget build(BuildContext context) => Tappable(
    onTap: onTap,
    circle: true,
    splash: splash,
    child: Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: fill, shape: BoxShape.circle),
      child: Icon(icon, size: iconSize, color: iconColor),
    ),
  );
}
