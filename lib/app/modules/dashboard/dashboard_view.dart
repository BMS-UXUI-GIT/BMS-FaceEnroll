import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../widgets/tappable.dart';

import '../../services/api_service.dart';
import '../../services/demo_attendance.dart';
import '../../services/settings_service.dart';
import '../../theme/nexus.dart';
import '../../utils/thai_date.dart';

/// แดชบอร์ด — ภาพรวมการลงเวลาของตัวเอง (มือถือ: อ่านง่าย ไม่เน้นกราฟ)
/// ภาพรวม 1 อัน เปลี่ยนช่วงได้: ปี→สรุปรายเดือน · เดือน→สรุปรายสัปดาห์ · สัปดาห์→รายวัน
/// ด้านล่างเป็นรายละเอียดทุกวันของเดือนที่เลือก
class DashboardBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut(() => DashboardController());
  }
}

/// ═══ DEMO DATA — ตั้ง false ก่อนขึ้นจริง (หรือลบบล็อกนี้ + _demoRows ทิ้ง) ═══
/// true = แดชบอร์ดใช้ข้อมูลจำลอง ไม่ยิง API เลย ไว้ดูหน้าตา UI ตอนข้อมูลจริงยังน้อย
const bool kDashboardDemo = true;

enum DashRange { year, month, week }

/// ชั้นสีในแท่งเดียว — legend กดปิดทีละชั้นได้
enum Series { normal, late, incomplete }

/// สถานะของหนึ่งเวรที่ใช้ระบายวงกลมในแถบสถานะรายสัปดาห์
enum DayMark { ok, late, early, bad }

/// หนึ่งแท่งในภาพรวม (เดือน / สัปดาห์ / วัน)
class Bucket {
  Bucket(this.label, {this.sub = ''});
  final String label;
  final String sub;

  /// วันหนึ่งลงเวลาได้หลายเวร — จึงต้องแยก "จำนวนวัน" ออกจาก "จำนวนเวร"
  final Set<String> _days = {};
  final Set<String> _lateDays = {}; // วันที่มีอย่างน้อย 1 เวรเข้าสาย
  final Set<String> _earlyDays = {};
  final Set<String> _noOutDays = {};
  int shifts = 0; // เวรที่ลงเวลาเข้าแล้ว
  int minutes = 0; // เวลาทำงานรวม (นาที) — ใช้เป็นความสูงแท่งกราฟ
  /// นาทีทำงานแยกตามสถานะของเวร — แท่งซ้อนสีใช้ชุดนี้ เพื่อให้สีตรงกับ legend ทุกแท็บ
  int minutesOk = 0;
  int minutesLate = 0;
  int minutesEarly = 0;
  int minutesBad = 0;
  int late = 0; // ครั้งที่เข้าสาย
  int early = 0; // ครั้งที่ออกก่อนเวลา
  int noOut = 0; // ครั้งที่ลืมออกเวร
  int openShifts = 0; // ยังไม่สแกนออกเพราะยังไม่เลิกงาน — ไม่ใช่ "เวลาไม่ครบ"

  int get days => _days.length;
  int get lateDays => _lateDays.length;
  int get earlyDays => _earlyDays.length;
  int get noOutDays => _noOutDays.length;
  void addDay(
    String date, {
    bool late = false,
    bool early = false,
    bool noOut = false,
  }) {
    _days.add(date);
    if (late) _lateDays.add(date);
    if (early) _earlyDays.add(date);
    if (noOut) _noOutDays.add(date);
  }

  /// วันที่มีปัญหาอย่างน้อยหนึ่งอย่าง — วันเดียวอาจทั้งสายและออกก่อน ต้อง union ไม่ใช่บวก
  int get issueDays => {..._lateDays, ..._earlyDays, ..._noOutDays}.length;

  /// จัดแต่ละวันเข้ากลุ่มเดียวตามความรุนแรง (ลืมออก > ออกก่อน > สาย)
  /// สี่ค่านี้บวกกันได้ days พอดี — แถบสัดส่วนจึงยาวรวมกันเท่าของจริงเสมอ
  int get noOutOnly => _noOutDays.length;
  int get earlyOnly => _earlyDays.difference(_noOutDays).length;
  int get lateOnly =>
      _lateDays.difference(_noOutDays).difference(_earlyDays).length;
  int get normalDays => days - issueDays;

  /// ใช้กับกราฟ ซึ่งมีหน่วยเป็น "วัน" — ห้ามเอา late (นับเป็นครั้ง) มาลบตรงๆ
  /// ไม่งั้นวันที่มี 2 เวรสายทั้งคู่จะได้ค่าติดลบ แท่งส้มล้นเกินความยาวจริง
  int get present => days;
  int get onTime => days - lateDays;
}

/// ข้อมูลกราฟของช่วงที่กำลังดู
class ChartCard {
  ChartCard({
    required this.buckets,
    required this.current,
    required this.byDay,
  });
  final List<Bucket> buckets;

  /// index แท่งที่เป็น "ตอนนี้" — null ถ้าการ์ดนี้ไม่ใช่ช่วงปัจจุบัน
  final int? current;

  /// แท่ง = วัน → มีเส้นประเกณฑ์ 8 ชม. ให้เทียบ (แท่ง = สัปดาห์/เดือน เทียบไม่ได้)
  final bool byDay;
}

class DashboardController extends GetxController {
  final settings = Get.find<SettingsService>();
  ApiService get _api => Get.find<ApiService>();

  final loading = true.obs; // บูตครั้งแรก — ทั้งหน้าเป็นโครง
  final rangeLoading = false.obs; // เปลี่ยนเดือน/ช่วง — โครงเฉพาะส่วนภาพรวม
  final error = ''.obs;
  final range = DashRange.month.obs;

  /// เดือนที่เลือก (วันที่ 1) — คุมทั้งภาพรวมและรายละเอียดรายวัน
  final month = DateTime(DateTime.now().year, DateTime.now().month).obs;

  /// จันทร์ของสัปดาห์ที่กำลังดู (โหมดรายสัปดาห์)
  final weekAnchor = DateTime.now().obs;

  final monthRows = <Map<String, dynamic>>[].obs; // แถวของเดือนที่เลือก
  /// เวรของ "วันนี้" — เก็บแยกไว้ เพราะการ์ดบนหัวไม่ควรหายตอนเลื่อนไปดูเดือนอื่น
  final todayRows = <Map<String, dynamic>>[].obs;

  final scroll = ScrollController();

  /// ความเข้มของ subtitle บนหัวแอป (1 = เต็ม, 0 = จางหาย)
  /// แยกเป็น ValueNotifier ให้รีบิลด์เฉพาะข้อความบรรทัดเดียว
  /// ไม่ใช่ทั้ง SliverAppBar ทุกเฟรมแบบตอนใช้ SliverLayoutBuilder
  final subFade = ValueNotifier<double>(1);

  void _onScroll() {
    if (!scroll.hasClients) return;
    // ปัดเป็นขั้นละ 0.1 — กันรีบิลด์ทุกพิกเซล และกันแคชสไตล์ฟอนต์บวมเพราะสีเปลี่ยนทุกเฟรม
    final t = ((1 - scroll.offset / 40).clamp(0.0, 1.0) * 10).round() / 10;
    if (t != subFade.value) subFade.value = t;
  }

  /// แผงน้ำเงินเลื่อนขึ้นมาชนหัวจอแล้วหรือยัง — หัวแอปเปลี่ยนสีตามตัวนี้
  /// (ตั้งจากตอน layout แท็บ จึงอัปเดตหลังเฟรม ไม่ใช่ระหว่าง build)
  final panelStuck = false.obs;

  /// เวลาที่ข้อมูลชุดล่าสุดเข้ามาสำเร็จ — โหลดพลาดไม่นับ ไม่งั้นโชว์ว่าสดทั้งที่ของเก่า
  final lastSync = Rxn<DateTime>();

  final onlyIssues = false.obs; // ตัวกรองรายวัน: เฉพาะรายการที่ผิดปกติ

  /// index แท่งที่แตะค้างไว้ (-1 = ไม่มี) — เปลี่ยนช่วงเมื่อไหร่ต้องล้าง ไม่งั้นค้างผิดแท่ง
  final touchedBar = (-1).obs;

  /// ชั้นข้อมูลที่ถูกปิดจาก legend — ปิดแล้วแท่งหดลงตามส่วนที่เหลือ
  final hiddenSeries = <Series>{}.obs;
  bool shown(Series s) => !hiddenSeries.contains(s);
  void toggleSeries(Series s) =>
      hiddenSeries.contains(s) ? hiddenSeries.remove(s) : hiddenSeries.add(s);
  final yearRows =
      <Map<String, dynamic>>[].obs; // แถวย้อนหลัง 365 วัน (โหลดเมื่อเลือกรายปี)

  bool get isCurrentMonth {
    final now = DateTime.now();
    return month.value.year == now.year && month.value.month == now.month;
  }

  String get _monthParam =>
      '${month.value.year}-${month.value.month.toString().padLeft(2, '0')}';

  @override
  void onInit() {
    super.onInit();
    scroll.addListener(_onScroll);
    refreshAll();
  }

  @override
  void onClose() {
    scroll
      ..removeListener(_onScroll)
      ..dispose();
    subFade.dispose();
    super.onClose();
  }

  void setRange(DashRange r) {
    touchedBar.value = -1;
    touchedDay.value = '';
    range.value = r;
    if (r == DashRange.week) _syncWeekAnchor();
  }

  DateTime get weekMonday => _mondayOf(weekAnchor.value);

  bool get isCurrentWeek {
    final now = DateTime.now();
    return _mondayOf(now) == weekMonday;
  }

  /// ป้ายช่วงวันที่ — รูปแบบเดียวทั้งหน้า: "1 - 6 ก.ย." · คร่อมเดือนค่อยใส่เดือนสองข้าง
  static String rangeLabel(DateTime a, DateTime b) => a.month == b.month
      ? '${a.day} - ${b.day} ${thaiMonthShort(a.month)}'
      : '${a.day} ${thaiMonthShort(a.month)} - ${b.day} ${thaiMonthShort(b.month)}';

  /// บรรทัดใหญ่ใต้ dropdown — ช่วงที่กำลังดู
  String get periodTitle {
    switch (range.value) {
      case DashRange.week:
        final mon = weekMonday;
        return rangeLabel(mon, mon.add(const Duration(days: 6)));
      case DashRange.month:
        return thaiMonthYear(month.value.year, month.value.month);
      case DashRange.year:
        return 'ปี ${month.value.year + 543}';
    }
  }

  /// หัวการ์ดกราฟ — บอกว่าการ์ดนี้คือช่วงย่อยไหน (ไม่ซ้ำกับบรรทัดบนที่บอกวันที่)
  String get cardTitle {
    switch (range.value) {
      case DashRange.week:
        final first = DateTime(month.value.year, month.value.month);
        return 'สัปดาห์ที่ ${weekMonday.difference(_mondayOf(first)).inDays ~/ 7 + 1}';
      case DashRange.month:
        return 'ทั้งเดือน';
      case DashRange.year:
        return 'ทั้งปี';
    }
  }

  String get cardSub {
    switch (range.value) {
      case DashRange.week:
        final mon = weekMonday;
        return rangeLabel(mon, mon.add(const Duration(days: 6)));
      case DashRange.month:
        final first = DateTime(month.value.year, month.value.month);
        return rangeLabel(first, DateTime(first.year, first.month + 1, 0));
      case DashRange.year:
        return '${thaiMonthShort(1)} - ${thaiMonthShort(12)} ${month.value.year + 543}';
    }
  }

  // ── ชั้นนอก: เลือกเดือน (รายปีเลือกปี) — อยู่บนหัวแผงน้ำเงิน ──

  bool get scopeIsYear => range.value == DashRange.year;

  String get scopeTitle => scopeIsYear
      ? 'ปี ${month.value.year + 543}'
      : thaiMonthYear(month.value.year, month.value.month);

  /// บรรทัดใต้หัวข้อ "ภาพรวม" — บอกว่าตัวเลขที่เห็นสดแค่ไหน คู่กับปุ่มรีเฟรช
  String get syncLabel {
    if (loading.value || rangeLoading.value) return 'กำลังอัปเดตข้อมูล…';
    final t = lastSync.value;
    if (t == null) return 'ยังไม่ได้โหลดข้อมูล';
    return 'อัปเดตล่าสุด ${_hhmm(t.hour, t.minute)} น.';
  }

  /// เลือกเดือน/ปีตรง ๆ จากตัวเลือกแบบเลื่อน — หนีบไม่ให้ทะลุเดือนปัจจุบัน
  /// (ล้อปีจะส่งเดือนเดิมมาด้วย ปีนี้อาจยังไม่ถึงเดือนนั้น)
  void setMonth(DateTime m) {
    final now = DateTime.now();
    var t = DateTime(m.year, m.month);
    final cap = DateTime(now.year, now.month);
    if (t.isAfter(cap)) t = cap;
    if (t == month.value) return;
    touchedBar.value = -1;
    touchedDay.value = '';
    month.value = t;
    _syncWeekAnchor();
    refreshAll();
  }

  // ── ชั้นใน: เลือกสัปดาห์ในเดือนนั้น — อยู่บนหัวการ์ดกราฟ ──

  /// เลื่อนได้เฉพาะในเดือนที่เลือก — ข้ามเดือนใช้ตัวเลือกเดือนด้านบน
  bool get canGoPrev => _weekTarget(-7) != null;
  bool get canGoNext => _weekTarget(7) != null;

  void goPrev() => _shiftWeek(-7);
  void goNext() => _shiftWeek(7);

  DateTime? _weekTarget(int days) {
    final d = weekAnchor.value.add(Duration(days: days));
    if (d.isAfter(DateTime.now())) return null;
    if (d.year != month.value.year || d.month != month.value.month) return null;
    return d;
  }

  void _shiftWeek(int days) {
    final d = _weekTarget(days);
    if (d == null) return;
    touchedBar.value = -1;
    touchedDay.value = '';
    weekAnchor.value = d;
  }

  /// ให้วันอ้างอิงสัปดาห์อยู่ในเดือนที่เลือก — เดือนปัจจุบันยึดวันนี้ เดือนอื่นยึดวันที่ 1
  void _syncWeekAnchor() {
    weekAnchor.value = isCurrentMonth ? DateTime.now() : month.value;
  }

  /// ปุ่ม refresh = เริ่มใหม่ทั้งหน้า — กลับมาเดือน/สัปดาห์ปัจจุบันและล้างตัวกรอง
  /// ไม่งั้นกดรีเฟรชแล้วยังค้างอยู่ช่วงเก่า ดูเหมือนโหลดไม่ขึ้น
  Future<void> resetAndRefresh() {
    final now = DateTime.now();
    range.value = DashRange.month;
    month.value = DateTime(now.year, now.month);
    weekAnchor.value = now;
    touchedBar.value = -1;
    touchedDay.value = '';
    hiddenSeries.clear();
    onlyIssues.value = false;
    return refreshAll();
  }

