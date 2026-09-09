import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../dash_theme.dart';
import '../widgets/skeleton.dart';

/// การ์ดสแกนเข้า/ออก วางคู่กัน (Figma 584:14302)
class ScanTiles extends StatefulWidget {
  const ScanTiles({
    super.key,
    required this.inTime,
    required this.outTime,
    required this.inColor,
    required this.outColor,
    this.skelIn = false,
    this.skelOut = false,
  });

  static double get tileH => Dash.box(84);

  final String inTime;
  final String outTime;
  final Color inColor;
  final Color outColor;

  /// ช่องนี้กำลังโหลดค่าใหม่ — วางโครงร่างแทนตัวเลขไว้ก่อน (หน้าตรวจสอบคำขอใช้)
  final bool skelIn;
  final bool skelOut;

  @override
  State<ScanTiles> createState() => _ScanTilesState();
}

class _ScanTilesState extends State<ScanTiles> {
  @override
  Widget build(BuildContext context) => SizedBox(
    height: ScanTiles.tileH,
    child: Row(
      children: [
        Expanded(
          child: _ScanTile(
            label: 'สแกนเข้า',
            time: widget.inTime,
            timeColor: widget.inColor,
            art: 'assets/images/scan_in.png',
            skel: widget.skelIn,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _ScanTile(
            label: 'สแกนออก',
            time: widget.outTime,
            timeColor: widget.outColor,
            art: 'assets/images/scan_out.png',
            skel: widget.skelOut,
          ),
        ),
      ],
    ),
  );
}

/// ช่องสแกนเข้า/ออกหนึ่งช่อง — ปกติเป็นกล่องนิ่ง ๆ
/// ตอนโครงร่างคลายเป็นค่าใหม่ (หน้าตรวจสอบคำขอ) จะย้อมเขียวพร้อมติ๊กถูกหนึ่งจังหวะ
/// ให้ตาจับได้ว่าเลขนี้แหละที่เพิ่งเปลี่ยน แล้วจางกลับเป็นกล่องปกติ
class _ScanTile extends StatefulWidget {
  const _ScanTile({
    required this.label,
    required this.time,
    required this.timeColor,
    required this.art,
    required this.skel,
  });

  final String label;
  final String time;
  final Color timeColor;
  final String art;
  final bool skel;

