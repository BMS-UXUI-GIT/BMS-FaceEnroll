import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../widgets/tappable.dart';
import '../../routes/app_pages.dart';
import '../../utils/thai_date.dart';
import 'dash_theme.dart';
import 'dashboard_controller.dart';
import 'attendance_row.dart';
import 'widgets/sliver_headers.dart';
import 'widgets/web_badges.dart';
import 'widgets/dash_page.dart';
import 'widgets/dash_text.dart';
import 'widgets/underline_tab.dart';

/// หน้ารายการที่ต้องขอแก้ไข — เปิดจากการ์ดแจ้งเตือนบนแดชบอร์ด
///
/// อ่านอย่างเดียว: รวมวันที่ลงเวลาไม่ครบ/สแกนนอกพื้นที่ไว้ที่เดียว พร้อมบอกว่าติดต่อใคร
/// (ตัวแอปแก้เวลาเองไม่ได้ — ต้องให้หัวหน้าเวรหรือฝ่ายบุคคลแก้ในระบบหลัง)
class FixRequestView extends StatefulWidget {
  const FixRequestView({super.key});

  /// วันที่ที่ส่งคำขอไปแล้วในเซสชันนี้ — ต้นแบบยังไม่มีที่เก็บจริง
  /// (ของจริงต้องอ่านสถานะคำขอจาก backend ไม่ใช่จำไว้ในแอป)
  static final Set<String> sentDates = <String>{};

  @override
  State<FixRequestView> createState() => _FixRequestViewState();
}

class _FixRequestViewState extends State<FixRequestView> {
  /// แท็บสถานะ: false = ยังไม่ส่ง (ค่าเริ่มต้น คือที่ยังต้องทำ) · true = ส่งแล้ว
  bool _showSent = false;

  /// เรียงวันที่: true = ใหม่สุดก่อน (ค่าเริ่มต้น) · กดหัวคอลัมน์ "วันที่" เพื่อสลับ
  bool _dateDesc = true;

  /// รายการทั้งหมด — เริ่มจาก snapshot ที่แดชบอร์ดส่งมา แล้วอัปเดตเมื่อดึงรีเฟรช
  late List<Map<String, dynamic>> _all = _rowsFromArgs();

  static List<Map<String, dynamic>> _rowsFromArgs() {
    final args = (Get.arguments as Map?)?.cast<String, dynamic>() ?? const {};
    return ((args['rows'] as List?) ?? const [])
        .whereType<Map>()
        .map((e) => e.cast<String, dynamic>())
        .toList();
  }

  /// ดึงลงเพื่อรีเฟรช: โหลดเดือนใหม่ผ่านตัวควบคุมแดชบอร์ด แล้วอ่านรายการค้างชุดล่าสุด
  /// (ใช้ตัวควบคุมเดิม จะได้ไม่ยิงซ้ำและแดชบอร์ดข้างหลังก็อัปเดตตามไปด้วย)
  Future<void> _refresh() async {
    if (!Get.isRegistered<DashboardController>()) return;
    final c = Get.find<DashboardController>();
    await c.refreshAll();
    if (!mounted) return;
    setState(() => _all = c.pendingFixes);
  }

  static const _intro =
      'รายการลงเวลาที่ข้อมูลไม่ครบถ้วนหรือบันทึกนอกพื้นที่ที่กำหนด '
      'กรุณาเลือกรายการเพื่อยื่นคำขอแก้ไขเวลาการทำงาน';

