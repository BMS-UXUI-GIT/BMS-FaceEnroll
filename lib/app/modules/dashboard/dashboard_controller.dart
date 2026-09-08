import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../services/api_service.dart';
import '../../services/demo_attendance.dart';
import '../../services/settings_service.dart';
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
/// ชั้นสีในแท่งภาพรวม — ตรงกับชิป legend หนึ่งต่อหนึ่ง (กดปิดได้ทีละชั้น)
enum Series { ok, late, early, bad, none }

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
      ? '${a.day} ถึง ${b.day} ${thaiMonthShort(a.month)}'
      : '${a.day} ${thaiMonthShort(a.month)} ถึง ${b.day} ${thaiMonthShort(b.month)}';

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
        return '${thaiMonthShort(1)} ถึง ${thaiMonthShort(12)} ${month.value.year + 543}';
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
    // วันที่ยังมาไม่ถึงไม่ใช่รายการค้าง — เดือนที่กำลังดูมีวันในอนาคตได้
    final today = todayKey;
    final list = monthRows
        .where(
          (r) =>
              (r['no_out'] == true ||
                  r['out_area'] == true ||
                  r['no_in'] == true) &&
              !isToday(r) &&
              '${r['date']}'.compareTo(today) < 0,
        )
        .toList();
    list.sort((a, b) => '${b['date']}'.compareTo('${a['date']}'));
    return list;
  }

  /// แถวที่ผิดปกติ — ใช้ทั้งตัวกรองรายวันและนับจำนวนบนชิป
  bool isIssue(Map<String, dynamic> r) =>
      r['late'] == true ||
      r['early'] == true ||
      r['no_in'] == true ||
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
          return '$s ถึง $e ${thaiMonthShort(first.month)}';
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
      r['no_in'] == true || r['no_out'] == true || r['out_area'] == true
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
