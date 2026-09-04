import 'dart:convert';

import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/face_template_model.dart';
import 'settings_service.dart';

/// คุยกับ 2 backend แยกกัน:
///   face-scan (Bearer apiKey): /match /register /health
///   attendance              : /{hcode}/login /{hcode}/?Data=DoorEnroll /shifts /profile
class ApiService {
  ApiService(this._settings, {http.Client? client}) : _client = client ?? http.Client();

  final SettingsService _settings;
  final http.Client _client;

  Duration get _timeout => Duration(milliseconds: _settings.requestTimeoutMs.value);

  Map<String, String> get _faceHeaders => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${ApiConfig.apiKey}',
  };

  // ---------- attendance: /hospitals (รายชื่อ รพ. ค้นหาได้ — dropdown ตอน login) ----------
  /// ค้นรายชื่อโรงพยาบาลจาก backend (q = เลข/ชื่อ contains) — global ไม่ต้องมี hcode
  Future<List<Hospital>> getHospitals(String q, {int limit = 300}) async {
    try {
      final url = Uri.parse('${ApiConfig.attendanceUrl}/hospitals?q=${Uri.encodeQueryComponent(q)}&limit=$limit');
      final res = await _client.get(url).timeout(_timeout);
      if (res.statusCode != 200) return [];
      final j = jsonDecode(res.body) as Map<String, dynamic>;
      return (j['hospitals'] as List<dynamic>? ?? []).map((e) => Hospital.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return []; // ค้นไม่ได้ = list ว่าง (ไม่ล้ม)
    }
  }

  // ---------- attendance: /{hcode}/login (พนักงาน login ด้วย HOSxP) ----------
  Future<LoginResult> login(String hcode, String loginname, String password) async {
    final url = Uri.parse('${ApiConfig.attendanceUrl}/$hcode/login');
    final body = {'loginname': loginname, 'password': password};
    final res = await _client
        .post(url, headers: {'Content-Type': 'application/json'}, body: jsonEncode(body))
        .timeout(_timeout);
    if (res.statusCode != 200) {
      return LoginResult(ok: false, message: 'เซิร์ฟเวอร์ตอบ ${res.statusCode}');
    }
    return LoginResult.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  // ---------- face-scan: /match ----------
  Future<MatchResponse> match(String base64Image) async {
    final url = Uri.parse(ApiConfig.faceScanUrl + ApiConfig.pathMatch);
    final body = {'hcode': _settings.hcode.value, 'base64': base64Image};
    final res = await _client.post(url, headers: _faceHeaders, body: jsonEncode(body)).timeout(_timeout);
    if (res.statusCode != 200) throw ApiException('face-scan ตอบ ${res.statusCode}');
    return MatchResponse.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  // ---------- face-scan: /register (ลงหลายรูปใน call เดียว; ตัวกลางออก subject_id) ----------
  Future<RegisterResponse> register({
    required Map<String, dynamic> metadata, // {emp_id, name}
    required List<String> images,
    String? subjectId, // มี = เพิ่มรูปให้คนเดิม / ไม่มี = ออก uuid ใหม่
    bool saveImage = true,
  }) async {
    final url = Uri.parse(ApiConfig.faceScanUrl + ApiConfig.pathRegister);
    final body = <String, dynamic>{
      'hcode': _settings.hcode.value,
      'metadata': metadata, // emp_id/ชื่อ — ตัวกลางเก็บ+คืน ไม่ตีความ
      'images': images,
      if (subjectId != null) 'subject_id': subjectId,
      'save_image': saveImage,
    };
    final res = await _client.post(url, headers: _faceHeaders, body: jsonEncode(body)).timeout(_timeout);
    if (res.statusCode != 200) throw ApiException('register ตอบ ${res.statusCode}: ${res.body}');
    return RegisterResponse.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  // ---------- attendance: /{hcode}/?Data=DoorEnroll (ลงเวลา staff) ----------
  Future<DoorEnrollResponse> doorEnroll({
    required MatchResult person,
    int? empShiftId,
    Position? position, // พิกัด GPS ตอนลงเวลา (logic ระบบเก่า) — null = ไม่ได้เปิด/ไม่ได้พิกัด
    String? gpsPlace, // ชื่อจุดลงเวลาที่พิกัดอยู่ในรัศมี (จาก geofence ของแอป) — backend เก็บลง emp_in_out.gps_place
    int enrollType = 1, // 1=legacy(auto) · 2=เข้างาน · 3=ออกงาน (ผู้ใช้เลือกจากหน้า home)
  }) async {
    final url = Uri.parse('${ApiConfig.attendanceUrl}/${_settings.hcode.value}${ApiConfig.pathDoorEnroll}');
    final body = <String, dynamic>{
      'EmployeeID': person.empId, // emp_id ที่ฝากใน metadata ตอนลงทะเบียน (pharm คีย์ด้วยตัวนี้)
      'EnrollDoorID': 1, // เลิกใช้ระบบจุดสแกนแล้ว — ส่งค่าคงที่ตามโครง pharm
      'EnrollTypeID': enrollType,
      if (position != null) 'EnrollDoorLatitude': '${position.latitude}',
      if (position != null) 'EnrollDoorLongitude': '${position.longitude}',
      // ความคลาดพิกัด (เมตร) — backend เก็บลง emp_in_out.gps_accuracy ให้ dashboard เผื่อ slack
      if (position != null && position.accuracy.isFinite && position.accuracy > 0)
        'gps_accuracy': position.accuracy.round(),
      if (position != null && gpsPlace != null && gpsPlace.isNotEmpty) 'gps_place': gpsPlace,
      if (empShiftId != null) 'emp_shift_id': empShiftId, // เวรที่เลือก
      if (person.subjectId.isNotEmpty) 'subject_id': person.subjectId, // echo เป็น audit
    };
    final res = await _client
        .post(url, headers: {'Content-Type': 'application/json'}, body: jsonEncode(body))
        .timeout(_timeout);
    if (res.statusCode != 200) throw ApiException('attendance ตอบ ${res.statusCode}');
    return DoorEnrollResponse.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  // ---------- attendance: ประวัติของฉัน ----------
  /// ประวัติ+สถิติของตัวเอง — เลือกเดือน (month="YYYY-MM") หรือย้อนหลัง N วัน
  Future<Map<String, dynamic>> myAttendance({int days = 30, String? month}) async {
    final emp = Uri.encodeComponent(_settings.empId.value);
    final range = month != null ? 'month=$month' : 'days=$days';
    final url = Uri.parse('${ApiConfig.attendanceUrl}/${_settings.hcode.value}/my-attendance?emp_id=$emp&$range');
    final res = await _client.get(url).timeout(const Duration(seconds: 60));
    if (res.statusCode != 200) throw ApiException('โหลดประวัติไม่สำเร็จ');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // ---------- attendance: /{hcode}/policy (ตั้งค่ากลางรายโรง จาก dashboard) ----------
  /// ดึง policy ของโรง — null = ดึงไม่ได้ (ใช้ค่าที่มีในเครื่องต่อ ไม่บล็อค)
  Future<Map<String, dynamic>?> getPolicy() async {
    try {
      final emp = Uri.encodeComponent(_settings.empId.value);
      final url = Uri.parse('${ApiConfig.attendanceUrl}/${_settings.hcode.value}/policy?emp_id=$emp');
      final res = await _client.get(url).timeout(_timeout);
      if (res.statusCode != 200) return null;
      final j = jsonDecode(res.body) as Map<String, dynamic>;
      // รองรับทั้ง {policy:{...}} และ {...} ตรงๆ
      return (j['policy'] as Map<String, dynamic>?) ?? j;
    } catch (_) {
      return null;
    }
  }

  // ---------- attendance: /{hcode}/shifts (ดึงเวรให้เลือกตอน confirm) ----------
  Future<List<EmpShift>> getShifts() async {
    try {
      final url = Uri.parse('${ApiConfig.attendanceUrl}/${_settings.hcode.value}/shifts');
      final res = await _client.get(url).timeout(_timeout);
      if (res.statusCode != 200) return [];
      final j = jsonDecode(res.body) as Map<String, dynamic>;
      return (j['shifts'] as List<dynamic>? ?? []).map((e) => EmpShift.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return []; // ดึงเวรไม่ได้ = ไม่บล็อกการลงเวลา
    }
  }

  // ---------- attendance: /{hcode}/profile (ตำแหน่งงาน ไว้โชว์บนจอ) ----------
  Future<String> getProfile(String empId) async {
    try {
      final url = Uri.parse('${ApiConfig.attendanceUrl}/${_settings.hcode.value}/profile?person_id=$empId');
      final res = await _client.get(url).timeout(_timeout);
      if (res.statusCode != 200) return '';
      final j = jsonDecode(res.body) as Map<String, dynamic>;
      return j['position_name']?.toString() ?? '';
    } catch (_) {
      return '';
    }
  }

  // ---------- BMS push notification (เด้งแจ้งตอนเช็คอิน) — fire-and-forget ----------
  Future<void> sendBmsNotification({required String name, String position = '', required String token}) async {
    if (token.isEmpty) return;
    final now = DateTime.now();
    final ts =
        '${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/'
        '${now.year + 543} ${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    // ไม่ใส่ emp_id ในข้อความแจ้งเตือน (อ่อนไหว) — โชว์แค่ ชื่อ/ตำแหน่ง/เวลา
    final content = '- **$name**\n- **$position**\n- **$ts น.**';
    try {
      await _client
          .post(
            Uri.parse(ApiConfig.notifyUrl),
            headers: {'Token': token, 'Content-Type': 'application/json'},
            body: jsonEncode({'content': content}),
          )
          .timeout(_timeout);
    } catch (_) {
      // แจ้งเตือนล้มเหลวไม่กระทบการลงเวลา
    }
  }

  // ---------- Telegram push (ยิงตรง Telegram Bot API — sendMessage เข้ากลุ่ม) ----------
  Future<void> sendTelegramNotification({
    required String botToken,
    required String chatId,
    required String name,
    String position = '',
  }) async {
    if (botToken.isEmpty || chatId.isEmpty) return;
    final now = DateTime.now();
    final ts =
        '${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/'
        '${now.year + 543} ${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    final pos = position.isNotEmpty ? '\n$position' : '';
    // ไม่ใส่ emp_id (อ่อนไหว) — ชื่อ/ตำแหน่ง/เวลา
    final text = '✅ ลงเวลาสำเร็จ\n$name$pos\n🕐 $ts น.';
    try {
      await _client
          .post(
            Uri.parse('https://api.telegram.org/bot$botToken/sendMessage'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'chat_id': chatId, 'text': text}),
          )
          .timeout(_timeout);
    } catch (_) {
      // แจ้งเตือนล้มเหลวไม่กระทบการลงเวลา
    }
  }

  // ---------- face-scan: /subject (จัดการหน้าตัวเอง: หา/ลบ) ----------
  /// หา subject_id ทั้งหมดของ emp_id นี้ (hcode ปัจจุบัน) — เช็คว่าเคยลงทะเบียนไหม
  Future<List<String>> findSubjectIdsByEmpId(String empId) async {
    final url = Uri.parse(
      '${ApiConfig.faceScanUrl}/subject'
      '?emp_id=${Uri.encodeQueryComponent(empId)}&hcode=${_settings.hcode.value}',
    );
    final res = await _client.get(url, headers: _faceHeaders).timeout(_timeout);
    if (res.statusCode != 200) throw ApiException('ค้น subject ตอบ ${res.statusCode}');
    final j = jsonDecode(res.body) as Map<String, dynamic>;
    return (j['subjects'] as List<dynamic>? ?? []).map((e) => (e as Map)['subject_id'].toString()).toList();
  }

  /// ลบ subject (ตอน "ลงทะเบียนใหม่")
  Future<bool> deleteSubject(String subjectId) async {
    final url = Uri.parse('${ApiConfig.faceScanUrl}/subject/$subjectId');
    final res = await _client.delete(url, headers: _faceHeaders).timeout(_timeout);
    return res.statusCode == 200;
  }

  // ---------- face-scan /health (ตรวจการเชื่อมต่อ) ----------
  Future<bool> checkStatus() async {
    try {
      final res = await _client.get(Uri.parse(ApiConfig.faceScanUrl + ApiConfig.pathHealth)).timeout(_timeout);
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  void dispose() => _client.close();
}

class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

/// โรงพยาบาล (จาก attendance /hospitals) — ใช้ใน dropdown ตอน login
class Hospital {
  Hospital({required this.hcode, required this.name});
  final String hcode;
  final String name;

  factory Hospital.fromJson(Map<String, dynamic> j) =>
      Hospital(hcode: j['hcode']?.toString() ?? '', name: j['name']?.toString() ?? '');
}
