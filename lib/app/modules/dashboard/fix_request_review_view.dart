import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import 'dash_theme.dart';
import 'attendance_row.dart';
import 'widgets/fix_day_card.dart';
import 'widgets/scan_tiles.dart';
import 'widgets/skeleton.dart';
import 'widgets/dash_page.dart';
import 'widgets/dash_page_bar.dart';
import 'widgets/dash_text.dart';
import 'widgets/dash_buttons.dart';
import '../../routes/app_pages.dart';

/// หน้าตรวจสอบก่อนส่ง — วางค่าที่ระบบบันทึกกับค่าที่ขอแก้เคียงกันเป็นตาราง
/// ช่องที่เปลี่ยนเน้นสี ช่องเดิมบอกว่า "เท่าเดิม" ผู้ใช้กวาดตาแถวเดียวรู้ว่าจะส่งอะไรออกไป
///
/// ⚠️ ต้นแบบ: ยืนยันแล้วไม่ได้ยิงไปไหน — คืน true ให้ฟอร์มปิดตัวเองต่อ ต่อ API ที่ _confirm()
class FixRequestReviewView extends StatefulWidget {
  const FixRequestReviewView({super.key});

  @override
  State<FixRequestReviewView> createState() => _FixRequestReviewViewState();
}

class _FixRequestReviewViewState extends State<FixRequestReviewView> {
  /// ไทม์ไลน์การ์ดหัว: ค่าเดิม → โครงร่างเฉพาะช่องที่เปลี่ยน → ค่าที่ขอแก้เป็น
  /// เห็นด้วยตาว่าคำขอนี้ไปแตะอะไรบ้าง ก่อนจะไล่อ่านตารางเทียบด้านล่าง
  static const _hold = Duration(milliseconds: 420);
  static const _load = Duration(milliseconds: 950);

  /// ช่องออกเผยทีหลังช่องเข้านิดเดียว — เผยพร้อมกันตาจับได้ทีละอันอยู่ดี
  static const _stagger = Duration(milliseconds: 320);

  /// 0 = ค่าเดิม · 1 = โครงร่าง · 2 = เผยเวลาเข้า · 3 = เผยเวลาออก + เวร + ป้าย
  int _phase = 0;
  final _timers = <Timer>[];

  void _to(int p) {
    if (mounted) setState(() => _phase = p);
  }

  @override
  void initState() {
    super.initState();
    _timers.addAll([
      Timer(_hold, () => _to(1)),
      Timer(_hold + _load, () => _to(2)),
      Timer(_hold + _load + _stagger, () => _to(3)),
    ]);
  }

  @override
  void dispose() {
    for (final t in _timers) {
      t.cancel();
    }
    _scroll.dispose();
    super.dispose();
  }

  Map<String, dynamic> get _a =>
      (Get.arguments as Map?)?.cast<String, dynamic>() ?? const {};
  Map<String, dynamic> get _row =>
      (_a['row'] as Map?)?.cast<String, dynamic>() ?? const {};

  final _scroll = ScrollController();

  /// ยืนยันส่ง — ไปหน้าสำเร็จเต็มจอก่อน แล้วค่อยปิดหน้านี้คืน true ให้ฟอร์ม
  /// ⚠️ ต้นแบบ: ยังไม่ยิงออกนอกเครื่อง — ต่อ API ตรงนี้เมื่อมี endpoint
  Future<void> _confirm() async {
    // อ่าน arguments ให้เสร็จก่อนเปลี่ยนหน้า — พอ push แล้ว Get.arguments เป็นของหน้าใหม่
    final args = {
      'date': '${_row['date']}',
      'shift': _a['shift'],
      'summary': _a['summary'],
    };
    await Get.toNamed<Object?>(Routes.fixRequestDone, arguments: args);
    if (!mounted) return;
    Get.back(result: true);
  }

