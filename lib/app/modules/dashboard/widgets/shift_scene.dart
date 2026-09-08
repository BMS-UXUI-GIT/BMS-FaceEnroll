import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../attendance_row.dart';

/// ฉากประจำเวรบนการ์ดวันนี้ — วาดเองทั้งหมดเพื่อให้ขยับทีละชิ้นได้
/// ดวงอาทิตย์/จันทร์ไต่ข้ามโดมช้า ๆ · เมฆค่อย ๆ ลอยมารวมกันเป็นก้อนตอนเปิดการ์ด
class ShiftScene extends StatefulWidget {
  const ShiftScene({
    super.key,
    required this.hhmm,
    required this.width,
    required this.height,
  });

  final String hhmm;
  final double width;
  final double height;

  @override
  State<ShiftScene> createState() => _ShiftSceneState();
}

class _ShiftSceneState extends State<ShiftScene> with TickerProviderStateMixin {
  /// ดวงอาทิตย์ไต่โดม — 18 วิต่อรอบ ช้าจนไม่รบกวนตอนอ่านตัวเลข แต่เห็นว่าขยับ
  late final AnimationController _sun = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 18),
  )..repeat(reverse: true);

  /// เมฆประกอบร่าง — เล่นครั้งเดียวตอนโผล่ และเล่นใหม่เมื่อสลับเวร
  late final AnimationController _form = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  )..forward();

  /// 0 = ดวงอาทิตย์เต็มดวง · 1 = พระจันทร์เสี้ยว — ค่อย ๆ แปลงร่างตอนสลับไปเวรดึก
  late final AnimationController _night = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 650),
    value: _isNight(widget.hhmm) ? 1 : 0,
  );

  static bool _isNight(String hhmm) =>
      (int.tryParse(hhmm.split(':').first) ?? 8) >= 18;

  @override
  void didUpdateWidget(covariant ShiftScene old) {
    super.didUpdateWidget(old);
    if (shiftName(old.hhmm) != shiftName(widget.hhmm)) {
      _form.forward(from: 0);
      _night.animateTo(_isNight(widget.hhmm) ? 1 : 0, curve: Curves.easeInOut);
    }
  }

  @override
  void dispose() {
    _sun.dispose();
    _form.dispose();
    _night.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => RepaintBoundary(
    child: CustomPaint(
      size: Size(widget.width, widget.height),
      painter: _ShiftPainter(
        sun: _sun,
        form: CurvedAnimation(parent: _form, curve: Curves.easeOutBack),
        night: _night,
      ),
    ),
  );
}

class _ShiftPainter extends CustomPainter {
  _ShiftPainter({required this.sun, required this.form, required this.night})
    : super(repaint: Listenable.merge([sun, form, night]));

  final Animation<double> sun;
  final Animation<double> form;

  /// 0 = ดวงอาทิตย์ · 1 = พระจันทร์เสี้ยว (ค่ากลางคือกำลังแปลงร่าง)
  final Animation<double> night;

  // สีดูดมาจากไฟล์ภาพประกอบเดิม
  static const _sunColor = Color(0xFFFDAF32);
  static const _moonColor = Color(0xFFDCC8F5);

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final baseY = h * 0.97;
    final cx = w * 0.5;
    final orbR = w * 0.085;
    // เผื่อรัศมีดวง + แสงเรือง (1.7 เท่า) ไว้ทั้งสองข้าง ไม่งั้นตอนไต่ไปสุดขอบจะโดนตัด
    final margin = orbR * 1.7;
    // รัศมีโดม — กว้างที่สุดเท่าที่ดวงยังอยู่ในกรอบครบทั้งใบตลอดทาง
    final r = math.min(w * 0.46, math.min(w * 0.5, baseY) - margin);

    // ไม่วาดโดมแล้ว — พื้นหลังการ์ดที่ไล่สีจากมุมขวาบนทำหน้าที่เป็นท้องฟ้าแทน
    // โดมเหลือไว้เป็นแค่ "เส้นทาง" ที่ดวงอาทิตย์ไต่ (r, cx, baseY ด้านล่าง)