  @override
  Widget build(BuildContext context) {
    final all = _all;
    final sent = FixRequestView.sentDates;
    final rows = all
        .where((r) => sent.contains('${r['date']}') == _showSent)
        .toList();
    // เรียงตามวันที่ — กดหัวคอลัมน์สลับใหม่→เก่า / เก่า→ใหม่ (ค่าเริ่มต้นใหม่สุดก่อน)
    rows.sort((a, b) {
      final c = '${a['date']}'.compareTo('${b['date']}');
      return _dateDesc ? -c : c;
    });

    return DashPage(
      builder: (context) => RefreshIndicator(
        color: Dash.accent,
        backgroundColor: Dash.card,
        // ให้วงกลมโผล่ใต้แถบบนที่ตรึงไว้ ไม่ทับปุ่ม back
        edgeOffset: Dash.box(52) + MediaQuery.paddingOf(context).top,
        onRefresh: _refresh,
        child: CustomScrollView(
          // ให้ดึงลงได้แม้รายการสั้นกว่าจอ
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            _heroBar(context),
            _stickyHead(
              context,
              pending: all.where((r) => !sent.contains('${r['date']}')).length,
              sent: all.where((r) => sent.contains('${r['date']}')).length,
              count: rows.length,
            ),
            if (rows.isEmpty)
              SliverToBoxAdapter(child: _empty())
            else
              SliverList.builder(
                itemCount: rows.length,
                itemBuilder: (context, i) => _row(rows[i]),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ),
      ),
    );
  }

  // ---------- หัวเรื่อง ----------

  /// หัวเรื่องตามแบบ Figma 606:12606 — พื้นฟ้าอ่อน ปุ่มปิด ชื่อเรื่อง คำอธิบาย
  /// ภาพประกอบชิดขอบล่างขวา · เลื่อนลงแล้วยุบเหลือแถบชื่อ
  Widget _heroBar(BuildContext context) {
    final top = MediaQuery.viewPaddingOf(context).top;
    final minH = Dash.box(52) + top;
    // ภาพ 157×136 ตามสัดส่วนใน Figma — ต้องกันที่กว้างตามอัตราส่วนจริง ไม่งั้นล้นแถว
    final artW = Dash.sp(157);
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
    const titleText = 'แก้ไขเวลาเข้า - ออกงาน';
    TextStyle title(double size) =>
        Dash.tech(size: size, weight: FontWeight.w600, color: Dash.ink);
    final oneLineW = paint(titleText, title(20), double.infinity).width;
    final titleStyle = title(
      oneLineW <= textW ? 20 : math.max(15, 20 * textW / oneLineW),
    );
    final textH =
        paint(titleText, titleStyle, textW).height +
        6 +
        paint(_intro, introStyle, textW).height +
        18;
    final maxH = minH + math.max(textH, Dash.sp(136));
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
                    titleText,
                    style: titleStyle,
                    maxLines: 1,
                    softWrap: false,
                    overflow: TextOverflow.visible,
                  ),
                  const SizedBox(height: 6),
                  Text(_intro, style: introStyle),
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
              height: Dash.sp(136),
              child: SvgPicture.asset(
                'assets/images/fix_time_hero.svg',
                fit: BoxFit.contain,
              ),
            ),
          ),
        ],
      ),
    );
    final close = Padding(
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
                    close,
                    Expanded(
                      // จางด้วยค่าอัลฟาของสีตัวอักษร ไม่ใช่ Opacity — เลี่ยง saveLayer ทุกเฟรม
                      child: Text(
                        'แก้ไขเวลาเข้า - ออกงาน',
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

  // ---------- แถบตรึง: แท็บสถานะ + คำอธิบาย + จำนวน ----------

  Widget _stickyHead(
    BuildContext context, {
    required int pending,
    required int sent,
    required int count,
  }) {
    final h = Dash.box(46) + 14 + Dash.box(22) + 6;
    return SliverPersistentHeader(
      pinned: true,
      delegate: FixedHeightHeader(
        height: h,
        // ความสูงเท่าเดิมทุกแท็บ ถ้าเทียบแค่ความสูงหัวจะไม่วาดใหม่ แท็บที่เลือกเลยค้าง
        signature: '$_showSent|$_dateDesc|$pending|$sent|$count',
        child: ColoredBox(
          color: Dash.bg,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(height: Dash.box(46), child: _tabs(pending, sent)),
              const SizedBox(height: 14),
              // หัวคอลัมน์ของรายการ — สเปกเดียวกับหัวตารางรายวันบนแดชบอร์ด
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 6),
                child: SizedBox(
                  height: Dash.box(22),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      SizedBox(
                        width: _colDateW,
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Tappable(
                            onTap: () => setState(() => _dateDesc = !_dateDesc),
                            borderRadius: BorderRadius.circular(6),
                            splash: Dash.accent,
                            child: Padding(
                              // ขยายพื้นที่กดให้ใหญ่กว่าตัวหนังสือนิดหน่อย
                              padding: const EdgeInsets.symmetric(
                                horizontal: 4,
                                vertical: 2,
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  TableHeadCell('วันที่'),
                                  const SizedBox(width: 2),
                                  Icon(
                                    _dateDesc
                                        ? PhosphorIconsBold.caretDown
                                        : PhosphorIconsBold.caretUp,
                                    size: Dash.sp(11),
                                    color: Dash.accentActive,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(child: TableHeadCell('เวลาการทำงาน')),
                      TableHeadCell('สาเหตุ', end: true),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// แท็บสถานะแบบขีดใต้ — ชิดขอบจอเหมือนแท็บช่วงเวลาบนแดชบอร์ด
  Widget _tabs(int pending, int sent) => Row(
    children: [
      Expanded(child: _tab('ยังไม่ส่ง', pending, !_showSent, false)),
      Expanded(child: _tab('ส่งแล้ว', sent, _showSent, true)),
    ],
  );

  Widget _tab(String label, int count, bool on, bool showSent) => UnderlineTab(
    label: '$label ($count)',
    on: on,
    onTap: () => setState(() => _showSent = showSent),
  );

  Widget _empty() => Padding(
    padding: const EdgeInsets.symmetric(vertical: 48),
    child: Column(
      children: [
        Icon(
          _showSent
              ? PhosphorIconsRegular.paperPlaneTilt
              : PhosphorIconsRegular.checkCircle,
          size: 34,
          color: _showSent ? Dash.muted : Dash.ok,
        ),
        const SizedBox(height: 10),
        Text(
          _showSent ? 'ยังไม่ได้ส่งคำขอไหน' : 'ไม่มีรายการค้าง',
          style: Dash.body(size: 13, color: Dash.muted),
        ),
      ],
    ),
  );

  // ---------- หนึ่งรายการ ----------

  /// แถวรายการ 3 คอลัมน์: วันที่+วัน · เวลาที่บันทึก+เวร · ป้ายสาเหตุ
  /// คั่นด้วยเส้น ไม่ใช่การ์ดแยกใบ ตาจะได้ไล่คอลัมน์ลงมาได้รวดเดียว
  Widget _row(Map<String, dynamic> r) {
    final inT = '${r['in'] ?? ''}';
    final outT = '${r['out'] ?? ''}';
    return Tappable(
      onTap: () => _openForm(r),
      splash: Dash.accent,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: Dash.hairline)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // คอลัมน์ 1: วันที่ + วัน
                SizedBox(
                  width: _colDateW,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        thaiShortDate('${r['date']}'),
                        style: Dash.tech(
                          size: 15,
                          weight: FontWeight.w700,
                          color: Dash.ink,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _relativeDay('${r['date']}'),
                        style: Dash.body(size: 12, color: Dash.muted),
                      ),
                    ],
                  ),
                ),
                // คอลัมน์ 2: เวลาที่บันทึก + เวร
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // บรรทัดเดียวเสมอ — จอแคบให้ย่อฟอนต์ ไม่ตัดขึ้นบรรทัดใหม่
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          '${inT.isEmpty ? '--:--' : inT} ถึง ${outT.isEmpty ? '--:--' : outT} น.',
                          maxLines: 1,
                          style: Dash.tech(
                            size: 14,
                            weight: FontWeight.w700,
                            color: Dash.sub,
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      // ไม่มีเวลาเข้าก็ยังบอกเวรได้ — เดาจากเวลาออก
                      WebShiftBadge(shiftAnchor(r)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // คอลัมน์ 3: ป้ายสาเหตุอย่างเดียว — สถานะ "ส่งแล้ว" บอกด้วยแท็บที่เปิดอยู่แล้ว
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // ป้ายเดียวกับเว็บ — แถวที่ขาดหลายอย่างซ้อนหลายป้าย
                    for (final (i, b) in problemBadgesOf(r).indexed) ...[
                      if (i > 0) const SizedBox(height: 4),
                      b,
                    ],
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// ความกว้างคอลัมน์วันที่ — หัวคอลัมน์กับทุกแถวใช้ค่าเดียวกัน
  static double get _colDateW => Dash.box(104);

  /// บรรทัดใต้วันที่ — บอกว่านานแค่ไหนแล้ว สำคัญกว่าชื่อวัน
  /// เพราะคำขอค้างยิ่งนานยิ่งต้องรีบส่ง
  ///
  /// ไล่หยาบขึ้นตามระยะ: วัน → สัปดาห์ → เดือน → ปี
  /// "45 วันที่แล้ว" ไม่ได้บอกอะไรมากกว่า "เดือนที่แล้ว" แต่ต้องอ่านนานกว่า
  /// (ข้อมูลเดโมมีวันในอนาคตด้วย จึงรองรับสองทาง)
  static String _relativeDay(String ymd) {
    final d = DateTime.tryParse(ymd);
    if (d == null) return '';
    final now = DateTime.now();
    final days = DateTime(
      d.year,
      d.month,
      d.day,
    ).difference(DateTime(now.year, now.month, now.day)).inDays;
    if (days == 0) return 'วันนี้';
    if (days == -1) return 'เมื่อวาน';
    if (days == 1) return 'พรุ่งนี้';
    final past = days < 0;
    final n = days.abs();
    final (unit, count) = switch (n) {
      < 7 => ('วัน', n),
      < 30 => ('สัปดาห์', n ~/ 7),
      // ตัดที่ 11 เดือน — 12 เดือนที่แล้วต้องอ่านว่า "ปีที่แล้ว"
      < 330 => ('เดือน', n ~/ 30),
      _ => ('ปี', n ~/ 365),
    };
    // "1 สัปดาห์ที่แล้ว" อ่านแข็ง — หน่วยละหนึ่งพูดว่า "สัปดาห์ที่แล้ว" เฉย ๆ
    final head = count == 1 && unit != 'วัน' ? unit : '$count $unit';
    return past ? '$headที่แล้ว' : 'อีก $count $unit';
  }

  Future<void> _openForm(Map<String, dynamic> r) async {
    final ok = await Get.toNamed<Object?>(Routes.fixRequestForm, arguments: r);
    if (ok != true || !mounted) return;
    // ส่งแล้วเด้งไปแท็บ "ส่งแล้ว" ให้เลย — คนเพิ่งส่งอยากเห็นว่ารายการไปอยู่ตรงไหน
    // (ถ้าค้างที่แท็บเดิม รายการจะหายไปเฉย ๆ เหมือนกดแล้วไม่เกิดอะไร)
    setState(() {
      FixRequestView.sentDates.add('${r['date']}');
      _showSent = true;
    });
  }
}
