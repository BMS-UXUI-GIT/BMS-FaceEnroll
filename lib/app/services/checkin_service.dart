import 'dart:convert';

import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/checkin.dart';

/// สถานะลงเวลา "วันนี้" + เวร — เก็บ local ทั้งหมด (ไม่แตะ DB, ไม่ต้องย้อนหลัง)
/// รองรับควบเวร: หลาย session/วัน + เข้า-ออกคนละกะได้ (เข้าเช้า ออกบ่าย)
class CheckinService extends GetxService {
  static const _kDate = 'checkin_date';
  static const _kSessions = 'checkin_sessions';
  static const _kShifts = 'shifts_cache';

  static const int lateGraceMin = 0; // ผ่อนผันสายกี่นาที (0 = เป๊ะ) — ปรับได้

  late SharedPreferences _prefs;
  final sessions = <CheckinSession>[].obs; // ของวันนี้ (ล้างเมื่อข้ามวัน)
  final shifts = <Shift>[].obs; // master list (เก็บตอน login)

  Future<CheckinService> init() async {
    _prefs = await SharedPreferences.getInstance();
    _loadShifts();
    _loadToday();
    return this;
  }

  // ---------- วันนี้ ----------
  String get _todayStr {
    final n = DateTime.now();
    return '${n.year}-${n.month.toString().padLeft(2, '0')}-${n.day.toString().padLeft(2, '0')}';
  }

  void _loadToday() {
    if (_prefs.getString(_kDate) != _todayStr) {
      sessions.clear(); // วันใหม่ = เริ่มใหม่
      return;
    }
    final raw = _prefs.getString(_kSessions);
    if (raw == null) return;
    final list = (jsonDecode(raw) as List).map(
      (e) => Map<String, dynamic>.from(e as Map),
    );
    sessions.assignAll(list.map(CheckinSession.fromJson));
  }

  Future<void> _persist() async {
    await _prefs.setString(_kDate, _todayStr);
    await _prefs.setString(
      _kSessions,
      jsonEncode(sessions.map((s) => s.toJson()).toList()),
    );
  }

  // ---------- บันทึก punch ----------
  /// เข้างาน: เปิด session ใหม่ (เลือกเวรตอนเข้า — null = ไม่มีเวร)
  /// lateMin: นาทีสายจากเซิร์ฟเวอร์ (null = ไม่รู้ -> การ์ดคำนวณเองจากเวร)
  Future<void> recordIn(Shift? shift, String isoTime, {int? lateMin}) async {
    sessions.add(
      CheckinSession(inShift: shift, inTime: isoTime, lateMin: lateMin),
    );
    sessions.refresh();
    await _persist();
  }

  /// ออกงาน: ปิด session ที่เปิดอยู่ (เลือกเวรตอนออกได้ต่างจากตอนเข้า — null = ไม่มีเวร)
  /// ถ้าไม่มี session เปิด (เผลอไม่ได้สแกนเข้า) → สร้าง session ที่มีแต่ออก
  /// autoOut = ระบบสแตมป์ออกให้เอง (ควบเวร) ไม่ใช่คนสแกนออก
  Future<void> recordOut(
    Shift? shift,
    String isoTime, {
    int? earlyMin,
    bool autoOut = false,
  }) async {
    CheckinSession? open;
    for (final s in sessions.reversed) {
      if (s.isOpen) {
        open = s;
        break;
      }
    }
    if (open == null) {
      open = CheckinSession();
      sessions.add(open);
    }
    open.outShift = shift;
    open.outTime = isoTime;
    open.earlyMin = earlyMin;
    open.autoOut = autoOut;
    sessions.refresh();
    await _persist();
  }

  // ---------- สถานะไว้ให้ home ----------
  /// session ที่ active = อันที่ยังเปิดอยู่ (ไม่งั้น = อันล่าสุด)
  CheckinSession? get activeSession {
    for (final s in sessions.reversed) {
      if (s.isOpen) return s;
    }
    return sessions.isNotEmpty ? sessions.last : null;
  }

  /// ปุ่มถัดไปควรเป็น 'in' หรือ 'out' (มี session เปิด = ต่อไปคือออก)
  String get nextAction => sessions.any((s) => s.isOpen) ? 'out' : 'in';

