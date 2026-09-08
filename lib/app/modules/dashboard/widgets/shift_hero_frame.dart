import 'package:flutter/material.dart';

import '../dash_theme.dart';

/// กรอบการ์ดที่มีไล่สีเวรมุมขวาบน + ฉากท้องฟ้า — การ์ด "การสแกนของวันนี้" กับ "วันที่ขอแก้ไข"
/// ใช้กรอบเดียวกัน ต่างแค่เนื้อใน
///
/// ไล่สีเป็น radial จากมุมขวาบนจางลงเป็นสีการ์ดก่อนถึงกลางใบ — ให้ฉากมีท้องฟ้ารองรับ
/// โดยไม่ไปแย่งตัวหนังสือ · เปลี่ยน [tint] แล้วสีค่อย ๆ ไล่ไปหาสีใหม่ ไม่กระโดด
class ShiftHeroFrame extends StatelessWidget {
  const ShiftHeroFrame({
    super.key,
    required this.tint,
    required this.scene,
    required this.child,
    this.duration = const Duration(milliseconds: 450),
  });

  /// สีท้องฟ้าที่ผ่านการปรับความโปร่ง/lerp มาแล้ว
  final Color tint;

  /// ฉากมุมขวาบน (ตำแหน่ง/ขนาดชุดเดียวกันทุกการ์ด) — ส่ง AnimatedSwitcher ครอบมาได้
  final Widget scene;
  final Widget child;
  final Duration duration;

  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: duration,
    curve: Curves.easeOut,
    // ไม่มี padding ที่การ์ด — แผ่นขาวส่วนล่างต้องกว้างชนขอบการ์ด
    decoration: BoxDecoration(
      color: Dash.card,
      gradient: RadialGradient(
        center: const Alignment(0.95, -1.1),
        radius: 1.15,
        colors: [tint, Dash.card],
        stops: const [0, 0.72],
      ),
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: Dash.hairline),
    ),
    child: Stack(
      children: [
        // ดันฉากลงล่าง — ส่วนที่ทับแผ่นสแกนถูกแผ่นบังไว้อยู่แล้ว (วาดก่อนเนื้อหา)
        // Figma: ห่างขอบขวาการ์ด 34
        Positioned(
          top: 25,
          right: 34,
          child: Opacity(opacity: Dash.dark ? 0.35 : 1, child: scene),
        ),
        child,
      ],
    ),
  );
}

/// แถวบนสุดของการ์ด: ป้ายเล็กซ้าย · ชิปเวรขวา (ชิดบนตาม Figma items-start)
class HeroCardHeader extends StatelessWidget {
  const HeroCardHeader({super.key, required this.title, this.trailing});

  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(title, style: Dash.body(size: 12, color: Dash.muted)),
        ),
        if (trailing != null) trailing!,
      ],
    ),
  );
}

/// แผ่นทึบคลุมช่องสแกน — แยกสถานะด้านบนออกจากเวลาด้านล่าง (Figma 606:12591)
/// กว้างชนขอบการ์ด มุมโค้ง 24 เท่ากัน ท่อนล่างของไล่สีเวรจึงถูกบังไว้ทั้งแถบ
/// เงานุ่มพุ่งขึ้น — บอกว่าแผ่นนี้ลอยทับส่วนบนของการ์ด ไม่ใช่พื้นผืนเดียวกัน
class ScanSheet extends StatelessWidget {
  const ScanSheet({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: Dash.card,
      borderRadius: BorderRadius.circular(24),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: Dash.dark ? 0.35 : 0.06),
          blurRadius: 16,
          offset: const Offset(0, -4),
        ),
      ],
    ),
    child: child,
  );
}