  @override
  State<_ScanTile> createState() => _ScanTileState();
}

class _ScanTileState extends State<_ScanTile>
    with SingleTickerProviderStateMixin {
  /// จังหวะเปลี่ยนค่าของช่องนี้ ต่อจากโครงร่างเป็นทอด ๆ:
  /// โครงร่างละลาย → ช่องเขียวพร้อมติ๊กถูก (ค่าใหม่มาแล้ว) → เขียวจางออกเหลือค่าใหม่
  late final AnimationController _reveal = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1800),
  );

  /// กำลังเล่นจังหวะนี้อยู่ไหม — ช่องที่ไม่เคยเป็นโครงร่างต้องวาดแบบนิ่ง ๆ ไม่แตะ
  bool _revealing = false;

  @override
  void didUpdateWidget(_ScanTile old) {
    super.didUpdateWidget(old);
    if (old.skel && !widget.skel) {
      setState(() => _revealing = true);
      _reveal.forward(from: 0).whenComplete(() {
        if (mounted) setState(() => _revealing = false);
      });
    }
  }

  @override
  void dispose() {
    _reveal.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // fit ต้องเป็น expand — ไม่งั้น Stack ส่ง constraint หลวมให้กล่องข้างใน
    // แล้วช่องจะหุบตามความกว้างข้อความ ภาพประกอบทับตัวเลข
    if (!_revealing) {
      return _box(widget.skel ? _skelBox() : _content());
    }
    return AnimatedBuilder(
      animation: _reveal,
      builder: (context, _) {
        final t = _reveal.value;
        // โครงร่างละลายช่วงแรก
        final skelOut =
            1 - Curves.easeInOut.transform((t / 0.16).clamp(0.0, 1.0));
        // เขียว+ติ๊กถูกขึ้นทับทันทีที่โครงร่างเริ่มหาย ค้างไว้ แล้วจางออกยาว ๆ
        final ok = t < 0.12
            ? Curves.easeOut.transform(t / 0.12)
            : (t < 0.56
                  ? 1.0
                  : 1 - Curves.easeInOutCubic.transform((t - 0.56) / 0.44));
        // ค่าใหม่โผล่ตอนเขียวเริ่มจาง
        final inAlpha = Curves.easeOut.transform(
          ((t - 0.56) / 0.24).clamp(0.0, 1.0),
        );
        return Stack(
          fit: StackFit.expand,
          children: [
            _box(
              Stack(
                fit: StackFit.expand,
                children: [
                  if (skelOut > 0.01)
                    Opacity(opacity: skelOut, child: _skelBox()),
                  Opacity(opacity: inAlpha, child: _content()),
                ],
              ),
            ),
            if (ok > 0.01) _okLayer(ok, t),
          ],
        );
      },
    );
  }

  /// แผ่นเขียว + ติ๊กถูกกลางช่อง — บอกว่าค่าใหม่ของช่องนี้มาแล้ว
  Widget _okLayer(double ok, double t) => IgnorePointer(
    child: Opacity(
      opacity: ok,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Dash.ok,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Center(
          child: Transform.scale(
            scale:
                0.6 +
                0.4 * Curves.easeOutBack.transform((t / 0.22).clamp(0.0, 1.0)),
            child: Icon(
              PhosphorIconsFill.checkCircle,
              size: Dash.sp(44),
              color: Dash.on,
            ),
          ),
        ),
      ),
    ),
  );

  /// ภาพประกอบมุมขวาล่างของช่อง — โหมดมืดเร่งความสว่างขึ้นเล็กน้อย
  /// ต้นฉบับวาดมาสำหรับพื้นสว่าง เส้นขอบเข้ม ๆ เลยจมไปกับการ์ดสีเทาเข้ม
  Widget _art() {
    final img = Image.asset(
      widget.art,
      width: Dash.sp(56),
      height: Dash.sp(62),
      fit: BoxFit.contain,
      alignment: Alignment.bottomRight,
      cacheWidth: (Dash.sp(56) * Dash.dpr).round(),
      cacheHeight: (Dash.sp(62) * Dash.dpr).round(),
    );
    if (!Dash.dark) return img;
    return ColorFiltered(
      // คูณความสว่าง 1.18 + ยกพื้น 10 — สีคงเดิม แค่สว่างขึ้นทั้งภาพ
      colorFilter: const ColorFilter.matrix(<double>[
        1.18,
        0,
        0,
        0,
        10,
        0,
        1.18,
        0,
        0,
        10,
        0,
        0,
        1.18,
        0,
        10,
        0,
        0,
        0,
        1,
        0,
      ]),
      child: img,
    );
  }

  Widget _skelBox() => Skel(height: ScanTiles.tileH, radius: 16);

  Widget _box(Widget child) => DecoratedBox(
    decoration: BoxDecoration(
      color: Dash.rowBg,
      borderRadius: BorderRadius.circular(16),
    ),
    child: child,
  );

  Widget _content() => Stack(
    clipBehavior:
        Clip.none, // ปล่อยให้ภาพล้นพ้นการ์ดได้ (Stack ตัดขอบเป็นค่าเริ่มต้น)
    children: [
      // ภาพประกอบล้นพ้นขอบล่างการ์ดนิดเดียว — เห็นเต็มตัว ไม่ถูกตัด
      Positioned(right: 0, bottom: -6, child: _art()),
      Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(widget.label, style: Dash.body(size: 12, color: Dash.muted)),
            const SizedBox(height: 8),
            Text(
              '${widget.time.isEmpty ? '--:--' : widget.time} น.',
              style: Dash.num(
                size: 16,
                weight: FontWeight.w700,
                color: widget.timeColor,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}