  Future<void> refreshAll() async {
    // บูตครั้งแรกเท่านั้นที่ทำทั้งหน้าเป็นโครง — เปลี่ยนเดือนไม่ควรไปรีเซ็ตการ์ดวันนี้ด้านบน
    final boot = loading.value;
    if (!boot) rangeLoading.value = true;
    error.value = '';
    if (kDashboardDemo) {
      await Future<void>.delayed(
        const Duration(milliseconds: 600),
      ); // demo: หน่วงเล็กน้อยให้เห็น skeleton
      final first = DateTime(month.value.year, month.value.month);
      monthRows.assignAll(
        demoAttendanceRows(first, DateTime(first.year, first.month + 1, 0)),
      );
      final now = DateTime.now();
      yearRows.assignAll(
        demoAttendanceRows(
          DateTime(month.value.year),
          DateTime(month.value.year, 12, 31),
          until: now,
        ),
      );
      _keepToday();
      lastSync.value = DateTime.now();
      loading.value = false;
      rangeLoading.value = false;
      return;
    }
    try {
      final att = await _api.myAttendance(month: _monthParam);
      monthRows.assignAll(
        ((att['rows'] as List?) ?? []).whereType<Map>().map(
          (e) => e.cast<String, dynamic>(),
        ),
      );
      // การ์ดกราฟทุกโหมดอ่านจาก yearRows — สัปดาห์คร่อมเดือนได้ จึงพึ่ง monthRows อย่างเดียวไม่พอ
      final y = await _api.myAttendance(days: 365);
      yearRows.assignAll(
        ((y['rows'] as List?) ?? []).whereType<Map>().map(
          (e) => e.cast<String, dynamic>(),
        ),
      );
      _keepToday();
      lastSync.value = DateTime.now();
    } catch (e) {
      error.value = 'โหลดข้อมูลไม่ได้ — ตรวจเครือข่ายแล้วลองใหม่';
    } finally {
      loading.value = false;
      rangeLoading.value = false;
    }
  }

  /// อัปเดตเวรวันนี้เฉพาะตอนที่ข้อมูลชุดใหม่ครอบคลุมวันนี้จริง
  /// (เลื่อนไปดูเดือนอื่นแล้ว monthRows ไม่มีวันนี้ — ต้องคงของเดิมไว้ ไม่ใช่ล้างทิ้ง)
  void _keepToday() {
    if (isCurrentMonth) todayRows.assignAll(monthRows.where(isToday));
  }

  String _hhmm(int h, int m) =>
      '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';

  // ---------- รวมตัวเลข ----------

  DateTime? _dateOf(Map<String, dynamic> r) =>
      DateTime.tryParse('${r['date']}');

  void _tally(Bucket b, Map<String, dynamic> r) {
    if ('${r['in'] ?? ''}'.isEmpty) return; // ไม่มีเวลาเข้า = ไม่นับว่ามาทำงาน
    b.shifts++;
    if ('${r['out'] ?? ''}'.isEmpty && r['no_out'] != true) b.openShifts++;
    b.addDay(
      '${r['date']}',
      late: r['late'] == true,
      early: r['early'] == true,
      noOut: r['no_out'] == true,
    );
    final w = workedMinutes(r);
    b.minutes += w;
    switch (markOf(r)) {
      case DayMark.bad:
        b.minutesBad += w;
      case DayMark.early:
        b.minutesEarly += w;
      case DayMark.late:
        b.minutesLate += w;
      case DayMark.ok:
        b.minutesOk += w;
    }
    if (r['late'] == true) b.late++;
    if (r['early'] == true) b.early++;
    if (r['no_out'] == true) b.noOut++;
  }

  /// นาทีทำงานของหนึ่งเวร — ยังไม่สแกนออก/ลืมออก = นับไม่ได้ (0)
  /// เวรข้ามคืน (ออกเช้าวันถัดไป) บวก 24 ชม.ให้ ไม่งั้นได้ค่าติดลบ
  int workedMinutes(Map<String, dynamic> r) {
    final a = _minOfDay('${r['in'] ?? ''}');
    final b = _minOfDay('${r['out'] ?? ''}');
    if (a == null || b == null) return 0;
    final d = b - a;
    return d >= 0 ? d : d + 24 * 60;
  }

  int? _minOfDay(String hhmm) {
    final p = hhmm.split(':');
    if (p.length < 2) return null;
    final h = int.tryParse(p[0]);
    final m = int.tryParse(p[1]);
    if (h == null || m == null) return null;
    return h * 60 + m;
  }

  /// จันทร์ของสัปดาห์ที่วันนั้นอยู่
  DateTime _mondayOf(DateTime d) =>
      DateTime(d.year, d.month, d.day).subtract(Duration(days: d.weekday - 1));

  /// แถวในช่วงที่กราฟวาดอยู่ — การ์ดสรุป 4 ช่องต้องตรงกับกราฟ
  List<Map<String, dynamic>> get rowsInRange {
    switch (range.value) {
      case DashRange.week:
        final mon = weekMonday;
        final sun = mon.add(const Duration(days: 6));
        return yearRows.where((r) {
          final d = _dateOf(r);
          return d != null && !d.isBefore(mon) && !d.isAfter(sun);
        }).toList();
      case DashRange.month:
        return monthRows;
      case DashRange.year:
        return yearRows
            .where((r) => _dateOf(r)?.year == month.value.year)
            .toList();
    }
  }

  /// สรุปตัวเลขของช่วงที่ดูอยู่ (การ์ด 4 ช่อง)
  Bucket get summary {
    final b = Bucket('');
    for (final r in rowsInRange) {
      _tally(b, r);
    }
    return b;
  }

  /// รายการที่ต้องจัดการ — ลืมออกเวร (ไม่รวมวันนี้ เพราะอาจยังไม่เลิกงาน) ใหม่→เก่า
  List<Map<String, dynamic>> get pendingFixes {
    final list = monthRows
        .where(
          (r) => (r['no_out'] == true || r['out_area'] == true) && !isToday(r),
        )
        .toList();
    list.sort((a, b) => '${b['date']}'.compareTo('${a['date']}'));
    return list;
  }

  /// แถวที่ผิดปกติ — ใช้ทั้งตัวกรองรายวันและนับจำนวนบนชิป
  bool isIssue(Map<String, dynamic> r) =>
      r['late'] == true ||
      r['early'] == true ||
      r['no_out'] == true ||
      r['out_area'] == true;

  /// กราฟของช่วงที่เลือก — สัปดาห์:7 วัน · เดือน:ทุกวันในเดือน · ปี:12 เดือน
  ChartCard get card {
    final now = DateTime.now();
    switch (range.value) {
      case DashRange.week:
        final mon = weekMonday;
        final idx = DateTime(
          now.year,
          now.month,
          now.day,
        ).difference(mon).inDays;
        return ChartCard(
          buckets: _dayBuckets(mon),
          current: (idx >= 0 && idx < 7) ? idx : null,
          byDay: true,
        );

      case DashRange.month:
        final first = month.value;
        final mon0 = _mondayOf(first);
        return ChartCard(
          buckets: _weekBuckets(first),
          current: isCurrentMonth
              ? DateTime(
                      now.year,
                      now.month,
                      now.day,
                    ).difference(mon0).inDays ~/
                    7
              : null,
          byDay: false,
        );

      case DashRange.year:
        final y = month.value.year;
        final out = [for (var m = 1; m <= 12; m++) Bucket(thaiMonthShort(m))];
        for (final r in yearRows) {
          final d = _dateOf(r);
          if (d == null || d.year != y) continue;
          _tally(out[d.month - 1], r);
        }
        return ChartCard(
          buckets: out,
          current: y == now.year ? now.month - 1 : null,
          byDay: false,
        );
    }
  }

  /// แท่งละสัปดาห์ (บล็อกจันทร์–อาทิตย์) ของเดือน [first] — สัปดาห์คร่อมเดือนนับเฉพาะวันที่อยู่ในเดือนนี้
  List<Bucket> _weekBuckets(DateTime first) {
    final mon0 = _mondayOf(first);
    final last = DateTime(first.year, first.month + 1, 0);
    final n = last.difference(mon0).inDays ~/ 7 + 1;
    // ป้ายเป็นช่วงวันที่ ไม่ใช่ "สัปดาห์ 1..n" — เดือนที่ขึ้นต้น/ลงท้ายคาบเกี่ยว (เช่น ส.ค. 69
    // เริ่มเสาร์ จบจันทร์) แตะบล็อกจันทร์–อาทิตย์ถึง 6 อัน อ่านว่า "6 สัปดาห์" แล้วสะดุด
    final out = [
      for (var i = 0; i < n; i++)
        Bucket(() {
          final a = mon0.add(Duration(days: i * 7));
          final b = a.add(const Duration(days: 6));
          final s = a.isBefore(first) ? first.day : a.day;
          final e = b.isAfter(last) ? last.day : b.day;
          return '$s - $e ${thaiMonthShort(first.month)}';
        }()),
    ];
    for (final r in monthRows) {
      final d = _dateOf(r);
      if (d == null) continue;
      final i = DateTime(d.year, d.month, d.day).difference(mon0).inDays ~/ 7;
      if (i >= 0 && i < out.length) _tally(out[i], r);
    }
    return out;
  }

  /// 7 แท่ง จ.–อา. ของสัปดาห์ที่ขึ้นต้นด้วย [mon]
  List<Bucket> _dayBuckets(DateTime mon) {
    final out = [
      for (var i = 0; i < 7; i++)
        Bucket(weekdayNames[i], sub: '${mon.add(Duration(days: i)).day}'),
    ];
    for (final r in yearRows) {
      final d = _dateOf(r);
      if (d == null) continue;
      final i = DateTime(d.year, d.month, d.day).difference(mon).inDays;
      if (i >= 0 && i < 7) _tally(out[i], r);
    }
    return out;
  }

  /// รายละเอียดรายวันของช่วงที่กราฟวาดอยู่ (ใหม่→เก่า) — เลื่อน ‹ › แล้วรายการเลื่อนตาม
  List<Map<String, dynamic>> get dailyRows {
    final list = [...rowsInRange.where((r) => !onlyIssues.value || isIssue(r))];
    list.sort((a, b) => '${b['date']}'.compareTo('${a['date']}'));
    return list;
  }

  int get issueCount => rowsInRange.where(isIssue).length;

  /// เวรของแต่ละวันในช่วงที่ดูอยู่ เรียงตามเวลาเข้า — ใช้วาดวงกลมสถานะรายสัปดาห์
  Map<String, List<Map<String, dynamic>>> get dayShifts {
    final out = <String, List<Map<String, dynamic>>>{};
    for (final r in rowsInRange) {
      out.putIfAbsent('${r['date']}', () => []).add(r);
    }
    for (final v in out.values) {
      v.sort((a, b) => '${a['in']}'.compareTo('${b['in']}'));
    }
    return out;
  }

  /// วันที่แตะค้างไว้ในแถบสถานะ (yyyy-MM-dd · ว่าง = ยังไม่เลือก)
  final touchedDay = ''.obs;

  /// สถานะของหนึ่งเวร — ใช้เลือกสีวงกลม เรียงตามความรุนแรง
  static DayMark markOf(Map<String, dynamic> r) =>
      r['no_out'] == true || r['out_area'] == true
      ? DayMark.bad
      : r['early'] == true
      ? DayMark.early
      : r['late'] == true
      ? DayMark.late
      : DayMark.ok;

  // ---------- วันนี้ / ไฮไลต์ ----------

  static String ymd(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String get todayKey => ymd(DateTime.now());

  bool isToday(Map<String, dynamic> r) => '${r['date']}' == todayKey;

  /// เวรของวันนี้ทั้งหมด (วันหนึ่งลงเวลาได้หลายเวร) — เรียงตามเวลาเข้า
  List<Map<String, dynamic>> get todayShifts {
    final list = todayRows.toList();
    list.sort((a, b) => '${a['in']}'.compareTo('${b['in']}'));
    return list;
  }

  /// เวรแรกของวันนี้ — ใช้ตอนต้องการค่าเดียว
  Map<String, dynamic>? get todayRow =>
      todayShifts.isEmpty ? null : todayShifts.first;

  /// ชื่อวันย่อ จ.–อา. จาก "yyyy-MM-dd"
  static const weekdayNames = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
  String weekdayOf(String? raw) {
    final d = DateTime.tryParse(raw ?? '');
    return d == null ? '' : weekdayNames[d.weekday - 1];
  }
}

/// palette "FaceEnroll" — token จาก web app BMS FaceEnroll (ใช้เฉพาะหน้าแดชบอร์ด ไม่แตะ Nexus กลาง)
/// ฟ้าโรงพยาบาลสว่าง · การ์ดขาวขอบบาง · pill · badge สถานะสีเฉพาะ · สลับ dark ตาม Nexus.isDark
class _D {
  static bool get dark => Nexus.isDark;

  /// ตัวคูณตามความกว้างจอ — Figma วาดบนเฟรม 402 (iPhone 17)
  /// จอ 320 (SE) ย่อลง ~15% · จอใหญ่ขยายได้ถึง ~10% · หนีบไว้ไม่ให้เพี้ยนเกิน
  /// ตั้งค่าครั้งเดียวที่ต้นเฟรมใน [DashboardView.build] — ทุก _D.* หลังจากนั้นใช้ค่าเดียวกัน
  static double _s = 1;

  /// ตัวคูณขนาดฟอนต์ของระบบ (หนีบ 1.0–1.2 ให้ตรงกับ withClampedTextScaling ที่ครอบหน้านี้)
  static double _ts = 1;

  /// พิกเซลจริงต่อ dp ของเครื่อง — ใช้บอก Image ว่าให้ถอดรหัสละเอียดแค่ไหน
  static double dpr = 3;

  static void useScale(BuildContext c) {
    dpr = MediaQuery.devicePixelRatioOf(c);
    _s = (MediaQuery.sizeOf(c).width / 402).clamp(0.82, 1.1);
    _ts = MediaQuery.textScalerOf(c).scale(1).clamp(1.0, _maxTextScale);
  }

  static const double _maxTextScale = 1.2;

  /// ขนาดที่ยืดหดตามจอ (ภาพ/ไอคอน) — ระยะห่างไม่ต้องใช้ ปล่อยตามสเกล 4pt เดิม
  static double sp(double v) => v * _s;

  /// ความสูงคงที่ของกล่องที่มีข้อความอยู่ข้างใน — ต้องโตตามฟอนต์ระบบด้วย ไม่งั้นล้น
  static double box(double v) => v * _s * _ts;
  // พื้น / การ์ด
  static Color get bg => dark
      ? const Color(0xFF161A23)
      : const Color(0xFFF0F6FD); // --bg / --hero-bg
  static Color get card => dark
      ? const Color(0xFF222835)
      : const Color(0xFFFFFFFF); // --surface-card / --bg
  static Color get wash => dark
      ? const Color(0xFF1F2A3D)
      : const Color(0xFFEBF1FD); // --surface-blue
  // ตัวอักษร
  static Color get ink =>
      dark ? const Color(0xFFE8EBF0) : const Color(0xFF111827); // --text
  static Color get sub =>
      dark ? const Color(0xFFDDE2EA) : const Color(0xFF252A39); // --text-dark
  static Color get muted =>
      dark ? const Color(0xFF9AA5B8) : const Color(0xFF667385); // --text-dim
  static Color get faint =>
      dark ? const Color(0xFF5B6678) : const Color(0xFFC3CAD6);
  // accent
  static Color get accent => const Color(0xFF5682E9);
  static Color get accentActive => const Color(0xFF3382E7);

  /// แผงน้ำเงินครึ่งล่างของหน้า (Figma 593:12419) — โหมดมืดหรี่ลงไม่ให้แสบตา
  static Color get panel =>
      dark ? const Color(0xFF1B2A4A) : const Color(0xFF3382E7);