  @override
  Widget build(BuildContext context) {
    final inOld = '${_row['in'] ?? ''}';
    final outOld = '${_row['out'] ?? ''}';
    final inNew = '${_a['in'] ?? ''}';
    final outNew = '${_a['out'] ?? ''}';
    final reasons = ((_a['reasons'] as List?) ?? const []).cast<String>();
    final note = '${_a['note'] ?? ''}';
    final photos = ((_a['photos'] as List?) ?? const []).cast<Uint8List>();
    final shiftOld = shiftOfRow(_row);
    final shiftNew = '${_a['shift'] ?? ''}';
    final outArea = _row['out_area'] == true;

    return DashPage(
      // กวาดแสงให้กล่องโครงร่างบนการ์ดหัว
      builder: (context) => Shimmer(
        child: Stack(
          children: [
            Positioned.fill(
              child: CustomScrollView(
                controller: _scroll,
                slivers: [
                  // การ์ดหัวยุบเป็นแถบชื่อเมื่อเลื่อนลงไปอ่านตารางเทียบ
                  _topSliver(context),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
                    sliver: SliverToBoxAdapter(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          SectionLabel('เปรียบเทียบ'),
                          const SizedBox(height: 10),
                          _compareCard([
                            _Cmp('เวร', shiftOld, shiftNew),
                            _Cmp(
                              'เวลาเข้า',
                              inOld,
                              inNew,
                              // ไม่มีของเดิม = กรอกใหม่ · นอกพื้นที่ = เวลาเดิมถูกอยู่แล้ว ขอแค่รับรอง
                              note: inOld.isEmpty
                                  ? 'ระบุใหม่'
                                  : (outArea && inOld == inNew
                                        ? 'ยืนยันเวลาเดิม'
                                        : null),
                            ),
                            _Cmp(
                              'เวลาออก',
                              outOld,
                              outNew,
                              note: outOld.isEmpty ? 'ระบุใหม่' : null,
                            ),
                          ]),
                          const SizedBox(height: 22),
                          SectionLabel('สาเหตุ'),
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Dash.card,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                for (final (i, r) in reasons.indexed) ...[
                                  if (i > 0) const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Icon(
                                        PhosphorIconsFill.checkCircle,
                                        size: Dash.sp(18),
                                        color: Dash.accentActive,
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          r,
                                          style: Dash.body(
                                            size: 13.5,
                                            color: Dash.ink,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                                const SizedBox(height: 10),
                                const Hairline(),
                                const SizedBox(height: 10),
                                Text(
                                  'รายละเอียดเพิ่มเติม',
                                  style: Dash.body(
                                    size: 11.5,
                                    color: Dash.muted,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  note.isEmpty ? '—' : note,
                                  style: Dash.body(
                                    size: 13.5,
                                    color: note.isEmpty ? Dash.faint : Dash.ink,
                                  ),
                                ),
                                if (photos.isNotEmpty) ...[
                                  const SizedBox(height: 10),
                                  const Hairline(),
                                  const SizedBox(height: 10),
                                  Text(
                                    'รูปประกอบ ${photos.length} รูป',
                                    style: Dash.body(
                                      size: 11.5,
                                      color: Dash.muted,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  SizedBox(
                                    height: Dash.box(72),
                                    child: ListView.separated(
                                      scrollDirection: Axis.horizontal,
                                      itemCount: photos.length,
                                      separatorBuilder: (_, _) =>
                                          const SizedBox(width: 8),
                                      itemBuilder: (context, i) => ClipRRect(
                                        borderRadius: BorderRadius.circular(12),
                                        child: Image.memory(
                                          photos[i],
                                          width: Dash.box(72),
                                          height: Dash.box(72),
                                          fit: BoxFit.cover,
                                          cacheWidth: (Dash.box(72) * Dash.dpr)
                                              .round(),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(height: 18),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                PhosphorIconsRegular.info,
                                size: Dash.sp(16),
                                color: Dash.muted,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'โปรดตรวจสอบความถูกต้องก่อนยืนยัน '
                                  'คำขอจะถูกส่งให้หัวหน้าเวรพิจารณา และแก้ไขภายหลังไม่ได้',
                                  style: Dash.body(
                                    size: 12,
                                    color: Dash.muted,
                                  ).copyWith(height: 1.45),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  // เผื่อระยะเลื่อนให้หัวยุบได้จนสุดแม้เนื้อหาจะสั้น
                  // ไม่งั้นเลื่อนสุดแล้วเหลือแถบน้ำเงินเปล่า ๆ ค้างอยู่
                  SliverToBoxAdapter(child: SizedBox(height: _heroH)),
                  // เนื้อหาบรรทัดสุดท้ายต้องเลื่อนพ้นแผงปุ่มที่ลอยทับอยู่
                  SliverToBoxAdapter(child: SizedBox(height: _barH(context))),
                ],
              ),
            ),
            Positioned(left: 0, right: 0, bottom: 0, child: _bar(context)),
          ],
        ),
      ),
    );
  }

  // ---------- หัว: แถบสี + การ์ดวันที่ที่ขอแก้ (ยุบได้) ----------

  /// ความสูงการ์ดหัวโดยประมาณ — หัวเรื่อง + วันที่/ป้าย + แผ่นขาวคลุมช่องเวลา
  /// เผื่อเกินเท่าไหร่กลายเป็นช่องว่างน้ำเงินใต้การ์ด จึงเผื่อเฉพาะตอนป้ายเยอะจริง
  /// (วันที่ + ป้ายสองอันยังอยู่บรรทัดเดียวได้ ตกบรรทัดใหม่ตอนสามอันขึ้นไป)
  double get _heroH {
    final badges = problemBadgesOf(_row).length;
    return 16 + // ขอบบนการ์ด
        Dash.box(22) + // แถวหัวเรื่อง + ชิปเวร
        Dash.box(30) + // วันที่ตัวใหญ่ (ป้ายสูงพอ ๆ กัน)
        16 + // ช่องไฟก่อนแผ่นขาว
        24 + // ขอบบน-ล่างของแผ่นขาว
        ScanTiles.tileH +
        4 + // กันเศษปัดของบรรทัดข้อความ — ขาดไปนิดเดียวก็ล้น
        (badges > 2 ? Dash.box(28) : 0); // ป้ายตกบรรทัดใหม่
  }

  /// แถบหัวแบบยุบได้ — เลื่อนลงอ่านตารางเทียบแล้วการ์ดจางหายเหลือแถบชื่อ
  Widget _topSliver(BuildContext context) {
    final top = MediaQuery.viewPaddingOf(context).top;
    final minH = Dash.box(52) + top;
    final maxH = minH + _heroH + 20;
    return SliverAppBar(
      pinned: true,
      backgroundColor: Dash.panel,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      expandedHeight: maxH - top,
      collapsedHeight: minH - top,
      automaticallyImplyLeading: false,
      flexibleSpace: LayoutBuilder(
        builder: (context, c) {
          // 0 = กางเต็ม · 1 = ยุบเป็นแถบชื่อ
          final t = ((maxH - c.maxHeight) / (maxH - minH)).clamp(0.0, 1.0);
          // จางหมดก่อนยุบสุด — เนื้อหาหน้านี้สั้น เลื่อนสุดแล้วอาจยุบไม่สุด
          // ปล่อยให้จางตามตรง ๆ จะค้างเป็นการ์ดจาง ๆ ครึ่งใบ
          final fade = (1 - t * 1.7).clamp(0.0, 1.0);
          final card = Padding(
            padding: EdgeInsets.fromLTRB(16, minH + 4, 16, 16),
            // เลื่อนขึ้นตามการยุบเล็กน้อย — ดูเหมือนการ์ดมุดหายใต้แถบชื่อ
            child: Transform.translate(
              offset: Offset(0, -12 * t),
              child: _heroCard(),
            ),
          );
          return Stack(
            fit: StackFit.expand,
            children: [
              ColoredBox(color: Dash.panel),
              // ยุบสุดแล้วไม่ต้องวาดการ์ด · กางสุดก็ไม่ต้องมี Opacity มาบังคับ saveLayer
              if (fade > 0.005)
                ClipRect(
                  child: OverflowBox(
                    alignment: Alignment.topCenter,
                    // minHeight ต้องเป็น 0 — ไม่ใส่แล้วมันรับ min จาก Stack ที่ fit: expand
                    // (ความสูงเต็มแถบ) การ์ดเลยถูกยืดจนมีที่ว่างขาวใต้ช่องสแกน
                    minHeight: 0,
                    maxHeight: maxH,
                    child: fade == 1
                        ? card
                        : Opacity(opacity: fade, child: card),
                  ),
                ),
              // แถบบนสุด: ปุ่มย้อนกลับซ้าย ชื่อหน้าอยู่กลางเสมอ
              Positioned(
                left: 0,
                right: 0,
                top: top,
                height: minH - top,
                child: const DashPageBar(title: 'ตรวจสอบคำขอ'),
              ),
            ],
          );
        },
      ),
    );
  }

  /// การ์ดเดียวกับหน้าฟอร์ม แต่เล่าเป็นลำดับ: ค่าเดิม → โครงร่าง → ค่าที่ขอแก้เป็น
  Widget _heroCard() {
    final inOld = '${_row['in'] ?? ''}';
    final outOld = '${_row['out'] ?? ''}';
    final inNew = '${_a['in'] ?? ''}';
    final outNew = '${_a['out'] ?? ''}';
    final shiftNew = '${_a['shift'] ?? ''}';
    final outArea = _row['out_area'] == true;

    // ช่องที่ค่าไม่ขยับไม่ต้องขึ้นโครงร่าง — ไม่งั้นดูเหมือนคำขอไปแตะทุกอย่าง
    final inChanged = inOld != inNew;
    final outChanged = outOld != outNew;
    final showIn = _phase >= 2 || !inChanged;
    final showOut = _phase >= 3 || !outChanged;
    final done = _phase >= 3;

    final inT = showIn ? inNew : inOld;
    final outT = showOut ? outNew : outOld;
    final shift = done ? shiftNew : shiftOfRow(_row);

    return FixDayCard(
      date: '${_row['date']}',
      anchor: _anchorFor(shift, inT),
      // ค่าใหม่แล้วป้ายที่คำขอนี้ปิดไปต้องหาย เหลือแต่เรื่องที่ยังค้าง (เช่น นอกพื้นที่)
      badges: problemBadgesOf(
        done
            ? {
                'in': inNew,
                'out': outNew,
                'no_in': inNew.isEmpty,
                'no_out': outNew.isEmpty,
                'out_area': outArea,
              }
            : _row,
        blur: true,
      ),
      badgeKey: done ? 'new' : 'old',
      inTime: inT,
      outTime: outT,
      // เขียวเมื่อค่าใหม่ขึ้นแล้ว — ก่อนหน้านั้นยังใช้สีของข้อมูลเดิม
      inColor: inT.isEmpty
          ? Dash.bad
          : ((inChanged && showIn) || !outArea ? Dash.ok : Dash.bad),
      outColor: outT.isEmpty ? Dash.bad : Dash.ok,
      skelIn: inChanged && _phase >= 1 && !showIn,
      skelOut: outChanged && _phase >= 1 && !showOut,
    );
  }

  /// เวลาตัวแทนของเวรที่จะวาด — ใช้เวลาเข้าจริงถ้าเป็นเวรเดียวกัน ไม่งั้นใช้เวลากลางเวร
  /// (คนเลือกเวรเองได้ เวลาเข้ากับเวรจึงไม่ตรงกันก็ได้ ฉากต้องตามเวรที่เลือก)
  static String _anchorFor(String shift, String inT) =>
      inT.isNotEmpty && shiftName(inT) == shift
      ? inT
      : switch (shift) {
          'เวรบ่าย' => '16:00',
          'เวรดึก' => '23:00',
          _ => '08:00',
        };

  // ---------- ตารางเทียบ ----------

  Widget _compareCard(List<_Cmp> rows) => Container(
    decoration: BoxDecoration(
      color: Dash.card,
      borderRadius: BorderRadius.circular(16),
    ),
    // แถบหัวตารางสีเทาเกือบเท่าสีพื้นหน้า มุมโค้งเลยมองไม่ออกว่าโค้ง — ตีเส้นขอบให้เห็นรูปการ์ด
    // วาดทับลูก ไม่ใช่ border ใน decoration — ของเดิมโดน clipBehavior กินไปครึ่งเส้น
    foregroundDecoration: BoxDecoration(
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: Dash.hairline),
    ),
    clipBehavior: Clip.antiAlias,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
          color: Dash.rowBg,
          child: Row(
            children: [
              SizedBox(width: _colW, child: TableHeadCell('รายการ')),
              Expanded(child: TableHeadCell('ระบบบันทึก')),
              Expanded(child: TableHeadCell('หลังแก้ไข')),
            ],
          ),
        ),
        for (final (i, r) in rows.indexed) ...[
          if (i > 0)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: const Hairline(),
            ),
          _cmpRow(r),
        ],
      ],
    ),
  );

  static double get _colW => Dash.box(64);

  Widget _cmpRow(_Cmp r) {
    final changed = r.oldV != r.newV;
    // แถวเวลาต่อท้ายด้วย น. แถวเวรเป็นข้อความล้วน ไม่ต้องต่อ
    final unit = r.label.contains('เวลา') ? ' น.' : '';
    final oldShown = '${r.oldV.isEmpty ? '--:--' : r.oldV}$unit';
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: _colW,
            child: Text(
              r.label,
              style: Dash.body(size: 12.5, color: Dash.muted),
            ),
          ),
          Expanded(
            child: Text(
              oldShown,
              style:
                  Dash.tech(
                    size: 15,
                    weight: FontWeight.w600,
                    // ค่าเดิมที่ถูกแทนขีดฆ่าให้เห็นว่าอันนี้จะหายไป
                    color: r.oldV.isEmpty ? Dash.faint : Dash.sub,
                  ).copyWith(
                    decoration: changed && r.oldV.isNotEmpty
                        ? TextDecoration.lineThrough
                        : null,
                    decorationColor: Dash.muted,
                  ),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    if (changed) ...[
                      Icon(
                        PhosphorIconsBold.arrowRight,
                        size: Dash.sp(12),
                        color: Dash.accentActive,
                      ),
                      const SizedBox(width: 4),
                    ],
                    Text(
                      '${r.newV}$unit',
                      style: Dash.tech(
                        size: 15,
                        weight: FontWeight.w700,
                        color: changed ? Dash.accentActive : Dash.ink,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  r.note ?? (changed ? 'เปลี่ยน' : 'เท่าเดิม'),
                  style: Dash.body(
                    size: 10.5,
                    weight: FontWeight.w600,
                    color: r.note != null
                        ? Dash.ok
                        : changed
                        ? Dash.accentActive
                        : Dash.muted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ---------- ปุ่มล่าง: แก้ไข / ยืนยัน ----------

  /// ความสูงจริงของแผงปุ่มรวมขอบล่าง — ใช้กันเนื้อหาโดนบัง
  static double _barH(BuildContext context) =>
      Dash.box(50) + _barPad * 2 + MediaQuery.viewPaddingOf(context).bottom;

  /// ช่องไฟรอบปุ่มในแผง — บนกับล่างเท่ากัน ปุ่มอยู่กลางแผงพอดี
  /// พื้นที่ปลอดภัยของเครื่องบวกเพิ่มใต้แผงต่างหาก ไม่ใช่บวกทั้งบนและล่าง
  /// (เครื่องที่มีแถบ home สูง ๆ เคยได้ช่องไฟบน 46 แผงเลยหนาผิดสัดส่วน)
  static const double _barPad = 14;

  Widget _bar(BuildContext context) => Container(
    // เต็มความกว้าง ชนขอบล่าง มุมตรง — แยกจากเนื้อหาด้วยเงาอย่างเดียว
    padding: EdgeInsets.fromLTRB(
      16,
      _barPad,
      16,
      _barPad + MediaQuery.viewPaddingOf(context).bottom,
    ),
    decoration: BoxDecoration(
      color: Dash.card,
      // เงานุ่มบอกว่าแผงลอยอยู่เหนือเนื้อหาที่เลื่อนผ่านข้างหลัง
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: Dash.dark ? 0.4 : 0.08),
          blurRadius: 20,
          offset: const Offset(0, -2),
        ),
      ],
    ),
    child: Row(
      children: [
        Expanded(
          child: DashPillButton(
            label: 'แก้ไข',
            secondary: true,
            onTap: Get.back,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          flex: 2,
          child: DashPillButton(label: 'ยืนยัน', onTap: _confirm),
        ),
      ],
    ),
  );
}

/// หนึ่งแถวในตารางเทียบ: ป้าย · ค่าเดิม · ค่าที่ขอ · หมายเหตุ (ถ้ามีจะแทนคำว่า เปลี่ยน/เท่าเดิม)
class _Cmp {
  const _Cmp(this.label, this.oldV, this.newV, {this.note});
  final String label;
  final String oldV;
  final String newV;
  final String? note;
}
