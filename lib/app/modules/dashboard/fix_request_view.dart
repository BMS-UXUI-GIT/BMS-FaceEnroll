import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../routes/app_pages.dart';
import 'dash_theme.dart';
import 'dashboard_controller.dart';
import 'widgets/dash_empty_state.dart';
import 'widgets/dash_page.dart';
import 'widgets/fix_hero_bar.dart';
import 'widgets/fix_list_header.dart';
import 'widgets/fix_request_row.dart';

/// หน้ารายการที่ต้องขอแก้ไข — เปิดจากแบนเนอร์บนแดชบอร์ด
///
/// อ่านอย่างเดียว: รวมวันที่ลงเวลาไม่ครบ/สแกนนอกพื้นที่ไว้ที่เดียว แล้วกดเข้าฟอร์มทีละรายการ
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

  static const _intro =
      'รายการลงเวลาที่ข้อมูลไม่ครบถ้วนหรือบันทึกนอกพื้นที่ที่กำหนด '
      'กรุณาเลือกรายการเพื่อยื่นคำขอแก้ไขเวลาการทำงาน';

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
            const FixHeroBar(title: 'แก้ไขเวลาเข้า - ออกงาน', intro: _intro),
            FixListHeaderSliver(
              pending: all.where((r) => !sent.contains('${r['date']}')).length,
              sent: all.where((r) => sent.contains('${r['date']}')).length,
              count: rows.length,
              showSent: _showSent,
              dateDesc: _dateDesc,
              onTab: (v) => setState(() => _showSent = v),
              onToggleSort: () => setState(() => _dateDesc = !_dateDesc),
            ),
            if (rows.isEmpty)
              SliverToBoxAdapter(
                child: DashEmptyState(
                  icon: _showSent
                      ? PhosphorIconsRegular.paperPlaneTilt
                      : PhosphorIconsRegular.checkCircle,
                  iconColor: _showSent ? Dash.muted : Dash.ok,
                  message: _showSent
                      ? 'ยังไม่ได้ส่งคำขอไหน'
                      : 'ไม่มีรายการค้าง',
                ),
              )
            else
              SliverList.builder(
                itemCount: rows.length,
                itemBuilder: (context, i) => FixRequestRow(
                  row: rows[i],
                  onTap: () => _openForm(rows[i]),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ),
      ),
    );
  }
}