  /// แถบ legend ใต้การ์ดกราฟ (Figma 593:12411) — ชิปเป็นสีโปร่ง 50% จึงต้องมีพื้นเข้มรองทั้งสองโหมด
  static const LinearGradient band = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFF000000), Color(0xFF2F2F2F)],
  );
  static Color onPanel([double a = 1]) => Colors.white.withValues(alpha: a);
  static Color get on => const Color(0xFFFFFFFF);
  static LinearGradient get accentGradient => const LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF8CBFEE), Color(0xFF5D9BDD), Color(0xFF2E6CB3)],
    stops: [0, 0.48, 1],
  );
  // semantic
  static Color get ok => const Color(0xFF34C759); // colors/green จาก Figma
  static Color get hairline => dark
      ? const Color(0x1AFFFFFF)
      : const Color(0x1A000000); // border การ์ด rgba(0,0,0,.1)
  /// พื้นการ์ดย่อย — ทึบ 100% ไม่ใช่สีโปร่ง เพราะภาพประกอบที่วางหลังการ์ดจะทะลุขึ้นมาเห็น
  static Color get rowBg =>
      dark ? const Color(0xFF262B36) : const Color(0xFFF4F6F9);
  static Color get warn => const Color(0xFFFC9709);
  static Color get bad => const Color(0xFFEB5757);
  static Color get info =>
      const Color(0xFF8D58D3); // ออกก่อนเวลา = ม่วง (ตามเว็บ)
  // badge (bg, text) ตาม --badge-*
  static (Color, Color) get bLate => dark
      ? (const Color(0x2EFC9709), const Color(0xFFFFC46B))
      : (const Color(0xFFFFEBCC), const Color(0xFFB46400));
  static (Color, Color) get bEarly => dark
      ? (const Color(0x338D58D3), const Color(0xFFC9A6F0))
      : (const Color(0xFFEDE4FA), const Color(0xFF6432AA));
  static (Color, Color) get bNoOut => dark
      ? (const Color(0x2EEB5757), const Color(0xFFFF9C9C))
      : (const Color(0x1AEB5757), const Color(0xFFEB5757));
  static (Color, Color) get bOutArea => dark
      ? (const Color(0x29B7C0D0), const Color(0xFFB7C0D0))
      : (const Color(0x0D667385), const Color(0xFF667385));

  // ฟอนต์ใช้ของกลางจาก Nexus — แหล่งเดียวทั้งแอป ต่างแค่สี default ของหน้านี้
  // ฟอนต์ยืดหดตามจอด้วย — จอแคบตัวหนังสือเท่าเดิมจะกินที่จนตัดคำ/ล้น
  static TextStyle tech({
    double size = 14,
    FontWeight weight = FontWeight.w600,
    Color? color,
    double spacing = 0,
  }) => Nexus.tech(
    size: sp(size),
    weight: weight,
    color: color ?? ink,
    spacing: spacing,
  );
  static TextStyle body({
    double size = 14,
    FontWeight weight = FontWeight.w500,
    Color? color,
  }) => Nexus.body(size: sp(size), weight: weight, color: color ?? ink);
  static TextStyle num({
    double size = 14,
    FontWeight weight = FontWeight.w700,
    Color? color,
  }) => Nexus.num(size: sp(size), weight: weight, color: color ?? ink);
}

/// หน้าแดชบอร์ด — โครงตาม Figma: hero (พื้นฟ้า) + แผ่นขาวมุมมนบนเลื่อนขึ้นซ้อนใต้การ์ดสถานะ
class DashboardView extends GetView<DashboardController> {
  const DashboardView({super.key});

  /// ระยะจากขอบบนการ์ดสถานะถึงขอบบนแผ่นขาว (การ์ดจึงคร่อมรอยต่อ) — ค่าเดียวกับ Figma (215-143)
  static const double _sheetOverlap = 72;