    // ดวงอาทิตย์/จันทร์ไต่จากซ้ายไปขวาตามขอบโดม แล้ววนใหม่
    // ไต่แค่ช่วงกลางของโดม แล้ววิ่งกลับ — ดวงอาทิตย์อยู่ในกรอบตลอด
    // ปล่อยให้วิ่งครบ 0→1 จะมีช่วงที่มันลับขอบฟ้าแล้วมุมนั้นว่างเปล่าเฉย ๆ
    final t = 0.15 + sun.value * 0.7;
    final a = math.pi * (1 - t); // pi → 0
    final orbC = Offset(cx + r * math.cos(a), baseY - r * math.sin(a));
    canvas.save();
    // ไม่ตัดที่เส้นฐานโดมแล้ว — ไม่ได้วาดพื้น/ขอบฟ้าไว้ ตัดแล้วดูเป็นดวงโดนเฉือนเฉย ๆ
    // (รัศมีโดมคุมไว้ให้ดวงอยู่ในกรอบครบทั้งใบตลอดทางแล้ว)
    final n = night.value;
    final orbColor = Color.lerp(_sunColor, _moonColor, n)!;
    canvas.drawCircle(
      orbC,
      orbR * 1.7,
      Paint()..color = orbColor.withValues(alpha: 0.18),
    );
    // วาดตัวดวงในเลเยอร์แยกแล้ว "เจาะ" ด้วย dstOut — เสี้ยวจึงโปร่งจริง
    // ไม่ต้องรู้ว่าพื้นหลังตรงนั้นสีอะไร (การ์ดไล่เฉดอยู่ ทาสีทับจะเห็นรอยต่อ)
    canvas
      ..saveLayer(Rect.fromCircle(center: orbC, radius: orbR * 1.2), Paint())
      ..drawCircle(orbC, orbR, Paint()..color = orbColor);
    if (n > 0.01) {
      // วงที่มาเจาะเลื่อนเข้ามาจากนอกดวง (2.1R) จนถึงตำแหน่งเสี้ยว (0.55R)
      canvas.drawCircle(
        orbC.translate(orbR * (2.1 - 1.55 * n), -orbR * 0.3 * n),
        orbR * 0.95,
        Paint()..blendMode = BlendMode.dstOut,
      );
    }
    canvas
      ..restore()
      ..restore();

    // เมฆ 3 ก้อนลอยเข้ามารวมกัน — p=0 กระจายและจาง · p=1 ประกอบร่างเสร็จ
    final p = form.value.clamp(0.0, 1.0);
    final cloud = Paint()..color = Colors.white.withValues(alpha: 0.92 * p);
    final base = Offset(w * 0.54, baseY - h * 0.13);
    const spread = [Offset(-1.6, 0.9), Offset(0, -1.4), Offset(1.7, 0.8)];
    const puffs = [
      (Offset(-0.20, 0.05), 0.135),
      (Offset(0.0, -0.10), 0.175),
      (Offset(0.21, 0.04), 0.145),
    ];
    for (var i = 0; i < puffs.length; i++) {
      final (rel, rr) = puffs[i];
      final off = Offset(
        rel.dx * w + spread[i].dx * w * 0.28 * (1 - p),
        rel.dy * h + spread[i].dy * h * 0.24 * (1 - p),
      );
      canvas.drawCircle(base + off, w * rr * (0.55 + 0.45 * p), cloud);
    }
    // ฐานเมฆแบน ๆ เชื่อมก้อนให้เป็นก้อนเดียว
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: base + Offset(0, h * 0.09),
          width: w * 0.52 * p,
          height: h * 0.16,
        ),
        Radius.circular(h * 0.08),
      ),
      cloud,
    );
  }

  @override
  bool shouldRepaint(_ShiftPainter old) => false; // repaint ผูกกับ animation แล้ว
}