  // ---------- เวร ----------
  Future<void> setShifts(List<Shift> list) async {
    shifts.assignAll(list);
    await _prefs.setString(
      _kShifts,
      jsonEncode(list.map((s) => s.toJson()).toList()),
    );
  }

  void _loadShifts() {
    final raw = _prefs.getString(_kShifts);
    if (raw == null) return;
    final list = (jsonDecode(raw) as List).map(
      (e) => Map<String, dynamic>.from(e as Map),
    );
    shifts.assignAll(list.map(Shift.fromJson));
  }

  /// เวรที่ใกล้เวลาปัจจุบันสุด — เป็นค่าเริ่มต้นตอนเลือกใน confirm popup
  Shift? get nearestShift {
    if (shifts.isEmpty) return null;
    final now = _nowSec();
    Shift? best;
    int bestDiff = 1 << 30;
    for (final s in shifts) {
      final st = _toSec(s.timeStart);
      if (st == null) continue;
      final d = (now - st).abs();
      if (d < bestDiff) {
        bestDiff = d;
        best = s;
      }
    }
    return best ?? shifts.first;
  }

  // ---------- สาย / ก่อนเวลา — ค่าจากเซิร์ฟเวอร์ก่อน (ถ้ามี) ไม่งั้นเทียบเวรเอง ----------
  bool isLate(CheckinSession s) {
    if (s.lateMin != null) return s.lateMin! > 0;
    final t = _toSec(_timeOf(s.inTime));
    final st = _toSec(s.inShift?.timeStart);
    if (t == null || st == null) return false;
    return t > st + lateGraceMin * 60;
  }

  bool isEarlyOut(CheckinSession s) {
    if (s.earlyMin != null) return s.earlyMin! > 0;
    final t = _toSec(_timeOf(s.outTime));
    final et = _toSec(s.outShift?.timeEnd);
    if (t == null || et == null) return false;
    return t < et;
  }

  /// สายกี่นาที (0 = ไม่สาย) — ใช้ค่าเซิร์ฟเวอร์ก่อน ไม่งั้นคำนวณจากเวร
  int lateMinutes(CheckinSession s) {
    if (s.lateMin != null) return s.lateMin!.clamp(0, 24 * 60);
    final t = _toSec(_timeOf(s.inTime));
    final st = _toSec(s.inShift?.timeStart);
    if (t == null || st == null || t <= st) return 0;
    return (t - st) ~/ 60;
  }

  /// ออกก่อนกี่นาที (0 = ไม่ก่อน)
  int earlyMinutes(CheckinSession s) {
    if (s.earlyMin != null) return s.earlyMin!.clamp(0, 24 * 60);
    final t = _toSec(_timeOf(s.outTime));
    final et = _toSec(s.outShift?.timeEnd);
    if (t == null || et == null || t >= et) return 0;
    return (et - t) ~/ 60;
  }

  // ---------- helpers ----------
  int _nowSec() {
    final n = DateTime.now();
    return n.hour * 3600 + n.minute * 60 + n.second;
  }

  /// "2026-06-29T08:05:00+07:00" -> "08:05:00"
  String? _timeOf(String? iso) {
    if (iso == null) return null;
    final i = iso.indexOf('T');
    if (i < 0) return iso;
    var t = iso.substring(i + 1);
    final m = RegExp(r'[+\-Z]').firstMatch(t);
    if (m != null && m.start > 0) t = t.substring(0, m.start);
    return t;
  }

  int? _toSec(String? hms) {
    if (hms == null) return null;
    final p = hms.split(':');
    if (p.isEmpty || int.tryParse(p[0]) == null) return null;
    final h = int.parse(p[0]);
    final m = p.length > 1 ? (int.tryParse(p[1]) ?? 0) : 0;
    final s = p.length > 2 ? (int.tryParse(p[2]) ?? 0) : 0;
    return h * 3600 + m * 60 + s;
  }

  /// แสดงเวลา HH:mm จาก ISO (ไว้โชว์การ์ด) — null = "--:--"
  static String hhmm(String? iso) {
    if (iso == null) return '--:--';
    final i = iso.indexOf('T');
    if (i < 0) return iso;
    final t = iso.substring(i + 1);
    return t.length >= 5 ? t.substring(0, 5) : t;
  }
}