  @override
  Widget build(BuildContext context) {
    _D.useScale(context); // ต้องมาก่อนทุก _D.* ของเฟรมนี้
    // ฟอนต์ระบบใหญ่กว่า 1.2 เท่าทำให้กล่องความสูงคงที่ (การ์ดสแกน/แถบเลือกเดือน) ล้น
    // ยอมให้ขยายได้ถึง 1.2 แล้วความสูงโตตามผ่าน _D.box()
    return MediaQuery.withClampedTextScaling(
      maxScaleFactor: _D._maxTextScale,
      child: Scaffold(
        backgroundColor: _D.bg,
        body: Obx(() {
          if (controller.error.value.isNotEmpty) return _errorState();
          if (controller.loading.value) return _skeleton(context);
          return RefreshIndicator(
            color: _D.accent,
            backgroundColor: _D.card,
            onRefresh: controller.resetAndRefresh,
            child: CustomScrollView(
              controller: controller.scroll,
              slivers: [
                _appBar(context),
                // การ์ดวันนี้มี PageView ปัดได้ — กันการวาดซ้ำไม่ให้ลามไปทั้งหน้า
                SliverToBoxAdapter(
                  child: RepaintBoundary(child: _hero(context)),
                ),
                // แผ่นขาว (ต่อจากที่โผล่มาใต้การ์ด — ไร้รอยต่อ) รับแค่แถบเตือน
                // ห้ามครอบแผงน้ำเงินไว้ข้างใน: พื้นขาวจะถูกระบายเต็มจอทุกเฟรมแล้วโดนน้ำเงินทับทิ้ง
                DecoratedSliver(
                  decoration: BoxDecoration(color: _D.card),
                  sliver: SliverToBoxAdapter(
                    child: Obx(
                      () => controller.pendingFixes.isEmpty
                          ? const SizedBox(height: 24)
                          // 24 บน-ล่างเท่ากับตอนไม่มีการ์ด (SizedBox 24) — ไม่งั้นมีการ์ดแล้ว
                          // ระยะถึงแผงน้ำเงินหดเหลือ 8 ทั้งที่เป็นรอยต่อ section เหมือนกัน
                          : Padding(
                              padding: const EdgeInsets.fromLTRB(
                                16,
                                24,
                                16,
                                24,
                              ),
                              child: _actionBanner(),
                            ),
                    ),
                  ),
                ),
                // แผงน้ำเงินคลุมส่วนล่างทั้งหมด: ภาพรวม + รายวัน (Figma 593:12419)
                DecoratedSliver(
                  decoration: BoxDecoration(
                    color: _D.panel,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                  ),
                  sliver: SliverMainAxisGroup(
                    slivers: [
                      _tabsSliver(context),
                      _statSliver(),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          // กราฟวาดใหม่เองตอน tween/แตะ — กันไม่ให้ลากแผงน้ำเงินทั้งแผ่นไปวาดด้วย
                          child: RepaintBoundary(
                            child: Obx(() => _chartCard(controller.card)),
                          ),
                        ),
                      ),
                      SliverToBoxAdapter(child: _dailyHeader()),
                      _dailySliver(),
                      const SliverToBoxAdapter(
                        child: SizedBox(height: 120),
                      ), // เว้นที่ให้แถบล่าง
                    ],
                  ),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }

  // ============ โครงร่างระหว่างโหลด ============

  /// ใช้โครงเดียวกับของจริง (hero + แผ่นขาว) เพื่อไม่ให้ layout กระโดดตอนข้อมูลมาถึง
  /// หัวเรื่องแสดงของจริงไปเลย เพราะเป็นข้อความคงที่ ไม่ต้องรอโหลด
  Widget _skeleton(BuildContext context) => _Shimmer(
    child: SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            color: _D.bg,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SafeArea(bottom: false, child: _heroTitle()),
                const SizedBox(height: 12),
                Stack(
                  children: [
                    Positioned(
                      top: _sheetOverlap,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: _D.card,
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(24),
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: _skelTodayCard(),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(color: _D.card, height: 24),
          Container(
            decoration: BoxDecoration(
              color: _D.panel,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const _Skel(width: 96, height: 22, onPanel: true, phase: 0.00),
                const SizedBox(height: 16),
                Row(
                  children: [
                    for (var i = 0; i < 3; i++) ...[
                      Expanded(
                        child: _Skel(
                          height: 36,
                          radius: 100,
                          onPanel: true,
                          phase: 0.08 + i * 0.06,
                        ),
                      ),
                      if (i < 2) const SizedBox(width: 8),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const _Skel(
                      width: 120,
                      height: 34,
                      onPanel: true,
                      phase: 0.28,
                    ),
                    const Spacer(),
                    const _Skel(
                      width: 40,
                      height: 40,
                      radius: 100,
                      onPanel: true,
                      phase: 0.32,
                    ),
                    const SizedBox(width: 16),
                    const _Skel(
                      width: 40,
                      height: 40,
                      radius: 100,
                      onPanel: true,
                      phase: 0.34,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    for (var i = 0; i < 4; i++) ...[
                      Expanded(
                        child: _Skel(
                          height: 88,
                          radius: 16,
                          onPanel: true,
                          phase: 0.36 + i * 0.05,
                        ),
                      ),
                      if (i < 3) const SizedBox(width: 8),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                for (var i = 0; i < 2; i++) ...[
                  _Skel(
                    height: 250,
                    radius: 24,
                    onPanel: true,
                    phase: 0.58 + i * 0.08,
                  ),
                  const SizedBox(height: 16),
                ],
                const SizedBox(height: 8),
                const _Skel(width: 80, height: 20, onPanel: true, phase: 0.76),
                const SizedBox(height: 12),
                for (var i = 0; i < 4; i++) ...[
                  _Skel(
                    height: 64,
                    radius: 16,
                    onPanel: true,
                    phase: 0.80 + i * 0.06,
                  ),
                  const SizedBox(height: 8),
                ],
              ],
            ),
          ),
        ],
      ),
    ),
  );

  Widget _skelTodayCard() => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: _D.card,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: _D.hairline),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const _Skel(width: 120, height: 14, phase: 0.0),
            const Spacer(),
            const _Skel(width: 56, height: 24, radius: 100, phase: 0.10),
          ],
        ),
        const SizedBox(height: 12),
        const _Skel(width: 150, height: 24, phase: 0.18),
        const SizedBox(height: 16),
        Row(
          children: const [
            Expanded(child: _Skel(height: 84, radius: 16, phase: 0.26)),
            SizedBox(width: 8),
            Expanded(child: _Skel(height: 84, radius: 16, phase: 0.34)),
          ],
        ),
      ],
    ),
  );

  // ============ hero ============

  Widget _hero(BuildContext context) {
    return Container(
      color: _D.bg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 12),
          // Stack กำหนดขนาดตามการ์ด แล้วให้แผ่นขาวเริ่มที่ _sheetOverlap ลงไปจนสุดการ์ด
          Stack(
            children: [
              Positioned(
                top: _sheetOverlap,
                left: 0,
                right: 0,
                bottom: 0,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: _D.card,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(
                          alpha: _D.dark ? 0.30 : 0.04,
                        ),
                        blurRadius: 12,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Obx(() => _TodayCard(shifts: controller.todayShifts)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// หัวแอป — floating+snap: เลื่อนลงอ่านเนื้อหาแล้วหาย ปัดขึ้นนิดเดียวก็โผล่กลับมาทันที
  /// (ไม่ pinned เพราะกินที่จอถาวรทั้งที่เป็นแค่ชื่อหน้า)
  /// หัวแอป — เลื่อนลงอ่านเนื้อหาแล้วหายสนิท ปัดขึ้นนิดเดียวก็โผล่กลับมาทันที
  /// พื้นที่ status bar ไปกันไว้ที่แถบเลือกเดือนที่ตรึงอยู่แทน (ดู [_scopeSliver])
  /// โผล่กลับมาจากการปัดขึ้นกลางหน้า = ผู้ใช้รู้อยู่แล้วว่าหน้านี้คืออะไร
  /// คำอธิบายจึงจางหายตาม 40dp แรกของการเลื่อน (ดู DashboardController.subFade)
  Widget _appBar(BuildContext context) => SliverAppBar(
    floating: true,
    // ไม่ใช้ snap — snap จะ "เติมให้เต็ม" ทุกครั้งที่ปล่อยนิ้วโดยมีหัวโผล่มาแม้แต่พิกเซลเดียว
    // เลื่อนลงแล้วหยุด (หรือสะบัดกลับนิดเดียวตอนปล่อย) หัวจึงเด้งขึ้นมาเองตลอด
    // ปิดแล้วหัวจะโผล่ตามระยะที่ปัดขึ้นจริงเท่านั้น
    // สีพื้นวาดเองใน flexibleSpace — Obx ต้องเป็น box widget ครอบ sliver ไม่ได้
    backgroundColor: Colors.transparent,
    surfaceTintColor: Colors.transparent,
    elevation: 0,
    scrolledUnderElevation: 0,
    automaticallyImplyLeading: false,
    toolbarHeight: 0,
    expandedHeight: _D.box(76),
    flexibleSpace: FlexibleSpaceBar(
      background: Obx(() {
        // ฟ้าเฉพาะตอนที่ข้างหลังเป็นแผงน้ำเงินแล้ว — ยังอยู่ช่วง hero พื้นสว่างต้องขาวเหมือนเดิม
        final onPanel = controller.panelStuck.value;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          color: onPanel ? _D.panel : _D.bg,
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'แดชบอร์ด',
                          style: _D.tech(
                            size: 20,
                            weight: FontWeight.w700,
                            color: onPanel ? _D.onPanel() : null,
                          ),
                        ),
                        // คงที่ทางในเลย์เอาต์ไว้เสมอ จางอย่างเดียว
                        // ไม่งั้นพอจางหมดแล้วชื่อหน้าจะเด้งขึ้นไปกลางแถบ
                        const SizedBox(height: 4),
                        // จางด้วย alpha ของสีตัวอักษร ไม่ใช่ widget Opacity
                        // — Opacity สั่ง saveLayer ทุกเฟรมที่ค่าอยู่ระหว่าง 0-1 แพงเปล่า ๆ
                        ValueListenableBuilder<double>(
                          valueListenable: controller.subFade,
                          builder: (context, v, _) => Text(
                            'สรุปข้อมูลการมาทำงานของคุณ',
                            style: _D.body(
                              size: 12,
                              color: _D.muted.withValues(alpha: v),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Obx(
                    () =>
                        controller.loading.value ||
                            controller.rangeLoading.value
                        ? SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: onPanel ? _D.onPanel() : _D.accent,
                            ),
                          )
                        : _iconBtn(
                            PhosphorIconsRegular.arrowsClockwise,
                            controller.resetAndRefresh,
                            onPanel: onPanel,
                          ),
                  ),
                ],
              ),
            ),
          ),
        );
      }),
    ),
  );

  /// หัวเรื่องแบบอยู่กับที่ — ใช้ตอนโหลด (ยังไม่มี scroll view จริง)
  Widget _heroTitle() => Padding(
    padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
    child: Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'แดชบอร์ด',
                style: _D.tech(size: 20, weight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                'สรุปข้อมูลการมาทำงานของคุณ',
                style: _D.body(size: 12, color: _D.muted),
              ),
            ],
          ),
        ),
        SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(strokeWidth: 2, color: _D.accent),
        ),
      ],
    ),
  );

  // ============ ภาพรวม (อยู่บนแผงน้ำเงิน) ============

  /// หัวแผงทั้งก้อน (หัวข้อ + ปุ่มเดือน + แท็บ) ตรึงไว้บนสุด
  /// ความสูงคงที่ทุกสถานะ — เดิมพอตรึงแล้วสูงเพิ่มรวดเดียว ~70dp เลยกระตุกเห็นชัด
  Widget _tabsSliver(BuildContext context) {
    // หัวแอปเป็น floating หายสนิทตอนเลื่อนลง — พอหัวนี้ตรึงถึงบนสุดจะไปอยู่ใต้ status bar
    // ตอนยังไม่ตรึงค่านี้ทำหน้าที่เป็นช่องไฟหัวแผงพอดี จึงตั้งคงที่ได้ ไม่ต้องสลับ
    final safeTop = MediaQuery.viewPaddingOf(context).top;
    final topPad = safeTop < 16 ? 16.0 : safeTop;
    final rowH = _D.box(52); // แถวหัวข้อ + ปุ่มเดือน
    final tabH = _D.box(40) + 4; // 40 ตัวแท็บ + 3 ขีดใต้ + 1 เส้นฐาน
    return SliverLayoutBuilder(
      builder: (context, cons) {
        // ห้ามใช้ overlapsContent — ค่านั้นมาจาก overlap ของ sliver ก่อนหน้า พอหัวแอปเลิก pinned
        // มันเป็น 0 ตลอด
        final stuck = cons.scrollOffset > 0;
        // แจ้งหัวแอปให้เปลี่ยนสี — ตั้งค่า Rx ระหว่าง layout ไม่ได้ ต้องรอจบเฟรม
        if (controller.panelStuck.value != stuck) {
          WidgetsBinding.instance.addPostFrameCallback(
            (_) => controller.panelStuck.value = stuck,
          );
        }
        return SliverPersistentHeader(
          pinned: true,
          delegate: _Sticky(
            height: topPad + rowH + tabH,
            topGap: topPad,
            stuck: stuck,
            child: Column(
              children: [
                SizedBox(height: rowH, child: _titleRow()),
                Expanded(child: _rangeTabs()),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _statSliver() => SliverToBoxAdapter(
    child: Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      child: _statRow(),
    ),
  );

  static const _rangeNames = {
    DashRange.week: 'รายสัปดาห์',
    DashRange.month: 'รายเดือน',
    DashRange.year: 'รายปี',
  };

  /// หัวข้อ + แท็บเลือกช่วง — 3 ตัวเลือกเห็นครบในจอเดียว กดสลับได้ทันทีไม่ต้องเปิดชั้นซ้อน
  /// หัวข้อ + บรรทัดบอกความสดของข้อมูล + ปุ่มเลือกเดือน — อยู่ในหัวที่ตรึง
  Widget _titleRow() => Padding(
    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
    child: Row(
      children: [
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'ภาพรวม',
                style: _D.tech(
                  size: 17,
                  weight: FontWeight.w700,
                  color: _D.onPanel(),
                ),
              ),
              Obx(
                () => Text(
                  controller.syncLabel,
                  style: _D.body(size: 11, color: _D.onPanel(0.75)),
                ),
              ),
            ],
          ),
        ),
        _monthChip(),
      ],
    ),
  );

  /// ปุ่มเลือกเดือน — โปร่งใส ไม่ใช่ขาวทึบ กันสับสนกับแท็บที่เลือกซึ่งเป็นพิลขาว
  Widget _monthChip() => Obx(
    () => Tappable(
      onTap: _pickScope,
      borderRadius: BorderRadius.circular(100),
      splash: _D.onPanel(),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 8, 10, 8),
        decoration: BoxDecoration(
          color: _D.onPanel(0.18),
          borderRadius: BorderRadius.circular(100),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              controller.scopeTitle,
              style: _D.tech(
                size: 13,
                weight: FontWeight.w600,
                color: _D.onPanel(),
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              PhosphorIconsRegular.caretDown,
              size: _D.sp(14),
              color: _D.onPanel(0.8),
            ),
          ],
        ),
      ),
    ),
  );

  /// แท็บเลือกช่วง — เหลี่ยม ชิดขอบจอ ตัวที่เลือกขีดเส้นใต้
  Widget _rangeTabs() => Obx(
    () => DecoratedBox(
      // เส้นฐานจาง ๆ ให้เห็นว่าแถวนี้เป็นแท็บ ไม่ใช่ข้อความลอย
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: _D.onPanel(0.25))),
      ),
      child: Row(
        children: [
          for (final e in _rangeNames.entries)
            Expanded(child: _rangeTab(e.key, e.value)),
        ],
      ),
    ),
  );

  Widget _rangeTab(DashRange r, String label) {
    final on = controller.range.value == r;
    return Tappable(
      onTap: () => controller.setRange(r),
      borderRadius: BorderRadius.zero,
      splash: _D.onPanel(),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            height: _D.box(40),
            child: Center(
              child: Text(
                label,
                style: _D.body(
                  size: 13,
                  weight: on ? FontWeight.w700 : FontWeight.w500,
                  // ตัวที่ไม่ได้เลือกอยู่บนพื้นน้ำเงิน — ขาว 70% ยังอ่านออกแต่ไม่แย่งสายตา
                  color: _D.onPanel(on ? 1 : 0.7),
                ),
              ),
            ),
          ),
          // ทับเส้นฐานพอดี — ตัวที่เลือกจึงดูเหมือนขีดเส้นใต้ ไม่ใช่มีเส้นสองชั้น
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOut,
            height: 3,
            decoration: BoxDecoration(
              color: on ? _D.onPanel() : Colors.transparent,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(3),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// ย้อนหลังได้แค่ไหนในตัวเลือกแบบเลื่อน — เท่าที่ข้อมูลลงเวลามีจริง
  static const _pickMonthsBack = 24;
  static const _pickYearsBack = 5;

  /// เลือกเดือน (หรือปี ตอนดูรายปี) แบบเลื่อน — กดที่หัวข้อบนแถบเดือน
  void _pickScope() {
    final now = DateTime.now();
    final isYear = controller.scopeIsYear;
    final cur = controller.month.value;
    // เรียงเก่า→ใหม่ ให้เลื่อนลงคือเข้าใกล้ปัจจุบัน ตรงกับสัญชาตญาณปฏิทิน
    final items = <DateTime>[
      for (var i = isYear ? _pickYearsBack : _pickMonthsBack; i >= 0; i--)
        isYear
            ? DateTime(now.year - i, cur.month)
            : DateTime(now.year, now.month - i),
    ];
    var picked = items.indexWhere(
      (d) => isYear
          ? d.year == cur.year
          : (d.year == cur.year && d.month == cur.month),
    );
    // เดือนที่ดูอยู่เก่ากว่าช่วงที่ให้เลือก — เริ่มที่ตัวเก่าสุด
    if (picked < 0) picked = 0;
    final wheel = FixedExtentScrollController(initialItem: picked);
    final rowH = _D.box(44);

    Get.bottomSheet<void>(
      Container(
        decoration: BoxDecoration(
          color: _D.card,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        child: StatefulBuilder(
          builder: (context, setSheet) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: _D.faint,
                  borderRadius: BorderRadius.circular(100),
                ),
              ),
              Text(
                isYear ? 'เลือกปี' : 'เลือกเดือน',
                style: _D.tech(size: 14, color: _D.ink),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: rowH * 5,
                child: Stack(
                  children: [
                    // แถบไฮไลต์วางไว้ใต้ล้อ ไม่งั้นทับตัวอักษรที่เลือกอยู่
                    Center(
                      child: Container(
                        height: rowH,
                        decoration: BoxDecoration(
                          color: _D.wash,
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                    ListWheelScrollView.useDelegate(
                      controller: wheel,
                      itemExtent: rowH,
                      // แบนไว้ — โค้งมากแล้วบรรทัดบนสุดบี้จนอ่านไม่ออก
                      diameterRatio: 2.4,
                      perspective: 0.002,
                      physics: const FixedExtentScrollPhysics(),
                      onSelectedItemChanged: (i) => setSheet(() => picked = i),
                      childDelegate: ListWheelChildBuilderDelegate(
                        childCount: items.length,
                        builder: (context, i) {
                          final d = items[i];
                          final on = i == picked;
                          return Center(
                            child: Text(
                              isYear
                                  ? 'ปี ${d.year + 543}'
                                  : thaiMonthYear(d.year, d.month),
                              style: _D.tech(
                                size: on ? 16 : 15,
                                weight: on ? FontWeight.w700 : FontWeight.w500,
                                color: on ? _D.accentActive : _D.muted,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Tappable(
                onTap: () {
                  Get.back<void>();
                  controller.setMonth(items[picked]);
                },
                borderRadius: BorderRadius.circular(16),
                splash: _D.on,
                child: Container(
                  width: double.infinity,
                  height: _D.box(48),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: _D.accentActive,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    'เลือก',
                    style: _D.body(
                      size: 14,
                      weight: FontWeight.w600,
                      color: _D.on,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      isScrollControlled: true,
    ).whenComplete(wheel.dispose);
  }

  /// หัวการ์ดกราฟ — ช่วงย่อยที่การ์ดนี้แสดง + ปุ่มเลื่อนสัปดาห์ (เฉพาะรายสัปดาห์)
  Widget _periodHeader() => Obx(
    () => Row(
      children: [
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                controller.cardTitle,
                style: _D.tech(
                  size: 16,
                  weight: FontWeight.w700,
                  color: _D.ink,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                controller.cardSub,
                style: _D.body(size: 12, color: _D.muted),
              ),
            ],
          ),
        ),
        // เลื่อนได้เฉพาะรายสัปดาห์ — เดือน/ปีเปลี่ยนที่ปุ่มเดือนมุมขวาบน
        if (controller.range.value == DashRange.week) ...[
          _navBtn(
            PhosphorIconsRegular.caretLeft,
            controller.goPrev,
            controller.canGoPrev,
          ),
          const SizedBox(width: 12),
          _navBtn(
            PhosphorIconsRegular.caretRight,
            controller.goNext,
            controller.canGoNext,
          ),
        ],
      ],
    ),
  );

  Widget _navBtn(IconData icon, VoidCallback onTap, bool enabled) => Tappable(
    onTap: onTap,
    enabled: enabled,
    circle: true,
    splash: _D.accent,
    child: Container(
      width: _D.sp(40),
      height: _D.sp(40),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        // ปุ่มที่กดได้เป็นฟ้าทึบ ปุ่มที่สุดทางแล้วเป็นฟ้าจาง — ต่างกันชัดโดยไม่ต้องอ่าน
        color: enabled ? _D.accent : _D.wash,
      ),
      child: Icon(
        icon,
        size: _D.sp(20),
        color: enabled ? _D.on : _D.accent.withValues(alpha: 0.45),
      ),
    ),
  );

  Widget _dailyHeader() => Obx(
    () => Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text(
                'รายวัน',
                style: _D.tech(
                  size: 16,
                  weight: FontWeight.w700,
                  color: _D.onPanel(),
                ),
              ),
              const Spacer(),
              Text(
                controller.periodTitle,
                style: _D.body(size: 11.5, color: _D.onPanel(0.8)),
              ),
            ],
          ),
          if (controller.issueCount > 0) ...[
            const SizedBox(height: 8),
            // ส่วนใหญ่เปิดมาเพื่อหาว่า "วันไหนมีปัญหา" — ให้กรองได้ในคลิกเดียว
            Align(
              alignment: Alignment.centerLeft,
              child: Tappable(
                onTap: controller.onlyIssues.toggle,
                borderRadius: BorderRadius.circular(100),
                splash: _D.onPanel(),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: controller.onlyIssues.value
                        ? _D.onPanel()
                        : _D.onPanel(0.2),
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        PhosphorIconsRegular.warningCircle,
                        size: 14,
                        color: controller.onlyIssues.value
                            ? _D.accent
                            : _D.onPanel(),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'เฉพาะที่ผิดปกติ (${controller.issueCount})',
                        style: _D.body(
                          size: 11.5,
                          weight: FontWeight.w600,
                          color: controller.onlyIssues.value
                              ? _D.accent
                              : _D.onPanel(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    ),
  );

  // ============ ต้องขอแก้ไข ============

  /// ลงเวลาที่ระบบใช้ต่อไม่ได้ (ลืมออกเวร/นอกพื้นที่) = งานค้างที่ต้องเดินไปแจ้ง ไม่ใช่แค่สถิติ
  /// ยกขึ้นมาไว้บนสุดพร้อมรายละเอียดครบ: วันไหน เวรอะไร เวลาเท่าไหร่ ผิดยังไง แจ้งใคร
  Widget _actionBanner() {
    final fixes = controller.pendingFixes;
    final c = _D.bad;
    final contact = controller.settings.contactMsg.value.trim();
    return Tappable(
      // กดแล้วเปิดตัวกรอง "เฉพาะที่ผิดปกติ" ในรายการรายวันด้านล่าง
      onTap: () => controller.onlyIssues.value = true,
      borderRadius: BorderRadius.circular(16),
      splash: c,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: c.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(PhosphorIconsRegular.warningCircle, size: 18, color: c),
                const SizedBox(width: 8),
                Text(
                  'ต้องขอแก้ไข ${fixes.length} รายการ',
                  style: _D.tech(size: 13.5, weight: FontWeight.w700, color: c),
                ),
              ],
            ),
            const SizedBox(height: 8),
            for (final r in fixes.take(3)) _fixItem(r),
            if (fixes.length > 3)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  'และอีก ${fixes.length - 3} รายการ',
                  style: _D.body(size: 11, color: _D.muted),
                ),
              ),
            const SizedBox(height: 8),
            Text(
              contact.isEmpty
                  ? 'ขอแก้ไขเวลาได้ที่หัวหน้าเวรหรือฝ่ายบุคคล'
                  : 'ขอแก้ไขเวลา: $contact',
              style: _D.body(
                size: 11.5,
                weight: FontWeight.w600,
                color: _D.accentActive,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// หนึ่งรายการค้าง — วันที่ · เวร · เวลาที่มี · สาเหตุ
  Widget _fixItem(Map<String, dynamic> r) {
    final inT = '${r['in'] ?? ''}';
    final outT = '${r['out'] ?? ''}';
    final why = r['no_out'] == true ? 'ไม่มีเวลาออก' : 'สแกนนอกพื้นที่';
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 74,
            child: Text(
              thaiShortDate('${r['date']}'),
              style: _D.body(
                size: 11.5,
                weight: FontWeight.w700,
                color: _D.sub,
              ),
            ),
          ),
          Expanded(
            child: Text(
              '${inT.isEmpty ? 'เวร' : _shiftName(inT)} · '
              'เข้า ${inT.isEmpty ? '--:--' : inT} · ออก ${outT.isEmpty ? '--:--' : outT} · $why',
              style: _D.body(size: 11.5, color: _D.muted),
            ),
          ),
        ],
      ),
    );
  }

  Widget _iconBtn(
    IconData icon,
    VoidCallback? onTap, {
    Key? key,
    bool enabled = true,
    bool onPanel = false,
  }) => Tappable(
    key: key,
    onTap: enabled ? onTap : null,
    circle: true,
    splash: onPanel ? _D.onPanel() : _D.accent,
    child: Container(
      width: 36,
      height: 36,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: onPanel ? _D.onPanel(0.2) : _D.rowBg,
        shape: BoxShape.circle,
      ),
      child: Icon(
        icon,
        size: 19,
        color: onPanel
            ? _D.onPanel(enabled ? 1 : 0.4)
            : (enabled ? _D.accent : _D.faint),
      ),
    ),
  );

  Widget _errorState() => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(PhosphorIconsRegular.wifiSlash, size: 36, color: _D.faint),
          const SizedBox(height: 8),
          Text(
            controller.error.value,
            textAlign: TextAlign.center,
            style: _D.body(size: 13, color: _D.sub),
          ),
          const SizedBox(height: 16),
          Tappable(
            onTap: controller.refreshAll,
            borderRadius: BorderRadius.circular(100),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                gradient: _D.accentGradient,
                borderRadius: BorderRadius.circular(100),
              ),
              child: Text(
                'ลองใหม่',
                style: _D.tech(size: 13, weight: FontWeight.w700, color: _D.on),
              ),
            ),
          ),
        ],
      ),
    ),
  );

  // ============ 4 ช่องสรุป ============

  /// สรุปช่วงที่เลือกเป็นแถบสัดส่วนเส้นเดียว — การ์ด 4 ใบบอกแต่ตัวเลขโดด ๆ
  /// อ่านไม่ออกว่าสัดส่วนวันที่มีปัญหาเทียบกับทั้งเดือนเป็นเท่าไหร่
  Widget _statRow() => Obx(() {
    if (controller.rangeLoading.value) {
      return _Shimmer(child: _Skel(height: 104, radius: 16, onPanel: true));
    }
    final b = controller.summary;
    final segs = <(String, int, Color)>[
      ('ปกติ', b.normalDays, _D.ok),
      ('สาย', b.lateOnly, _D.warn),
      ('ออกก่อน', b.earlyOnly, _D.info),
      ('ลืมออก', b.noOutOnly, _D.bad),
    ];
    final total = b.days;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: _D.card,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('มาทำงาน', style: _D.body(size: 12.5, color: _D.muted)),
              const SizedBox(width: 8),
              // นับขึ้นจาก 0 — ตาจับได้ว่าตัวเลขนี้เพิ่งเปลี่ยนตามช่วงที่เลือก
              TweenAnimationBuilder<double>(
                key: ValueKey(total),
                tween: Tween(begin: 0, end: total.toDouble()),
                duration: const Duration(milliseconds: 450),
                curve: Curves.easeOutCubic,
                builder: (context, v, _) => Text(
                  '${v.round()} วัน',
                  style: _D.num(
                    size: 18,
                    weight: FontWeight.w800,
                    color: _D.ink,
                  ),
                ),
              ),
              const Spacer(),
              // ช่วงวันที่ของตัวเลขชุดนี้ — ใช้ค่าเดียวกับหัวการ์ดกราฟ เพราะสรุปจากแถวชุดเดียวกัน
              Text(
                controller.cardSub,
                style: _D.body(size: 11.5, color: _D.muted),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(100),
            child: SizedBox(
              height: _D.sp(12),
              child: total == 0
                  ? ColoredBox(color: _D.rowBg)
                  // ยืดจากซ้ายตอนโผล่/เปลี่ยนช่วง — key ผูกกับตัวเลขจริง
                  // ไม่งั้นสลับแท็บแล้วแถบเปลี่ยนค่าเงียบ ๆ ไม่รู้ว่าอัปเดตแล้ว
                  : TweenAnimationBuilder<double>(
                      key: ValueKey(
                        '$total-${b.normalDays}-${b.lateOnly}-${b.earlyOnly}-${b.noOutOnly}',
                      ),
                      tween: Tween(begin: 0, end: 1),
                      duration: const Duration(milliseconds: 550),
                      curve: Curves.easeOutCubic,
                      builder: (context, t, child) => Align(
                        alignment: Alignment.centerLeft,
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: t,
                          child: child,
                        ),
                      ),
                      child: Row(
                        // stretch — ColoredBox/Container ในแถวนี้ไม่มีความสูงของตัวเอง
                        // ปล่อยไว้ Row จะให้ความสูง 0 แถบเลยหายทั้งแถบ
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (final (i, seg) in segs.indexed)
                            if (seg.$2 > 0) ...[
                              // ช่องไฟคั่นเป็นสีพื้นหลัง ไม่ใช่ช่องว่าง — ClipRRect ตัดขอบให้เอง
                              if (i > 0 && segs.take(i).any((e) => e.$2 > 0))
                                Container(width: 2, color: _D.card),
                              // Expanded ไม่ใช่ Flexible — loose fit ทำให้ ColoredBox
                              // ที่ไม่มีขนาดของตัวเองหดเหลือ 0 แถบเลยหายไปทั้งแถว
                              Expanded(
                                flex: seg.$2,
                                child: ColoredBox(color: seg.$3),
                              ),
                            ],
                        ],
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 14,
            runSpacing: 8,
            children: [
              for (final (label, v, c) in segs) _statLegend(label, v, c),
            ],
          ),
        ],
      ),
    );
  });

  Widget _statLegend(String label, int v, Color c) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          // จางลงเมื่อเป็นศูนย์ — ตายังกวาดหาอันที่มีค่าได้เร็ว
          color: v > 0 ? c : _D.faint,
          shape: BoxShape.circle,
        ),
      ),
      const SizedBox(width: 6),
      Text(label, style: _D.body(size: 11.5, color: _D.muted)),
      const SizedBox(width: 4),
      Text(
        '$v',
        style: _D.num(
          size: 12.5,
          weight: FontWeight.w700,
          color: v > 0 ? _D.ink : _D.faint,
        ),
      ),
    ],
  );

  // ============ การ์ดกราฟ ============

  Widget _chartCard(ChartCard c) {
    final maxMin = c.buckets.fold<int>(
      1,
      (m, b) => b.minutes > m ? b.minutes : m,
    );
    final empty = c.buckets.every((b) => b.minutes == 0 && b.shifts == 0);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        gradient: _D.band,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [_chartBody(c, maxMin, empty), _legendBar()],
      ),
    );
  }

  /// แถบเข้มท้ายการ์ด — ชิปบอกความหมายของสีแท่ง
  /// สีต้องเท่ากับที่วาดเป๊ะ — Figma ใส่ #3382E7 แต่แท่งเป็น #5682E9 legend ที่สีไม่ตรงคือ legend ที่ผิด
  /// ห้ามครอบ Obx: ในนี้ไม่ได้อ่านค่า .obs สักตัว GetX จะมองว่าใช้ผิดแล้วโยน error
  /// ออกมาเป็น ErrorWidget ซึ่งใน release build คือกล่องเทาที่ยืดเต็มพื้นที่ที่เหลือ
  /// (การ์ดกราฟอยู่ใน SliverToBoxAdapter = ความสูงไม่จำกัด เลยเทาลงไปเป็นพันพิกเซล)
  Widget _legendBar() {
    // ชิปชุดเดียวกันทุกแท็บ — ต่างแค่รายการที่กราฟโหมดนั้นวาดจริง
    // รายปีเป็นแท่งซ้อนตามชั่วโมง จึงมีแค่ 3 ชั้น ไม่มี "ออกก่อน/ไม่มีเวร" ให้บอก
    final chips = [
      _legendChip(_D.ok, 'ปกติ'),
      _legendChip(_D.warn, 'สาย'),
      _legendChip(_D.info, 'ออกก่อน'),
      _legendChip(_D.bad, 'ลืมออก/นอกพื้นที่'),
      _legendChip(_D.faint, 'ไม่มีเวร'),
    ];
    // บังคับความสูงไว้ด้วย — การ์ดกราฟอยู่ใน SliverToBoxAdapter (ความสูงไม่จำกัด)
    // แถวเลื่อนแนวนอนที่ไม่มีความสูงบังคับจะยืดไปเท่าที่พื้นที่เหลือให้
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 12),
      child: SizedBox(
        height: _D.box(34), // ชิป: ตัวอักษร 12 + padding 8 บน-ล่าง
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              for (var i = 0; i < chips.length; i++) ...[
                if (i > 0) const SizedBox(width: 8),
                chips[i],
              ],
            ],
          ),
        ),
      ),
    );
  }

  /// ชิป legend แบบอ่านอย่างเดียว — วงกลมสถานะไม่มีชั้นให้กดซ่อนเหมือนแท่งซ้อนสี
  Widget _legendChip(Color c, String label) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    decoration: BoxDecoration(
      color: c.withValues(alpha: 0.5),
      borderRadius: BorderRadius.circular(100),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(shape: BoxShape.circle, color: c),
        ),
        const SizedBox(width: 9),
        Text(label, style: _D.body(size: 12, color: Colors.white)),
      ],
    ),
  );

  Widget _chartBody(ChartCard c, int maxMin, bool empty) {
    return Container(
      // 16 ข้าง เท่าการ์ดสรุปด้านบน — เดิม 12 แท่งแรกเลยล้ำออกไปกว่าแถบสัดส่วน 4dp
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      decoration: BoxDecoration(
        color: _D.card,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _periodHeader(),
          const SizedBox(height: 16),
          // ปุ่มเลื่อนอยู่บนหัวการ์ด — ตอนโหลดต้องคงหัวไว้ ให้กดต่อได้ทันที
          if (controller.rangeLoading.value)
            _Shimmer(child: _Skel(height: _D.sp(160), radius: 16))
          else if (empty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Column(
                children: [
                  Icon(
                    PhosphorIconsRegular.calendarX,
                    size: 26,
                    color: _D.faint,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'ยังไม่มีข้อมูลในช่วงนี้',
                    style: _D.body(size: 12, color: _D.muted),
                  ),
                ],
              ),
            )
          // รายสัปดาห์แค่ 7 วัน ไล่ดูทีละวงได้ — ตอบ "วันไหนมีปัญหา" ทันทีโดยไม่ต้องแตะทีละแท่ง
          // เดือน/ปีข้อมูลเยอะเกินกว่าจะไล่ทีละวง จึงยังเป็นกราฟแท่ง
          else if (controller.range.value == DashRange.week)
            _dayStrip()
          else if (controller.range.value == DashRange.month)
            _monthHeatmap()
          else
            _bars(c.buckets, maxMin, c.current, c.byDay),
        ],
      ),
    );
  }

  /// 7 วันของสัปดาห์เป็นวงกลมสถานะ — สีมาจากเวรที่แย่ที่สุดของวันนั้น
  /// วันที่มีสองเวรผ่าครึ่งทแยง · เวรเดียวที่ผิดหลายอย่างมีจุดเล็กมุมบน
  Widget _dayStrip() {
    final mon = controller.weekMonday;
    final map = controller.dayShifts;
    final sel = controller.touchedDay.value;
    final today = DashboardController.ymd(DateTime.now());
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            for (var i = 0; i < 7; i++)
              Expanded(
                child: _dayDot(
                  mon.add(Duration(days: i)),
                  DashboardController.weekdayNames[i],
                  map,
                  sel,
                  today,
                ),
              ),
          ],
        ),
        const SizedBox(height: 14),
        // กล่องรายละเอียดสูงไม่เท่ากันตามจำนวนเวร — ยืด/หดให้ลื่น ไม่ใช่กระตุกเปลี่ยนความสูงทันที
        AnimatedSize(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          alignment: Alignment.topCenter,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 180),
            // ครอสเฟดตัวเก่า-ใหม่ตรงที่เดิม ไม่ให้ตัวเก่าดันความสูงระหว่างเปลี่ยน
            layoutBuilder: (cur, prev) => Stack(
              alignment: Alignment.topCenter,
              children: [...prev, if (cur != null) cur],
            ),
            child: KeyedSubtree(
              key: ValueKey(sel),
              child: _dayDetail(sel, map),
            ),
          ),
        ),
      ],
    );
  }

  Widget _dayDot(
    DateTime d,
    String wd,
    Map<String, List<Map<String, dynamic>>> map,
    String sel,
    String today,
  ) {
    final key = DashboardController.ymd(d);
    final shifts = map[key] ?? const <Map<String, dynamic>>[];
    final isToday = key == today;
    final on = key == sel;
    final size = _D.box(38);
    final marks = [for (final r in shifts) DashboardController.markOf(r)];
    return Tappable(
      onTap: shifts.isEmpty
          ? null
          : () => controller.touchedDay.value = on ? '' : key,
      borderRadius: BorderRadius.circular(12),
      splash: _D.accent,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              wd,
              style: _D.body(size: 10.5, color: isToday ? _D.accent : _D.muted),
            ),
            const SizedBox(height: 6),
            SizedBox(
              width: size,
              height: size,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: size,
                    height: size,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: marks.isEmpty ? _D.rowBg : null,
                      // วงเลือก/วันนี้เป็นขอบ ไม่ใช่สี — สีในวงถูกใช้บอกสถานะไปแล้ว
                      border: on || isToday
                          ? Border.all(
                              color: on ? _D.accentActive : _D.accent,
                              width: on ? 2.5 : 1.5,
                            )
                          : null,
                    ),
                    child: marks.isEmpty
                        ? null
                        : CustomPaint(
                            size: Size.square(size - (on ? 7 : 4)),
                            painter: _SplitDot(
                              _markColor(marks.first),
                              _markColor(marks.last),
                            ),
                          ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${d.day}',
              style: _D.num(
                size: 12,
                weight: FontWeight.w700,
                color: isToday ? _D.accentActive : _D.sub,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// ปฏิทินความเข้มรายเดือน — แถวละสัปดาห์ คอลัมน์ละวัน
  /// สีบอกสถานะเหมือนแถบรายสัปดาห์ · ความเข้มบอกชั่วโมงทำงาน (เต็มที่ 8 ชม.)
  /// กราฟแท่งรายสัปดาห์เดิมบอกได้แค่ยอดรวมของทั้งสัปดาห์ ไม่เห็นว่าวันไหนหนัก/วันไหนมีปัญหา
  Widget _monthHeatmap() {
    final first = DateTime(
      controller.month.value.year,
      controller.month.value.month,
    );
    final last = DateTime(first.year, first.month + 1, 0);
    final start = first.subtract(Duration(days: first.weekday - 1));
    final weeks = ((last.difference(start).inDays + 1) / 7).ceil();
    final map = controller.dayShifts;
    final sel = controller.touchedDay.value;
    final today = DashboardController.ymd(DateTime.now());
    final labelW = _D.box(26);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            SizedBox(width: labelW),
            for (final w in DashboardController.weekdayNames)
              Expanded(
                child: Center(
                  child: Text(w, style: _D.body(size: 10, color: _D.muted)),
                ),
              ),
          ],
        ),
        const SizedBox(height: 6),
        for (var r = 0; r < weeks; r++)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              children: [
                SizedBox(
                  width: labelW,
                  child: Text(
                    'ส.${r + 1}',
                    style: _D.body(size: 9.5, color: _D.faint),
                  ),
                ),
                for (var c = 0; c < 7; c++)
                  Expanded(
                    child: _heatCell(
                      start.add(Duration(days: r * 7 + c)),
                      first.month,
                      map,
                      sel,
                      today,
                    ),
                  ),
              ],
            ),
          ),
        const SizedBox(height: 12),
        AnimatedSize(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          alignment: Alignment.topCenter,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 180),
            layoutBuilder: (cur, prev) => Stack(
              alignment: Alignment.topCenter,
              children: [...prev, if (cur != null) cur],
            ),
            child: KeyedSubtree(
              key: ValueKey(sel),
              child: _dayDetail(sel, map),
            ),
          ),
        ),
      ],
    );
  }

  Widget _heatCell(
    DateTime d,
    int month,
    Map<String, List<Map<String, dynamic>>> map,
    String sel,
    String today,
  ) {
    // วันของเดือนข้างเคียงที่หลุดเข้ามาในสัปดาห์แรก/สุดท้าย — เว้นว่างไว้ ไม่นับรวม
    if (d.month != month) {
      return const AspectRatio(aspectRatio: 1.1, child: SizedBox());
    }
    final key = DashboardController.ymd(d);
    final shifts = map[key] ?? const <Map<String, dynamic>>[];
    final mins = shifts.fold<int>(
      0,
      (sum, r) => sum + controller.workedMinutes(r),
    );
    var mark = shifts.isEmpty ? null : DayMark.ok;
    for (final r in shifts) {
      final k = DashboardController.markOf(r);
      if (k.index > mark!.index) mark = k;
    }
    // ไล่เฉด 4→10 ชม. ไม่ใช่ 0→8 — เวรจริงเกาะแถว 7-9 ชม. เริ่มที่ 0 แล้วทุกวันเข้มเท่ากันหมด
    // ใช้ค่าคงที่ ไม่ใช่ค่าสูงสุดของเดือน เดือนไหนก็เทียบกันได้
    final t = ((mins - 240) / 360).clamp(0.0, 1.0);
    final on = key == sel;
    final isToday = key == today;
    final bg = mark == null
        ? _D.rowBg
        : _markColor(mark).withValues(alpha: 0.3 + 0.7 * t);
    return AspectRatio(
      aspectRatio: 1.1,
      child: Padding(
        padding: const EdgeInsets.all(2),
        child: Tappable(
          onTap: shifts.isEmpty
              ? null
              : () => controller.touchedDay.value = on ? '' : key,
          borderRadius: BorderRadius.circular(8),
          splash: _D.on,
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(8),
              border: on || isToday
                  ? Border.all(
                      color: on ? _D.accentActive : _D.accent,
                      width: on ? 2 : 1.2,
                    )
                  : null,
            ),
            child: Text(
              '${d.day}',
              style: _D.num(
                size: 11,
                weight: FontWeight.w700,
                // พื้นเข้มแล้วตัวเลขต้องขาว ไม่งั้นอ่านไม่ออก
                color: mark == null ? _D.faint : (t > 0.4 ? _D.on : _D.sub),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Color _markColor(DayMark m) => switch (m) {
    DayMark.ok => _D.ok,
    DayMark.late => _D.warn,
    DayMark.early => _D.info,
    DayMark.bad => _D.bad,
  };

  /// บรรทัดใต้แถบ — บอกว่าวันที่แตะมีเวรอะไร เวลาเท่าไหร่ ผิดตรงไหน
  Widget _dayDetail(String key, Map<String, List<Map<String, dynamic>>> map) {
    final list = key.isEmpty
        ? const <Map<String, dynamic>>[]
        : (map[key] ?? const []);
    if (list.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 10),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: _D.rowBg,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          'แตะวันที่มีเวรเพื่อดูรายละเอียด',
          style: _D.body(size: 11.5, color: _D.muted),
        ),
      );
    }
    final d = DateTime.parse(key);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _D.rowBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${d.day} ${thaiMonthShort(d.month)} ${(d.year + 543) % 100}',
            style: _D.tech(size: 12.5, weight: FontWeight.w700, color: _D.ink),
          ),
          for (final r in list) ...[
            const SizedBox(height: 6),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.only(top: 5, right: 8),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _markColor(DashboardController.markOf(r)),
                  ),
                ),
                Expanded(
                  child: Text(
                    _shiftLine(r),
                    style: _D.body(size: 11.5, color: _D.sub),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  String _shiftLine(Map<String, dynamic> r) {
    final inT = '${r['in'] ?? ''}';
    final outT = '${r['out'] ?? ''}';
    final why = [
      if (r['late'] == true) 'เข้าสาย',
      if (r['early'] == true) 'ออกก่อนเวลา',
      if (r['no_out'] == true) 'ไม่มีเวลาออก',
      if (r['out_area'] == true) 'สแกนนอกพื้นที่',
    ];
    final name = inT.isEmpty ? 'เวร' : _shiftName(inT);
    final time = '$inT - ${outT.isEmpty ? '--:--' : outT}';
    return why.isEmpty ? '$name · $time' : '$name · $time · ${why.join(' · ')}';
  }

  /// แท่งแนวตั้ง = ชั่วโมงทำงานของวัน/เดือนนั้น · เส้นประ = เกณฑ์ 8 ชม.
  /// อ่านได้ทันทีว่า "วันไหนทำงานสั้น/ยาวผิดปกติ" ซึ่งดูจากตัวเลขอย่างเดียวไม่เห็น
  Widget _bars(List<Bucket> list, int maxMin, int? cur, bool byDay) {
    // ต้องอ่าน Rx ตรงนี้ ไม่ใช่ใน LayoutBuilder ด้านล่าง — builder ของ LayoutBuilder ทำงานตอน layout
    // ซึ่งอยู่นอก closure ของ Obx แล้ว GetX จึงไม่เห็นว่าใครพึ่งค่าไหน กด legend/แท่งแล้วกราฟไม่ขยับ
    final hidden = {...controller.hiddenSeries};
    final touched = controller.touchedBar.value;
    const target =
        8.0; // เพดานขั้นต่ำของสเกล — วันที่ทำงานน้อยจะได้ไม่ถูกดันจนเต็มกราฟ
    final maxH = maxMin / 60;
    final top =
        (byDay ? (maxH < target ? target : maxH) : maxH) *
        1.18; // เผื่อที่ให้ป้ายค่าลอยเหนือแท่ง
    // แท่งเยอะเกินกว่าจะใส่ป้ายครบ — เว้นระยะให้อ่านออก
    final step = list.length > 20 ? 5 : 1;

    return LayoutBuilder(
      builder: (context, box) {
        // ความกว้างแท่งตามพื้นที่จริง — เดิมตายตัว 16 ทำให้กราฟ 5 แท่งดูผอมเก้อ
        final barW = (box.maxWidth / list.length * 0.6).clamp(5.0, 30.0);
        return SizedBox(
          height: _D.sp(160),
          child: BarChart(
            BarChartData(
              maxY: top,
              minY: 0,
              // spaceBetween — แท่งแรก/สุดท้ายชิดขอบกราฟพอดี ไม่เหลือช่องว่างหัวท้าย
              alignment: BarChartAlignment.spaceBetween,
              borderData: FlBorderData(show: false),
              gridData: const FlGridData(show: false),
              titlesData: FlTitlesData(
                leftTitles: const AxisTitles(),
                rightTitles: const AxisTitles(),
                topTitles: const AxisTitles(),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 24,
                    getTitlesWidget: (value, meta) {
                      final i = value.toInt();
                      if (i < 0 || i >= list.length)
                        return const SizedBox.shrink();
                      if (step > 1 && i % step != 0)
                        return const SizedBox.shrink();
                      return Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: SizedBox(
                          width: box.maxWidth / list.length - 2,
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              list[i].label,
                              maxLines: 1,
                              softWrap: false,
                              style: _D.body(
                                size: 10,
                                color: i == cur ? _D.accent : _D.muted,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
              barTouchData: BarTouchData(
                // จัดการเองเพื่อให้ tooltip ค้างจนกดที่อื่น — ของ built-in หายทันทีที่ปล่อยนิ้ว
                handleBuiltInTouches: false,
                touchCallback: (event, resp) {
                  if (event is! FlTapUpEvent) return;
                  final i = resp?.spot?.touchedBarGroupIndex ?? -1;
                  controller.touchedBar.value = controller.touchedBar.value == i
                      ? -1
                      : i;
                },
                touchTooltipData: BarTouchTooltipData(
                  getTooltipColor: (_) => _D.ink,
                  fitInsideHorizontally: true,
                  fitInsideVertically: true,
                  maxContentWidth: 200,
                  tooltipBorderRadius: BorderRadius.circular(12),
                  tooltipPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  tooltipMargin: 8,
                  // สลับช่วงแล้ว fl_chart ยัง tween จากชุดเดิมอยู่ — groupIndex อาจเกินความยาว list ชุดใหม่
                  getTooltipItem: (group, groupIndex, rod, rodIndex) =>
                      groupIndex < 0 || groupIndex >= list.length
                      ? null
                      : _tooltip(list[groupIndex], byDay, hidden),
                ),
              ),
              barGroups: [
                for (var i = 0; i < list.length; i++)
                  _group(
                    i,
                    list[i],
                    top,
                    barW,
                    hidden,
                    touched,
                    current: i == cur,
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// แท่งเดียวซ้อนหลายสี: ตรงเวลา → สาย · ลืมออกเวรไม่มีชั่วโมงจึงใส่ขีดแดงเตี้ยๆ ให้วันนั้นไม่หายไป
  BarChartGroupData _group(
    int i,
    Bucket b,
    double top,
    double barW,
    Set<Series> hidden,
    int touched, {
    bool current = false,
  }) {
    // เวรที่ยังไม่เลิกงานไม่ใช่ความผิดปกติ — ขีดจางแทนแดง
    final open = b.openShifts > 0 && b.noOut == 0;
    // สีทึบเต็มเท่าแถบสัดส่วนด้านบน — เดิมแท่งที่ไม่ใช่ช่วงปัจจุบันถูกลด alpha 0.85
    // ทำให้เขียว/ส้มดูคนละเฉดกับ legend และการ์ดสรุปทั้งที่เป็นสีเดียวกัน
    const a = 1.0;

    // ชั้นที่ถูกปิดจาก legend ต้องหายไปจริง — สแต็กจึงต้องคำนวณ offset ใหม่ ไม่ใช่แค่ทำให้ใส
    // สีชุดเดียวกับชิป legend ทุกแท็บ — แท่งเดียวบอกได้ว่าชั่วโมงมาจากเวรแบบไหน
    final parts = <(double, Color)>[
      (b.minutesOk / 60, _D.ok.withValues(alpha: a)),
      (b.minutesLate / 60, _D.warn.withValues(alpha: a)),
      (b.minutesEarly / 60, _D.info.withValues(alpha: a)),
      (b.minutesBad / 60, _D.bad.withValues(alpha: a)),
      // มีเวรแต่ไม่มีชั่วโมง (ลืมออก / ยังไม่เลิกงาน) — ขีดเตี้ย ๆ ไม่ให้เดือนนั้นหายไปเลย
      if (b.minutes == 0 && b.shifts > 0)
        (top * 0.04, (open ? _D.faint : _D.bad).withValues(alpha: a)),
    ];
    final stack = <BarChartRodStackItem>[];
    var acc = 0.0;
    for (final (v, c) in parts) {
      if (v <= 0) continue;
      stack.add(BarChartRodStackItem(acc, acc + v, c));
      acc += v;
    }

    return BarChartGroupData(
      x: i,
      showingTooltipIndicators: touched == i ? [0] : const [],
      barRods: [
        BarChartRodData(
          toY: acc,
          width: barW,
          // แท่งกว้างขึ้นแล้ว มุม 100 กลายเป็นครึ่งวงกลมเต็มหัว — ตรึงไว้ที่ 6
          borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
          rodStackItems: stack,
          color: _D.ok,
          // รางพื้นหลัง = สเกล ต้องจางจริง — withValues(alpha:) แทนที่ค่า alpha เดิม ไม่ได้คูณ
          backDrawRodData: BackgroundBarChartRodData(
            show: true,
            toY: top,
            color: _D.dark
                ? Colors.white.withValues(alpha: 0.06)
                : Colors.black.withValues(alpha: 0.05),
          ),
        ),
      ],
    );
  }

  /// สรุปของแท่งที่แตะ — หัวข้อ + ชั่วโมง + สิ่งที่ผิดปกติ
  /// แท่ง = วัน จะนับเป็น "ครั้ง" (วันเดียวลงได้หลายเวร) · แท่ง = สัปดาห์/เดือน นับเป็น "วัน"
  BarTooltipItem _tooltip(Bucket b, bool byDay, Set<Series> hidden) {
    final head = _D.num(
      size: 12.5,
      weight: FontWeight.w800,
      color: Colors.white,
    );
    final line = _D.body(
      size: 11.5,
      color: Colors.white.withValues(alpha: 0.85),
    );
    final unit = byDay ? 'ครั้ง' : 'วัน';
    final late = byDay ? b.late : b.lateDays;
    final early = byDay ? b.early : b.earlyDays;
    final noOut = byDay ? b.noOut : b.noOutDays;
    final rows = <String>[
      if (b.shifts == 0)
        'ไม่มีการลงเวลา'
      else ...[
        _hShort(_visibleMinutes(b, hidden)),
        if (!byDay) 'มาทำงาน ${b.days} วัน',
        if (byDay && b.shifts > 1) '${b.shifts} เวร',
        if (late > 0) 'เข้าสาย $late $unit',
        if (early > 0) 'ออกก่อน $early $unit',
        if (noOut > 0) 'ลืมออกเวร $noOut $unit',
        if (b.openShifts > 0) 'ยังไม่สแกนออก',
      ],
    ];
    return BarTooltipItem(
      b.label,
      head,
      textAlign: TextAlign.left,
      children: [for (final r in rows) TextSpan(text: '\n$r', style: line)],
    );
  }

  /// นาทีที่แท่งแสดงจริง — ตอนนี้แสดงครบทุกชั้น ป้ายค่าจึงเท่ากับยอดรวม
  int _visibleMinutes(Bucket b, Set<Series> hidden) => b.minutes;

  String _hShort(int minutes) {
    final h = minutes / 60;
    return h >= 10 ? '${h.round()} ชม.' : '${h.toStringAsFixed(1)} ชม.';
  }

  // ============ รายวันทั้งเดือน ============

  /// รายการรายวัน — sliver แยก Obx ของตัวเอง สร้างแถวเฉพาะที่เห็นในจอ
  Widget _dailySliver() => Obx(() {
    if (controller.rangeLoading.value) {
      return SliverToBoxAdapter(
        child: _Shimmer(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                for (var i = 0; i < 4; i++) ...[
                  _Skel(height: 64, radius: 16, onPanel: true, phase: i * 0.09),
                  const SizedBox(height: 8),
                ],
              ],
            ),
          ),
        ),
      );
    }
    // อ่านครั้งเดียวต่อ build — getter นี้ filter + sort ทุกครั้งที่เรียก ห้ามเรียกใน itemBuilder
    final rows = controller.dailyRows;
    if (rows.isEmpty) {
      return SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Column(
            children: [
              Icon(PhosphorIconsRegular.tray, size: 28, color: _D.onPanel(0.5)),
              const SizedBox(height: 8),
              Text(
                'ไม่มีรายการในช่วงนี้',
                style: _D.body(size: 12.5, color: _D.onPanel(0.8)),
              ),
            ],
          ),
        ),
      );
    }
    // การ์ดใบเดียวคลุมทั้งลิสต์ แถวคั่นด้วยเส้น — อ่านเทียบเวลาข้ามวันได้เพราะคอลัมน์ตรงกัน
    // (การ์ดแยกใบต่อวันทำให้ตาต้องกระโดดข้ามช่องไฟทุกแถว)
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      sliver: DecoratedSliver(
        decoration: BoxDecoration(
          color: _D.card,
          borderRadius: BorderRadius.circular(16),
        ),
        sliver: SliverMainAxisGroup(
          slivers: [
            SliverToBoxAdapter(child: _dayTableHead()),
            SliverList.builder(
              itemCount: rows.length,
              itemBuilder: (context, i) =>
                  _dayRow(rows[i], last: i == rows.length - 1),
            ),
          ],
        ),
      ),
    );
  });

  /// ความกว้างคอลัมน์ — หัวตารางกับทุกแถวต้องอ่านค่าชุดเดียวกัน ไม่งั้นเลื่อนไม่ตรง
  static double get _colDate => _D.box(46);
  static double get _colRight => _D.box(104);
  static const double _colBar = 13; // แถบสถานะ 3 + ช่องไฟ 10
  static const double _rowPad = 12;

  Widget _dayTableHead() => Padding(
    padding: const EdgeInsets.fromLTRB(_rowPad, 10, _rowPad, 10),
    child: Row(
      children: [
        SizedBox(width: _colBar + _colDate, child: _headCell('วันที่')),
        Expanded(child: _headCell('เข้า - ออก')),
        SizedBox(
          width: _colRight,
          child: _headCell('ชั่วโมง · สถานะ', end: true),
        ),
      ],
    ),
  );

  Widget _headCell(String s, {bool end = false}) => Text(
    s,
    textAlign: end ? TextAlign.right : TextAlign.left,
    style: _D.tech(
      size: 10.5,
      weight: FontWeight.w600,
      color: _D.muted,
      spacing: 0.3,
    ),
  );

  Widget _dayRow(Map<String, dynamic> r, {required bool last}) {
    final today = controller.isToday(r);
    final inT = '${r['in'] ?? ''}';
    final outT = '${r['out'] ?? ''}';
    final date = DateTime.tryParse('${r['date']}');
    final tags = _tags(r); // สร้างครั้งเดียว — เดิมเรียกซ้ำตอนเช็คว่าง
    final mins = controller.workedMinutes(r);
    final Color dotC = r['no_out'] == true || r['out_area'] == true
        ? _D.bad
        : r['early'] == true
        ? _D.info
        : r['late'] == true
        ? _D.warn
        : _D.ok;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(_rowPad, 12, _rowPad, 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 3,
                height: _D.box(34),
                decoration: BoxDecoration(
                  color: dotC,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 10),
              SizedBox(
                width: _colDate,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${date?.day ?? '-'}',
                      style: _D.num(
                        size: 18,
                        weight: FontWeight.w800,
                        color: today ? _D.accentActive : _D.ink,
                      ),
                    ),
                    Text(
                      // ใช้ date ที่ parse ไว้แล้ว — weekdayOf() parse สตริงซ้ำอีกรอบต่อแถว
                      date == null
                          ? ''
                          : DashboardController.weekdayNames[date.weekday - 1],
                      style: _D.body(
                        size: 10.5,
                        color: today ? _D.accent : _D.muted,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        _timeCell(inT),
                        Text(' - ', style: _D.body(size: 12, color: _D.faint)),
                        _timeCell(outT),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      inT.isEmpty ? 'ไม่มีการลงเวลา' : _shiftName(inT),
                      style: _D.body(size: 11, color: _D.muted),
                    ),
                  ],
                ),
              ),
              SizedBox(
                width: _colRight,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      mins > 0
                          ? '${mins ~/ 60}:${(mins % 60).toString().padLeft(2, '0')} ชม.'
                          : '—',
                      style: _D.num(
                        size: 13.5,
                        weight: FontWeight.w700,
                        color: mins > 0 ? _D.ink : _D.faint,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Wrap(
                      alignment: WrapAlignment.end,
                      spacing: 4,
                      runSpacing: 4,
                      children: [
                        if (today) _todayChip(),
                        ...tags,
                        if (tags.isEmpty && !today) _okChip(),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (tags.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(
              _rowPad + _colBar,
              0,
              _rowPad,
              12,
            ),
            child: _fixNote(r, inT),
          ),
        // เส้นคั่นเว้นขอบเท่า padding แถว — ลากชนขอบการ์ดจะดูเหมือนตารางถูกหั่นเป็นท่อน
        if (!last)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: _rowPad),
            child: Container(height: 1, color: _D.hairline),
          ),
      ],
    );
  }

  Widget _timeCell(String v) => Text(
    v.isEmpty ? '--:--' : v,
    style: _D.num(
      size: 14,
      weight: FontWeight.w700,
      color: v.isEmpty ? _D.faint : _D.ink,
    ),
  );

  Widget _todayChip() => _chip('วันนี้', _D.wash, _D.accentActive);
  Widget _okChip() => _chip('ปกติ', _D.rowBg, _D.muted);

  Widget _chip(String label, Color bg, Color fg) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(100),
    ),
    child: Text(
      label,
      style: _D.body(size: 10, weight: FontWeight.w700, color: fg),
    ),
  );

  /// รายการที่ผิดปกติต้องบอกให้ครบว่า "เวรไหน เวลาเท่าไหร่ ผิดยังไง แล้วต้องทำอะไรต่อ"
  /// ระบบยังไม่มี API ขอแก้ไขเวลา — บอกช่องทางติดต่อจริงแทนปุ่มที่กดแล้วไม่เกิดอะไร
  Widget _fixNote(Map<String, dynamic> r, String inT) {
    final shift = inT.isEmpty ? 'เวร' : _shiftName(inT);
    final outT = '${r['out'] ?? ''}';
    final why = <String>[
      if (r['no_out'] == true)
        '$shift วันนี้มีเวลาเข้า $inT แต่ไม่มีเวลาออก ระบบคำนวณชั่วโมงทำงานไม่ได้',
      if (r['late'] == true) 'สแกนเข้า $inT ซึ่งช้ากว่าเวลาเริ่ม$shift',
      if (r['early'] == true) 'สแกนออก $outT ซึ่งเร็วกว่าเวลาเลิก$shift',
      if (r['out_area'] == true) 'จุดที่สแกนอยู่นอกพื้นที่ที่กำหนดไว้',
    ];
    if (why.isEmpty) return const SizedBox.shrink();
    final contact = controller.settings.contactMsg.value.trim();
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _D.rowBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(PhosphorIconsRegular.info, size: 14, color: _D.muted),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final w in why)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: Text(w, style: _D.body(size: 11, color: _D.sub)),
                  ),
                const SizedBox(height: 2),
                Text(
                  contact.isEmpty
                      ? 'ขอแก้ไขเวลาได้ที่หัวหน้าเวรหรือฝ่ายบุคคล'
                      : 'ขอแก้ไขเวลา: $contact',
                  style: _D.body(
                    size: 11,
                    weight: FontWeight.w600,
                    color: _D.accentActive,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _tags(Map<String, dynamic> r) {
    final tags = <(String, (Color, Color))>[
      if (r['late'] == true) ('สาย', _D.bLate),
      if (r['early'] == true) ('ออกก่อนเวลา', _D.bEarly),
      if (r['no_out'] == true) ('ลืมออกเวร', _D.bNoOut),
      if (r['out_area'] == true) ('นอกพื้นที่', _D.bOutArea),
    ];
    return [
      for (final (label, c) in tags)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: c.$1,
            borderRadius: BorderRadius.circular(100),
          ),
          child: Text(
            label,
            style: _D.body(size: 10, weight: FontWeight.w600, color: c.$2),
          ),
        ),
    ];
  }
}

// ============ การ์ด "การสแกนของวันนี้" ============

/// เวรจากเวลาเข้า — ข้อมูลลงเวลายังไม่ส่งชื่อเวรมาด้วย จึงอนุมานจากช่วงเวลา
String _shiftName(String hhmm) {
  final h = int.tryParse(hhmm.split(':').first) ?? 8;
  if (h < 12) return 'เวรเช้า';
  if (h < 18) return 'เวรบ่าย';
  return 'เวรดึก';
}

/// สีอ่อนประจำเวร — ใช้ไล่เฉดมุมขวาบนการ์ดและเป็นพื้นฉากที่วาดเอง
Color _shiftTint(String hhmm) {
  final h = int.tryParse(hhmm.split(':').first) ?? 8;
  if (h < 12) return const Color(0xFFCFE3FB); // เช้า ฟ้า
  if (h < 18) return const Color(0xFFFFE3BE); // บ่าย ครีม
  return const Color(0xFFD6CCE6); // ดึก ม่วง
}

/// สีชิปเวร — ชุดเดียวกับ web app FaceEnroll (.chip เช้า/บ่าย/ดึก)
/// เช้า ฟ้าอ่อน · บ่าย ครีม · ดึก เทาน้ำเงิน — พื้นอ่อน ตัวอักษรเข้ม ไม่ใช่พื้นทึบตัวขาว
(Color, Color) _shiftChipColors(String hhmm) {
  final h = int.tryParse(hhmm.split(':').first) ?? 8;
  if (h < 12) return (const Color(0xFFD7E8F6), const Color(0xFF404D8C));
  if (h < 18) return (const Color(0xFFFFF0D9), const Color(0xFF8C591A));
  return (const Color(0xFFD4DDE9), const Color(0xFF263873));
}

Widget _pill(String text, Color bg, {Color fg = Colors.white}) => Container(
  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
  decoration: BoxDecoration(
    color: bg,
    borderRadius: BorderRadius.circular(100),
  ),
  child: Text(
    text,
    style: _D.body(size: 10.5, weight: FontWeight.w600, color: fg),
  ),
);

/// ชิปเวรบนการ์ดวันนี้ — ใช้สีตามเวรแบบเดียวกับเว็บ
Widget _shiftPill(String hhmm) {
  final (bg, fg) = _shiftChipColors(hhmm);
  return _pill(_shiftName(hhmm), bg, fg: fg);
}

/// การ์ดสถานะวันนี้ — ปัดซ้าย/ขวาดูเวรอื่นของวันเดียวกัน มี dot บอกว่ามีกี่เวรและอยู่เวรไหน
class _TodayCard extends StatefulWidget {
  const _TodayCard({required this.shifts});

  final List<Map<String, dynamic>> shifts;

  @override
  State<_TodayCard> createState() => _TodayCardState();
}

class _TodayCardState extends State<_TodayCard>
    with SingleTickerProviderStateMixin {
  /// ไล่สีมุมขวาบนค่อย ๆ ขึ้นตอนการ์ดโผล่ — ครั้งเดียว ไม่วน
  late final AnimationController _intro = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 700),
  )..forward();

  /// PageView ต้องการความสูงคงที่ — หัวเรื่อง ~28 + ระยะ 16 + แผ่นขาว (12 + การ์ดสแกน 84 + 12) + เผื่อ 8
  /// (ตัวเนื้อหาห่อ scroll ไว้อีกชั้น เผื่อฟอนต์/ตัวอักษรใหญ่กว่าที่เผื่อไว้ จะได้เลื่อนแทนที่จะล้น)
  static double get _pageH => _D.box(160);

  final _pc = PageController();
  int _page = 0;

  @override
  void didUpdateWidget(covariant _TodayCard old) {
    super.didUpdateWidget(old);
    // จำนวนเวรลดลง (เปลี่ยนเดือน/รีเฟรช) — กันหน้าค้างเกินขอบ
    final maxPage = (widget.shifts.isEmpty ? 1 : widget.shifts.length) - 1;
    if (_page > maxPage && _pc.hasClients) {
      _page = maxPage;
      _pc.jumpToPage(maxPage);
    }
  }

  @override
  void dispose() {
    _intro.dispose();
    _pc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // ยังไม่ลงเวลาเลย = หน้าว่างหนึ่งหน้า
    final pages = widget.shifts.isEmpty
        ? <Map<String, dynamic>?>[null]
        : widget.shifts;
    // เวรของหน้าที่กำลังดู — คุมทั้งภาพประกอบและ badge ที่อยู่แถวบนสุดของการ์ด
    final current = pages[_page.clamp(0, pages.length - 1)];
    final currentIn = '${current?['in'] ?? ''}';
    final tint = _shiftTint(currentIn).withValues(alpha: _D.dark ? 0.22 : 0.95);
    return AnimatedBuilder(
      animation: _intro,
      // ตัวการ์ดไม่ต้องสร้างใหม่ทุกเฟรม ส่งเป็น child ให้ AnimatedBuilder ถือไว้
      child: _cardBody(currentIn, pages),
      builder: (context, child) {
        final v = Curves.easeOutCubic.transform(_intro.value);
        return AnimatedContainer(
          // เปลี่ยนเวร (ปัดหน้า) แล้วสีไล่ไปหาสีใหม่ ไม่กระโดด
          duration: const Duration(milliseconds: 450),
          curve: Curves.easeOut,
          // ไม่มี padding ที่การ์ด — แผ่นขาวส่วนล่างต้องกว้างชนขอบการ์ด
          // ส่วนบนเว้นระยะเองด้วย Padding
          decoration: BoxDecoration(
            color: _D.card,
            // ไล่สีของเวรจากมุมขวาบนจางลงเป็นสีการ์ด — ให้ฉากที่วาดไว้มุมนั้นมีท้องฟ้ารองรับ
            // radial ไม่ใช่ linear เพราะต้องการให้จางหมดก่อนถึงกลางการ์ด ไม่ไปแย่งตัวหนังสือ
            gradient: RadialGradient(
              center: const Alignment(0.95, -1.1),
              radius: 1.15,
              colors: [Color.lerp(_D.card, tint, v)!, _D.card],
              stops: const [0, 0.72],
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: _D.hairline),
          ),
          child: child,
        );
      },
    );
  }

  Widget _cardBody(String currentIn, List<Map<String, dynamic>?> pages) {
    return Stack(
      children: [
        // ภาพประกอบมุมขวาบน — เปลี่ยนตามเวรที่เลือก
        // ไฟล์ทั้ง 3 อยู่บน canvas ร่วม 246×176 (ฐานโดมที่ y=149) จึงสลับกันได้โดยไม่ขยับ
        // top 3 = ให้ฐานโดมตกที่ y76 เท่าเดิม (13 + 63 ของสเปก Figma)
        Positioned(
          top:
              25, // ดันลงล่าง — ส่วนที่ทับการ์ดสแกนถูกการ์ดบังไว้อยู่แล้ว (วาดก่อน Column)
          right: 34, // Figma: ห่างขอบขวาการ์ด 34
          child: Opacity(
            opacity: _D.dark ? 0.35 : 1,
            // วาดเองแทน PNG — ดวงอาทิตย์ต้องเคลื่อนข้ามโดม เมฆต้องค่อยประกอบร่าง
            // ภาพ raster แยกชิ้นไม่ได้ ต้องเป็นรูปทรงที่วาดเองถึงขยับทีละชิ้นได้
            child: _ShiftScene(
              hhmm: currentIn,
              width: _D.sp(150),
              height: _D.sp(86),
            ),
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // แถวบนสุด: label ซ้าย · badge เวรขวา (ชิดบนตาม Figma items-start)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      'การสแกนของวันนี้',
                      style: _D.body(size: 12, color: _D.muted),
                    ),
                  ),
                  if (currentIn.isNotEmpty) _shiftPill(currentIn),
                ],
              ),
            ),
            SizedBox(
              height: _pageH,
              child: PageView.builder(
                controller: _pc,
                itemCount: pages.length,
                onPageChanged: (i) => setState(() => _page = i),
                itemBuilder: (context, i) => SingleChildScrollView(
                  physics: const ClampingScrollPhysics(),
                  child: _shiftPage(pages[i], i),
                ),
              ),
            ),
            if (pages.length > 1) ...[
              _dots(pages.length),
              const SizedBox(height: 12),
            ],
          ],
        ),
      ],
    );
  }

  Widget _shiftPage(Map<String, dynamic>? r, int index) {
    final inT = '${r?['in'] ?? ''}';
    final outT = '${r?['out'] ?? ''}';
    final hasIn = inT.isNotEmpty;
    final hasOut = outT.isNotEmpty;

    final (String headline, Color headColor) = switch (r) {
      null => ('ยังไม่ลงเวลา', _D.muted),
      _ when r['no_out'] == true => ('ลืมออกเวร', _D.bad),
      _ when r['late'] == true => ('เข้างานสาย', _D.warn),
      _ when r['early'] == true => ('ออกก่อนเวลา', _D.info),
      _ when !hasOut => ('กำลังเข้าเวร', _D.accent),
      _ => ('เข้างานปกติ', _D.ok),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ไม่ต้องเว้นระยะเอง — สองบรรทัดนี้มีช่องว่างจาก line-height ของฟอนต์อยู่แล้ว
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              headline,
              style: _D.tech(
                size: 20,
                weight: FontWeight.w600,
                color: headColor,
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        // แผ่นทึบคลุมการ์ดสแกน — แยกสถานะด้านบนออกจากเวลาด้านล่าง (Figma 606:12591)
        // กว้างชนขอบการ์ด มุมโค้ง 24 เท่ากัน ท่อนล่างของไล่สีเวรจึงถูกบังไว้ทั้งแถบ
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: _D.card,
            borderRadius: BorderRadius.circular(24),
          ),
          child: _ScanTiles(
            inTime: inT,
            outTime: outT,
            inColor: hasIn ? (r?['late'] == true ? _D.warn : _D.ok) : _D.muted,
            outColor: hasOut
                ? (r?['early'] == true ? _D.info : _D.ok)
                : _D.muted,
          ),
        ),
      ],
    );
  }

  Widget _dots(int count) => Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      for (var i = 0; i < count; i++)
        AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
          margin: const EdgeInsets.symmetric(horizontal: 2),
          width: i == _page ? 18 : 6,
          height: 6,
          decoration: BoxDecoration(
            color: i == _page ? _D.accent : _D.hairline,
            borderRadius: BorderRadius.circular(100),
          ),
        ),
    ],
  );
}

