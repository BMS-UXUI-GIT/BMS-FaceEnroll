import 'package:flutter/material.dart';

/// วงกลมสถานะ — เวรเดียวระบายสีเดียว สองเวรผ่าครึ่งทแยงคนละสี
class SplitDot extends CustomPainter {
  const SplitDot(this.a, this.b);
  final Color a;
  final Color b;

  @override
  void paint(Canvas canvas, Size size) {
    final r = size.width / 2;
    final c = Offset(r, r);
    if (a == b) {
      canvas.drawCircle(c, r, Paint()..color = a);
      return;
    }
    void half(Path clip, Color color) {
      canvas
        ..save()
        ..clipPath(clip)
        ..drawCircle(c, r, Paint()..color = color)
        ..restore();
    }

    half(
      Path()
        ..moveTo(0, 0)
        ..lineTo(size.width, 0)
        ..lineTo(0, size.height)
        ..close(),
      a,
    );
    half(
      Path()
        ..moveTo(size.width, 0)
        ..lineTo(size.width, size.height)
        ..lineTo(0, size.height)
        ..close(),
      b,
    );
    // เส้นขาวคั่นให้เห็นว่าเป็นสองเวร ไม่ใช่สีไล่เฉด
    canvas.drawLine(
      Offset(0, size.height),
      Offset(size.width, 0),
      Paint()
        ..color = Colors.white
        ..strokeWidth = 1.5,
    );
  }

  @override
  bool shouldRepaint(SplitDot old) => old.a != a || old.b != b;
}

/// ช่องปฏิทินสถานะ — สองเวรคนละสถานะผ่าครึ่งทแยง (ภาษาเดียวกับ [SplitDot])
class SplitBox extends CustomPainter {
  const SplitBox(this.a, this.b);
  final Color a;
  final Color b;

  @override
  void paint(Canvas canvas, Size size) {
    final upper = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width, 0)
      ..lineTo(0, size.height)
      ..close();
    final lower = Path()
      ..moveTo(size.width, 0)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas
      ..drawPath(upper, Paint()..color = a)
      ..drawPath(lower, Paint()..color = b)
      // เส้นขาวคั่นให้เห็นว่าเป็นสองเวร ไม่ใช่สีไล่เฉด
      ..drawLine(
        Offset(0, size.height),
        Offset(size.width, 0),
        Paint()
          ..color = Colors.white
          ..strokeWidth = 1.2,
      );
  }

  @override
  bool shouldRepaint(SplitBox old) => old.a != a || old.b != b;
}
