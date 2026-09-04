import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../widgets/tappable.dart';

import '../../services/api_service.dart';
import '../../services/settings_service.dart';
import '../../theme/nexus.dart';
import '../../utils/thai_date.dart';

/// บันทึกเวลาของฉัน — สถิติเดือน + ประวัติ 30 วัน (ดูอย่างเดียว — มีปัญหาแจ้งผู้ดูแลโรง)

class MyTimeController extends GetxController {
  final settings = Get.find<SettingsService>();
  ApiService get _api => Get.find<ApiService>();

  final loading = true.obs;
  final error = ''.obs;
  final stat = Rxn<Map<String, dynamic>>();
  final rows = <Map<String, dynamic>>[].obs; // ประวัติรายวัน (ใหม่→เก่า)

  // เดือนที่กำลังดู (วันที่ 1 ของเดือน) — เริ่มที่เดือนปัจจุบัน
  final month = DateTime(DateTime.now().year, DateTime.now().month).obs;

  String get _monthParam => '${month.value.year}-${month.value.month.toString().padLeft(2, '0')}';

  /// เดือนปัจจุบันไหม (ห้ามเลื่อนไปเดือนอนาคต)
  bool get isCurrentMonth {
    final now = DateTime.now();
    return month.value.year == now.year && month.value.month == now.month;
  }

  @override
  void onInit() {
    super.onInit();
    refreshAll();
  }

  void prevMonth() {
    month.value = DateTime(month.value.year, month.value.month - 1);
    refreshAll();
  }

  void nextMonth() {
    if (isCurrentMonth) return; // ไม่ให้เลื่อนเกินเดือนนี้
    month.value = DateTime(month.value.year, month.value.month + 1);
    refreshAll();
  }

  /// เลือกเดือนตรงๆ จากปฏิทิน (กันอนาคต)
  void setMonth(int year, int monthNum) {
    final now = DateTime.now();
    if (year > now.year || (year == now.year && monthNum > now.month)) return;
    month.value = DateTime(year, monthNum);
    refreshAll();
  }

  Future<void> refreshAll() async {
    loading.value = true;
    error.value = '';
    try {
      final att = await _api.myAttendance(month: _monthParam);
      stat.value = (att['stat'] as Map?)?.cast<String, dynamic>();
      rows.assignAll(((att['rows'] as List?) ?? []).whereType<Map>().map((e) => e.cast<String, dynamic>()));
    } catch (e) {
      error.value = 'โหลดข้อมูลไม่ได้ — ตรวจเครือข่ายแล้วลองใหม่';
    } finally {
      loading.value = false;
    }
  }

  /// วันล่าสุดก่อนวันนี้ที่ลืมลงเวลาออก (วันนี้ยังไม่นับ — อาจยังไม่เลิกงาน)
  Map<String, dynamic>? get missedOut {
    final today = DateTime.now().toIso8601String().substring(0, 10);
    for (final r in rows) {
      if (r['date'] == today) continue;
      if (r['no_out'] == true) return r;
    }
    return null;
  }
}

class MyTimeBinding extends Bindings {
  @override
  void dependencies() => Get.lazyPut(() => MyTimeController());
}