/// การ์ดสแกนเข้า/ออก วางคู่กัน (Figma 584:14302)
class _ScanTiles extends StatefulWidget {
  const _ScanTiles({
    required this.inTime,
    required this.outTime,
    required this.inColor,
    required this.outColor,
  });

  static double get _tileH => _D.box(84);

  final String inTime;
  final String outTime;
  final Color inColor;
  final Color outColor;

  @override
  State<_ScanTiles> createState() => _ScanTilesState();
}

class _ScanTilesState extends State<_ScanTiles> {
  @override
  Widget build(BuildContext context) => SizedBox(
    height: _ScanTiles._tileH,
    child: Row(
      children: [
        Expanded(
          child: _tile(
            'สแกนเข้า',
            widget.inTime,
            widget.inColor,
            'assets/images/scan_in.png',
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _tile(
            'สแกนออก',
            widget.outTime,
            widget.outColor,
            'assets/images/scan_out.png',
          ),
        ),
      ],
    ),
  );

  Widget _tile(String label, String time, Color timeColor, String art) =>
      Container(
        decoration: BoxDecoration(
          color: _D.rowBg,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Stack(
          clipBehavior: Clip
              .none, // ปล่อยให้ภาพล้นพ้นการ์ดได้ (Stack ตัดขอบเป็นค่าเริ่มต้น)
          children: [
            // ภาพประกอบล้นพ้นขอบล่างการ์ดนิดเดียว — เห็นเต็มตัว ไม่ถูกตัด
            Positioned(
              right: 0,
              bottom: 0,
              child: Image.asset(
                art,
                width: _D.sp(56),
                height: _D.sp(62),
                fit: BoxFit.contain,
                alignment: Alignment.bottomRight,
                cacheWidth: (_D.sp(56) * _D.dpr).round(),
                cacheHeight: (_D.sp(62) * _D.dpr).round(),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(label, style: _D.body(size: 12, color: _D.muted)),
                  const SizedBox(height: 8),
                  Text(
                    '${time.isEmpty ? '--:--' : time} น.',
                    style: _D.num(
                      size: 16,
                      weight: FontWeight.w700,
                      color: timeColor,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
}

/// กล่องโครงร่างสีเทา — กวาดแสง "ภายในกล่องตัวเอง" ไม่ใช่เส้นพาดทั้งจอ
class _Skel extends StatelessWidget {
  const _Skel({
    this.width,
    required this.height,
    this.radius = 8,
    this.phase = 0,
    this.onPanel = false,
  });

  final double? width;
  final double height;
  final double radius;

  /// วางบนแผงน้ำเงิน — เทาอ่อนจะดูเป็นรอยเปื้อน ใช้ขาวโปร่งแทน
  final bool onPanel;

  /// เหลื่อมจังหวะกวาดแสง 0..1 — ถ้าทุกกล่องเฟสตรงกัน แถบสว่างจะเรียงเป็นเส้นเดียวพาดทั้งจอ
  final double phase;

  @override
  Widget build(BuildContext context) {
    final t = _ShimmerScope.of(context)?.value ?? 0;
    final base = onPanel ? _D.onPanel(0.18) : _D.rowBg;
    final highlight = onPanel
        ? _D.onPanel(0.34)
        : (_D.dark ? const Color(0xFF343A47) : Colors.white);
    // แถบสว่างวิ่งจากซ้ายไปขวาในขอบเขตของกล่องนี้เท่านั้น
    final c = ((t + phase) % 1.0) * 1.6 - 0.3;
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        gradient: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [base, highlight, base],
          stops: [
            (c - 0.3).clamp(0.0, 1.0),
            c.clamp(0.0, 1.0),
            (c + 0.3).clamp(0.0, 1.0),
          ],
        ),
      ),
    );
  }
}

/// หัวที่ตรึงไว้บนสุดของ CustomScrollView — ความสูงคงที่ ไม่ย่อ
class _ShimmerScope extends InheritedNotifier<Animation<double>> {
  const _ShimmerScope({
    required Animation<double> super.notifier,
    required super.child,
  });

  static Animation<double>? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_ShimmerScope>()?.notifier;
}

class _Shimmer extends StatefulWidget {
  const _Shimmer({required this.child});

  final Widget child;

  @override
  State<_Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<_Shimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      _ShimmerScope(notifier: _c, child: widget.child);
}

/// หัวตรึงความสูงคงที่ — [topGap] คือที่ว่างสำหรับ status bar ตอนตรึงถึงบนสุด
class _Sticky extends SliverPersistentHeaderDelegate {
  const _Sticky({
    required this.height,
    required this.topGap,
    required this.stuck,
    required this.child,
  });

  final double height;
  final double topGap;
  final bool stuck;
  final Widget child;

  /// ล้นขึ้นข้างบนนิดหน่อย — ตอนตรึง ขอบล่างหัวแอปกับขอบบนหัวนี้ตกลงคนละครึ่งพิกเซลจริง
  /// เหลือรอยบาง ๆ ให้เห็นการ์ดขาวข้างใต้ทะลุขึ้นมา ระบายเผื่อไว้ให้ทับรอยนั้น
  /// ตอนยังไม่ตรึงต้องไม่ล้น ไม่งั้นสีน้ำเงินเลยขอบบนแผงขึ้นไปทับแผ่นขาว
  static const double _bleedMax = 4;
  double get _bleed => stuck ? _bleedMax : 0;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlaps) =>
      RepaintBoundary(
        child: OverflowBox(
          alignment: Alignment.bottomCenter,
          minHeight: height + _bleed,
          maxHeight: height + _bleed,
          child: AnimatedContainer(
            // เงาค่อย ๆ มา ไม่ปรากฏพรวด ตอนเริ่มมีอะไรลอดใต้หัว
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOut,
            decoration: BoxDecoration(
              // ทึบเสมอ ไม่งั้นแถวรายวันเลื่อนลอดใต้หัวแล้วเห็นทะลุ
              color: _D.panel,
              // หัวนี้คือขอบบนสุดของแผงน้ำเงิน — ต้องมนตามแผง
              // พอตรึงถึงขอบจอแล้วค่อยคลายเป็นเหลี่ยมให้เต็มความกว้างจริง
              borderRadius: stuck
                  ? BorderRadius.zero
                  : const BorderRadius.vertical(top: Radius.circular(24)),
              // เงาบอกว่าการ์ดข้างล่างลอดอยู่ใต้หัว ไม่ใช่ต่อกันเป็นแผ่นเดียว
              boxShadow: stuck
                  ? [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.18),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ]
                  : null,
            ),
            // ส่วนที่ล้นบวกเข้าที่ช่องบน แท็บจึงสูงเท่าเดิม ขีดใต้ไม่ขยับ
            child: Column(
              children: [
                SizedBox(height: topGap + _bleed),
                Expanded(child: child),
              ],
            ),
          ),
        ),
      );

  @override
  double get maxExtent => height;

  @override
  double get minExtent => height;

  @override
  // ไม่เทียบ child — SliverLayoutBuilder สร้าง widget ใหม่ทุกเฟรมที่เลื่อน
  // เทียบแล้วไม่มีทางตรง แท็บเลยรีบิลด์ทิ้งทุกเฟรมทั้งที่หน้าตาเหมือนเดิม
  // (ตัวแท็บเป็น Obx อยู่แล้ว เปลี่ยนช่วงเมื่อไหร่มันอัปเดตตัวเอง)
  bool shouldRebuild(_Sticky old) =>
      old.height != height || old.topGap != topGap || old.stuck != stuck;
}

/// วงกลมสถานะ — เวรเดียวระบายสีเดียว สองเวรผ่าครึ่งทแยงคนละสี
class _SplitDot extends CustomPainter {
  const _SplitDot(this.a, this.b);
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
  bool shouldRepaint(_SplitDot old) => old.a != a || old.b != b;
}

/// ฉากประจำเวรบนการ์ดวันนี้ — วาดเองทั้งหมดเพื่อให้ขยับทีละชิ้นได้
/// ดวงอาทิตย์/จันทร์ไต่ข้ามโดมช้า ๆ · เมฆค่อย ๆ ลอยมารวมกันเป็นก้อนตอนเปิดการ์ด
class _ShiftScene extends StatefulWidget {
  const _ShiftScene({
    required this.hhmm,
    required this.width,
    required this.height,
  });

  final String hhmm;
  final double width;
  final double height;

  @override
  State<_ShiftScene> createState() => _ShiftSceneState();
}

class _ShiftSceneState extends State<_ShiftScene>
    with TickerProviderStateMixin {
  /// ดวงอาทิตย์ไต่โดม — 18 วิต่อรอบ ช้าจนไม่รบกวนตอนอ่านตัวเลข แต่เห็นว่าขยับ
  late final AnimationController _sun = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 18),
  )..repeat(reverse: true);

  /// เมฆประกอบร่าง — เล่นครั้งเดียวตอนโผล่ และเล่นใหม่เมื่อสลับเวร
  late final AnimationController _form = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  )..forward();

  /// 0 = ดวงอาทิตย์เต็มดวง · 1 = พระจันทร์เสี้ยว — ค่อย ๆ แปลงร่างตอนสลับไปเวรดึก
  late final AnimationController _night = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 650),
    value: _isNight(widget.hhmm) ? 1 : 0,
  );

  static bool _isNight(String hhmm) =>
      (int.tryParse(hhmm.split(':').first) ?? 8) >= 18;

  @override
  void didUpdateWidget(covariant _ShiftScene old) {
    super.didUpdateWidget(old);
    if (_shiftName(old.hhmm) != _shiftName(widget.hhmm)) {
      _form.forward(from: 0);
      _night.animateTo(_isNight(widget.hhmm) ? 1 : 0, curve: Curves.easeInOut);
    }
  }

  @override
  void dispose() {
    _sun.dispose();
    _form.dispose();
    _night.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => RepaintBoundary(
    child: CustomPaint(
      size: Size(widget.width, widget.height),
      painter: _ShiftPainter(
        sun: _sun,
        form: CurvedAnimation(parent: _form, curve: Curves.easeOutBack),
        night: _night,
      ),
    ),
  );
}

