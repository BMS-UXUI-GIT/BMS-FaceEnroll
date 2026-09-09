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

/// ปุ่มไอคอนกลมมาตรฐานของแดชบอร์ด — สลับชุดสีเองตามพื้นที่วาง
/// [onPanel] = อยู่บนแผงน้ำเงิน (ขาวโปร่ง) · ไม่ใช่ = บนพื้นสว่าง (เทาอ่อน ไอคอนฟ้า)
class DashIconButton extends StatelessWidget {
  const DashIconButton({
    super.key,
    required this.icon,
    this.onTap,
    this.enabled = true,
    this.onPanel = false,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final bool enabled;
  final bool onPanel;

  @override
  Widget build(BuildContext context) => DashCircleButton(
    icon: icon,
    onTap: enabled ? onTap : null,
    splash: onPanel ? Dash.onPanel() : Dash.accent,
    fill: onPanel ? Dash.onPanel(0.2) : Dash.rowBg,
    iconColor: onPanel
        ? Dash.onPanel(enabled ? 1 : 0.4)
        : (enabled ? Dash.accent : Dash.faint),
  );
}

/// ปุ่มเลื่อนช่วง (สัปดาห์ก่อนหน้า/ถัดไป) บนหัวการ์ดกราฟ
/// ปุ่มที่กดได้เป็นฟ้าทึบ ปุ่มที่สุดทางแล้วเป็นฟ้าจาง — ต่างกันชัดโดยไม่ต้องอ่าน
class DashNavButton extends StatelessWidget {
  const DashNavButton({
    super.key,
    required this.icon,
    required this.onTap,
    required this.enabled,
  });

  final IconData icon;
  final VoidCallback onTap;
  final bool enabled;

  @override
  Widget build(BuildContext context) => DashCircleButton(
    icon: icon,
    onTap: enabled ? onTap : null,
    size: Dash.sp(40),
    iconSize: Dash.sp(20),
    splash: Dash.accent,
    fill: enabled ? Dash.accent : Dash.wash,
    iconColor: enabled ? Dash.on : Dash.accent.withValues(alpha: 0.45),
  );
}

/// ชิปตัวเลือกในฟอร์ม — เลือกแล้วน้ำเงินทึบ ไม่เลือกเป็นกล่องขอบบาง
class PillChoice extends StatelessWidget {
  const PillChoice({
    super.key,
    required this.label,
    required this.on,
    required this.onTap,
  });

  final String label;
  final bool on;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Tappable(
    onTap: onTap,
    borderRadius: BorderRadius.circular(100),
    splash: Dash.accent,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: on ? Dash.accentActive : Dash.card,
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: on ? Dash.accentActive : Dash.hairline),
      ),
      child: Text(
        label,
        style: Dash.body(
          size: 12.5,
          weight: FontWeight.w600,
          color: on ? Dash.on : Dash.sub,
        ),
      ),
    ),
  );
}

/// ปุ่มพิลบนแผงน้ำเงิน (มุมขวาของแถบหัวหน้าย่อย) — จางลงตอนยังกดไม่ได้
class PanelPillButton extends StatelessWidget {
  const PanelPillButton({
    super.key,
    required this.label,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Tappable(
    onTap: enabled ? onTap : null,
    borderRadius: BorderRadius.circular(100),
    splash: Dash.onPanel(),
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Dash.onPanel(enabled ? 1 : 0.18),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        label,
        style: Dash.tech(
          size: 13,
          weight: FontWeight.w700,
          color: enabled ? Dash.accentActive : Dash.onPanel(0.5),
        ),
      ),
    ),
  );
}