class MyTimeView extends GetView<MyTimeController> {
  const MyTimeView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: Nexus.pScreenBg,
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 12, 18, 4),
                child: Row(
                  children: [
                    // เป็นแท็บในโครงหลักแล้ว — ไม่มีปุ่มย้อนกลับ
                    Text('บันทึกเวลาของฉัน', style: Nexus.tech(size: 17, weight: FontWeight.w700)),
                    const Spacer(),
                    Obx(
                      () => controller.loading.value
                          ? SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Nexus.pAccent),
                            )
                          : Tappable(
                              onTap: controller.refreshAll,
                              child: Icon(PhosphorIconsRegular.arrowsClockwise, size: 20, color: Nexus.pAccent),
                            ),
                    ),
                  ],
                ),
              ),
              _monthPicker(),
              Expanded(
                child: Obx(() {
                  if (controller.error.value.isNotEmpty) {
                    return Center(
                      child: Text(controller.error.value, style: Nexus.body(size: 13, color: Nexus.pBad)),
                    );
                  }
                  return ListView(
                    padding: const EdgeInsets.fromLTRB(18, 8, 18, 24),
                    children: [
                      _statRow(),
                      _missedBanner(),
                      const SizedBox(height: 14),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8, top: 4),
                        child: Text(
                          'ประวัติการลงเวลา',
                          style: Nexus.tech(size: 13.5, weight: FontWeight.w700, color: Nexus.pSub),
                        ),
                      ),
                      ..._historyRows(),
                    ],
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statRow() {
    final s = controller.stat.value ?? {};
    Widget pill(String label, dynamic v, Color c) => Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: Nexus.pPanel,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Nexus.pLine),
        ),
        child: Column(
          children: [
            Text(
              '${v ?? '—'}',
              style: Nexus.tech(size: 18, weight: FontWeight.w700, color: c),
            ),
            const SizedBox(height: 2),
            Text(label, style: Nexus.body(size: 10.5, color: Nexus.pMuted)),
          ],
        ),
      ),
    );
    return Row(
      children: [
        pill('มาทำงาน', s['present'], Nexus.pOk),
        const SizedBox(width: 8),
        pill('สาย', s['late'], Nexus.pWarn),
        const SizedBox(width: 8),
        pill('ลืมออกเวร', s['no_out'], Nexus.pBad),
      ],
    );
  }

  Widget _missedBanner() {
    final m = controller.missedOut;
    if (m == null) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Nexus.pBadBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Nexus.pBadBorder),
      ),
      child: Row(
        children: [
          Icon(PhosphorIconsRegular.warningCircle, size: 18, color: Nexus.pBad),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              'วันที่ ${thaiShortDate(m['date'] as String?)} ลืมลงเวลาออกเวร — แจ้งผู้ดูแลของโรงพยาบาลหากต้องแก้ไข',
              style: Nexus.body(size: 12.5, color: Nexus.pInk),
            ),
          ),
        ],
      ),
    );
  }

  Widget _monthPicker() {
    return Obx(() {
      final m = controller.month.value;
      final atCurrent = controller.isCurrentMonth;
      Widget arrow(IconData ic, VoidCallback onTap, bool enabled) => Tappable(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(11),
        child: Container(
          width: 36,
          height: 36,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(11),
            border: Border.all(color: Nexus.pLine),
            color: Nexus.pPanel,
          ),
          child: Icon(ic, size: 20, color: enabled ? Nexus.pSub : Nexus.pDim),
        ),
      );
      return Padding(
        padding: const EdgeInsets.fromLTRB(18, 2, 18, 8),
        child: Row(
          children: [
            arrow(PhosphorIconsRegular.caretLeft, controller.prevMonth, true),
            // แตะชื่อเดือน = เปิดปฏิทินเลือกเดือน/ปี (กระโดดไกลๆ ได้ ไม่ต้องกดลูกศรทีละเดือน)
            Expanded(
              child: Tappable(
                onTap: () => Get.dialog(_MonthPickerDialog(selected: m, onPick: controller.setMonth)),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      thaiMonthYear(m.year, m.month),
                      style: Nexus.tech(size: 15, weight: FontWeight.w700, color: Nexus.pInk),
                    ),
                    const SizedBox(width: 3),
                    Icon(PhosphorIconsRegular.caretDown, size: 22, color: Nexus.pSub),
                  ],
                ),
              ),
            ),
            // เดือนปัจจุบัน = จางปุ่มถัดไป (เลื่อนไปอนาคตไม่ได้)
            arrow(PhosphorIconsRegular.caretRight, controller.nextMonth, !atCurrent),
          ],
        ),
      );
    });
  }

  List<Widget> _historyRows() {
    if (controller.rows.isEmpty) {
      return [Text('ไม่มีการลงเวลาในเดือนที่เลือก', style: Nexus.body(size: 12, color: Nexus.pDim))];
    }
    return controller.rows.map((r) {
      final badges = <(String, Color)>[
        if (r['late'] == true) ('สาย', Nexus.pWarn),
        if (r['early'] == true) ('ออกก่อน', Nexus.pWarn),
        if (r['no_out'] == true) ('ลืมออกเวร', Nexus.pBad),
        if (r['out_area'] == true) ('นอกพื้นที่', Nexus.pBad),
      ];
      return Container(
        margin: const EdgeInsets.only(bottom: 7),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Nexus.pPanel,
          borderRadius: BorderRadius.circular(11),
          border: Border.all(color: Nexus.pDivider),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 82,
              child: Text(thaiShortDate(r['date'] as String?), style: Nexus.tech(size: 11.5, color: Nexus.pMuted)),
            ),
            Text('เข้า ${r['in']}', style: Nexus.tech(size: 12, color: Nexus.pOk)),
            const SizedBox(width: 10),
            Text('ออก ${r['out']}', style: Nexus.tech(size: 12, color: (r['out'] == '—') ? Nexus.pDim : Nexus.pSub)),
            const Spacer(),
            if (badges.isEmpty)
              Text('ปกติ', style: Nexus.body(size: 11, color: Nexus.pOk))
            else
              Wrap(
                spacing: 4,
                children: badges.map((b) => Text(b.$1, style: Nexus.body(size: 11, color: b.$2))).toList(),
              ),
          ],
        ),
      );
    }).toList();
  }
}