class _ShiftPainter extends CustomPainter {
  _ShiftPainter({required this.sun, required this.form, required this.night})
    : super(repaint: Listenable.merge([sun, form, night]));

  final Animation<double> sun;
  final Animation<double> form;

  /// 0 = ดวงอาทิตย์ · 1 = พระจันทร์เสี้ยว (ค่ากลางคือกำลังแปลงร่าง)
  final Animation<double> night;

  // สีดูดมาจากไฟล์ภาพประกอบเดิม
  static const _sunColor = Color(0xFFFDAF32);
  static const _moonColor = Color(0xFFDCC8F5);

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final baseY = h * 0.97;
    final cx = w * 0.5;
    final orbR = w * 0.085;
    // เผื่อรัศมีดวง + แสงเรือง (1.7 เท่า) ไว้ทั้งสองข้าง ไม่งั้นตอนไต่ไปสุดขอบจะโดนตัด
    final margin = orbR * 1.7;
    // รัศมีโดม — กว้างที่สุดเท่าที่ดวงยังอยู่ในกรอบครบทั้งใบตลอดทาง
    final r = math.min(w * 0.46, math.min(w * 0.5, baseY) - margin);

    // ไม่วาดโดมแล้ว — พื้นหลังการ์ดที่ไล่สีจากมุมขวาบนทำหน้าที่เป็นท้องฟ้าแทน
    // โดมเหลือไว้เป็นแค่ "เส้นทาง" ที่ดวงอาทิตย์ไต่ (r, cx, baseY ด้านล่าง)

