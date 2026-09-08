import 'package:flutter/material.dart';

/// ไล่โผล่ข้อมูลในกราฟทีละชิ้น — จุดวันในสัปดาห์ · ช่องปฏิทินเดือน · แท่งกราฟรายปี
///
/// เล่นใหม่ทุกครั้งที่ [trigger] เปลี่ยน (สลับแท็บช่วง หรือเลื่อนไปสัปดาห์/เดือน/ปีอื่น)
/// ตัวคุมเดียวคุมทุกชิ้น ไม่ต้องมี controller ต่อชิ้น — ปฏิทินเดือนมีได้ถึง 42 ช่อง
class ChartAppear extends StatelessWidget {
  const ChartAppear({
    super.key,
    required this.trigger,
    required this.builder,
    this.duration = const Duration(milliseconds: 520),
  });

  /// เปลี่ยนค่านี้เมื่อไหร่ = เริ่มไล่โผล่ใหม่
  final Object trigger;
  final Duration duration;
  final Widget Function(BuildContext context, double t) builder;

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    // key ผูกกับ trigger — เปลี่ยนชุดข้อมูลแล้ววิดเจ็ตถูกสร้างใหม่ ค่าจึงเริ่มจาก 0 อีกครั้ง
    key: ValueKey(trigger),
    tween: Tween(begin: 0, end: 1),
    duration: duration,
    curve: Curves.linear,
    builder: (context, t, _) => builder(context, t),
  );
}

/// ความคืบหน้าของชิ้นที่ [i] จาก [n] ชิ้น เมื่อทั้งชุดเดินมาถึง [t] (0..1)
///
/// [window] = สัดส่วนเวลาที่แต่ละชิ้นใช้โผล่ ที่เหลือคือระยะเหลื่อมระหว่างชิ้น
/// ค่ามากขึ้น = ชิ้นซ้อนเวลากันมาก ดูเป็นก้อนเดียว · ค่าน้อย = ไล่ทีละชิ้นชัด ๆ
double appearAt(double t, int i, int n, {double window = 0.55}) {
  if (n <= 1) return t.clamp(0.0, 1.0);
  final delta = (1 - window) / (n - 1);
  return ((t - i * delta) / window).clamp(0.0, 1.0);
}