/// ปฏิทินเลือกเดือน/ปี — ปีเลื่อนด้วยลูกศร, แตะเดือนเพื่อเลือก (เดือนอนาคตกดไม่ได้)
class _MonthPickerDialog extends StatefulWidget {
  const _MonthPickerDialog({required this.selected, required this.onPick});
  final DateTime selected;
  final void Function(int year, int month) onPick;

  @override
  State<_MonthPickerDialog> createState() => _MonthPickerDialogState();
}

class _MonthPickerDialogState extends State<_MonthPickerDialog> {
  static const _months = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];
  late int _year;

  @override
  void initState() {
    super.initState();
    _year = widget.selected.year;
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    return Dialog(
      backgroundColor: Nexus.pSheet, // ทึบ — pPanel โปร่งทำให้ทะลุเห็นข้างหลัง (จาง)
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: Nexus.pLine),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ปี ‹ 2568 ›  (ปีอนาคตกดไม่ได้)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _yearArrow(PhosphorIconsRegular.caretLeft, () => setState(() => _year--), true),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 22),
                  child: Text(
                    '${_year + 543}',
                    style: Nexus.tech(size: 17, weight: FontWeight.w700, color: Nexus.pInk),
                  ),
                ),
                _yearArrow(PhosphorIconsRegular.caretRight, () => setState(() => _year++), _year < now.year),
              ],
            ),
            const SizedBox(height: 16),
            for (var row = 0; row < 4; row++)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    for (var col = 0; col < 3; col++) ...[
                      if (col > 0) const SizedBox(width: 8),
                      Expanded(child: _monthCell(row * 3 + col + 1, now)),
                    ],
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _yearArrow(IconData ic, VoidCallback onTap, bool enabled) => Tappable(
    onTap: enabled ? onTap : null,
    child: Container(
      width: 40,
      height: 40,
      alignment: Alignment.center,
      child: Icon(ic, size: 26, color: enabled ? Nexus.pSub : Nexus.pDim),
    ),
  );

  Widget _monthCell(int m, DateTime now) {
    final future = _year > now.year || (_year == now.year && m > now.month);
    final sel = widget.selected.year == _year && widget.selected.month == m;
    return Tappable(
      onTap: future
          ? null
          : () {
              widget.onPick(_year, m);
              Get.back();
            },
      borderRadius: BorderRadius.circular(11),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: sel ? Nexus.pAccent.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(11),
          border: Border.all(color: sel ? Nexus.pAccent : Nexus.pLine),
        ),
        child: Text(
          _months[m - 1],
          style: Nexus.body(
            size: 13,
            weight: sel ? FontWeight.w700 : FontWeight.w500,
            color: future ? Nexus.pDim : (sel ? Nexus.pAccent : Nexus.pSub),
          ),
        ),
      ),
    );
  }
}