    // ดวงอาทิตย์/จันทร์ไต่จากซ้ายไปขวาตามขอบโดม แล้ววนใหม่
    // ไต่แค่ช่วงกลางของโดม แล้ววิ่งกลับ — ดวงอาทิตย์อยู่ในกรอบตลอด
    // ปล่อยให้วิ่งครบ 0→1 จะมีช่วงที่มันลับขอบฟ้าแล้วมุมนั้นว่างเปล่าเฉย ๆ
    final t = 0.15 + sun.value * 0.7;
    final a = math.pi * (1 - t); // pi → 0
    final orbC = Offset(cx + r * math.cos(a), baseY - r * math.sin(a));
    canvas.save();
    // ไม่ตัดที่เส้นฐานโดมแล้ว — ไม่ได้วาดพื้น/ขอบฟ้าไว้ ตัดแล้วดูเป็นดวงโดนเฉือนเฉย ๆ
    // (รัศมีโดมคุมไว้ให้ดวงอยู่ในกรอบครบทั้งใบตลอดทางแล้ว)
    final n = night.value;
    final orbColor = Color.lerp(_sunColor, _moonColor, n)!;
    canvas.drawCircle(
      orbC,
      orbR * 1.7,
      Paint()..color = orbColor.withValues(alpha: 0.18),
    );
    // วาดตัวดวงในเลเยอร์แยกแล้ว "เจาะ" ด้วย dstOut — เสี้ยวจึงโปร่งจริง
    // ไม่ต้องรู้ว่าพื้นหลังตรงนั้นสีอะไร (การ์ดไล่เฉดอยู่ ทาสีทับจะเห็นรอยต่อ)
    canvas
      ..saveLayer(Rect.fromCircle(center: orbC, radius: orbR * 1.2), Paint())
      ..drawCircle(orbC, orbR, Paint()..color = orbColor);
    if (n > 0.01) {
      // วงที่มาเจาะเลื่อนเข้ามาจากนอกดวง (2.1R) จนถึงตำแหน่งเสี้ยว (0.55R)
      canvas.drawCircle(
        orbC.translate(orbR * (2.1 - 1.55 * n), -orbR * 0.3 * n),
        orbR * 0.95,
        Paint()..blendMode = BlendMode.dstOut,
      );
    }
    canvas
      ..restore()
      ..restore();

