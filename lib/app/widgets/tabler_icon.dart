import 'package:flutter/material.dart';

/// ไอคอน tabler วาดจาก path เดียวกับเว็บ (src/icons.tsx) — หน้าตาจึงตรงกันพิกเซลต่อพิกเซล
/// ใช้เฉพาะที่ต้องเหมือนเว็บเป๊ะ (ป้ายสถานะ) ส่วนอื่นของแอปยังใช้ Phosphor ตามเดิม
///
/// รองรับคำสั่ง path เท่าที่ชุดนี้ใช้: M m L l H h V v C c A a Z z
class TablerIcon extends StatelessWidget {
  const TablerIcon(
    this.name, {
    super.key,
    this.size = 24,
    this.color,
    this.strokeWidth = 2,
  });

  final String name;
  final double size;
  final Color? color;

  /// ความหนาเส้นบน viewBox 24 (เว็บส่ง width={2} ในป้ายสถานะ)
  final double strokeWidth;

  /// path data ก๊อปตรงจากเว็บ — แต่ละไอคอนมีหลาย `<path>` รวมเป็นสตริงเดียวได้เพราะ M ขึ้นต้นใหม่ทุกเส้น
  static const Map<String, String> paths = {
    // tabler: user-scan
    'scan':
        'M10 9a2 2 0 1 0 4 0a2 2 0 0 0 -4 0 M8 16a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2 '
        'M3 7v-2a2 2 0 0 1 2 -2h2 M3 17v2a2 2 0 0 0 2 2h2 M17 3h2a2 2 0 0 1 2 2v2 '
        'M17 21h2a2 2 0 0 0 2 -2v-2',
    // tabler: clock-exclamation
    'clock-alert':
        'M20.986 12.502a9 9 0 1 0 -5.973 7.98 M12 7v5l3 3 M19 16v3 M19 22v.01',
    // tabler: clock-play
    'clock-play':
        'M12 7v5l2 2 M17 22l5 -3l-5 -3l0 6 M13.017 20.943a9 9 0 1 1 7.831 -7.292',
    // tabler: map-question
    'map-question':
        'M15 20l-6 -3l-6 3v-13l6 -3l6 3l6 -3v7.5 M9 4v13 M15 7v5.5 M19 22v.01 '
        'M19 19a2.003 2.003 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483',
    // tabler: time-duration-off
    'time-duration-off':
        'M3 12v.01 M7.5 19.8v.01 M4.2 16.5v.01 M4.2 7.5v.01 '
        'M12 21a8.994 8.994 0 0 0 6.362 -2.634m1.685 -2.336a9 9 0 0 0 -8.047 -13.03 '
        'M3 3l18 18',
    // tabler: clock
    'clock': 'M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0 M12 7v5l3 3',
    // tabler: clock-x (ไม่มีเวลาเข้า)
    'clock-x':
        'M20.984 12.535a9 9 0 1 0 -8.431 8.448 M12 7v5l3 3 M22 22l-5 -5 M17 22l5 -5',
    // tabler: haze (เวรเช้า)
    'haze':
        'M3 12h1 M12 3v1 M20 12h1 M5.6 5.6l.7 .7 M18.4 5.6l-.7 .7 M8 12a4 4 0 1 1 8 0 '
        'M3 16h18 M3 20h18',
    // tabler: sun-high (เวรบ่าย)
    'sun':
        'M14.828 14.828a4 4 0 1 0 -5.656 -5.656a4 4 0 0 0 5.656 5.656 '
        'M6.343 17.657l-1.414 1.414 M6.343 6.343l-1.414 -1.414 M17.657 6.343l1.414 -1.414 '
        'M17.657 17.657l1.414 1.414 M4 12h-2 M12 4v-2 M20 12h2 M12 20v2',
    // tabler: moon-stars (เวรดึก)
    'moon':
        'M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008 '
        'M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2 M19 11h2m-1 -1v2',
  };

  @override
  Widget build(BuildContext context) => SizedBox(
    width: size,
    height: size,
    child: CustomPaint(
      painter: _TablerPainter(
        _cache[name] ??= _parse(paths[name] ?? ''),
        color ?? IconTheme.of(context).color ?? Colors.black,
        strokeWidth,
      ),
    ),
  );

  static final Map<String, Path> _cache = {};

  /// แปลง path data (viewBox 24) เป็น Path — parser เล็ก ๆ พอสำหรับคำสั่งที่ tabler ใช้
  static Path _parse(String d) {
    final path = Path();
    final tokens = RegExp(
      r'[MmLlHhVvCcAaZz]|-?\d*\.?\d+(?:e-?\d+)?',
    ).allMatches(d).map((m) => m.group(0)!).toList();
    var i = 0;
    double x = 0, y = 0, sx = 0, sy = 0;
    String cmd = 'M';
    double next() => double.parse(tokens[i++]);
    while (i < tokens.length) {
      final t = tokens[i];
      if (RegExp(r'[A-Za-z]').hasMatch(t)) {
        cmd = t;
        i++;
        if (cmd == 'Z' || cmd == 'z') {
          path.close();
          x = sx;
          y = sy;
          continue;
        }
      }
      switch (cmd) {
        case 'M':
          x = next();
          y = next();
          path.moveTo(x, y);
          sx = x;
          sy = y;
          cmd = 'L'; // พิกัดถัดไปหลัง M นับเป็น L ตามสเปก SVG
        case 'm':
          x += next();
          y += next();
          path.moveTo(x, y);
          sx = x;
          sy = y;
          cmd = 'l';
        case 'L':
          x = next();
          y = next();
          path.lineTo(x, y);
        case 'l':
          x += next();
          y += next();
          path.lineTo(x, y);
        case 'H':
          x = next();
          path.lineTo(x, y);
        case 'h':
          x += next();
          path.lineTo(x, y);
        case 'V':
          y = next();
          path.lineTo(x, y);
        case 'v':
          y += next();
          path.lineTo(x, y);
        case 'C':
        case 'c':
          final rel = cmd == 'c';
          final x1 = next(), y1 = next(), x2 = next(), y2 = next();
          final ex = next(), ey = next();
          final ox = rel ? x : 0, oy = rel ? y : 0;
          path.cubicTo(ox + x1, oy + y1, ox + x2, oy + y2, ox + ex, oy + ey);
          x = ox + ex;
          y = oy + ey;
        case 'A':
        case 'a':
          final rx = next(), ry = next(), rot = next();
          final large = next() != 0, sweep = next() != 0;
          final ex = next(), ey = next();
          final tx = cmd == 'a' ? x + ex : ex;
          final ty = cmd == 'a' ? y + ey : ey;
          // arcToPoint ใช้ความหมายเดียวกับ arc ของ SVG เป๊ะ ไม่ต้องคำนวณจุดศูนย์กลางเอง
          path.arcToPoint(
            Offset(tx, ty),
            radius: Radius.elliptical(rx, ry),
            rotation: rot,
            largeArc: large,
            clockwise: sweep,
          );
          x = tx;
          y = ty;
        default:
          i = tokens.length; // คำสั่งที่ไม่รู้จัก — หยุด ไม่วาดมั่ว
      }
    }
    return path;
  }
}

class _TablerPainter extends CustomPainter {
  const _TablerPainter(this.path, this.color, this.strokeWidth);

  final Path path;
  final Color color;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 24;
    canvas.scale(s, s);
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(_TablerPainter old) =>
      old.path != path || old.color != color || old.strokeWidth != strokeWidth;
}
