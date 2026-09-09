import 'package:flutter/material.dart';

import '../attendance_row.dart';
import '../dash_theme.dart';
import 'dash_page_bar.dart';
import 'fix_day_card.dart';
import 'scan_tiles.dart';

/// หัวแบบยุบได้ของหน้าตรวจสอบคำขอ — เลื่อนลงอ่านตารางเทียบแล้วการ์ดจางหายเหลือแถบชื่อ
class ReviewHeroSliver extends StatelessWidget {
  const ReviewHeroSliver({
    super.key,
    required this.row,
    required this.inNew,
    required this.outNew,
    required this.shiftNew,
    required this.phase,
  });

  /// แถวเดิมที่ระบบบันทึกไว้
  final Map<String, dynamic> row;
  final String inNew;
  final String outNew;
  final String shiftNew;

  /// 0 = ค่าเดิม · 1 = โครงร่าง · 2 = เผยเวลาเข้า · 3 = เผยเวลาออก + เวร + ป้าย
  final int phase;

  /// ความสูงการ์ดหัวโดยประมาณ — หัวเรื่อง + วันที่/ป้าย + แผ่นขาวคลุมช่องเวลา
  /// เผื่อเกินเท่าไหร่กลายเป็นช่องว่างน้ำเงินใต้การ์ด จึงเผื่อเฉพาะตอนป้ายเยอะจริง
  /// (วันที่ + ป้ายสองอันยังอยู่บรรทัดเดียวได้ ตกบรรทัดใหม่ตอนสามอันขึ้นไป)
  static double cardHeight(Map<String, dynamic> row) {
    final badges = problemBadgesOf(row).length;
    return 16 + // ขอบบนการ์ด
        Dash.box(22) + // แถวหัวเรื่อง + ชิปเวร
        Dash.box(30) + // วันที่ตัวใหญ่ (ป้ายสูงพอ ๆ กัน)
        16 + // ช่องไฟก่อนแผ่นขาว
        24 + // ขอบบน-ล่างของแผ่นขาว
        ScanTiles.tileH +
        4 + // กันเศษปัดของบรรทัดข้อความ — ขาดไปนิดเดียวก็ล้น
        (badges > 2 ? Dash.box(28) : 0); // ป้ายตกบรรทัดใหม่
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.viewPaddingOf(context).top;
    final minH = Dash.box(52) + top;
    final maxH = minH + cardHeight(row) + 20;
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
              child: ReviewHeroCard(
                row: row,
                inNew: inNew,
                outNew: outNew,
                shiftNew: shiftNew,
                phase: phase,
              ),
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
}

/// การ์ดเดียวกับหน้าฟอร์ม แต่เล่าเป็นลำดับ: ค่าเดิม → โครงร่าง → ค่าที่ขอแก้เป็น
/// เห็นด้วยตาว่าคำขอนี้ไปแตะอะไรบ้าง ก่อนจะไล่อ่านตารางเทียบด้านล่าง
class ReviewHeroCard extends StatelessWidget {
  const ReviewHeroCard({
    super.key,
    required this.row,
    required this.inNew,
    required this.outNew,
    required this.shiftNew,
    required this.phase,
  });

  final Map<String, dynamic> row;
  final String inNew;
  final String outNew;
  final String shiftNew;
  final int phase;

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

  @override
  Widget build(BuildContext context) {
    final inOld = '${row['in'] ?? ''}';
    final outOld = '${row['out'] ?? ''}';
    final outArea = row['out_area'] == true;

    // ช่องที่ค่าไม่ขยับไม่ต้องขึ้นโครงร่าง — ไม่งั้นดูเหมือนคำขอไปแตะทุกอย่าง
    final inChanged = inOld != inNew;
    final outChanged = outOld != outNew;
    final showIn = phase >= 2 || !inChanged;
    final showOut = phase >= 3 || !outChanged;
    final done = phase >= 3;

    final inT = showIn ? inNew : inOld;
    final outT = showOut ? outNew : outOld;
    final shift = done ? shiftNew : shiftOfRow(row);

    return FixDayCard(
      date: '${row['date']}',
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
            : row,
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
      skelIn: inChanged && phase >= 1 && !showIn,
      skelOut: outChanged && phase >= 1 && !showOut,
    );
  }
}
