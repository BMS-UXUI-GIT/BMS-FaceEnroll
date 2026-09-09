import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../widgets/tappable.dart';
import '../dash_theme.dart';

/// หัวเรื่องแบบยุบได้ของหน้าแก้ไขเวลา (Figma 606:12606)
///
/// พื้นฟ้าอ่อน ปุ่มปิด ชื่อเรื่อง คำอธิบาย · ภาพประกอบชิดขอบล่างขวา
/// เลื่อนลงแล้วยุบเหลือแถบชื่ออย่างเดียว โดยปุ่มปิดอยู่มุมซ้ายตลอด
class FixHeroBar extends StatelessWidget {
  const FixHeroBar({super.key, required this.title, required this.intro});

  final String title;
  final String intro;

  /// ภาพ 157×136 ตามสัดส่วนใน Figma — ต้องกันที่กว้างตามอัตราส่วนจริง ไม่งั้นล้นแถว
  static const double _artRatio = 157 / 136;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.viewPaddingOf(context).top;
    final minH = Dash.box(52) + top;
    final artH = Dash.sp(136);
    final artW = artH * _artRatio;
    final introStyle = Dash.body(
      size: 12,
      weight: FontWeight.w500,
      color: Dash.muted,
    ).copyWith(height: 1.45);
    // วัดข้อความเองก่อน — hero สูงคงที่ พอฟอนต์ระบบใหญ่หรือจอแคบแล้วบรรทัดเพิ่ม จะล้น
    final textW = MediaQuery.sizeOf(context).width - 32 - artW - 8;
    TextPainter paint(String t, TextStyle st, double w) => TextPainter(
      text: TextSpan(text: t, style: st),
      textDirection: TextDirection.ltr,
      textScaler: TextScaler.linear(Dash.textScale),
    )..layout(maxWidth: w);
    // ชื่อเรื่องต้องอยู่บรรทัดเดียวเสมอ — จอแคบหรือฟอนต์ระบบใหญ่ก็ย่อขนาดลงแทนที่จะขึ้นบรรทัดใหม่
    TextStyle titleAt(double size) =>
        Dash.tech(size: size, weight: FontWeight.w600, color: Dash.ink);
    final oneLineW = paint(title, titleAt(20), double.infinity).width;
    final titleStyle = titleAt(
      oneLineW <= textW ? 20 : math.max(15, 20 * textW / oneLineW),
    );
    final textH =
        paint(title, titleStyle, textW).height +
        6 +
        paint(intro, introStyle, textW).height +
        18;
    final maxH = minH + math.max(textH, artH);
    // สร้างครั้งเดียวแล้วใช้ instance เดิมทุกเฟรมที่เลื่อน — วิดเจ็ตตัวเดิมเป๊ะ
    // Flutter จะข้ามการ build ซ้ำทั้งกิ่ง (ไม่งั้นภาพประกอบถูกสร้างใหม่ทุกเฟรม)
    final art = Padding(
      padding: EdgeInsets.only(top: minH, left: 16, right: 16),
      child: Row(
        // ภาพชนขอบล่างของ hero · ข้อความเกาะขอบบนใต้ปุ่มปิด
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // กว้างเท่าที่วัดไว้เป๊ะ ๆ ไม่ใช่ Expanded — ถ้าเรนเดอร์กว้างไม่ตรงกับที่วัด บรรทัดจะเกินแล้ว hero ล้น
          // สูงเท่าพื้นที่เนื้อหาทั้งก้อน แล้วดันข้อความขึ้นบน ไม่ให้ไปเกาะล่างตามภาพ
          SizedBox(
            width: textW,
            height: maxH - minH,
            child: Align(
              alignment: Alignment.topLeft,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: titleStyle,
                    maxLines: 1,
                    softWrap: false,
                    overflow: TextOverflow.visible,
                  ),
                  const SizedBox(height: 6),
                  Text(intro, style: introStyle),
                ],
              ),
            ),
          ),
          const Spacer(),
          // ปลายทางของภาพที่บินมาจากแบนเนอร์บนแดชบอร์ด — ขนาดต่างกัน Hero ย่อ/ขยายให้เอง
          Hero(
            tag: kFixTimeHeroTag,
            child: SizedBox(
              width: artW,
              height: artH,
              child: SvgPicture.asset(
                'assets/images/fix_time_hero.svg',
                fit: BoxFit.contain,
              ),
            ),
          ),
        ],
      ),
    );
    return SliverAppBar(
      pinned: true,
      backgroundColor: Dash.heroSky,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      expandedHeight: maxH - top,
      collapsedHeight: minH - top,
      automaticallyImplyLeading: false,
      flexibleSpace: LayoutBuilder(
        builder: (context, c) {
          // 0 = กางเต็ม · 1 = ยุบเป็นแถบ — ใช้สลับภาพกับชื่อเรื่อง
          final t = ((maxH - c.maxHeight) / (maxH - minH)).clamp(0.0, 1.0);
          return Stack(
            fit: StackFit.expand,
            children: [
              ColoredBox(color: Dash.heroSky),
              // ยุบสุดแล้วไม่ต้องวาดภาพเลย · กางสุดก็ไม่ต้องมี Opacity มาบังคับ saveLayer
              if (t < 0.995)
                if (t == 0) art else Opacity(opacity: 1 - t, child: art),
              // แถบบนสุด: ปุ่มปิดมุมซ้ายเสมอ ทั้งตอนกางและตอนยุบ
              Positioned(
                left: 0,
                right: 0,
                top: top,
                height: minH - top,
                child: Row(
                  children: [
                    const _CloseButton(),
                    Expanded(
                      // จางด้วยค่าอัลฟาของสีตัวอักษร ไม่ใช่ Opacity — เลี่ยง saveLayer ทุกเฟรม
                      child: Text(
                        title,
                        textAlign: TextAlign.center,
                        style: Dash.tech(
                          size: 16,
                          weight: FontWeight.w700,
                          color: Dash.ink.withValues(alpha: t),
                        ),
                      ),
                    ),
                    // ถ่วงความกว้างเท่าปุ่มปิด ชื่อเรื่องจะได้อยู่กลางแถบจริง
                    SizedBox(width: Dash.box(36) + 16),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// ปุ่มปิดวงกลมขาวมุมซ้ายบนของหน้าย่อย
class _CloseButton extends StatelessWidget {
  const _CloseButton();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(left: 16),
    child: Tappable(
      onTap: Get.back,
      circle: true,
      splash: Dash.accent,
      child: Container(
        width: Dash.box(36),
        height: Dash.box(36),
        alignment: Alignment.center,
        decoration: BoxDecoration(color: Dash.card, shape: BoxShape.circle),
        child: Icon(PhosphorIconsBold.x, size: Dash.sp(18), color: Dash.ink),
      ),
    ),
  );
}
