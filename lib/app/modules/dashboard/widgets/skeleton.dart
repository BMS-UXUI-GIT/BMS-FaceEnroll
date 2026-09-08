import 'package:flutter/material.dart';

import '../dash_theme.dart';

/// กล่องโครงร่างสีเทา — กวาดแสง "ภายในกล่องตัวเอง" ไม่ใช่เส้นพาดทั้งจอ
class Skel extends StatelessWidget {
  const Skel({
    super.key,
    this.width,
    required this.height,
    this.radius = 8,
    this.phase = 0,
    this.onPanel = false,
  });

  final double? width;
  final double height;
  final double radius;

  /// วางบนแผงน้ำเงิน — เทาอ่อนจะดูเป็นรอยเปื้อน ใช้ขาวโปร่งแทน
  final bool onPanel;

  /// เหลื่อมจังหวะกวาดแสง 0..1 — ถ้าทุกกล่องเฟสตรงกัน แถบสว่างจะเรียงเป็นเส้นเดียวพาดทั้งจอ
  final double phase;

  @override
  Widget build(BuildContext context) {
    final t = ShimmerScope.of(context)?.value ?? 0;
    final base = onPanel ? Dash.onPanel(0.18) : Dash.rowBg;
    final highlight = onPanel
        ? Dash.onPanel(0.34)
        : (Dash.dark ? const Color(0xFF343A47) : Colors.white);
    // แถบสว่างวิ่งจากซ้ายไปขวาในขอบเขตของกล่องนี้เท่านั้น
    final c = ((t + phase) % 1.0) * 1.6 - 0.3;
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        gradient: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [base, highlight, base],
          stops: [
            (c - 0.3).clamp(0.0, 1.0),
            c.clamp(0.0, 1.0),
            (c + 0.3).clamp(0.0, 1.0),
          ],
        ),
      ),
    );
  }
}

/// ส่งจังหวะกวาดแสงลงไปให้ทุก [Skel] ใต้ต้นไม้ — ตัวเดียวเดินเวลาให้ทั้งหน้า

class ShimmerScope extends InheritedNotifier<Animation<double>> {
  const ShimmerScope({
    super.key,
    required Animation<double> super.notifier,
    required super.child,
  });

  static Animation<double>? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ShimmerScope>()?.notifier;
}

/// ครอบส่วนที่มีโครงร่าง — ตัวนับเวลาวน 1.2 วิ ให้แสงกวาดของทุกกล่องตรงจังหวะกัน
class Shimmer extends StatefulWidget {
  const Shimmer({super.key, required this.child});

  final Widget child;

  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      ShimmerScope(notifier: _c, child: widget.child);
}
