import 'package:geolocator/geolocator.dart';

import '../config/demo_mode.dart';
import '../models/face_template_model.dart';
import 'api_service.dart';
import 'demo_attendance.dart';
import 'settings_service.dart';

/// ตัวเดียวที่ binding เรียก — เดโมได้ตัวปลอม, build มือถือได้ตัวจริง
/// (kDemoBuild เป็น const false บนมือถือ กิ่งเดโมจึงถูกตัดทิ้งตอน compile)
ApiService buildApiService(SettingsService settings) =>
    kDemoBuild ? DemoApiService(settings) : ApiService(settings);

/// ApiService ปลอมสำหรับเว็บเดโม — ตอบจากข้อมูลจำลองล้วน ไม่ยิง request ออกไปไหนเลย
///
/// สืบทอด ApiService แล้ว override ทุกเมธอด เพื่อไม่ให้มี http.Client ตัวจริงถูกเรียก
/// (แทนที่ทาง binding เมื่อ kDemoBuild — build มือถือยังใช้ตัวจริงเหมือนเดิม)
class DemoApiService extends ApiService {
  DemoApiService(super.settings);

  /// หน่วงให้เห็น loading state เหมือนคุยกับเซิร์ฟเวอร์จริง
  static Future<void> _wait([int ms = 450]) =>
      Future<void>.delayed(Duration(milliseconds: ms));

  static const _empId = 'DEMO001';
  static const _name = 'สมชาย ใจดี';
  static const _position = 'พยาบาลวิชาชีพ';
  static const _subjectId = 'demo-subject-0001';

  static final _hospitals = <Hospital>[
    Hospital(hcode: '99999', name: 'โรงพยาบาลตัวอย่าง (เดโม)'),
    Hospital(hcode: '10670', name: 'โรงพยาบาลบ้านหมี่'),
    Hospital(hcode: '11289', name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านโคก'),
  ];

  @override
  Future<List<Hospital>> getHospitals(String q, {int limit = 300}) async {
    await _wait(250);
    if (q.isEmpty) return _hospitals;
    return _hospitals
        .where((h) => h.name.contains(q) || h.hcode.contains(q))
        .toList();
  }

  /// เดโม: ใส่อะไรก็ผ่าน (ไม่มีการตรวจรหัสผ่าน และไม่มีรหัสผ่านถูกส่งไปไหน)
  @override
  Future<LoginResult> login(
    String hcode,
    String loginname,
    String password,
  ) async {
    await _wait(700);
    if (loginname.trim().isEmpty) {
      return LoginResult(ok: false, message: 'กรอกชื่อผู้ใช้ก่อน');
    }
    return LoginResult(ok: true, empId: _empId, name: _name);
  }

  @override
  Future<MatchResponse> match(String base64Image) async {
    await _wait(900);
    return MatchResponse(
      matched: true,
      matchedAt: DateTime.now().toIso8601String(),
      result: MatchResult(
        subjectId: _subjectId,
        metadata: const {
          'emp_id': _empId,
          'name': _name,
          'position': _position,
        },
        score: 0.93,
      ),
    );
  }

  @override
  Future<RegisterResponse> register({
    required Map<String, dynamic> metadata,
    required List<String> images,
    String? subjectId,
    bool saveImage = true,
  }) async {
    await _wait(1200);
    return RegisterResponse(
      subjectId: subjectId ?? _subjectId,
      faceIds: List<int>.generate(images.length, (i) => i + 1),
    );
  }

  @override
  Future<DoorEnrollResponse> doorEnroll({
    required MatchResult person,
    int? empShiftId,
    Position? position,
    String? gpsPlace,
    int enrollType = 1,
  }) async {
    await _wait(800);
    final out = enrollType == 3;
    return DoorEnrollResponse(
      messageCode: 200,
      message: out ? 'ลงเวลาออกงานเรียบร้อย' : 'ลงเวลาเข้างานเรียบร้อย',
      inOutType: out ? 'O' : 'I',
      subjectId: person.subjectId,
      statusId: 1,
      statusName: 'ตรงเวลา',
      diffMinute: 0,
    );
  }

  @override
  Future<Map<String, dynamic>> myAttendance({
    int days = 30,
    String? month,
  }) async {
    await _wait(600);
    final now = DateTime.now();
    final DateTime from, to;
    if (month != null) {
      final parts = month.split('-');
      final y = int.tryParse(parts.first) ?? now.year;
      final m = parts.length > 1
          ? (int.tryParse(parts[1]) ?? now.month)
          : now.month;
      from = DateTime(y, m);
      to = DateTime(y, m + 1, 0);
    } else {
      to = DateTime(now.year, now.month, now.day);
      from = to.subtract(Duration(days: days - 1));
    }
    final rows = demoAttendanceRows(from, to, until: now);
    var present = 0, late = 0, noOut = 0;
    final seen = <String>{};
    for (final r in rows) {
      if (seen.add('${r['date']}')) present++;
      if (r['late'] == true) late++;
      if (r['no_out'] == true) noOut++;
    }
    return {
      'rows': rows,
      'stat': {'present': present, 'late': late, 'no_out': noOut},
    };
  }

  @override
  Future<Map<String, dynamic>?> getPolicy() async => null; // ใช้ค่าตั้งต้นในเครื่อง

  @override
  Future<List<EmpShift>> getShifts() async {
    await _wait(300);
    return [
      EmpShift(id: 1, name: 'เวรเช้า', timeStart: '08:00', timeEnd: '16:00'),
      EmpShift(id: 2, name: 'เวรบ่าย', timeStart: '16:00', timeEnd: '00:00'),
      EmpShift(id: 3, name: 'เวรดึก', timeStart: '00:00', timeEnd: '08:00'),
    ];
  }

  @override
  Future<String> getProfile(String empId) async {
    await _wait(200);
    return _position;
  }

  // แจ้งเตือนภายนอก: เดโมไม่ยิงจริง
  @override
  Future<void> sendBmsNotification({
    required String name,
    String position = '',
    required String token,
  }) async {}

  @override
  Future<void> sendTelegramNotification({
    required String botToken,
    required String chatId,
    required String name,
    String position = '',
  }) async {}

  @override
  Future<List<String>> findSubjectIdsByEmpId(String empId) async {
    await _wait(300);
    return [_subjectId]; // เดโมถือว่าลงทะเบียนใบหน้าไว้แล้ว
  }

  @override
  Future<bool> deleteSubject(String subjectId) async {
    await _wait(300);
    return true;
  }

  @override
  Future<bool> checkStatus() async => true;

  @override
  void dispose() {}
}
