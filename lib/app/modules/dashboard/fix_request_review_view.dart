import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../config/demo_mode.dart';
import '../../routes/app_pages.dart';
import 'attendance_row.dart';
import 'dash_theme.dart';
import 'widgets/compare_table.dart';
import 'widgets/dash_buttons.dart';
import 'widgets/dash_page.dart';
import 'widgets/dash_text.dart';
import 'widgets/floating_action_bar.dart';
import 'widgets/info_note.dart';
import 'widgets/review_hero_sliver.dart';
import 'widgets/review_reason_card.dart';
import 'widgets/skeleton.dart';

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
  static const _hold = Duration(milliseconds: 420);
  static const _load = Duration(milliseconds: 950);

  /// ช่องออกเผยทีหลังช่องเข้านิดเดียว — เผยพร้อมกันตาจับได้ทีละอันอยู่ดี
  static const _stagger = Duration(milliseconds: 320);

  /// 0 = ค่าเดิม · 1 = โครงร่าง · 2 = เผยเวลาเข้า · 3 = เผยเวลาออก + เวร + ป้าย
  int _phase = 0;
  final _timers = <Timer>[];
  final _scroll = ScrollController();

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
                  ReviewHeroSliver(
                    row: _row,
                    inNew: inNew,
                    outNew: outNew,
                    shiftNew: shiftNew,
                    phase: _phase,
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
                    sliver: SliverToBoxAdapter(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          SectionLabel('เปรียบเทียบ'),
                          const SizedBox(height: 10),
                          // คำขอที่ไม่ได้เปลี่ยนค่าอะไรเลยมีจริง — สแกนนอกพื้นที่
                          // เวลาถูกอยู่แล้ว ขอแค่ให้รับรอง ตารางที่ทุกช่องเขียนว่า
                          // "เท่าเดิม" อ่านเหมือนคำขอเปล่าที่กรอกไม่ครบ จึงต้องมี
                          // ประโยคบอกว่ากำลังขออะไร ก่อนจะให้ตารางไปยืนยันรายละเอียด
                          if (shiftOld == shiftNew &&
                              inOld == inNew &&
                              outOld == outNew) ...[
                            _UnchangedNote(outArea: outArea),
                            const SizedBox(height: 10),
                          ],
                          CompareTable(
                            rows: [
                              CompareItem('เวร', shiftOld, shiftNew),
                              CompareItem(
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
                              CompareItem(
                                'เวลาออก',
                                outOld,
                                outNew,
                                note: outOld.isEmpty ? 'ระบุใหม่' : null,
                              ),
                            ],
                          ),
                          const SizedBox(height: 22),
                          SectionLabel('สาเหตุ'),
                          const SizedBox(height: 10),
                          ReviewReasonCard(
                            reasons: reasons,
                            note: note,
                            photos: photos,
                          ),
                          const SizedBox(height: 18),
                          // ต้นแบบยังไม่ต่อ API — เขียนว่า "ส่งแล้วแก้ไม่ได้" ทั้งที่
                          // ไม่มีอะไรถูกส่ง ทำให้คนที่มาลองใช้เชื่อว่ายื่นเรื่องแล้ว
                          // แล้วไม่ไปแจ้งทางอื่น · feedback ที่ได้ก็ตั้งอยู่บนเรื่องที่ไม่จริง
                          InfoNote(
                            kDemoBuild
                                ? 'ต้นแบบสำหรับดูหน้าจอ — กดยืนยันแล้ว '
                                      'คำขอยังไม่ถูกส่งเข้าระบบจริง'
                                : 'โปรดตรวจสอบความถูกต้องก่อนยืนยัน '
                                      'คำขอจะถูกส่งให้หัวหน้าเวรพิจารณา และแก้ไขภายหลังไม่ได้',
                          ),
                        ],
                      ),
                    ),
                  ),
                  // เผื่อระยะเลื่อนให้หัวยุบได้จนสุดแม้เนื้อหาจะสั้น
                  // ไม่งั้นเลื่อนสุดแล้วเหลือแถบน้ำเงินเปล่า ๆ ค้างอยู่
                  SliverToBoxAdapter(
                    child: SizedBox(height: ReviewHeroSliver.cardHeight(_row)),
                  ),
                  // เนื้อหาบรรทัดสุดท้ายต้องเลื่อนพ้นแผงปุ่มที่ลอยทับอยู่
                  SliverToBoxAdapter(
                    child: SizedBox(height: actionBarHeight(context)),
                  ),
                ],
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: FloatingActionBar(
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
            ),
          ],
        ),
      ),
    );
  }
}

/// ประโยคนำหน้าตารางเทียบ สำหรับคำขอที่ไม่ได้เปลี่ยนค่าอะไรเลย
class _UnchangedNote extends StatelessWidget {
  const _UnchangedNote({required this.outArea});

  /// สแกนอยู่นอกพื้นที่ที่กำหนด — เวลาที่บันทึกไว้ถูกแล้ว ขอแค่ให้รับรอง
  final bool outArea;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
    decoration: BoxDecoration(
      color: Dash.accent.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Text(
      outArea
          ? 'คำขอนี้ไม่ได้แก้เวลา — ขอให้รับรองว่าเวลาที่ระบบบันทึกไว้ถูกต้อง '
                'แม้จะสแกนนอกพื้นที่ที่กำหนด'
          : 'คำขอนี้ไม่ได้แก้ค่าใด — ขอให้รับรองว่าข้อมูลที่ระบบบันทึกไว้ถูกต้องแล้ว',
      style: Dash.body(size: 12.5, color: Dash.sub).copyWith(height: 1.5),
    ),
  );
}