    // เมฆ 3 ก้อนลอยเข้ามารวมกัน — p=0 กระจายและจาง · p=1 ประกอบร่างเสร็จ
    final p = form.value.clamp(0.0, 1.0);
    final cloud = Paint()..color = Colors.white.withValues(alpha: 0.92 * p);
    final base = Offset(w * 0.54, baseY - h * 0.13);
    const spread = [Offset(-1.6, 0.9), Offset(0, -1.4), Offset(1.7, 0.8)];
    const puffs = [
      (Offset(-0.20, 0.05), 0.135),
      (Offset(0.0, -0.10), 0.175),
      (Offset(0.21, 0.04), 0.145),
    ];
    for (var i = 0; i < puffs.length; i++) {
      final (rel, rr) = puffs[i];
      final off = Offset(
        rel.dx * w + spread[i].dx * w * 0.28 * (1 - p),
        rel.dy * h + spread[i].dy * h * 0.24 * (1 - p),
      );
      canvas.drawCircle(base + off, w * rr * (0.55 + 0.45 * p), cloud);
    }
    // ฐานเมฆแบน ๆ เชื่อมก้อนให้เป็นก้อนเดียว
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: base + Offset(0, h * 0.09),
          width: w * 0.52 * p,
          height: h * 0.16,
        ),
        Radius.circular(h * 0.08),
      ),
      cloud,
    );
  }

  @override
  bool shouldRepaint(_ShiftPainter old) => false; // repaint ผูกกับ animation แล้ว
}
