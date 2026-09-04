import 'package:flutter/material.dart';

/// ครอบ widget ที่กดได้ให้มี ripple — วาง InkWell ทับด้านบนแบบ overlay
/// จึงไม่แตะ layout/decoration เดิมเลย และ ink วาดทับพื้นการ์ดได้ (ไม่โดน decoration บัง)
///
/// - [borderRadius] ให้ ripple ตัดขอบตรงกับการ์ด (ค่าเริ่มต้น 12)
/// - [circle] สำหรับปุ่มวงกลม (ใช้แทน borderRadius)
/// - [splash] สีเฉพาะจุด — ไม่ส่ง = ใช้สี primary ของธีม (เห็นได้ทั้งพื้นสว่างและมืด)
class Tappable extends StatelessWidget {
  const Tappable({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.borderRadius,
    this.circle = false,
    this.splash,
    this.enabled = true,
  });

  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final BorderRadius? borderRadius;
  final bool circle;
  final Color? splash;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final active = enabled && (onTap != null || onLongPress != null);
    if (!active) return child;
    final c = splash ?? Theme.of(context).colorScheme.primary;
    final radius = circle ? null : (borderRadius ?? BorderRadius.circular(12));
    return Stack(
      // passthrough = ส่ง constraint เดิมทะลุถึง child (ไม่งั้น Stack จะ loose แล้วชิดซ้ายบน → layout เพี้ยน)
      fit: StackFit.passthrough,
      children: [
        child,
        Positioned.fill(
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onTap,
              onLongPress: onLongPress,
              borderRadius: radius,
              customBorder: circle ? const CircleBorder() : null,
              splashColor: c.withValues(alpha: 0.16),
              highlightColor: c.withValues(alpha: 0.07),
              child: const SizedBox.expand(),
            ),
          ),
        ),
      ],
    );
  }
}
